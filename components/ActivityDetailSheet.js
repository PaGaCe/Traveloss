"use client";

import { useRef, useState } from "react";
import { Utensils, Camera, Plane, Bed, Sparkles, X, ImagePlus, Trash2, CheckCircle2, Circle, Navigation } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import TimePicker from "./TimePicker";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

export default function ActivityDetailSheet({ item, onClose, onUpdate, onDelete, accentColor }) {
  const [details, setDetails] = useState(item.details || "");
  const [time, setTime] = useState(item.time || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const ticketInputRef = useRef(null);
  const Icon = ICONS[item.type] || Sparkles;

  const isFlight = item.type === "flight";

  const detailLabel =
    isFlight ? "Billete / reserva" : item.type === "stay" ? "Reserva de alojamiento" : "Notas adicionales";

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleTicketPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      if (firebaseReady) {
        const url = await uploadImageToFirebase(dataUrl, `tickets/${item.id}-${Date.now()}.jpg`);
        onUpdate({ ticketImage: url });
      } else {
        onUpdate({ ticketImage: dataUrl });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (ticketInputRef.current) ticketInputRef.current.value = "";
    }
  }

  const hasCoords = item.lat && item.lng;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-3xl px-5 pt-5 pb-6 z-10 max-h-[85%] overflow-y-auto bg-cloud max-w-lg mx-4 w-full shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentColor}22` }}>
              <Icon size={16} style={{ color: accentColor }} />
            </div>
            <div>
              <p className={`font-semibold text-[16px] text-ink font-display ${item.completed ? "line-through opacity-60" : ""}`}>
                {item.title}
              </p>
              <p className="text-[12px] text-slate">
                {item.place}
              </p>
            </div>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        {item.note && <p className="text-[12.5px] italic mb-3 text-gold">✦ {item.note}</p>}

        {/* Completed toggle */}
        <button
          onClick={() => onUpdate({ completed: !item.completed })}
          className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3 mb-3 transition-colors border"
          style={{
            background: item.completed ? `${accentColor}12` : "white",
            borderColor: item.completed ? accentColor : "#C5CAD6",
          }}
        >
          {item.completed ? (
            <CheckCircle2 size={18} style={{ color: accentColor }} />
          ) : (
            <Circle size={18} className="text-slate" />
          )}
          <span className={`text-[13px] font-medium ${item.completed ? "text-ink" : "text-slate"}`}>
            {item.completed ? "Actividad completada" : "Marcar como hecho"}
          </span>
        </button>

        {/* Google Maps */}
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3 mb-3 bg-white border border-line text-left hover:bg-cloud transition-colors"
          >
            <Navigation size={16} style={{ color: accentColor }} />
            <span className="text-[13px] font-medium text-ink flex-1">Abrir en Google Maps</span>
            <ExternalLink size={13} className="text-slate" />
          </a>
        )}

        <div className="mb-3">
          <TimePicker value={time} onChange={setTime} accentColor={accentColor} />
        </div>

        {isFlight ? (
          <>
            {/* Ticket upload for flights */}
            {item.ticketImage ? (
              <div className="relative mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.ticketImage} alt="Billete" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => ticketInputRef.current && ticketInputRef.current.click()}
                  className="absolute bottom-2 right-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-white bg-black/60"
                >
                  {uploading ? "Subiendo..." : "Cambiar billete"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => ticketInputRef.current && ticketInputRef.current.click()}
                className="w-full h-24 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 mb-3 text-slate"
              >
                <Plane size={18} />
                <span className="text-[12px]">{uploading ? "Subiendo..." : "Añadir billete / boarding pass"}</span>
              </button>
            )}
            <input ref={ticketInputRef} type="file" accept="image/*" className="hidden" onChange={handleTicketPick} />
          </>
        ) : (
          <>
            {/* Regular photo for non-flight activities */}
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
          </>
        )}

        <label className="text-[12px] font-medium mb-1 block text-muted">{detailLabel}</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={isFlight ? "Nº de reserva, aerolínea, asiento..." : "Escribe aquí cualquier detalle extra"}
          className="w-full rounded-xl px-4 py-3 text-[13.5px] outline-none min-h-[90px] bg-cloud text-ink"
        />

        <button
          onClick={() => { onUpdate({ details, time }); onClose(); }}
          className="w-full mt-4 rounded-xl py-3.5 text-[15px] font-semibold text-white"
          style={{ background: accentColor }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function ExternalLink({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
