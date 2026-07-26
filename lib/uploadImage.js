"use client";

import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// Sube una imagen (como data URL, ya comprimida por compressImage.js) a
// Firebase Storage y devuelve la URL pública de descarga.
export async function uploadImageToFirebase(dataUrl, path) {
  if (!storage) {
    throw new Error("Firebase Storage no está configurado (faltan variables de entorno).");
  }
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, "data_url");
  return getDownloadURL(storageRef);
}
