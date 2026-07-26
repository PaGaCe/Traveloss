"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, firebaseReady } from "./firebase";
import { INITIAL_TRIP } from "./tripData";

const STORAGE_KEY = "slovenia-trip-v1";
const TRIP_DOC_ID = "eslovenia-2026";

export function useTripStore() {
  const [trip, setTrip] = useState(INITIAL_TRIP);
  const [loaded, setLoaded] = useState(false);
  const tripRef = useRef(trip);
  tripRef.current = trip;

  // ---------- Modo Firebase (Firestore en tiempo real) ----------
  useEffect(() => {
    if (!firebaseReady) return;
    const ref = doc(db, "trips", TRIP_DOC_ID);

    async function ensureSeed() {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, INITIAL_TRIP);
        }
      } catch (err) {
        console.error("No se pudo inicializar el viaje en Firestore:", err);
      }
    }
    ensureSeed();

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setTrip(snap.data());
        setLoaded(true);
      },
      (err) => {
        console.error("Error escuchando cambios en Firestore:", err);
        setLoaded(true);
      }
    );

    return () => unsubscribe();
  }, []);

  // ---------- Modo local (fallback si Firebase no está configurado) ----------
  useEffect(() => {
    if (firebaseReady) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setTrip(JSON.parse(raw));
    } catch (err) {
      console.error("No se pudo leer el viaje guardado:", err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || firebaseReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    } catch (err) {
      console.error("No se pudo guardar el viaje (¿espacio lleno?):", err);
    }
  }, [trip, loaded]);

  // Guarda un nuevo estado del viaje, tanto local como en Firestore si aplica.
  const persist = useCallback((nextTrip) => {
    setTrip(nextTrip);
    if (firebaseReady) {
      setDoc(doc(db, "trips", TRIP_DOC_ID), nextTrip).catch((err) => {
        console.error("No se pudo guardar en Firebase:", err);
      });
    }
  }, []);

  const addDay = useCallback(() => {
    const newId = `d${Date.now()}`;
    const current = tripRef.current;
    persist({
      ...current,
      days: [...current.days, { id: newId, label: `Día ${current.days.length + 1}`, date: "Nueva fecha", items: [] }],
    });
    return newId;
  }, [persist]);

  const renameDay = useCallback(
    (dayId, newDate) => {
      const current = tripRef.current;
      persist({
        ...current,
        days: current.days.map((d) => (d.id !== dayId ? d : { ...d, date: newDate })),
      });
    },
    [persist]
  );

  const addActivity = useCallback(
    (dayId, activity) => {
      const current = tripRef.current;
      persist({
        ...current,
        days: current.days.map((d) => (d.id !== dayId ? d : { ...d, items: [...d.items, activity] })),
      });
    },
    [persist]
  );

  const updateActivity = useCallback(
    (dayId, activityId, updates) => {
      const current = tripRef.current;
      persist({
        ...current,
        days: current.days.map((d) =>
          d.id !== dayId
            ? d
            : { ...d, items: d.items.map((i) => (i.id !== activityId ? i : { ...i, ...updates })) }
        ),
      });
    },
    [persist]
  );

  return { trip, loaded, addDay, renameDay, addActivity, updateActivity, usingFirebase: firebaseReady };
}
