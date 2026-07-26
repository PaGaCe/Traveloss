"use client";

import { useRef, useState } from "react";
import { Utensils, Camera, Plane, Bed, Sparkles, X, ImagePlus } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

export default function ActivityDetailSheet({ item, onClose, onUpdate, accentColor }) {
  const [details, setDetails] = useState(item.details || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const Icon = ICONS[item.type] || Sparkles;

  const detailLabel =
    item.type === "flight" ? "Billete / reserva" : item.type === "stay" ? "Reserva de alojamiento" : "Notas adicionales";

  async function handleImagePick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      if (firebaseReady) {
        const url = await uploadImageToFirebase(dataUrl, `activities/${item.id}-${Date.now()}.jpg`);
        onUpdate({ image: url });
      } else {
        onUpdate({ image: dataUrl });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-t-3xl px-5 pt-4 pb-8 z-10 max-h-[88%] overflow-y-auto bg-cloud">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentColor}22` }}>
              <Icon size={16} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="font-semibold text-[16px] text-ink font-display">{item.title}</p>
              <p className="text-[12px] text-slate">
                {item.time} · {item.place}
              </p>
            </div>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        {item.note && <p className="text-[12.5px] italic mb-3 text-gold">✦ {item.note}</p>}

        {item.image ? (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt="" className="w-full h-40 object-cover rounded-xl" />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="absolute bottom-2 right-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-white bg-black/60"
            >
              {uploading ? "Subiendo..." : "Cambiar foto"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full h-24 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 mb-3 text-slate"
          >
            <ImagePlus size={18} />
            <span className="text-[12px]">{uploading ? "Subiendo..." : "Añadir foto desde tu dispositivo"}</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

        <label className="text-[12px] font-medium mb-1 block text-muted">{detailLabel}</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={item.type === "flight" ? "Nº de reserva, aerolínea, asiento..." : "Escribe aquí cualquier detalle extra"}
          className="w-full rounded-xl px-4 py-3 text-[13.5px] outline-none min-h-[90px] bg-cloud text-ink"
        />

        <button
          onClick={() => onUpdate({ details })}
          className="w-full mt-4 rounded-xl py-3.5 text-[15px] font-semibold text-white"
          style={{ background: accentColor }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
