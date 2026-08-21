"use client";

import { ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

function assertStorage() {
  if (!storage) {
    throw new Error("Firebase Storage no está configurado (faltan variables de entorno).");
  }
}

// Sube una imagen (como data URL, ya comprimida por compressImage.js) a
// Firebase Storage y devuelve la URL pública de descarga.
export async function uploadImageToFirebase(dataUrl, path) {
  assertStorage();
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, "data_url");
  return getDownloadURL(storageRef);
}

// Sube un archivo binario (ej. PDF) directamente a Firebase Storage y
// devuelve la URL pública de descarga.
export async function uploadFileToFirebase(file, path) {
  assertStorage();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
