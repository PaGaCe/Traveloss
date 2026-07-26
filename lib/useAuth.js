"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db, firebaseReady } from "./firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Guardar perfil del usuario en Firestore al iniciar sesión
  useEffect(() => {
    if (!user || !firebaseReady || !db) return;
    setDoc(
      doc(db, "users", user.uid),
      {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
      { merge: true }
    ).catch(() => {});
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseReady || !auth) return;
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Error al iniciar sesión:", err);
        setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseReady || !auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  }, []);

  return {
    user,
    userId: user ? user.uid : null,
    loading,
    error,
    signInWithGoogle,
    signOut,
    authReady: firebaseReady && !!auth,
  };
}
