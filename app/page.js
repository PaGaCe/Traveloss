"use client";

import { useState, Fragment } from "react";
import dynamic from "next/dynamic";
import { Plus, MapPin, List, Map as MapIcon } from "lucide-react";
import { useTripStore } from "../lib/useTripStore";
import ActivityTicket from "../components/ActivityTicket";
import ActivityDetailSheet from "../components/ActivityDetailSheet";
import AddActivitySheet from "../components/AddActivitySheet";

// Leaflet necesita `window`, así que el mapa solo se carga en el navegador.
const DayMap = dynamic(() => import("../components/DayMap"), { ssr: false });

export default function HomePage() {
  const { trip, loaded, addDay, renameDay, addActivity, updateActivity, usingFirebase } = useTripStore();

  const [activeDayId, setActiveDayId] = useState(null);
  const [dayView, setDayView] = useState("timeline");
  const [showAdd, setShowAdd] = useState(false);
  const [detailItemId, setDetailItemId] = useState(null);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate text-[13px]">Cargando tu viaje...</p>
      </div>
    );
  }

  const day = trip.days.find((d) => d.id === activeDayId) || trip.days[0];
  const detailItem = day.items.find((i) => i.id === detailItemId);

  function handleAddDay() {
    const newId = addDay();
    setActiveDayId(newId);
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-6 px-2 bg-[#DDE3EC]">
      <div className="relative w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl overflow-hidden min-h-[85vh] flex flex-col">
        {/* header */}
        <div className="px-5 pt-6 pb-4" style={{ background: `linear-gradient(135deg, ${trip.stampColor} 0%, #1B2A4A 100%)` }}>
          <h1 className="text-white text-[24px] font-semibold font-display">{trip.title}</h1>
          <p className="text-white/85 text-[13px] flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {trip.place} · {trip.dateLabel}
          </p>
          <p className="text-white/70 text-[11px] mt-1">
            {usingFirebase ? "☁️ Sincronizado con Firebase" : "💾 Guardado solo en este navegador"}
          </p>
        </div>

        {/* day stamps */}
        <div className="flex gap-3 px-5 py-4 overflow-x-auto bg-white border-b border-line/60">
          {trip.days.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDayId(d.id)}
              className="shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all"
              style={{
                border: `2px dashed ${d.id === day.id ? trip.stampColor : "#C9CFDA"}`,
                color: d.id === day.id ? trip.stampColor : "#8A93A6",
                background: d.id === day.id ? `${trip.stampColor}14` : "transparent",
                transform: d.id === day.id ? "scale(1.06)" : "scale(1)",
              }}
            >
              <span className="text-[10px] font-semibold leading-none">{d.label.split(" ")[1]}</span>
              <span className="text-[9px] leading-none mt-0.5">{d.date.split(" ")[0]}</span>
            </button>
          ))}
          <button
            onClick={handleAddDay}
            className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed border-line text-slate"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* day meta + toggle */}
        <div className="px-5 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] font-medium text-ink">{day.label}</span>
            <span className="text-line">·</span>
            <input
              value={day.date}
              onChange={(e) => renameDay(day.id, e.target.value)}
              className="text-[12.5px] bg-transparent outline-none border-b border-dashed border-line w-24 text-[#5A6478]"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setDayView("timeline")}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-medium flex items-center gap-1"
              style={{
                background: dayView === "timeline" ? trip.stampColor : "#EFF4F8",
                color: dayView === "timeline" ? "white" : "#5A6478",
              }}
            >
              <List size={12} /> Lista
            </button>
            <button
              onClick={() => setDayView("map")}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-medium flex items-center gap-1"
              style={{
                background: dayView === "map" ? trip.stampColor : "#EFF4F8",
                color: dayView === "map" ? "white" : "#5A6478",
              }}
            >
              <MapIcon size={12} /> Mapa
            </button>
          </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24 bg-cloud">
          {dayView === "map" ? (
            <DayMap items={day.items} color={trip.stampColor} />
          ) : day.items.length === 0 ? (
            <p className="text-center text-[13px] mt-10 text-slate">
              Aún no hay planes para este día. Toca “+” para añadir el primero.
            </p>
          ) : (
            day.items.map((item) => (
              <Fragment key={item.id}>
                <ActivityTicket item={item} onClick={() => setDetailItemId(item.id)} />
              </Fragment>
            ))
          )}
        </div>

        {/* floating add button */}
        <button
          onClick={() => setShowAdd(true)}
          className="absolute bottom-6 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: trip.stampColor }}
        >
          <Plus size={22} color="white" />
        </button>

        {showAdd && (
          <AddActivitySheet
            accentColor={trip.stampColor}
            onClose={() => setShowAdd(false)}
            onSave={(activity) => {
              addActivity(day.id, activity);
              setShowAdd(false);
            }}
          />
        )}

        {detailItem && (
          <ActivityDetailSheet
            item={detailItem}
            accentColor={trip.stampColor}
            onClose={() => setDetailItemId(null)}
            onUpdate={(updates) => updateActivity(day.id, detailItem.id, updates)}
          />
        )}
      </div>
    </div>
  );
}
