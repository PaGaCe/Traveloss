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
import { INITIAL_TRIP } from "./tripData";

const STORAGE_KEY = "traveloss-trips-v1";

export function useTripsStore(userId, userEmail) {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  useEffect(() => {
    setTrips([]);
    setLoaded(false);
  }, [userId]);

  // ---------- Firebase por usuario ----------
  useEffect(() => {
    if (!firebaseReady || !userId) return;

    let cancelled = false;
    const ownRef = doc(db, "userTrips", userId);
    const sharedQ = query(collection(db, "sharedTrips"), where("sharedWith", "array-contains", userId));

    async function init() {
      // 1. Seed: garantizar que INITIAL_TRIP exista en Firestore
      try {
        const snap = await getDoc(ownRef);
        if (!snap.exists()) {
          await setDoc(ownRef, { trips: [INITIAL_TRIP] });
        } else {
          const existing = snap.data().trips || [];
          if (!existing.some((t) => t.id === INITIAL_TRIP.id)) {
            await setDoc(ownRef, { trips: [INITIAL_TRIP, ...existing] });
          }
        }
      } catch (err) {
        console.error("Seed error:", err);
      }
      if (cancelled) return;

      // 2. Activar listeners en tiempo real
      const unsubOwn = onSnapshot(ownRef, (s) => {
        if (cancelled) return;
        const ownTrips = s.exists() ? (s.data().trips || []).map((t) => ({ ...t, _isShared: false })) : [];
        setTrips(ownTrips);
      }, () => {
        if (cancelled) return;
        setTrips([]);
      });

      const unsubShared = onSnapshot(sharedQ, (ss) => {
        if (cancelled) return;
        const sharedTrips = ss.docs.map((d) => {
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
        });
        setTrips((prev) => {
          const ownOnly = prev.filter((t) => !t._isShared);
          return [...ownOnly, ...sharedTrips];
        });
      }, () => {
        if (cancelled) return;
        setTrips((prev) => prev.filter((t) => !t._isShared));
      });

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

  // ---------- Modo local ----------
  useEffect(() => {
    if (firebaseReady && userId) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasSeed = parsed.some((t) => t.id === INITIAL_TRIP.id);
          setTrips(hasSeed ? parsed : [INITIAL_TRIP, ...parsed]);
        } else {
          setTrips([INITIAL_TRIP]);
        }
      } else {
        setTrips([INITIAL_TRIP]);
      }
    } catch {
      setTrips([INITIAL_TRIP]);
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
    (nextOwnTrips) => {
      if (firebaseReady && userId) {
        setDoc(doc(db, "userTrips", userId), { trips: nextOwnTrips }).catch(() => {});
      }
    },
    [userId]
  );

  const persistShared = useCallback((tripId, tripData, meta) => {
    if (!firebaseReady) return;
    const { _isShared, _sharedMeta, ...clean } = tripData;
    setDoc(doc(db, "sharedTrips", tripId), { trip: clean, ...meta }).catch(() => {});
  }, []);

  const refreshLocal = useCallback(
    (nextTrips) => {
      setTrips(nextTrips);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTrips));
      } catch {}
    },
    []
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
      persistOwn(nextTrips.filter((t) => !t._isShared));
    }
    return updated;
  }

  // ---------- CRUD ----------
  const addTrip = useCallback(
    (trip) => {
      const current = tripsRef.current;
      const next = [...current, trip];
      refreshLocal(next);
      persistOwn([...current.filter((t) => !t._isShared), trip]);
    },
    [refreshLocal, persistOwn]
  );

  const deleteTrip = useCallback(
    (tripId) => {
      const current = tripsRef.current;
      const trip = current.find((t) => t.id === tripId);
      if (!trip) return;
      const next = current.filter((t) => t.id !== tripId);
      refreshLocal(next);
      if (trip._isShared) {
        if (firebaseReady) deleteDoc(doc(db, "sharedTrips", tripId)).catch(() => {});
      } else {
        persistOwn(next.filter((t) => !t._isShared));
      }
    },
    [refreshLocal, persistOwn]
  );

  const getTrip = useCallback((tripId) => {
    return tripsRef.current.find((t) => t.id === tripId) || null;
  }, []);

  const updateTrip = useCallback(
    (tripId, updates) => {
      mutateTrip(tripId, (t) => ({ ...t, ...updates }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistOwn, persistShared]
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
    [refreshLocal, persistOwn, persistShared]
  );

  const renameDay = useCallback(
    (tripId, dayId, newDate) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) => (d.id !== dayId ? d : { ...d, date: newDate })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistOwn, persistShared]
  );

  const addActivity = useCallback(
    (tripId, dayId, activity) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: t.days.map((d) => (d.id !== dayId ? d : { ...d, items: [...d.items, activity] })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistOwn, persistShared]
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
    [refreshLocal, persistOwn, persistShared]
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
    [refreshLocal, persistOwn, persistShared]
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
    [refreshLocal, persistOwn, persistShared]
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

      if (!trip._isShared) {
        const ownTrips = current.filter((t) => !t._isShared && t.id !== tripId);
        await setDoc(doc(db, "userTrips", userId), { trips: ownTrips });
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
        await deleteDoc(doc(db, "sharedTrips", tripId));
        const ownTrips = current.filter((t) => !t._isShared);
        const next = [...ownTrips, tripData];
        setTrips(next);
        await setDoc(doc(db, "userTrips", userId), { trips: ownTrips });
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
    usingFirebase: firebaseReady && !!userId,
  };
}
