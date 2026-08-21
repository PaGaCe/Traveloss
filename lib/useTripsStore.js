"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, firebaseReady } from "./firebase";

const STORAGE_KEY = "traveloss-trips-v1";

// ---------- Errores de persistencia (pub/sub) ----------
// Si falla el guardado (cuota de localStorage superada, doc de Firestore > 1 MiB,
// reglas, red...), antes solo se logueaba por consola: la UI seguía mostrando los
// datos en memoria y al recargar desaparecían sin ningún aviso. Ahora se emite un
// evento que la capa de UI (ToastProvider) muestra como toast.
const persistErrorListeners = new Set();
let lastPersistErrorAt = 0;

export function onPersistError(listener) {
  persistErrorListeners.add(listener);
  return () => persistErrorListeners.delete(listener);
}

function emitPersistError(message) {
  // Throttle: una subida de varias fotos puede disparar muchos fallos seguidos.
  const now = Date.now();
  if (now - lastPersistErrorAt < 3000) return;
  lastPersistErrorAt = now;
  persistErrorListeners.forEach((listener) => {
    try {
      listener(message);
    } catch {}
  });
}

function describePersistError(err) {
  if (
    err &&
    (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014)
  ) {
    return "El almacenamiento del navegador está lleno. Borra fotos o viajes viejos: los últimos cambios no se guardarán al recargar.";
  }
  return null;
}

// Firestore rechaza valores `undefined` (lanza "Unsupported field value: undefined").
// Como los formularios guardan campos vacíos como `undefined` (p. ej. `x || undefined`),
// cualquier `undefined` en el objeto del viaje hace fallar TODA la escritura en la nube
// (y al recargar se recuperan los datos antiguos de Firestore). Esta función elimina
// recursivamente los valores `undefined` antes de escribir.
function sanitizeForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore).filter((v) => v !== undefined);
  }
  if (value && typeof value === "object") {
    const clean = {};
    for (const key of Object.keys(value)) {
      const v = sanitizeForFirestore(value[key]);
      if (v !== undefined) clean[key] = v;
    }
    return clean;
  }
  return value;
}

function ownTripDoc(userId, tripId) {
  return doc(db, "userTrips", userId, "trips", tripId);
}

export function useTripsStore(userId, userEmail) {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissedTrips, setDismissedTrips] = useState([]);
  const [dismissedTripsData, setDismissedTripsData] = useState([]);
  const tripsRef = useRef(trips);
  tripsRef.current = trips;
  const dismissedRef = useRef(dismissedTrips);
  dismissedRef.current = dismissedTrips;

  useEffect(() => {
    setTrips([]);
    setLoaded(false);
    setDismissedTrips([]);
    setDismissedTripsData([]);
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
      //    Solo migrar si la subcolección está vacía para no sobrescribir datos nuevos
      try {
        const existingSub = await getDocs(ownCollRef);
        const subIds = new Set(existingSub.docs.map((d) => d.id));
        const oldSnap = await getDoc(oldOwnDocRef);
        if (oldSnap.exists()) {
          const oldData = oldSnap.data();
          if (oldData.trips && Array.isArray(oldData.trips) && oldData.trips.length > 0) {
            let allMigrated = true;
            for (const trip of oldData.trips) {
              if (subIds.has(trip.id)) continue; // no sobrescribir datos nuevos
              try {
                const ref = doc(ownCollRef, trip.id);
                await setDoc(ref, sanitizeForFirestore(trip));
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

      // 2. Activar listeners
      //    - Escuchamos el doc antiguo (formato legacy) para que los datos existentes aparezcan
      //    - También escuchamos la subcolección (nuevo formato) para datos escritos desde ahora
      const unsubOwnOld = onSnapshot(
        oldOwnDocRef,
        (s) => {
          if (cancelled) return;
          const legacyTrips = s.exists()
            ? (s.data().trips || []).map((t) => ({ ...t, _isShared: false, _source: "legacy" }))
            : [];
          setTrips((prev) => {
            const sharedOnly = prev.filter((t) => t._isShared);
            // Si un viaje está compartido, la copia propia no debe mostrarse (evita duplicados)
            const sharedIds = new Set(sharedOnly.map((t) => t.id));
            const currentOwn = prev.filter((t) => !t._isShared);
            // Reemplazar viajes legacy con los del snapshot, preservar los que ya están en subcolección
            const newIds = new Set(legacyTrips.map((t) => t.id));
            const fromSub = currentOwn.filter((t) => (t._source !== "legacy" || !newIds.has(t.id)) && !sharedIds.has(t.id));
            const filteredLegacy = legacyTrips.filter((t) => !sharedIds.has(t.id));
            return [...fromSub, ...filteredLegacy, ...sharedOnly];
          });
        },
        (err) => {
          console.error("Error en listener de viajes propios (legacy):", err);
        }
      );

      const unsubOwnNew = onSnapshot(
        ownCollRef,
        (ss) => {
          if (cancelled) return;
          const subTrips = ss.docs.map((d) => ({ ...d.data(), _isShared: false, _source: "sub" }));
          setTrips((prev) => {
            const sharedOnly = prev.filter((t) => t._isShared);
            // Si un viaje está compartido, la copia propia no debe mostrarse (evita duplicados)
            const sharedIds = new Set(sharedOnly.map((t) => t.id));
            const currentOwn = prev.filter((t) => !t._isShared);
            // Reemplazar viajes de subcolección, preservar los legacy que no estén en sub
            const subIds = new Set(subTrips.map((t) => t.id));
            const fromLegacy = currentOwn.filter((t) => (t._source !== "sub" || !subIds.has(t.id)) && !sharedIds.has(t.id));
            const filteredSub = subTrips.filter((t) => !sharedIds.has(t.id));
            return [...fromLegacy, ...filteredSub, ...sharedOnly];
          });
        },
        (err) => {
          console.error("Error en listener de viajes propios (sub):", err);
        }
      );

      const unsubShared = onSnapshot(
        sharedQ,
        (ss) => {
          if (cancelled) return;
          const allSharedTrips = ss.docs.map((d) => {
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
          // Mantener los ocultos en su propia lista para poder restaurarlos desde la app
          const dismissedIds = new Set(dismissedRef.current);
          setDismissedTripsData(allSharedTrips.filter((t) => dismissedIds.has(t.id)));
          const sharedTrips = allSharedTrips.filter((t) => !dismissedIds.has(t.id));
          setTrips((prev) => {
            const sharedIds = new Set(sharedTrips.map((t) => t.id));
            // La copia propia de un viaje compartido no debe mostrarse (evita duplicados)
            const ownOnly = prev.filter((t) => !t._isShared && !sharedIds.has(t.id));
            return [...ownOnly, ...sharedTrips];
          });
        },
        (err) => {
          console.error("Error en listener de viajes compartidos:", err);
        }
      );

      setLoaded(true);

      return () => {
        unsubOwnOld();
        unsubOwnNew();
        unsubShared();
      };
    }

    let cleanupFn = null;
    init().then((fn) => {
      if (cancelled && fn) {
        // El componente se desmontó mientras init() resolvía: limpiar ya
        fn();
      } else {
        cleanupFn = fn;
      }
    });

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
    } catch (err) {
      const msg = describePersistError(err);
      if (msg) emitPersistError(msg);
      else console.error("Error guardando en localStorage:", err);
    }
  }, [trips, loaded, userId]);

  // ---------- Persistencia ----------
  const persistOwn = useCallback(
    (ownTrips) => {
      if (!firebaseReady || !userId) return;
      ownTrips.forEach((trip) => {
        setDoc(ownTripDoc(userId, trip.id), sanitizeForFirestore(trip)).catch((err) => {
          console.error(`Error guardando viaje ${trip.id}:`, err);
          emitPersistError(
            `No se pudo sincronizar el viaje con la nube${err?.code ? ` (${err.code})` : ""}. Comprueba tu conexión; el cambio puede perderse al recargar.`
          );
        });
      });
    },
    [userId]
  );

  const persistShared = useCallback(
    (tripId, tripData) => {
      if (!firebaseReady) return;
      const { _isShared, _sharedMeta, ...clean } = tripData;
      const ref = doc(db, "sharedTrips", tripId);
      // updateDoc con solo "trip": preserva ownerId/ownerEmail/sharedWith del servidor,
      // así una edición con meta local desactualizada no "desinvita" a otros miembros.
      // Si el doc no existe (estado local obsoleto), NO debe fallar en silencio:
      // se recrea con setDoc para no perder la edición.
      updateDoc(ref, { trip: sanitizeForFirestore(clean) }).catch(async (err) => {
        if (err?.code === "not-found") {
          try {
            const snap = await getDoc(ref);
            let meta;
            if (snap.exists()) {
              const data = snap.data();
              meta = {
                ownerId: data.ownerId,
                ownerEmail: data.ownerEmail,
                sharedWith: data.sharedWith || [],
              };
            } else {
              meta = {
                ownerId: _sharedMeta?.ownerId || userId,
                ownerEmail: _sharedMeta?.ownerEmail || userEmail || "",
                sharedWith: _sharedMeta?.sharedWith || [],
              };
            }
            await setDoc(ref, sanitizeForFirestore({ trip: clean, ...meta }));
          } catch (e2) {
            console.error("Error recreando viaje compartido:", e2);
            emitPersistError("No se pudo sincronizar el viaje compartido. El cambio puede perderse al recargar.");
          }
        } else {
          console.error("Error guardando viaje compartido:", err);
          emitPersistError(
            `No se pudo sincronizar el viaje compartido${err?.code ? ` (${err.code})` : ""}. El cambio puede perderse al recargar.`
          );
        }
      });
    },
    [userId, userEmail]
  );

  const refreshLocal = useCallback(
    (nextTrips) => {
      setTrips(nextTrips);
      if (!firebaseReady || !userId) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTrips));
        } catch (err) {
          const msg = describePersistError(err);
          if (msg) emitPersistError(msg);
          else console.error("Error guardando en localStorage:", err);
        }
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
      persistShared(tripId, updated);
    } else if (firebaseReady && userId) {
      setDoc(ownTripDoc(userId, tripId), sanitizeForFirestore(updated)).catch((err) => {
        console.error(`Error actualizando viaje ${tripId}:`, err);
        emitPersistError(
          `No se pudo sincronizar el viaje con la nube${err?.code ? ` (${err.code})` : ""}. Comprueba tu conexión; el cambio puede perderse al recargar.`
        );
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
        const ref = ownTripDoc(userId, trip.id);
        setDoc(ref, sanitizeForFirestore(trip)).catch((err) => {
          console.error("Error creando viaje:", err);
        });
        // También añadir al doc legacy
        const ownTrips = [...current.filter((t) => !t._isShared), trip];
        setDoc(doc(db, "userTrips", userId), sanitizeForFirestore({ trips: ownTrips })).catch(() => {});
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
        // Si el viaje quedara también en el doc legacy (datos antiguos), quitarlo
        const ownTrips = next.filter((t) => !t._isShared);
        setDoc(doc(db, "userTrips", userId), sanitizeForFirestore({ trips: ownTrips })).catch(() => {});
      } else if (firebaseReady && userId) {
        deleteDoc(ownTripDoc(userId, tripId)).catch((err) => {
          console.error(`Error eliminando viaje ${tripId}:`, err);
        });
        // También actualizar doc legacy
        const ownTrips = next.filter((t) => !t._isShared);
        setDoc(doc(db, "userTrips", userId), sanitizeForFirestore({ trips: ownTrips })).catch(() => {});
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
    (tripId, customDay) => {
      const newId = customDay?.id || `d${Date.now()}`;
      mutateTrip(tripId, (t) => {
        const days = t.days || [];
        const nextDay = customDay
          ? { id: newId, label: customDay.label || `Día ${days.length + 1}`, date: customDay.date || "", items: customDay.items || [], ...customDay }
          : { id: newId, label: `Día ${days.length + 1}`, date: "Nueva fecha", items: [] };
        return {
          ...t,
          days: [...days, nextDay],
        };
      });
      return newId;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const updateDay = useCallback(
    (tripId, dayId, updates) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).map((d) => (d.id !== dayId ? d : { ...d, ...updates })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const deleteDay = useCallback(
    (tripId, dayId) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).filter((d) => d.id !== dayId),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const renameDay = useCallback(
    (tripId, dayId, newDate) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).map((d) => (d.id !== dayId ? d : { ...d, date: newDate })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const addActivity = useCallback(
    (tripId, dayId, activity) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).map((d) => (d.id !== dayId ? d : { ...d, items: [...(d.items || []), activity] })),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const updateActivity = useCallback(
    (tripId, dayId, activityId, updates) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).map((d) =>
          d.id !== dayId
            ? d
            : { ...d, items: (d.items || []).map((i) => (i.id !== activityId ? i : { ...i, ...updates })) }
        ),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const deleteActivity = useCallback(
    (tripId, dayId, activityId) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).map((d) =>
          d.id !== dayId ? d : { ...d, items: (d.items || []).filter((i) => i.id !== activityId) }
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
        days: (t.days || []).map((d) =>
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
        days: (t.days || []).map((d) =>
          d.id !== dayId ? d : { ...d, gallery: (d.gallery || []).filter((_, i) => i !== photoIdx) }
        ),
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const addPhotoToGallery = useCallback(
    (tripId, dayId, photo) => {
      mutateTrip(tripId, (t) => {
        const targetDayId = dayId || t.days?.[0]?.id;
        if (!targetDayId) return t;
        const photoObj = typeof photo === "string" ? { id: `p_${Date.now()}`, url: photo } : { id: photo.id || `p_${Date.now()}`, ...photo };
        return {
          ...t,
          days: (t.days || []).map((d) =>
            d.id === targetDayId ? { ...d, gallery: [...(d.gallery || []), photoObj] } : d
          ),
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshLocal, persistShared, userId]
  );

  const deletePhotoFromGallery = useCallback(
    (tripId, dayId, photoId) => {
      mutateTrip(tripId, (t) => ({
        ...t,
        days: (t.days || []).map((d) =>
          !dayId || d.id === dayId
            ? {
                ...d,
                gallery: (d.gallery || []).filter(
                  (p, i) => p.id !== photoId && i !== photoId && p.url !== photoId && p !== photoId
                ),
              }
            : d
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

      await setDoc(doc(db, "sharedTrips", tripId), sanitizeForFirestore({ trip: tripData, ...meta }));

      // Eliminar de viajes propios si existe (subcolección)
      if (firebaseReady && userId) {
        await deleteDoc(ownTripDoc(userId, tripId)).catch(() => {});
      }

      // También eliminarlo del doc legacy (userTrips/{userId}) para no duplicar:
      // si queda ahí, el listener legacy lo muestra como propio y el de sharedTrips
      // como compartido → el viaje sale dos veces.
      const ownTrips = current.filter((t) => !t._isShared && t.id !== tripId);
      setDoc(doc(db, "userTrips", userId), sanitizeForFirestore({ trips: ownTrips })).catch(() => {});

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
        await setDoc(ownTripDoc(userId, tripId), sanitizeForFirestore(tripData));
        await deleteDoc(doc(db, "sharedTrips", tripId));
        const ownTrips = current.filter((t) => !t._isShared);
        const next = [...ownTrips, tripData];
        setTrips(next);
        // Mantener el doc legacy en sincronía para no duplicar
        setDoc(doc(db, "userTrips", userId), sanitizeForFirestore({ trips: [...ownTrips, tripData] })).catch(() => {});
      } else {
        const updatedMeta = { ...meta, sharedWith: newSharedWith };
        const { _isShared, _sharedMeta, ...tripData } = trip;
        await setDoc(doc(db, "sharedTrips", tripId), sanitizeForFirestore({ trip: tripData, ...updatedMeta }));
        setTrips(current.map((t) => (t.id !== tripId ? t : { ...t, _sharedMeta: updatedMeta })));
      }
    },
    [userId]
  );

  const getSharedUsers = useCallback(async (tripId) => {
    if (!firebaseReady) return [];
    // Leer de Firestore directamente: tripsRef.current puede estar desactualizado
    // justo después de compartir (el snapshot compartido aún no ha llegado).
    const snap = await getDoc(doc(db, "sharedTrips", tripId)).catch(() => null);
    if (!snap || !snap.exists()) return [];
    const sharedWith = snap.data().sharedWith || [];
    const results = await Promise.all(sharedWith.map((uid) => getDoc(doc(db, "users", uid)).catch(() => null)));
    return results
      .filter((d) => d && d.exists())
      .map((d) => ({ uid: d.id, ...d.data() }));
  }, []);

  const joinSharedTrip = useCallback(
    async (tripId) => {
      if (!firebaseReady || !userId) return false;
      try {
        await updateDoc(doc(db, "sharedTrips", tripId), {
          sharedWith: arrayUnion(userId),
        });
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
      // Mover el viaje a la lista de ocultos para poder restaurarlo después
      setDismissedTripsData((prev) => {
        if (prev.some((t) => t.id === tripId)) return prev;
        const trip = tripsRef.current.find((t) => t.id === tripId);
        return trip ? [...prev, trip] : prev;
      });
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      try {
        await setDoc(doc(db, "users", userId), { dismissedTrips: next }, { merge: true });
      } catch (err) {
        console.error("Error dismissing trip:", err);
      }
    },
    [userId]
  );

  // Re-añadir un viaje que estaba oculto (desde la home o al volver a abrir la invitación)
  const restoreTrip = useCallback(
    async (tripId) => {
      if (!firebaseReady || !userId) return;
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        const stored = userSnap.exists() ? userSnap.data().dismissedTrips : null;
        const dismissed = Array.isArray(stored) ? stored : dismissedRef.current;
        const next = dismissed.filter((id) => id !== tripId);
        if (next.length === dismissed.length) return;
        dismissedRef.current = next;
        setDismissedTrips(next);
        setDismissedTripsData((prev) => prev.filter((t) => t.id !== tripId));
        await setDoc(doc(db, "users", userId), { dismissedTrips: next }, { merge: true });
        // Re-añadir a la lista si el viaje sigue existiendo (compartido)
        const snap = await getDoc(doc(db, "sharedTrips", tripId));
        if (snap.exists()) {
          const data = snap.data();
          const restored = {
            ...data.trip,
            _isShared: true,
            _sharedMeta: {
              ownerId: data.ownerId,
              ownerEmail: data.ownerEmail,
              sharedWith: data.sharedWith || [],
            },
          };
          setTrips((prev) => {
            if (prev.some((t) => t.id === tripId)) return prev;
            const ownOnly = prev.filter((t) => !t._isShared);
            return [...ownOnly, restored];
          });
        }
      } catch (err) {
        console.error("Error restoring trip:", err);
      }
    },
    [userId]
  );

  const leaveSharedTrip = useCallback(
    async (tripId) => {
      if (!userId) return;
      const current = tripsRef.current;
      const trip = current.find((t) => t.id === tripId);
      if (trip && trip._isShared) {
        if (trip._sharedMeta?.ownerId === userId) {
          deleteTrip(tripId);
        } else {
          if (firebaseReady) {
            try {
              await updateDoc(doc(db, "sharedTrips", tripId), {
                sharedWith: arrayRemove(userId),
              });
            } catch {}
          }
          await dismissTrip(tripId);
        }
      } else {
        deleteTrip(tripId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, deleteTrip, dismissTrip]
  );

  return {
    trips,
    loaded,
    dismissedTrips,
    dismissedTripsData,
    getTrip,
    addTrip,
    deleteTrip,
    updateTrip,
    addDay,
    updateDay,
    deleteDay,
    renameDay,
    addActivity,
    updateActivity,
    deleteActivity,
    addDayPhoto,
    removeDayPhoto,
    addPhotoToGallery,
    deletePhotoFromGallery,
    shareTrip,
    unshareTrip,
    leaveSharedTrip,
    getSharedUsers,
    joinSharedTrip,
    dismissTrip,
    restoreTrip,
    usingFirebase: firebaseReady && !!userId,
  };
}
