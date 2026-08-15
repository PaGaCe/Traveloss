"use client";

import { useState, useRef } from "react";
import { X, MapPin, Calendar, ImagePlus, Sparkles } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";

const COLORS = [
  "#F59E0B", // Gold / Amber
  "#EA580C", // Coral / Orange
  "#0D9488", // Teal / Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#0B0F19", // Midnight Dark
  "#10B981", // Mint
];

export default function AddTripSheet({ onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function handleImagePick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 800, quality: 0.65 });
      if (firebaseReady) {
        try {
          const url = await uploadImageToFirebase(dataUrl, `trips/${Date.now()}-${file.name}`);
          setImage(url);
        } catch (storageErr) {
          console.warn("Storage upload failed, using inline image:", storageErr);
          setImage(dataUrl);
        }
      } else {
        setImage(dataUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id: `trip-${Date.now()}`,
      title: title.trim(),
      place: place.trim(),
      dateLabel: dateLabel.trim(),
      stampColor: color,
      ...(image ? { image } : {}),
      days: [],
      restaurants: [],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative rounded-t-[32px] px-6 pt-3 pb-8 z-10 bg-white max-h-[90%] overflow-y-auto max-w-lg mx-auto w-full shadow-2xl border-t border-line">
        {/* Drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate/20 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Sparkles size={16} />
            </div>
            <h2 className="text-[19px] font-bold text-ink font-display">Nuevo viaje</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cloud flex items-center justify-center text-slate hover:text-ink active:scale-95 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        {/* cover image */}
        {image ? (
          <div className="relative mb-4 rounded-2xl overflow-hidden shadow-soft border border-line">
            <img src={image} alt="" className="w-full h-36 object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full h-24 rounded-2xl border-2 border-dashed border-line hover:border-slate/40 bg-cloud/50 flex flex-col items-center justify-center gap-1.5 mb-4 text-slate hover:text-ink active:scale-[0.99] transition-all"
          >
            <ImagePlus size={20} className="text-slate/70" />
            <span className="text-[12.5px] font-medium">
              {uploading ? "Procesando imagen..." : "Añadir foto de portada"}
            </span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
              Nombre del viaje
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Japón Sakura 2027"
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
              Destino
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-white transition-all">
              <MapPin size={16} className="text-slate/70 shrink-0" />
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ej: Tokio → Kioto → Osaka"
                className="w-full bg-transparent text-[14px] outline-none text-ink font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
              Fechas aproximadas
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-white transition-all">
              <Calendar size={16} className="text-slate/70 shrink-0" />
              <input
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                placeholder="Ej: 15 – 28 Mar 2027"
                className="w-full bg-transparent text-[14px] outline-none text-ink font-medium"
              />
            </div>
          </div>
        </div>

        <p className="text-[11.5px] font-bold uppercase tracking-wider mt-5 mb-2.5 text-slate">
          Color temático del viaje
        </p>
        <div className="flex gap-2.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-9 h-9 rounded-full transition-all active:scale-95"
              style={{
                background: c,
                transform: color === c ? "scale(1.15)" : "scale(1)",
                boxShadow: color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : "none",
              }}
            />
          ))}
        </div>

        <button
          disabled={!title.trim()}
          onClick={handleSave}
          className="w-full mt-6 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-card active:scale-[0.98] transition-all"
          style={{ background: color, opacity: title.trim() ? 1 : 0.5 }}
        >
          Crear viaje
        </button>
      </div>
    </div>
  );
}
