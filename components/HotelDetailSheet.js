"use client";

import { useRef, useState, useEffect } from "react";
import { Bed, MapPin, X, ImagePlus, Trash2, FileText, Download, Check } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import { useToast } from "./Toast";
import DatePicker from "./DatePicker";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

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

export default function HotelDetailSheet({ hotel, accentColor, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(hotel.title || "");
  const [place, setPlace] = useState(hotel.place || "");
  const [coords, setCoords] = useState(hotel.lat ? { lat: hotel.lat, lng: hotel.lng } : null);
  const [checkinDate, setCheckinDate] = useState(hotel.checkinDate || "");
  const [checkoutDate, setCheckoutDate] = useState(hotel.checkoutDate || "");
  const [bookingUrl, setBookingUrl] = useState(hotel.bookingUrl || "");
  const [details, setDetails] = useState(hotel.details || "");
  const [file, setFile] = useState(hotel.bookingFile || null);
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef(null);
  const addToast = useToast();

  useEffect(() => {
    if (place.trim().length < 3 || coords) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(place)}`
        );
        const data = await res.json();
        if (!cancelled) setSuggestions(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [place, coords]);

  function pickSuggestion(s) {
    setPlace(s.display_name.split(",").slice(0, 2).join(","));
    setCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setSuggestions([]);
  }

  async function handleFilePick(e) {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    if (picked.size > MAX_FILE_SIZE) {
      addToast("El archivo es demasiado grande (máx 8 MB)", "warning");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await compressImage(picked, { maxWidth: 800, quality: 0.6 });
      let url = dataUrl;
      if (firebaseReady) {
        try {
          url = await uploadImageToFirebase(dataUrl, `hotels/${hotel.id}-${Date.now()}-${picked.name}`);
        } catch (storageErr) {
          addToast("No se pudo subir el archivo a la nube, se guarda localmente", "warning");
        }
      }
      setFile({
        name: picked.name,
        url,
        type: picked.type || (picked.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
        addedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      addToast("No se pudo leer el archivo", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openFile() {
    if (!file) return;
    if (isDataUrl(file.url)) {
      const blob = dataUrlToBlob(file.url);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      window.open(file.url, "_blank");
    }
  }

  function downloadFile() {
    if (!file) return;
    const a = document.createElement("a");
    if (isDataUrl(file.url)) {
      const blob = dataUrlToBlob(file.url);
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } else {
      a.href = file.url;
      a.download = file.name;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function handleSave() {
    if (!title.trim()) return;
    const updates = { title: title.trim() };
    if (place.trim()) {
      updates.place = place.trim();
      updates.lat = coords ? coords.lat : null;
      updates.lng = coords ? coords.lng : null;
    } else {
      updates.place = null;
      updates.lat = null;
      updates.lng = null;
    }
    updates.checkinDate = checkinDate || null;
    updates.checkoutDate = checkoutDate || null;
    updates.bookingUrl = bookingUrl.trim() || null;
    updates.details = details.trim() || null;
    updates.bookingFile = file || null;
    onUpdate(updates);
    addToast("Hotel actualizado", "success");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative rounded-3xl px-5 pt-5 pb-6 z-10 max-h-[85%] overflow-y-auto bg-cloud max-w-lg mx-4 w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accentColor}22` }}>
              <Bed size={16} style={{ color: accentColor }} />
            </div>
            <h2 className="text-[18px] font-semibold text-ink font-display">Editar hotel</h2>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del hotel"
            className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none bg-white text-ink border border-line"
          />

          <div className="relative">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line">
              <MapPin size={15} className="text-slate shrink-0" />
              <input
                value={place}
                onChange={(e) => { setPlace(e.target.value); setCoords(null); }}
                placeholder="Dirección o ciudad"
                className="w-full bg-transparent text-[13px] outline-none text-ink"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden border border-line">
                {suggestions.map((s) => (
                  <button
                    key={s.place_id}
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-3 py-2 text-[12px] text-ink hover:bg-cloud border-b border-line last:border-0"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
            {searching && <p className="text-[10px] text-slate mt-0.5 ml-1">Buscando lugar...</p>}
            {coords && <p className="text-[10px] text-teal mt-0.5 ml-1">✓ Ubicación fijada</p>}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-muted mb-0.5 block">Check-in</label>
              <DatePicker
                value={checkinDate}
                onChange={setCheckinDate}
                accentColor={accentColor}
                placeholder="Entrada"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-medium text-muted mb-0.5 block">Check-out</label>
              <DatePicker
                value={checkoutDate}
                onChange={setCheckoutDate}
                accentColor={accentColor}
                placeholder="Salida"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <input
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="Enlace Booking / Airbnb (opcional)"
              className="w-full bg-transparent text-[13px] outline-none text-ink"
            />
          </div>

          {/* Fichero de la reserva */}
          <div>
            <label className="text-[10px] font-medium text-muted mb-1 block">PDF de la reserva</label>
            {file ? (
              <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2.5 border border-line">
                <button
                  onClick={openFile}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-cloud rounded-lg px-1.5 py-1 transition-colors"
                >
                  <FileText size={15} className="text-slate shrink-0" />
                  <span className="flex-1 text-[12.5px] text-ink truncate">{file.name}</span>
                </button>
                <button onClick={downloadFile} className="p-1.5 hover:bg-cloud rounded-lg shrink-0" title="Descargar">
                  <Download size={13} className="text-teal" />
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="p-1.5 hover:bg-cloud rounded-lg shrink-0"
                  title="Eliminar archivo"
                >
                  <Trash2 size={13} className="text-coral" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="w-full h-16 rounded-xl border-2 border-dashed border-line flex items-center justify-center gap-1.5 text-slate hover:text-muted transition-colors"
              >
                <ImagePlus size={15} />
                <span className="text-[12px]">{uploading ? "Subiendo..." : "Adjuntar archivo (PDF, imagen...)"}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFilePick} />
          </div>

          <label className="text-[10px] font-medium text-muted block">Nº de reserva / comentarios</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Escribe aquí cualquier detalle extra"
            className="w-full rounded-xl px-4 py-3 text-[13px] outline-none min-h-[70px] bg-white text-ink border border-line"
          />
        </div>

        <div className="flex gap-2 mt-5">
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 text-[13px] font-medium bg-coral text-white"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-opacity flex items-center justify-center gap-1.5"
            style={{ background: accentColor, opacity: title.trim() ? 1 : 0.5 }}
          >
            <Check size={14} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
