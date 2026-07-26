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
      if (err.code === "auth/popup-closed-by-user") return;
      console.error("Error al iniciar sesión:", err.code, err.message);
      const messages = {
        "auth/operation-not-allowed": "Google Sign-In no está habilitado. Ve a Firebase Console → Authentication → Sign-in method y actívalo.",
        "auth/unauthorized-domain": "Tu dominio no está autorizado. Ve a Firebase Console → Authentication → Settings → Authorized domains y añádelo.",
        "auth/invalid-api-key": "API Key inválida. Revisa tu .env.local.",
        "auth/network-request-failed": "Error de red. Comprueba tu conexión a internet.",
      };
      setError(messages[err.code] || `Error: ${err.code}`);
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
