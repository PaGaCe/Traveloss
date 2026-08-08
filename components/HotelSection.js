"use client";

import { useState, useEffect, useRef } from "react";
import { Bed, MapPin, ExternalLink, Calendar, Navigation, Pencil, Check, X, Plus, FileText, Download, Trash2 } from "lucide-react";
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
      const d = new Date(2026, m, day);
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

export default function HotelSection({ trip, accentColor, onUpdateTrip }) {
  const [editingUrl, setEditingUrl] = useState(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [editingDates, setEditingDates] = useState(null);
  const [checkinDraft, setCheckinDraft] = useState("");
  const [checkoutDraft, setCheckoutDraft] = useState("");
  const [editingPlace, setEditingPlace] = useState(null);
  const [placeDraft, setPlaceDraft] = useState("");
  const [placeCoords, setPlaceCoords] = useState(null);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
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

  useEffect(() => {
    if (placeDraft.trim().length < 3 || placeCoords) {
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
  }, [placeDraft, placeCoords]);

  function pickSuggestion(s) {
    setNewPlace(s.display_name.split(",").slice(0, 2).join(","));
    setNewCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setSuggestions([]);
  }

  const hotels = [];
  for (const d of trip.days) {
    for (const item of (d.items || [])) {
      if (item.type === "stay") {
        hotels.push({ ...item, dayLabel: d.label, dayDate: d.date, dayId: d.id });
      }
    }
  }

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

  function handleSaveUrl(hotel) {
    const updatedDays = trip.days.map((d) => ({
      ...d,
      items: d.items.map((item) =>
        item.id === hotel.id ? { ...item, bookingUrl: urlDraft.trim() || undefined } : item
      ),
    }));
    onUpdateTrip({ days: updatedDays });
    setEditingUrl(null);
    setUrlDraft("");
  }

  function startEditUrl(hotel) {
    setEditingUrl(hotel.id);
    setUrlDraft(hotel.bookingUrl || "");
  }

  function startEditDates(hotel) {
    setEditingDates(hotel.id);
    setCheckinDraft(hotel.checkinDate || hotel.dayDate || "");
    setCheckoutDraft(hotel.checkoutDate || "");
  }

  function startEditPlace(hotel) {
    setEditingPlace(hotel.id);
    setPlaceDraft(hotel.place || "");
    setPlaceCoords(hotel.lat ? { lat: hotel.lat, lng: hotel.lng } : null);
  }

  function handleSavePlace(hotel) {
    const updates = { place: placeDraft.trim() };
    if (placeCoords) {
      updates.lat = placeCoords.lat;
      updates.lng = placeCoords.lng;
    }
    const updatedDays = trip.days.map((d) => ({
      ...d,
      items: d.items.map((item) =>
        item.id === hotel.id ? { ...item, ...updates } : item
      ),
    }));
    onUpdateTrip({ days: updatedDays });
    setEditingPlace(null);
    setPlaceDraft("");
    setPlaceCoords(null);
  }

  function handleSaveDates(hotel) {
    const updates = {};
    if (checkinDraft) updates.checkinDate = checkinDraft;
    if (checkoutDraft) updates.checkoutDate = checkoutDraft;
    const updatedDays = trip.days.map((d) => ({
      ...d,
      items: d.items.map((item) =>
        item.id === hotel.id ? { ...item, ...updates } : item
      ),
    }));
    onUpdateTrip({ days: updatedDays });
    setEditingDates(null);
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
  }

  function renderHotelDates(hotel) {
    const formatted = formatStayDates(hotel);
    if (formatted) {
      return (
        <p className="text-[11px] text-muted flex items-center gap-1 mt-1">
          <Calendar size={10} /> {formatted}
        </p>
      );
    }
    return (
      <p className="text-[11px] text-muted flex items-center gap-1 mt-1">
        <Calendar size={10} /> {hotel.dayLabel} · {hotel.dayDate}
      </p>
    );
  }

  return (
    <div className="px-1 py-2">
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-xl text-white transition-all active:scale-95"
          style={{ background: accentColor }}
        >
          <Plus size={14} />
          Añadir hotel
        </button>
      </div>

      {showAdd && (
        <div className="bg-cloud rounded-2xl border border-line p-4 mb-4">
          <p className="text-[14px] font-semibold text-ink font-display mb-3">Nuevo hotel</p>
          <div className="flex flex-col gap-2.5">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nombre del hotel"
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none bg-white text-ink border border-line"
            />
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line">
                <MapPin size={15} className="text-slate shrink-0" />
                <input
                  value={newPlace}
                  onChange={(e) => {
                    setNewPlace(e.target.value);
                    setNewCoords(null);
                  }}
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
              {newCoords && <p className="text-[10px] text-teal mt-0.5 ml-1">✓ Ubicación fijada</p>}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted mb-0.5 block">Check-in</label>
                <DatePicker
                  value={newCheckinDate}
                  onChange={setNewCheckinDate}
                  accentColor={accentColor}
                  placeholder="Entrada"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted mb-0.5 block">Check-out</label>
                <DatePicker
                  value={newCheckoutDate}
                  onChange={setNewCheckoutDate}
                  accentColor={accentColor}
                  placeholder="Salida"
                />
              </div>
            </div>
            <input
              value={newBookingUrl}
              onChange={(e) => setNewBookingUrl(e.target.value)}
              placeholder="Enlace Booking / Airbnb (opcional)"
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none bg-white text-ink border border-line"
            />
            {newFile ? (
              <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2.5 border border-line">
                <FileText size={14} className="text-slate shrink-0" />
                <span className="flex-1 text-[12.5px] text-ink truncate">{newFile.name}</span>
                <button onClick={() => setNewFile(null)} className="p-1 hover:bg-cloud rounded-lg shrink-0" title="Quitar archivo">
                  <X size={13} className="text-slate" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploadingFile}
                className="w-full h-14 rounded-xl border-2 border-dashed border-line flex items-center justify-center gap-1.5 text-slate hover:text-muted transition-colors disabled:opacity-60"
              >
                <FileText size={14} />
                <span className="text-[12px]">{uploadingFile ? "Procesando..." : "Adjuntar PDF de la reserva (opcional)"}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleNewFilePick} />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-cloud text-slate border border-line"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddHotel}
              disabled={!newTitle.trim()}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-opacity"
              style={{ background: accentColor, opacity: newTitle.trim() ? 1 : 0.5 }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {hotels.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${accentColor}18` }}
          >
            <Bed size={28} style={{ color: accentColor }} />
          </div>
          <p className="text-[14px] text-slate text-center">
            Añade hoteles en tu itinerario o pulsa &ldquo;Añadir hotel&rdquo;
          </p>
        </div>
      )}

      {currentHotel && (
        <div className="mb-4">
          <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">Hotel actual</p>
          <button
            onClick={() => currentHotel.bookingUrl && openBookingLink(currentHotel.bookingUrl)}
            className="w-full rounded-2xl p-4 border-2 text-left transition-all active:scale-[0.98]"
            style={{
              borderColor: accentColor,
              background: `${accentColor}0A`,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${accentColor}20` }}>
                <Navigation size={18} style={{ color: accentColor }} />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-ink">{currentHotel.title}</p>
                <p className="text-[12px] text-slate flex items-center gap-1">
                  <MapPin size={11} /> {currentHotel.place}
                </p>
              </div>
              {currentHotel.lat && currentHotel.lng && (
                <a
                  href={`https://www.google.com/maps?q=${currentHotel.lat},${currentHotel.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-white/60"
                  title="Google Maps"
                >
                  <Navigation size={16} style={{ color: accentColor }} />
                </a>
              )}
              {currentHotel.bookingUrl && (
                <ExternalLink size={16} style={{ color: accentColor }} />
              )}
            </div>
            {renderHotelDates(currentHotel)}
            {currentHotel.bookingUrl && (
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: accentColor }}>
                Toca para abrir en Booking/Airbnb →
              </p>
            )}
          </button>
        </div>
      )}

      {hotels.length > 0 && (
        <>
          <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">
            Todos los hoteles ({hotels.length})
          </p>

          <div className="flex flex-col gap-2">
            {hotels.map((hotel) => {
              const isCurrent = currentHotel && hotel.id === currentHotel.id;
              const isEditingDates = editingDates === hotel.id;
              return (
                <div
                  key={hotel.id}
                  className="bg-cloud rounded-2xl border border-line p-3.5"
                  style={isCurrent ? { borderColor: accentColor, borderWidth: 1.5 } : {}}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: isCurrent ? `${accentColor}20` : "#F4F4F7" }}
                    >
                      <Bed size={15} style={{ color: isCurrent ? accentColor : "#8A90A0" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-ink">{hotel.title}</p>
                      <p className="text-[12px] text-slate flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {hotel.place}
                      </p>
                      {renderHotelDates(hotel)}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {hotel.lat && hotel.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${hotel.lat},${hotel.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-white/60"
                          title="Google Maps"
                        >
                          <Navigation size={13} style={{ color: accentColor }} />
                        </a>
                      )}
                      {isCurrent && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: `${accentColor}20`, color: accentColor }}
                        >
                          Actual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date editing */}
                  {isEditingDates ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-medium text-muted mb-0.5 block">Check-in</label>
                          <DatePicker
                            value={checkinDraft}
                            onChange={setCheckinDraft}
                            accentColor={accentColor}
                            placeholder="Entrada"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-medium text-muted mb-0.5 block">Check-out</label>
                          <DatePicker
                            value={checkoutDraft}
                            onChange={setCheckoutDraft}
                            accentColor={accentColor}
                            placeholder="Salida"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveDates(hotel)}
                          className="flex-1 rounded-xl py-2 text-[12px] font-semibold text-white flex items-center justify-center gap-1"
                          style={{ background: accentColor }}
                        >
                          <Check size={12} /> Guardar fechas
                        </button>
                        <button
                          onClick={() => setEditingDates(null)}
                          className="rounded-xl py-2 px-3 text-[12px] font-medium bg-cloud text-slate border border-line"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : editingPlace === hotel.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="relative">
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-line">
                          <MapPin size={13} className="text-slate shrink-0" />
                          <input
                            autoFocus
                            value={placeDraft}
                            onChange={(e) => {
                              setPlaceDraft(e.target.value);
                              setPlaceCoords(null);
                            }}
                            placeholder="Dirección o ciudad"
                            className="w-full bg-transparent text-[12px] outline-none text-ink"
                          />
                        </div>
                        {placeSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden border border-line">
                            {placeSuggestions.map((s) => (
                              <button
                                key={s.place_id}
                                onClick={() => {
                                  setPlaceDraft(s.display_name.split(",").slice(0, 2).join(","));
                                  setPlaceCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                                  setPlaceSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-2 text-[11px] text-ink hover:bg-cloud border-b border-line last:border-0"
                              >
                                {s.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                        {placeSearching && <p className="text-[10px] text-slate mt-0.5 ml-1">Buscando...</p>}
                        {placeCoords && <p className="text-[10px] text-teal mt-0.5 ml-1">✓ Ubicación fijada</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSavePlace(hotel)}
                          className="flex-1 rounded-xl py-2 text-[12px] font-semibold text-white flex items-center justify-center gap-1"
                          style={{ background: accentColor }}
                        >
                          <Check size={12} /> Guardar dirección
                        </button>
                        <button
                          onClick={() => { setEditingPlace(null); setPlaceCoords(null); }}
                          className="rounded-xl py-2 px-3 text-[12px] font-medium bg-cloud text-slate border border-line"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {hotel.bookingUrl ? (
                        <button
                          onClick={() => openBookingLink(hotel.bookingUrl)}
                          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
                          style={{ background: `${accentColor}15`, color: accentColor }}
                        >
                          <ExternalLink size={12} />
                          Abrir reserva
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditUrl(hotel)}
                          className="flex items-center gap-1 text-[11.5px] text-slate hover:text-muted px-2 py-1 rounded-lg border border-dashed border-line"
                        >
                          <ExternalLink size={11} /> Añadir enlace
                        </button>
                      )}
                      <button
                        onClick={() => startEditDates(hotel)}
                        className="flex items-center gap-1 text-[11.5px] text-slate hover:text-muted px-2 py-1 rounded-lg border border-dashed border-line"
                      >
                        <Calendar size={11} /> Editar fechas
                      </button>
                      <button
                        onClick={() => startEditPlace(hotel)}
                        className="flex items-center gap-1 text-[11.5px] text-slate hover:text-muted px-2 py-1 rounded-lg border border-dashed border-line"
                      >
                        <MapPin size={11} /> Editar dirección
                      </button>
                      <button
                        onClick={() => setEditHotelId(hotel.id)}
                        className="p-1.5 rounded-lg hover:bg-cloud"
                        title="Editar hotel"
                      >
                        <Pencil size={12} className="text-slate" />
                      </button>
                    </div>
                  )}

                  {hotel.bookingFile && (
                    <div className="mt-2.5 flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-2 border border-line">
                      <button
                        onClick={() => openBookingFile(hotel.bookingFile)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-cloud rounded-lg px-1.5 py-1 transition-colors"
                      >
                        <FileText size={13} className="text-slate shrink-0" />
                        <span className="flex-1 text-[12px] text-ink truncate">{hotel.bookingFile.name}</span>
                        <ExternalLink size={11} className="text-slate shrink-0" />
                      </button>
                      <button
                        onClick={() => downloadBookingFile(hotel.bookingFile)}
                        className="p-1.5 hover:bg-cloud rounded-lg shrink-0"
                        title="Descargar"
                      >
                        <Download size={12} className="text-teal" />
                      </button>
                      <button
                        onClick={() => handleUpdateHotel(hotel.id, { bookingFile: null })}
                        className="p-1.5 hover:bg-cloud rounded-lg shrink-0"
                        title="Quitar archivo"
                      >
                        <Trash2 size={11} className="text-coral" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

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
