"use client";

import { useRef, useState, useEffect } from "react";
import { Bed, MapPin, X, Trash2, FileText, Download, Check, ExternalLink, Paperclip } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import { useToast } from "./Toast";
import DatePicker from "./DatePicker";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (mismo límite que storage.rules)

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

export default function HotelDetailSheet({ hotel, accentColor = "#0B0F19", onClose, onUpdate, onDelete }) {
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
      addToast("El archivo es demasiado grande (máx 10 MB)", "warning");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await compressImage(picked, { maxWidth: 800, quality: 0.6 });
      let url = dataUrl;
      if (firebaseReady) {
        try {
          url = await uploadImageToFirebase(dataUrl, `hotels/${hotel.id}-${Date.now()}-${picked.name}`);
        } catch {
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
    addToast("Hotel actualizado correctamente", "success");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-scrim/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div
        className="relative bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-sheet z-10 max-h-[90vh] flex flex-col overflow-hidden pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-line rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ background: `${accentColor}18` }}
            >
              <Bed size={20} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ink font-display">Editar alojamiento</h2>
              <p className="text-[12px] text-slate font-medium">Información y reservas de tu estancia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-ink hover:bg-cloud transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Nombre del hotel</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Hotel Gran Vía"
              className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Dirección o ciudad</label>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-surface">
                <MapPin size={16} className="text-slate shrink-0" />
                <input
                  value={place}
                  onChange={(e) => { setPlace(e.target.value); setCoords(null); }}
                  placeholder="Dirección o ciudad"
                  className="w-full bg-transparent text-[14px] outline-none text-ink font-medium"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface rounded-2xl shadow-xl z-20 overflow-hidden border border-line">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => pickSuggestion(s)}
                      className="w-full text-left px-4 py-2.5 text-[12.5px] text-ink hover:bg-cloud border-b border-line last:border-0 font-medium"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-[11px] text-slate mt-1 ml-2">Buscando lugar...</p>}
              {coords && <p className="text-[11px] text-teal font-semibold mt-1 ml-2">✓ Ubicación confirmada</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Check-in</label>
              <DatePicker
                value={checkinDate}
                onChange={setCheckinDate}
                accentColor={accentColor}
                placeholder="Entrada"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Check-out</label>
              <DatePicker
                value={checkoutDate}
                onChange={setCheckoutDate}
                accentColor={accentColor}
                placeholder="Salida"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Enlace de reserva</label>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-surface">
              <ExternalLink size={16} className="text-slate shrink-0" />
              <input
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://booking.com/..."
                className="w-full bg-transparent text-[13.5px] outline-none text-ink font-medium"
              />
            </div>
          </div>

          {/* Fichero de la reserva */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">PDF o comprobante de la reserva</label>
            {file ? (
              <div className="flex items-center gap-2 bg-cloud rounded-2xl px-4 py-3 border border-line">
                <button
                  onClick={openFile}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:bg-surface rounded-xl px-2 py-1 transition-colors"
                >
                  <FileText size={16} className="text-slate shrink-0" />
                  <span className="flex-1 text-[13px] font-semibold text-ink truncate">{file.name}</span>
                </button>
                <button onClick={downloadFile} className="p-2 hover:bg-surface rounded-xl shrink-0 text-teal transition-colors" title="Descargar">
                  <Download size={15} />
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="p-2 hover:bg-surface rounded-xl shrink-0 text-coral transition-colors"
                  title="Eliminar archivo"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
                className="w-full h-16 rounded-2xl border-2 border-dashed border-line flex items-center justify-center gap-2 text-slate hover:text-ink hover:border-slate/40 transition-colors bg-cloud/50 font-medium"
              >
                <Paperclip size={16} />
                <span className="text-[13px]">{uploading ? "Procesando comprobante..." : "Adjuntar PDF o voucher"}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFilePick} />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Nº de reserva / comentarios</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Código de confirmación, instrucciones de llegada o notas..."
              rows={3}
              className="w-full rounded-2xl p-4 text-[13.5px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface resize-none font-medium"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-line bg-cloud/40 flex items-center gap-3 shrink-0">
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-[13.5px] font-bold bg-surface text-coral border border-coral/30 hover:bg-coral/10 active:scale-95 transition-all shadow-xs"
            >
              <Trash2 size={16} />
              <span>Eliminar</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 rounded-2xl py-3.5 text-[14.5px] font-bold text-white shadow-soft active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: accentColor }}
          >
            <Check size={16} />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
