"use client";

import { useState } from "react";
import { Bed, MapPin, ExternalLink, Calendar, Navigation, Pencil, Check, X } from "lucide-react";

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
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("booking.com")) {
      const deepLink = url.replace(/^https?:\/\//, "booking://");
      window.location.href = deepLink;
      setTimeout(() => { window.open(url, "_blank"); }, 2000);
    } else if (host.includes("airbnb.com")) {
      const deepLink = url.replace(/^https?:\/\//, "airbnb://");
      window.location.href = deepLink;
      setTimeout(() => { window.open(url, "_blank"); }, 2000);
    } else {
      window.open(url, "_blank");
    }
  } catch {
    window.open(url, "_blank");
  }
}

export default function HotelSection({ trip, accentColor, onUpdateTrip }) {
  const [editingUrl, setEditingUrl] = useState(null);
  const [urlDraft, setUrlDraft] = useState("");

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
    const checkin = parseDateFromLabel(h.dayDate);
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

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `${accentColor}18` }}
        >
          <Bed size={28} style={{ color: accentColor }} />
        </div>
        <p className="text-[14px] text-slate text-center">
          Añade hoteles en tu itinerario (actividad tipo &ldquo;Hotel&rdquo;)
        </p>
      </div>
    );
  }

  return (
    <div className="px-1 py-2">
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
              {currentHotel.bookingUrl && (
                <ExternalLink size={16} style={{ color: accentColor }} />
              )}
            </div>
            <p className="text-[12px] text-muted">{currentHotel.dayLabel} · {currentHotel.dayDate}</p>
            {currentHotel.bookingUrl && (
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: accentColor }}>
                Toca para abrir en Booking/Airbnb →
              </p>
            )}
          </button>
        </div>
      )}

      <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">
        Todos los hoteles ({hotels.length})
      </p>

      <div className="flex flex-col gap-2">
        {hotels.map((hotel) => {
          const isCurrent = currentHotel && hotel.id === currentHotel.id;
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
                  <p className="text-[11px] text-muted flex items-center gap-1 mt-1">
                    <Calendar size={10} /> {hotel.dayLabel} · {hotel.dayDate}
                  </p>
                </div>
                {isCurrent && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: `${accentColor}20`, color: accentColor }}
                  >
                    Actual
                  </span>
                )}
              </div>

              {editingUrl === hotel.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    autoFocus
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder="Pega el enlace de Booking o Airbnb"
                    className="flex-1 rounded-lg px-3 py-2 text-[12px] outline-none bg-white border border-line text-ink"
                  />
                  <button onClick={() => handleSaveUrl(hotel)} className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center shrink-0">
                    <Check size={13} className="text-teal" />
                  </button>
                  <button onClick={() => setEditingUrl(null)} className="w-8 h-8 rounded-full bg-cloud flex items-center justify-center shrink-0">
                    <X size={13} className="text-slate" />
                  </button>
                </div>
              ) : (
                <div className="mt-2.5 flex items-center gap-2">
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
                    onClick={() => startEditUrl(hotel)}
                    className="p-1.5 rounded-lg hover:bg-cloud"
                    title="Editar enlace"
                  >
                    <Pencil size={12} className="text-line" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
