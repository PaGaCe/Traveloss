"use client";

import { useEffect, useState } from "react";
import { X, Clock, MapPin } from "lucide-react";

const TYPES = [
  { key: "sight", label: "Lugar" },
  { key: "food", label: "Comida" },
  { key: "activity", label: "Plan" },
  { key: "stay", label: "Hotel" },
  { key: "flight", label: "Transporte" },
];

export default function AddActivitySheet({ onClose, onSave, accentColor }) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("activity");
  const [coords, setCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

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

  function handleSave() {
    if (!title) return;
    onSave({
      id: `n${Date.now()}`,
      title,
      place,
      time: time || "--:--",
      type,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    });
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-t-3xl px-5 pt-4 pb-8 z-10 bg-white max-h-[88%] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-ink font-display">Nueva actividad</h2>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-medium shrink-0 transition-colors"
              style={{
                background: type === t.key ? accentColor : "#EFF4F8",
                color: type === t.key ? "white" : "#5A6478",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué vas a hacer?"
            className="w-full rounded-xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink"
          />
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud">
              <Clock size={15} className="text-slate" />
              <input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Hora"
                className="w-full bg-transparent text-[14px] outline-none text-ink"
              />
            </div>
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud">
                <MapPin size={15} className="text-slate" />
                <input
                  value={place}
                  onChange={(e) => {
                    setPlace(e.target.value);
                    setCoords(null);
                  }}
                  placeholder="Lugar"
                  className="w-full bg-transparent text-[14px] outline-none text-ink"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden">
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
            </div>
          </div>
          {coords && (
            <p className="text-[11px] text-teal -mt-1">✓ Ubicación fijada — aparecerá en el mapa del día</p>
          )}
          {searching && <p className="text-[11px] text-slate -mt-1">Buscando lugar...</p>}
        </div>

        <button
          disabled={!title}
          onClick={handleSave}
          className="w-full mt-5 rounded-xl py-3.5 text-[15px] font-semibold text-white transition-opacity"
          style={{ background: accentColor, opacity: title ? 1 : 0.5 }}
        >
          Agregar al itinerario
        </button>
      </div>
    </div>
  );
}
