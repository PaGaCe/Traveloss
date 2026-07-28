"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, firebaseReady } from "./firebase";

const STORAGE_KEY = "traveloss-trips-v1";

function ownTripDoc(userId, tripId) {
  return doc(db, "userTrips", userId, "trips", tripId);
}

export function useTripsStore(userId, userEmail) {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissedTrips, setDismissedTrips] = useState([]);
  const tripsRef = useRef(trips);
  tripsRef.current = trips;
  const dismissedRef = useRef(dismissedTrips);
  dismissedRef.current = dismissedTrips;

  useEffect(() => {
    setTrips([]);
    setLoaded(false);
    setDismissedTrips([]);
  }, [userId]);

  // ---------- Firebase por usuario ----------
  useEffect(() => {
    if (!firebaseReady || !userId) return;

    let cancelled = false;
    const ownCollRef = collection(db, "userTrips", userId, "trips");
    const oldOwnDocRef = doc(db, "userTrips", userId);
    const sharedQ = query(collection(db, "sharedTrips"), where("sharedWith", "array-contains", userId));

    async function init() {
      // 0. Cargar viajes descartados del usuario
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists() && userSnap.data().dismissedTrips) {
          const dismissed = userSnap.data().dismissedTrips;
          dismissedRef.current = dismissed;
          setDismissedTrips(dismissed);
        }
      } catch (err) {
        console.error("Error loading dismissed trips:", err);
      }
      if (cancelled) return;

      // 1. Migrar datos del antiguo formato (documento único) al nuevo (subcolección)
      try {
        const oldSnap = await getDoc(oldOwnDocRef);
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          if (oldData.trips && Array.isArray(oldData.trips) && oldData.trips.length > 0) {
            let allMigrated = true;
            for (const trip of oldData.trips) {
              try {
                const ref = doc(ownCollRef, trip.id);
                await setDoc(ref, trip);
              } catch (err) {
                console.error(`Error migrando viaje ${trip.id}, se queda en el doc antiguo:`, err);
                allMigrated = false;
              }
            }
            // Solo eliminar el doc antiguo si TODOS los viajes se migraron
            if (allMigrated) {
              await deleteDoc(oldOwnDocRef).catch(() => {});
            }
          } else {
            await deleteDoc(oldOwnDocRef).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Error migrando datos antiguos:", err);
      }
      if (cancelled) return;

      // 2. Activar listener en tiempo real sobre la subcolección
      const unsubOwn = onSnapshot(
        ownCollRef,
        (ss) => {
          if (cancelled) return;
          const ownTrips = ss.docs.map((d) => ({ ...d.data(), _isShared: false }));
          setTrips((prev) => {
            const sharedOnly = prev.filter((t) => t._isShared);
            return [...ownTrips, ...sharedOnly];
          });
        },
        (err) => {
          console.error("Error en listener de viajes propios:", err);
        }
      );

      const unsubShared = onSnapshot(
        sharedQ,
        (ss) => {
          if (cancelled) return;
          const sharedTrips = ss.docs
            .map((d) => {
              const data = d.data();
              return {
                ...data.trip,
                _isShared: true,
                _sharedMeta: {
                  ownerId: data.ownerId,
                  ownerEmail: data.ownerEmail,
                  sharedWith: data.sharedWith || [],
                },
              };
            })
            .filter((t) => !dismissedRef.current.includes(t.id));
          setTrips((prev) => {
            const ownOnly = prev.filter((t) => !t._isShared);
            return [...ownOnly, ...sharedTrips];
          });
        },
        (err) => {
          console.error("Error en listener de viajes compartidos:", err);
        }
      );

      setLoaded(true);

      return () => {
        unsubOwn();
        unsubShared();
      };
    }

    let cleanupFn = null;
    init().then((fn) => { cleanupFn = fn; });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [userId]);

  // ---------- Modo local (sin Firebase) ----------
  useEffect(() => {
    if (firebaseReady && userId) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrips(parsed);
        }
      }
    } catch {
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!loaded || (firebaseReady && userId)) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {}
  }, [trips, loaded, userId]);

  // ---------- Persistencia ----------
  const persistOwn = useCallback(
    (ownTrips) => {
      if (!firebaseReady || !userId) return;
      ownTrips.forEach((trip) => {
        setDoc(ownTripDoc(userId, trip.id), trip).catch((err) => {
          console.error(`Error guardando viaje ${trip.id}:`, err);
        });
      });
    },
    [userId]
  );

  const persistShared = useCallback((tripId, tripData, meta) => {
    if (!firebaseReady) return;
    const { _isShared, _sharedMeta, ...clean } = tripData;
    setDoc(doc(db, "sharedTrips", tripId), { trip: clean, ...meta }).catch((err) => {
      console.error("Error guardando viaje compartido:", err);
    });
  }, []);

  const refreshLocal = useCallback(
    (nextTrips) => {
      setTrips(nextTrips);
      if (!firebaseReady || !userId) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTrips));
        } catch {}
      }
    },
    [userId]
  );

  // Helper: Aplicar mutación a un viaje y persistir
  function mutateTrip(tripId, updater) {
    const current = tripsRef.current;
    const trip = current.find((t) => t.id === tripId);
    if (!trip) return null;
    const updated = updater(trip);
    const nextTrips = current.map((t) => (t.id !== tripId ? t : updated));
    refreshLocal(nextTrips);
    if (trip._isShared) {
      persistShared(tripId, updated, trip._sharedMeta);
    } else if (firebaseReady && userId) {
      setDoc(ownTripDoc(userId, tripId), updated).catch((err) => {
        console.error(`Error actualizando viaje ${tripId}:`, err);
      });
    }
    return updated;
  }

  // ---------- CRUD ----------
  const addTrip = useCallback(
    (trip) => {
      const current = tripsRef.current;
      const next = [...current, trip];
      refreshLocal(next);
      if (firebaseReady && userId) {
        setDoc(ownTripDoc(userId, trip.id), trip).catch((err) => {
          console.error("Error creando viaje:", err);
        });
      }
    },
    [refreshLocal, userId]
  );

  const deleteTrip = useCallback(
    (tripId) => {
      const current = tripsRef.current;
      const trip = current.find((t) => t.id === tripId);
      if (!trip) return;
      if (trip._isShared && trip._sharedMeta?.ownerId !== userId) return;
      const next = current.filter((t) => t.id !== tripId);
      refreshLocal(next);
      if (trip._isShared) {
        if (firebaseReady) deleteDoc(doc(db, "sharedTrips", tripId)).catch(() => {});
      } else if (firebaseReady && userId) {
        deleteDoc(ownTripDoc(userId, tripId)).catch((err) => {
          console.error(`Error eliminando viaje ${tripId}:`, err);
        });
      }
    },
    [refreshLocal, userId]
  );

  const getTrip = useCallback((tripId) => {
    return tripsRef.current.find((t) => t.id === tripId) || null;
  }, []);

  const updateTrip = useCallback(
    (tripId, updates) => {
      mutateTrip(tripId, (t) => ({ ...t, ...updates }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const addDay = useCallback(
    (tripId) => {
      const newId = `d${Date.now()}`;
      mutateTrip(tripId, (t) => ({
        ...t,
        days: [...t.days, { id: newId, label: `Día ${t.days.length + 1}`, date: "Nueva fecha", items: [] }],
      }));
      return newId;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const renameDay = useCallback(
    (tripId, dayId, newDate) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) => (d.id !== dayId ? d : { ...d, date: newDate })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const addActivity = useCallback(
    (tripId, dayId, activity) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) => (d.id !== dayId ? d : { ...d, items: [...d.items, activity] })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const updateActivity = useCallback(
    (tripId, dayId, activityId, updates) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) =>
          d.id !== dayId ? d : { ...d, items: d.items.map((i) => (i.id !== activityId ? i : { ...i, ...updates })) }
        ),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const addDayPhoto = useCallback(
    (tripId, dayId, photo) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) =>
          d.id !== dayId ? d : { ...d, gallery: [...(d.gallery || []), photo] }
        ),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const removeDayPhoto = useCallback(
    (tripId, dayId, photoIdx) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) =>
          d.id !== dayId ? d : { ...d, gallery: (d.gallery || []).filter((_, i) => i !== photoIdx) }
        ),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  // ---------- Sharing ----------
  const shareTrip = useCallback(
    async (tripId, targetEmail) => {
      if (!firebaseReady || !userId) return;
      const q = query(collection(db, "users"), where("email", "==", targetEmail));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("No se encontró ningún usuario con ese email");

      const targetUid = snap.docs[0].id;
      if (targetUid === userId) throw new Error("No puedes compartir un viaje contigo mismo");

      const current = tripsRef.current;
      const trip = current.find((t) => t.id === tripId);
      if (!trip) return;

      const existingMeta = trip._sharedMeta || {};
      const existingSharedWith = existingMeta.sharedWith || [];
      if (existingSharedWith.includes(targetUid)) throw new Error("Ya está compartido con este usuario");

      const newSharedWith = [...new Set([userId, ...existingSharedWith, targetUid])];
      const { _isShared, _sharedMeta, ...tripData } = trip;

      const meta = {
        ownerId: existingMeta.ownerId || userId,
        ownerEmail: existingMeta.ownerEmail || userEmail || "",
        sharedWith: newSharedWith,
      };

      await setDoc(doc(db, "sharedTrips", tripId), { trip: tripData, ...meta });

      // Eliminar de viajes propios si existe
      if (firebaseReady && userId) {
        await deleteDoc(ownTripDoc(userId, tripId)).catch(() => {});
      }

      const updatedTrip = { ...tripData, _isShared: true, _sharedMeta: meta };
      setTrips(current.map((t) => (t.id !== tripId ? t : updatedTrip)));
    },
    [userId, userEmail]
  );

  const unshareTrip = useCallback(
    async (tripId, targetUid) => {
      if (!firebaseReady) return;
      const current = tripsRef.current;
      const trip = current.find((t) => t.id === tripId);
      if (!trip || !trip._isShared) return;

      const meta = trip._sharedMeta;
      const newSharedWith = meta.sharedWith.filter((uid) => uid !== targetUid);

      if (newSharedWith.length <= 1) {
        // Solo queda el propietario → mover a viajes propios
        const { _isShared, _sharedMeta, ...tripData } = trip;
        await setDoc(ownTripDoc(userId, tripId), tripData);
        await deleteDoc(doc(db, "sharedTrips", tripId));
        const ownTrips = current.filter((t) => !t._isShared);
        const next = [...ownTrips, tripData];
        setTrips(next);
      } else {
        const updatedMeta = { ...meta, sharedWith: newSharedWith };
        const { _isShared, _sharedMeta, ...tripData } = trip;
        await setDoc(doc(db, "sharedTrips", tripId), { trip: tripData, ...updatedMeta });
        setTrips(current.map((t) => (t.id !== tripId ? t : { ...t, _sharedMeta: updatedMeta })));
      }
    },
    [userId]
  );

  const getSharedUsers = useCallback(async (tripId) => {
    const current = tripsRef.current;
    const trip = current.find((t) => t.id === tripId);
    if (!trip || !trip._isShared) return [];
    const uids = trip._sharedMeta.sharedWith || [];
    const results = await Promise.all(uids.map((uid) => getDoc(doc(db, "users", uid)).catch(() => null)));
    return results
      .filter((d) => d && d.exists())
      .map((d) => ({ uid: d.id, ...d.data() }));
  }, []);

  const joinSharedTrip = useCallback(
    async (tripId) => {
      if (!firebaseReady || !userId) return false;
      try {
        const tripRef = doc(db, "sharedTrips", tripId);
        const snap = await getDoc(tripRef);
        if (!snap.exists()) return false;
        const data = snap.data();
        const sharedWith = data.sharedWith || [];
        if (sharedWith.includes(userId)) return true;
        const newSharedWith = [...sharedWith, userId];
        await setDoc(tripRef, { ...data, sharedWith: newSharedWith });
        return true;
      } catch {
        return false;
      }
    },
    [userId]
  );

  // ---------- Dismiss (quitar de mi lista) ----------
  const dismissTrip = useCallback(
    async (tripId) => {
      if (!firebaseReady || !userId) return;
      const next = [...dismissedRef.current, tripId];
      dismissedRef.current = next;
      setDismissedTrips(next);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      try {
        await setDoc(doc(db, "users", userId), { dismissedTrips: next }, { merge: true });
      } catch (err) {
        console.error("Error dismissing trip:", err);
      }
    },
    [userId]
  );

  return {
    trips,
    loaded,
    getTrip,
    addTrip,
    deleteTrip,
    updateTrip,
    addDay,
    renameDay,
    addActivity,
    updateActivity,
    addDayPhoto,
    removeDayPhoto,
    shareTrip,
    unshareTrip,
    getSharedUsers,
    joinSharedTrip,
    dismissTrip,
    usingFirebase: firebaseReady && !!userId,
  };
}
