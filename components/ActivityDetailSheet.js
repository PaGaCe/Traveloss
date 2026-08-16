"use client";

import { useRef, useState, useEffect } from "react";
import {
  Utensils,
  Camera,
  Plane,
  Bed,
  Sparkles,
  X,
  ImagePlus,
  Trash2,
  CheckCircle2,
  Circle,
  Navigation,
  MapPin,
  FileText,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import TimePicker from "./TimePicker";
import { useToast } from "./Toast";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB

// Quita caracteres que Firebase Storage rechaza en el nombre del archivo
function sanitizeFileName(name) {
  const cleaned = String(name || "archivo").replace(/[\[\]#%?&/\\:*?"<>|\x00-\x1f]/g, "_");
  return cleaned || "archivo";
}

function isDataUrl(url) {
  return typeof url === "string" && url.startsWith("data:");
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function isPdfUrl(url) {
  if (typeof url !== "string") return false;
  if (url.startsWith("data:application/pdf")) return true;
  return url.toLowerCase().endsWith(".pdf");
}

// Normaliza cada entrada/ticket (URL string o {url, name, type}) a {url, name, type}
function normalizeTicket(t) {
  if (t && typeof t === "object") {
    return { url: t.url, name: t.name || "Entrada", type: t.type || "application/pdf" };
  }
  const url = String(t || "");
  return { url, name: "Entrada", type: isPdfUrl(url) ? "application/pdf" : "image/jpeg" };
}

export default function ActivityDetailSheet({ item, onClose, onUpdate, onDelete, accentColor = "#0B0F19" }) {
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

  // ticketImages: array de entradas (backward compat: si ticketImage es string, lo tratamos como array de 1)
  const ticketImages = (Array.isArray(item.ticketImages)
    ? item.ticketImages
    : item.ticketImage
      ? [item.ticketImage]
      : []).map(normalizeTicket);

  const detailLabel =
    item.type === "flight" ? "Billete / reserva" : item.type === "stay" ? "Reserva de alojamiento" : "Notas y detalles";

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

  const addToast = useToast();

  async function handleTicketPick(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newTickets = [...ticketImages];
      let added = 0;
      for (const file of files) {
        try {
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          if (isPdf && file.size > MAX_PDF_SIZE) {
            addToast?.(`"${file.name}" es demasiado grande (máx 5 MB)`, "warning");
            continue;
          }
          const dataUrl = await compressImage(file);
          let url = dataUrl;
          if (firebaseReady) {
            try {
              url = await uploadImageToFirebase(dataUrl, `tickets/${item.id}-${Date.now()}-${sanitizeFileName(file.name)}`);
            } catch (uploadErr) {
              console.error("No se pudo subir a la nube:", uploadErr);
              addToast?.(`No se pudo subir "${file.name}" a la nube, se guarda localmente`, "warning");
            }
          }
          if (isPdf) {
            newTickets.push({ url, name: file.name, type: "application/pdf" });
          } else {
            newTickets.push(url);
          }
          added++;
        } catch (err) {
          console.error(err);
          addToast?.(`Error al subir "${file.name}": ${err.message || "Error desconocido"}`, "error");
        }
      }
      if (added > 0) {
        onUpdate({ ticketImages: newTickets, ticketImage: undefined });
        addToast?.(added === 1 ? "Documento añadido correctamente" : `${added} documentos añadidos correctamente`, "success");
      }
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

  function openTicket(ticket) {
    if (isDataUrl(ticket.url)) {
      const blob = dataUrlToBlob(ticket.url);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      window.open(ticket.url, "_blank");
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={handleClose} />
      <div
        className="relative rounded-3xl px-5 pt-4 pb-6 z-10 max-h-[88%] overflow-y-auto bg-white max-w-lg w-full shadow-2xl border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-line">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ background: `${accentColor}18` }}
            >
              <Icon size={18} style={{ color: accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Nombre de la actividad"
                className={`font-bold text-[17px] text-ink font-display bg-transparent outline-none border-b border-transparent focus:border-line w-full ${
                  item.completed ? "line-through opacity-60" : ""
                }`}
              />
              {!editingPlace && (
                <p className="text-[12px] text-slate flex items-center gap-1 mt-0.5 truncate">
                  <MapPin size={12} className="shrink-0 text-slate/70" />
                  <span>{item.place || "Sin ubicación fijada"}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-cloud flex items-center justify-center text-slate hover:text-ink active:scale-95 transition-transform shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Completed status button */}
        <button
          onClick={() => onUpdate({ completed: !item.completed, title: titleDraft, details, time, note })}
          className={`w-full flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-3.5 transition-all border active:scale-[0.99] font-medium text-[13.5px] ${
            item.completed
              ? "bg-teal/10 border-teal/30 text-teal"
              : "bg-cloud text-ink border-line hover:bg-slate-100"
          }`}
        >
          {item.completed ? (
            <CheckCircle2 size={19} className="text-teal" />
          ) : (
            <Circle size={19} className="text-slate" />
          )}
          <span>{item.completed ? "Actividad completada" : "Marcar como realizada"}</span>
        </button>

        {/* Google Maps link if has coords */}
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-3.5 bg-cloud border border-line text-left hover:bg-slate-100 transition-colors active:scale-[0.99]"
          >
            <Navigation size={16} style={{ color: accentColor }} />
            <span className="text-[13px] font-semibold text-ink flex-1">Abrir en Google Maps</span>
            <ExternalLink size={14} className="text-slate" />
          </a>
        )}

        {/* Quick note input */}
        <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-3.5 bg-cloud border border-line focus-within:border-ink focus-within:bg-white transition-all">
          <span className="text-gold text-[15px]">✦</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota rápida (ej: entrada reservada para las 10:00)"
            className="w-full bg-transparent text-[13px] outline-none text-ink italic font-medium"
          />
        </div>

        {/* Location Section */}
        <div className="mb-3.5">
          {editingPlace ? (
            <div className="rounded-2xl bg-white border border-line p-3 shadow-soft">
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-cloud border border-line">
                  <MapPin size={15} className="text-slate shrink-0" />
                  <input
                    ref={placeInputRef}
                    value={placeDraft}
                    onChange={(e) => { setPlaceDraft(e.target.value); setPlaceCoords(null); }}
                    placeholder="Escribe el nombre del lugar..."
                    className="w-full bg-transparent text-[13px] outline-none text-ink font-medium"
                  />
                  {placeDraft && (
                    <button
                      onClick={() => { setPlaceDraft(""); setPlaceCoords(null); setPlaceSuggestions([]); }}
                      className="shrink-0 text-slate hover:text-ink"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {placeSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-card z-20 overflow-hidden border border-line max-h-[160px] overflow-y-auto">
                    {placeSuggestions.map((s) => (
                      <button
                        key={s.place_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaceDraft(s.display_name.split(",").slice(0, 2).join(","));
                          setPlaceCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                          setPlaceSuggestions([]);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-[12px] text-ink hover:bg-cloud border-b border-line last:border-0 font-medium transition-colors"
                      >
                        {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {placeSearching && <p className="text-[11px] text-slate mt-1.5 font-medium animate-pulse">Buscando coordenadas...</p>}
              {placeCoords && <p className="text-[11px] text-teal mt-1.5 font-semibold">✓ Ubicación y coordenadas fijadas</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSavePlace}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-white px-3.5 py-2 rounded-xl active:scale-95 transition-transform"
                  style={{ background: accentColor }}
                >
                  <CheckCircle2 size={13} /> Guardar lugar
                </button>
                {(item.place || item.lat) && (
                  <button
                    onClick={handleClearPlace}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-coral px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} /> Borrar
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingPlace(false);
                    setPlaceDraft(item.place || "");
                    setPlaceCoords(null);
                    setPlaceSuggestions([]);
                  }}
                  className="text-[12px] font-medium text-slate px-3 py-2 rounded-xl hover:bg-cloud transition-colors"
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
              className="w-full flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-cloud border border-line text-left hover:bg-slate-100 transition-colors active:scale-[0.99]"
            >
              <MapPin size={16} style={{ color: accentColor }} />
              <span className={`text-[13px] font-medium flex-1 ${item.place ? "text-ink font-semibold" : "text-slate"}`}>
                {item.place || "Añadir o cambiar ubicación"}
              </span>
              <Pencil size={13} className="text-slate" />
            </button>
          )}
        </div>

        {/* Time Picker */}
        <div className="mb-3.5">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
            Hora programada
          </label>
          <TimePicker value={time} onChange={setTime} accentColor={accentColor} />
        </div>

        {/* Activity Photo */}
        <div className="mb-3.5">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
            Foto de la actividad
          </label>
          {item.image ? (
            <div className="relative rounded-2xl overflow-hidden shadow-soft border border-line">
              <img
                src={item.image}
                alt=""
                className="w-full h-44 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setLightboxImg(item.image)}
              />
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="absolute bottom-2.5 right-2.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white bg-black/60 backdrop-blur-xs hover:bg-black/80 transition-colors"
              >
                {uploading ? "Subiendo..." : "Cambiar foto"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="w-full h-24 rounded-2xl border-2 border-dashed border-line hover:border-slate/40 bg-cloud/50 flex flex-col items-center justify-center gap-1 text-slate hover:text-ink active:scale-[0.99] transition-all"
            >
              <ImagePlus size={20} className="text-slate/70" />
              <span className="text-[12px] font-medium">
                {uploading ? "Subiendo..." : "Añadir foto desde tu dispositivo"}
              </span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        </div>

        {/* Tickets / Attachments Section */}
        <div className="mb-3.5">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1.5 block">
            Entradas / tickets / documentos
          </label>
          {ticketImages.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {ticketImages.map((ticket, idx) =>
                ticket.type === "application/pdf" ? (
                  <div key={idx} className="relative w-36 rounded-2xl border border-line bg-cloud p-3 flex flex-col items-center justify-center text-center shadow-xs">
                    <button onClick={() => openTicket(ticket)} className="w-full flex flex-col items-center gap-1.5" title="Abrir PDF">
                      <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center text-coral">
                        <FileText size={20} />
                      </div>
                      <span className="text-[11px] font-semibold text-ink truncate w-full">{ticket.name}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveTicket(idx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-line bg-white shadow-xs">
                    <img
                      src={ticket.url}
                      alt={`Ticket ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxImg(ticket.url)}
                    />
                    <button
                      onClick={() => handleRemoveTicket(idx)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )
              )}
              <button
                onClick={() => ticketInputRef.current && ticketInputRef.current.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-1 text-slate hover:text-ink active:scale-95 transition-all bg-cloud/50"
              >
                <ImagePlus size={18} />
                <span className="text-[10.5px] font-medium">+ Añadir</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => ticketInputRef.current && ticketInputRef.current.click()}
              className="w-full h-20 rounded-2xl border-2 border-dashed border-line flex items-center justify-center gap-2 text-slate hover:text-ink active:scale-[0.99] transition-all bg-cloud/50"
            >
              <ImagePlus size={18} />
              <span className="text-[12.5px] font-medium">
                {uploading ? "Subiendo..." : "Añadir entrada, PDF o reserva"}
              </span>
            </button>
          )}
          <input ref={ticketInputRef} type="file" accept="image/*,application/pdf,.pdf" multiple className="hidden" onChange={handleTicketPick} />
        </div>

        {/* Detailed Notes */}
        <div className="mb-4">
          <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
            {detailLabel}
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={item.type === "flight" ? "Nº de vuelo, localizador, terminal..." : "Detalles, indicaciones, notas..."}
            className="w-full rounded-2xl p-3.5 text-[13.5px] outline-none min-h-[90px] bg-cloud text-ink border border-line focus:border-ink focus:bg-white transition-all font-normal"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="flex items-center justify-center gap-1.5 rounded-2xl py-3.5 px-4 text-[13px] font-semibold bg-coral/10 text-coral hover:bg-coral hover:text-white transition-colors active:scale-95"
            >
              <Trash2 size={15} /> <span>Eliminar</span>
            </button>
          )}
          <button
            onClick={() => { onUpdate({ title: titleDraft, details, time, note }); onClose(); }}
            className="flex-1 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-card active:scale-[0.98] transition-all"
            style={{ background: accentColor }}
          >
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightboxImg(null)}>
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
          <img src={lightboxImg} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
