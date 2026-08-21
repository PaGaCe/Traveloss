"use client";

import { useState, useEffect, useRef } from "react";
import { Bed, MapPin, ExternalLink, Calendar, Navigation, Pencil, X, Plus, FileText, Download, Trash2, ChevronRight } from "lucide-react";
import DatePicker from "./DatePicker";
import HotelDetailSheet from "./HotelDetailSheet";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import { useToast } from "./Toast";

function parseDateFromLabel(label) {
  if (!label) return null;
  const months = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
  };
  const parts = label.toLowerCase().split(" ");
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const m = months[parts[1]];
    if (!isNaN(day) && m !== undefined) {
      const d = new Date(new Date().getFullYear(), m, day);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function openBookingLink(url) {
  if (!url) return;
  try {
    new URL(url);
    window.open(url, "_blank");
  } catch {
    window.open(url, "_blank");
  }
}

function formatStayDates(hotel) {
  const ci = hotel.checkinDate;
  const co = hotel.checkoutDate;
  if (ci && co) return `${ci} → ${co}`;
  if (ci) return `Check-in: ${ci}`;
  return null;
}

export default function HotelSection({ trip, accentColor = "#0B0F19", onUpdateTrip }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [newCoords, setNewCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newCheckinDate, setNewCheckinDate] = useState("");
  const [newCheckoutDate, setNewCheckoutDate] = useState("");
  const [newBookingUrl, setNewBookingUrl] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editHotelId, setEditHotelId] = useState(null);
  const addToast = useToast();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (newPlace.trim().length < 3 || newCoords) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(newPlace)}`
        );
        const data = await res.json();
        if (!cancelled) setSuggestions(data);
      } catch (err) {
        console.error("Error buscando el lugar:", err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [newPlace, newCoords]);

  function pickSuggestion(s) {
    setNewPlace(s.display_name.split(",").slice(0, 2).join(","));
    setNewCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setSuggestions([]);
  }

  const hotels = [];
  for (const d of trip.days || []) {
    for (const item of (d.items || [])) {
      if (item.type === "stay") {
        hotels.push({ ...item, dayLabel: d.label, dayDate: d.date, dayId: d.id });
      }
    }
  }

  // Orden automático por fecha de check-in (o la fecha del día si no tiene);
  // los que no tienen fecha válida van al final. Desempate por check-out.
  // El sort es estable: a igualdad se conserva el orden original de días.
  hotels.sort((a, b) => {
    const da = parseDateFromLabel(a.checkinDate || a.dayDate);
    const dbb = parseDateFromLabel(b.checkinDate || b.dayDate);
    if (!da && !dbb) return 0;
    if (!da) return 1;
    if (!dbb) return -1;
    if (da.getTime() !== dbb.getTime()) return da.getTime() - dbb.getTime();
    const ca = parseDateFromLabel(a.checkoutDate || "");
    const cb = parseDateFromLabel(b.checkoutDate || "");
    if (ca && cb && ca.getTime() !== cb.getTime()) return ca.getTime() - cb.getTime();
    return 0;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentHotel = null;
  for (const h of hotels) {
    const dateStr = h.checkinDate || h.dayDate;
    const checkin = parseDateFromLabel(dateStr);
    if (checkin && checkin <= today) {
      currentHotel = h;
    }
  }

  function handleUpdateHotel(hotelId, updates) {
    const updatedDays = trip.days.map((d) => ({
      ...d,
      items: d.items.map((item) =>
        item.id === hotelId ? { ...item, ...updates } : item
      ),
    }));
    onUpdateTrip({ days: updatedDays });
  }

  function handleDeleteHotel(hotelId) {
    const updatedDays = trip.days.map((d) => ({
      ...d,
      items: d.items.filter((item) => item.id !== hotelId),
    }));
    onUpdateTrip({ days: updatedDays });
    addToast("Hotel eliminado", "info");
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

  function openBookingFile(file) {
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

  function downloadBookingFile(file) {
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

  async function handleNewFilePick(e) {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    if (picked.size > 10 * 1024 * 1024) {
      addToast("El archivo es demasiado grande (máx 10 MB)", "warning");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadingFile(true);
    try {
      const dataUrl = await compressImage(picked, { maxWidth: 800, quality: 0.6 });
      setNewFile({
        name: picked.name,
        url: dataUrl,
        type: picked.type || (picked.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
        addedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
      addToast("No se pudo leer el archivo", "error");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function findDayForDate(dateStr) {
    if (!dateStr) return trip.days[0]?.id || "";
    const target = parseDateFromLabel(dateStr);
    if (!target) return trip.days[0]?.id || "";
    let bestId = trip.days[0]?.id || "";
    let bestDiff = Infinity;
    for (const d of trip.days) {
      const dayDate = parseDateFromLabel(d.date);
      if (!dayDate) continue;
      const diff = Math.abs(dayDate.getTime() - target.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        bestId = d.id;
      }
    }
    return bestId;
  }

  async function handleAddHotel() {
    if (!newTitle.trim()) return;
    const dayId = findDayForDate(newCheckinDate);
    const newId = `n${Date.now()}`;
    let bookingFile = null;
    if (newFile) {
      setUploadingFile(true);
      try {
        if (firebaseReady) {
          try {
            const url = await uploadImageToFirebase(newFile.url, `hotels/${newId}-${Date.now()}-${newFile.name}`);
            bookingFile = { ...newFile, url };
          } catch (storageErr) {
            console.warn("No se pudo subir el archivo a la nube, se guarda localmente:", storageErr);
            bookingFile = newFile;
          }
        } else {
          bookingFile = newFile;
        }
      } finally {
        setUploadingFile(false);
      }
    }
    const newHotel = {
      id: newId,
      title: newTitle.trim(),
      place: newPlace.trim(),
      time: "14:00",
      type: "stay",
      ...(newCheckinDate ? { checkinDate: newCheckinDate } : {}),
      ...(newCheckoutDate ? { checkoutDate: newCheckoutDate } : {}),
      ...(newBookingUrl.trim() ? { bookingUrl: newBookingUrl.trim() } : {}),
      ...(newCoords ? { lat: newCoords.lat, lng: newCoords.lng } : {}),
      ...(bookingFile ? { bookingFile } : {}),
    };
    const updatedDays = trip.days.map((d) =>
      d.id === dayId ? { ...d, items: [...d.items, newHotel] } : d
    );
    onUpdateTrip({ days: updatedDays });
    setNewTitle("");
    setNewPlace("");
    setNewCoords(null);
    setNewCheckinDate("");
    setNewCheckoutDate("");
    setNewBookingUrl("");
    setNewFile(null);
    setShowAdd(false);
    addToast("Hotel guardado correctamente", "success");
  }

  function renderHotelDates(hotel) {
    const formatted = formatStayDates(hotel);
    if (formatted) {
      return (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate bg-cloud px-2.5 py-1 rounded-lg border border-line">
          <Calendar size={12} className="text-slate" /> {formatted}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate bg-cloud px-2.5 py-1 rounded-lg border border-line">
        <Calendar size={12} className="text-slate" /> {hotel.dayLabel} · {hotel.dayDate}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[17px] font-bold text-ink font-display">Alojamientos</h3>
          <p className="text-[12px] text-slate font-medium">Hoteles y estancias registradas</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-[13px] font-bold px-4 py-2.5 rounded-2xl text-white shadow-soft transition-all active:scale-95"
          style={{ background: accentColor }}
        >
          <Plus size={16} />
          <span>Añadir hotel</span>
        </button>
      </div>

      {/* Add Hotel Card */}
      {showAdd && (
        <div className="bg-surface rounded-3xl border border-line p-5 shadow-card animate-fade-in space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <p className="text-[15px] font-bold text-ink font-display">Nuevo alojamiento</p>
            <button onClick={() => setShowAdd(false)} className="p-1 rounded-full hover:bg-cloud text-slate">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Nombre del hotel</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej. Hotel Gran Vía"
                className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Dirección o ciudad</label>
              <div className="relative">
                <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-surface">
                  <MapPin size={16} className="text-slate shrink-0" />
                  <input
                    value={newPlace}
                    onChange={(e) => {
                      setNewPlace(e.target.value);
                      setNewCoords(null);
                    }}
                    placeholder="Buscar ubicación..."
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
                {searching && <p className="text-[11px] text-slate mt-1 ml-2">Buscando dirección...</p>}
                {newCoords && <p className="text-[11px] text-teal font-semibold mt-1 ml-2">✓ Ubicación confirmada</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Check-in</label>
                <DatePicker
                  value={newCheckinDate}
                  onChange={setNewCheckinDate}
                  accentColor={accentColor}
                  placeholder="Entrada"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Check-out</label>
                <DatePicker
                  value={newCheckoutDate}
                  onChange={setNewCheckoutDate}
                  accentColor={accentColor}
                  placeholder="Salida"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Enlace de reserva</label>
              <input
                value={newBookingUrl}
                onChange={(e) => setNewBookingUrl(e.target.value)}
                placeholder="https://booking.com/..."
                className="w-full rounded-2xl px-4 py-3 text-[13.5px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Documento de reserva (PDF)</label>
              {newFile ? (
                <div className="flex items-center gap-2 bg-cloud rounded-2xl px-4 py-3 border border-line">
                  <FileText size={16} className="text-slate shrink-0" />
                  <span className="flex-1 text-[13px] font-semibold text-ink truncate">{newFile.name}</span>
                  <button onClick={() => setNewFile(null)} className="p-1 hover:bg-surface rounded-lg shrink-0" title="Quitar archivo">
                    <X size={15} className="text-slate" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={uploadingFile}
                  className="w-full h-16 rounded-2xl border-2 border-dashed border-line flex items-center justify-center gap-2 text-slate hover:text-ink hover:border-slate/40 transition-colors disabled:opacity-60 bg-cloud/50 font-medium"
                >
                  <FileText size={16} />
                  <span className="text-[12.5px]">{uploadingFile ? "Procesando archivo..." : "Adjuntar PDF o voucher de la reserva"}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleNewFilePick} />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-2xl py-3 text-[14px] font-bold bg-cloud text-slate hover:text-ink border border-line transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddHotel}
              disabled={!newTitle.trim()}
              className="flex-1 rounded-2xl py-3 text-[14px] font-bold text-white shadow-soft transition-all disabled:opacity-50"
              style={{ background: accentColor }}
            >
              Guardar hotel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hotels.length === 0 && !showAdd && (
        <div className="bg-surface rounded-3xl border border-line p-8 flex flex-col items-center justify-center text-center shadow-card">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xs"
            style={{ background: `${accentColor}15` }}
          >
            <Bed size={28} style={{ color: accentColor }} />
          </div>
          <h4 className="text-[16px] font-bold text-ink font-display">Sin hoteles registrados</h4>
          <p className="text-[13px] text-slate mt-1 max-w-xs">
            Añade las reservas de tus estancias para tener a mano check-in, ubicación y documentos.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2.5 rounded-2xl text-[13px] font-bold text-white shadow-soft"
            style={{ background: accentColor }}
          >
            + Añadir primer hotel
          </button>
        </div>
      )}

      {/* Current Hotel banner */}
      {currentHotel && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-teal">Alojamiento actual</span>
          </div>

          <div
            className="rounded-3xl p-5 border-2 text-left shadow-card relative overflow-hidden bg-surface"
            style={{ borderColor: accentColor }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                  style={{ background: `${accentColor}18` }}
                >
                  <Bed size={22} style={{ color: accentColor }} />
                </div>
                <div>
                  <h4 className="text-[16px] font-bold text-ink font-display">{currentHotel.title}</h4>
                  <p className="text-[12.5px] text-slate font-medium flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {currentHotel.place || "Sin dirección fijada"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {currentHotel.lat && currentHotel.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${currentHotel.lat},${currentHotel.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-cloud border border-line hover:bg-cloud text-slate hover:text-ink transition-all shadow-xs"
                    title="Abrir en Google Maps"
                  >
                    <Navigation size={15} style={{ color: accentColor }} />
                  </a>
                )}
                {currentHotel.bookingUrl && (
                  <button
                    onClick={() => openBookingLink(currentHotel.bookingUrl)}
                    className="p-2 rounded-xl bg-cloud border border-line hover:bg-cloud text-slate hover:text-ink transition-all shadow-xs"
                    title="Abrir reserva"
                  >
                    <ExternalLink size={15} style={{ color: accentColor }} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {renderHotelDates(currentHotel)}
            </div>

            {currentHotel.bookingUrl && (
              <button
                onClick={() => openBookingLink(currentHotel.bookingUrl)}
                className="mt-3.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold bg-cloud hover:bg-cloud transition-all border border-line"
                style={{ color: accentColor }}
              >
                <span>Ver reserva online en Booking/Airbnb</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Hotels List */}
      {hotels.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate">
              Lista de estancias ({hotels.length})
            </span>
          </div>

          <div className="space-y-3.5">
            {hotels.map((hotel) => {
              const isCurrent = currentHotel && hotel.id === currentHotel.id;

              return (
                <div
                  key={hotel.id}
                  onClick={() => setEditHotelId(hotel.id)}
                  className={`bg-surface rounded-3xl border p-4 cursor-pointer transition-all active:scale-[0.99] ${
                    isCurrent ? 'border-ink shadow-card' : 'border-line shadow-soft hover:shadow-card hover:border-slate/25'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                      style={{ background: isCurrent ? `${accentColor}18` : "rgb(var(--c-cloud))" }}
                    >
                      <Bed size={19} style={{ color: isCurrent ? accentColor : "rgb(var(--c-slate))" }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[15px] font-bold text-ink font-display">{hotel.title}</h4>
                        {isCurrent && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: `${accentColor}18`, color: accentColor }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
                            Actual
                          </span>
                        )}
                      </div>

                      {hotel.place ? (
                        <p className="text-[12.5px] text-slate font-medium flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={12} className="shrink-0" /> {hotel.place}
                        </p>
                      ) : null}

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {renderHotelDates(hotel)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {hotel.lat && hotel.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${hotel.lat},${hotel.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-cloud hover:bg-cloud text-slate hover:text-ink transition-all active:scale-95"
                          title="Google Maps"
                        >
                          <Navigation size={14} style={{ color: accentColor }} />
                        </a>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditHotelId(hotel.id); }}
                        className="p-2 rounded-xl bg-cloud hover:bg-cloud text-slate hover:text-ink transition-all active:scale-95"
                        title="Editar hotel completo"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Acciones rápidas: solo lectura; la edición vive en el sheet */}
                  {(hotel.bookingUrl || hotel.bookingFile) && (
                    <div className="mt-3 pt-3 border-t border-line flex items-center gap-2 flex-wrap">
                      {hotel.bookingUrl && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openBookingLink(hotel.bookingUrl); }}
                          className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs"
                          style={{ background: `${accentColor}14`, color: accentColor }}
                        >
                          <ExternalLink size={13} />
                          <span>Ver reserva</span>
                        </button>
                      )}
                      {hotel.bookingFile && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openBookingFile(hotel.bookingFile); }}
                            className="flex items-center gap-1.5 min-w-0 max-w-[190px] text-[12px] font-semibold px-3 py-1.5 rounded-xl bg-cloud hover:bg-cloud text-slate hover:text-ink transition-all active:scale-95"
                          >
                            <FileText size={13} className="shrink-0" />
                            <span className="truncate">{hotel.bookingFile.name}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadBookingFile(hotel.bookingFile); }}
                            className="p-1.5 rounded-xl hover:bg-cloud shrink-0 text-teal transition-colors"
                            title="Descargar voucher"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateHotel(hotel.id, { bookingFile: null }); }}
                            className="p-1.5 rounded-xl hover:bg-cloud shrink-0 text-coral transition-colors"
                            title="Eliminar voucher"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Hotel Sheet */}
      {editHotelId && (() => {
        const target = hotels.find((h) => h.id === editHotelId);
        if (!target) return null;
        return (
          <HotelDetailSheet
            hotel={target}
            accentColor={accentColor}
            onClose={() => setEditHotelId(null)}
            onUpdate={(updates) => handleUpdateHotel(target.id, updates)}
            onDelete={() => handleDeleteHotel(target.id)}
          />
        );
      })()}
    </div>
  );
}
