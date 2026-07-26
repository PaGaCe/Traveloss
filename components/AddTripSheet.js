"use client";

import { useState, useRef } from "react";
import { X, MapPin, Calendar, ImagePlus } from "lucide-react";
import { compressImage } from "../lib/compressImage";

const COLORS = ["#FBA006", "#FDC509", "#E56508", "#010615", "#2A9D8F", "#FF6B4A", "#4A90D9", "#9B59B6"];

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
      const dataUrl = await compressImage(file, { maxWidth: 600, quality: 0.6 });
      setImage(dataUrl);
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
    });
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-t-3xl px-5 pt-4 pb-8 z-10 bg-cloud max-h-[88%] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-ink font-display">Nuevo viaje</h2>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        {/* cover image */}
        {image ? (
          <div className="relative mb-4">
            <img src={image} alt="" className="w-full h-36 object-cover rounded-xl" />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full h-20 rounded-xl border-2 border-dashed border-line flex items-center justify-center gap-2 mb-4 text-slate"
          >
            <ImagePlus size={16} />
            <span className="text-[12.5px]">{uploading ? "Procesando..." : "Añadir foto de portada"}</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del viaje (ej: Japón 2027)"
            className="w-full rounded-xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink"
          />
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud">
            <MapPin size={15} className="text-slate" />
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Destino (ej: Tokio → Kioto)"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud">
            <Calendar size={15} className="text-slate" />
            <input
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              placeholder="Fechas (ej: 15 – 25 Mar)"
              className="w-full bg-transparent text-[14px] outline-none text-ink"
            />
          </div>
        </div>

        <p className="text-[12px] font-medium mt-4 mb-2 text-muted">Color del viaje</p>
        <div className="flex gap-2.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all"
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
          className="w-full mt-6 rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity"
          style={{ background: color, opacity: title.trim() ? 1 : 0.5 }}
        >
          Crear viaje
        </button>
      </div>
    </div>
  );
}
