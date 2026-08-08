"use client";

import { useRef, useState, useEffect } from "react";
import { Utensils, Camera, Plane, Bed, Sparkles, X, ImagePlus, Trash2, CheckCircle2, Circle, Navigation, MapPin } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import TimePicker from "./TimePicker";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

export default function ActivityDetailSheet({ item, onClose, onUpdate, onDelete, accentColor }) {
  const [titleDraft, setTitleDraft] = useState(item.title || "");
  const [note, setNote] = useState(item.note || "");
  const [details, setDetails] = useState(item.details || "");
  const [time, setTime] = useState(item.time || "");
  const [uploading, setUploading] = useState(false);
  const [editingPlace, setEditingPlace] = useState(false);
  const [placeDraft, setPlaceDraft] = useState(item.place || "");
  const [placeCoords, setPlaceCoords] = useState(null);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const fileInputRef = useRef(null);
  const ticketInputRef = useRef(null);
  const placeInputRef = useRef(null);
  const Icon = ICONS[item.type] || Sparkles;

  // ticketImages: array de URLs (backward compat: si ticketImage es string, lo tratamos como array de 1)
  const ticketImages = Array.isArray(item.ticketImages)
    ? item.ticketImages
    : item.ticketImage
      ? [item.ticketImage]
      : [];

  const detailLabel =
    item.type === "flight" ? "Billete / reserva" : item.type === "stay" ? "Reserva de alojamiento" : "Notas adicionales";

  useEffect(() => {
    if (!editingPlace || placeDraft.trim().length < 3 || placeCoords) {
      setPlaceSuggestions([]);
      return;
    }
    let cancelled = false;
    setPlaceSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(placeDraft)}`
        );
        const data = await res.json();
        if (!cancelled) setPlaceSuggestions(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setPlaceSearching(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [placeDraft, placeCoords, editingPlace]);

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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newTickets = [...ticketImages];
      for (const file of files) {
        const dataUrl = await compressImage(file);
        if (firebaseReady) {
          const url = await uploadImageToFirebase(dataUrl, `tickets/${item.id}-${Date.now()}.jpg`);
          newTickets.push(url);
        } else {
          newTickets.push(dataUrl);
        }
      }
      onUpdate({ ticketImages: newTickets, ticketImage: undefined });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (ticketInputRef.current) ticketInputRef.current.value = "";
    }
  }

  function handleRemoveTicket(idx) {
    const newTickets = ticketImages.filter((_, i) => i !== idx);
    if (newTickets.length === 0) {
      onUpdate({ ticketImages: [], ticketImage: undefined });
    } else {
      onUpdate({ ticketImages: newTickets, ticketImage: undefined });
    }
  }

  function handleSavePlace() {
    const updates = { place: placeDraft.trim(), lat: null, lng: null, title: titleDraft, details, time, note };
    if (placeCoords) {
      updates.lat = placeCoords.lat;
      updates.lng = placeCoords.lng;
    }
    onUpdate(updates);
    setEditingPlace(false);
  }

  function handleClearPlace() {
    onUpdate({ place: "", lat: null, lng: null, title: titleDraft, details, time, note });
    setEditingPlace(false);
    setPlaceDraft("");
    setPlaceCoords(null);
  }

  // Al cerrar el sheet se guardan los textos pendientes para no perder cambios
  function handleClose() {
    onUpdate({ title: titleDraft, details, time, note });
    onClose();
  }

  const hasCoords = item.lat && item.lng;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        className="relative rounded-3xl px-5 pt-5 pb-6 z-10 max-h-[85%] overflow-y-auto bg-cloud max-w-lg mx-4 w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentColor}22` }}>
              <Icon size={16} style={{ color: accentColor }} />
            </div>
            <div>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className={`font-semibold text-[16px] text-ink font-display bg-transparent outline-none border-b border-transparent focus:border-line w-full ${item.completed ? "line-through opacity-60" : ""}`}
              />
              {!editingPlace && (
                <p className="text-[12px] text-slate flex items-center gap-1">
                  {item.place || "Sin ubicación"}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-3 bg-white border border-line">
          <span className="text-gold text-[14px]">✦</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota rápida (opcional)"
            className="w-full bg-transparent text-[13px] outline-none text-ink italic"
          />
        </div>

        {/* Completed toggle */}
        <button
          onClick={() => onUpdate({ completed: !item.completed, title: titleDraft, details, time, note })}
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

        {/* Ubicación */}
        <div className="mb-3">
          {editingPlace ? (
            <div className="rounded-xl bg-white border border-line p-3">
              <div className="relative">
                <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 bg-cloud border border-line">
                  <MapPin size={13} className="text-slate shrink-0" />
                  <input
                    ref={placeInputRef}
                    value={placeDraft}
                    onChange={(e) => { setPlaceDraft(e.target.value); setPlaceCoords(null); }}
                    placeholder="Escribe un lugar..."
                    className="w-full bg-transparent text-[13px] outline-none text-ink"
                  />
                  {placeDraft && (
                    <button onClick={() => { setPlaceDraft(""); setPlaceCoords(null); setPlaceSuggestions([]); }} className="shrink-0 text-slate">
                      <X size={13} />
                    </button>
                  )}
                </div>
                {placeSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden border border-line max-h-[150px] overflow-y-auto">
                    {placeSuggestions.map((s) => (
                      <button
                        key={s.place_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaceDraft(s.display_name.split(",").slice(0, 2).join(","));
                          setPlaceCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                          setPlaceSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-[11.5px] text-ink hover:bg-cloud border-b border-line last:border-0"
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {placeSearching && <p className="text-[10.5px] text-slate mt-1.5">Buscando...</p>}
              {placeCoords && <p className="text-[10.5px] text-teal mt-1.5">✓ Ubicación fijada</p>}
              <div className="flex gap-1.5 mt-2.5">
                <button
                  onClick={handleSavePlace}
                  className="flex items-center gap-1 text-[12px] font-semibold text-white px-3 py-1.5 rounded-lg"
                  style={{ background: accentColor }}
                >
                  <CheckCircle2 size={12} /> Guardar
                </button>
                {(item.place || item.lat) && (
                  <button
                    onClick={handleClearPlace}
                    className="flex items-center gap-1 text-[12px] text-coral px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={11} /> Borrar
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingPlace(false);
                    setPlaceDraft(item.place || "");
                    setPlaceCoords(null);
                    setPlaceSuggestions([]);
                  }}
                  className="text-[12px] text-slate px-3 py-1.5 rounded-lg hover:bg-cloud"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingPlace(true);
                setPlaceDraft(item.place || "");
                setPlaceCoords(null);
                setPlaceSuggestions([]);
              }}
              className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3 bg-white border border-line text-left hover:bg-cloud transition-colors"
            >
              <MapPin size={15} style={{ color: accentColor }} />
              <span className={`text-[13px] font-medium flex-1 ${item.place ? "text-ink" : "text-slate"}`}>
                {item.place || "Añadir ubicación"}
              </span>
            </button>
          )}
        </div>

        <div className="mb-3">
          <TimePicker value={time} onChange={setTime} accentColor={accentColor} />
        </div>

        {/* Foto de actividad */}
        {item.image ? (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image} alt=""
              className="w-full h-40 object-cover rounded-xl cursor-pointer"
              onClick={() => setLightboxImg(item.image)}
            />
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

        {/* Entradas / Tickets — disponible para todos los tipos de actividad */}
        {ticketImages.length > 0 ? (
          <div className="mb-3">
            <label className="text-[12px] font-medium mb-1.5 block text-muted">Entradas / tickets</label>
            <div className="flex flex-wrap gap-2">
              {ticketImages.map((ticketUrl, idx) => (
                <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ticketUrl} alt={`Ticket ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxImg(ticketUrl)}
                  />
                  <button
                    onClick={() => handleRemoveTicket(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => ticketInputRef.current && ticketInputRef.current.click()}
                className="w-28 h-28 rounded-xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-slate hover:text-muted transition-colors"
              >
                <ImagePlus size={16} />
                <span className="text-[10px] text-center">Añadir otro</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => ticketInputRef.current && ticketInputRef.current.click()}
            className="w-full h-20 rounded-xl border-2 border-dashed border-line flex items-center justify-center gap-1.5 mb-3 text-slate hover:text-muted transition-colors"
          >
            <ImagePlus size={16} />
            <span className="text-[12px]">{uploading ? "Subiendo..." : "Añadir entrada / ticket"}</span>
          </button>
        )}
        <input ref={ticketInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleTicketPick} />

        <label className="text-[12px] font-medium mb-1 block text-muted">{detailLabel}</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={item.type === "flight" ? "Nº de reserva, aerolínea, asiento..." : "Escribe aquí cualquier detalle extra"}
          className="w-full rounded-xl px-4 py-3 text-[13.5px] outline-none min-h-[90px] bg-cloud text-ink"
        />

        <div className="flex gap-2 mt-4">
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="flex items-center justify-center gap-1.5 rounded-xl py-3.5 px-4 text-[13px] font-medium bg-coral text-white"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          )}
          <button
            onClick={() => { onUpdate({ title: titleDraft, details, time, note }); onClose(); }}
            className="flex-1 rounded-xl py-3.5 text-[15px] font-semibold text-white"
            style={{ background: accentColor }}
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90" onClick={() => setLightboxImg(null)}>
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImg} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
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
