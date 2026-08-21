"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Sparkles, Clock, Compass, Utensils, Flag, BedDouble, Plane } from "lucide-react";
import TimePicker from "./TimePicker";

const TYPES = [
  { key: "sight", label: "Lugar", icon: Compass },
  { key: "food", label: "Comida", icon: Utensils },
  { key: "activity", label: "Plan", icon: Flag },
  { key: "stay", label: "Hotel", icon: BedDouble },
  { key: "flight", label: "Transporte", icon: Plane },
];

export default function AddActivitySheet({ onClose, onSave, onAddActivity, accentColor = "#0B0F19", stampColor }) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("activity");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const effectiveAccent = accentColor || stampColor || "#0B0F19";
  const saveCallback = onSave || onAddActivity || (() => {});

  // Busca el lugar en Nominatim (geocoding de OpenStreetMap) con un pequeño
  // debounce, para poder guardar coordenadas reales sin que el usuario las
  // escriba a mano.
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
          `https://nominatim.openstreetmap.org/search?format=json&limit=4&q=${encodeURIComponent(place)}`
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
  }, [place, coords]);

  function pickSuggestion(s) {
    setPlace(s.display_name.split(",").slice(0, 2).join(","));
    setCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setSuggestions([]);
  }

  async function handleSave() {
    if (!title.trim()) return;
    let finalCoords = coords;
    if (!finalCoords && place.trim().length >= 3) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          finalCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    }
    saveCallback({
      id: `n${Date.now()}`,
      title: title.trim(),
      place: place.trim(),
      time: time || "--:--",
      type,
      note: note.trim() || undefined,
      ...(finalCoords ? { lat: finalCoords.lat, lng: finalCoords.lng } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative rounded-t-[32px] px-6 pt-3 pb-8 z-10 bg-surface max-h-[90%] overflow-y-auto max-w-lg mx-auto w-full shadow-2xl border-t border-line">
        {/* Drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate/20 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Sparkles size={16} />
            </div>
            <h2 className="text-[19px] font-bold text-ink font-display">Nueva actividad</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cloud flex items-center justify-center text-slate hover:text-ink active:scale-95 transition-transform"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const isSelected = type === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold shrink-0 transition-all flex items-center gap-1.5 active:scale-95 ${
                  isSelected
                    ? "text-white shadow-sm"
                    : "bg-cloud text-slate hover:text-ink border border-line"
                }`}
                style={{
                  background: isSelected ? effectiveAccent : undefined,
                }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
              Actividad
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué vas a hacer? (ej: Visitar Templo Senso-ji)"
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
                Hora
              </label>
              <TimePicker value={time} onChange={setTime} accentColor={effectiveAccent} />
            </div>

            <div className="relative">
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
                Lugar
              </label>
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-cloud border border-line focus-within:border-ink focus-within:bg-surface transition-all">
                <MapPin size={15} className="text-slate/70 shrink-0" />
                <input
                  value={place}
                  onChange={(e) => {
                    setPlace(e.target.value);
                    setCoords(null);
                  }}
                  placeholder="Ubicación"
                  className="w-full bg-transparent text-[13.5px] outline-none text-ink font-medium"
                />
              </div>

              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface rounded-2xl shadow-card z-20 overflow-hidden border border-line">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => pickSuggestion(s)}
                      className="w-full text-left px-3.5 py-2.5 text-[12px] text-ink hover:bg-cloud border-b border-line last:border-0 font-medium transition-colors"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">
              Notas adicionales
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detalles, reservas, tickets o consejos (opcional)"
              className="w-full rounded-xl px-4 py-3 text-[13.5px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-surface transition-all"
            />
          </div>

          {coords && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal/10 text-teal text-[11.5px] font-semibold">
              <span>✓ Ubicación fijada — aparecerá en el mapa del día</span>
            </div>
          )}
          {searching && (
            <p className="text-[11.5px] text-slate font-medium animate-pulse">Buscando sugerencias de ubicación...</p>
          )}
        </div>

        <button
          disabled={!title.trim()}
          onClick={handleSave}
          className="w-full mt-6 rounded-2xl py-3.5 text-[15px] font-bold text-white shadow-card active:scale-[0.98] transition-all"
          style={{ background: effectiveAccent, opacity: title.trim() ? 1 : 0.5 }}
        >
          Agregar al itinerario
        </button>
      </div>
    </div>
  );
}
