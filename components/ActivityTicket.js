"use client";

import { useState } from "react";
import { Utensils, Camera, Plane, Bed, Sparkles, MapPin, ChevronRight, Navigation, CheckCircle2, Circle, X } from "lucide-react";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

export default function ActivityTicket({ item, onClick, onToggleCompleted }) {
  const [lightboxImg, setLightboxImg] = useState(null);
  const Icon = ICONS[item.type] || Sparkles;
  const hasCoords = item.lat && item.lng;

  const ticketImages = Array.isArray(item.ticketImages)
    ? item.ticketImages
    : item.ticketImage
      ? [item.ticketImage]
      : [];

  return (
    <div className="mb-3">
      {item.travel && (
        <div className="flex items-center gap-2 text-[11.5px] mb-2 pl-1 text-slate">
          <Navigation size={12} /> {item.travel}
        </div>
      )}
      <div className="flex items-stretch gap-0">
        {/* Completed checkbox */}
        {onToggleCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompleted(item.id, !item.completed); }}
            className="shrink-0 w-9 flex items-center justify-center"
            aria-label={item.completed ? "Marcar como pendiente" : "Marcar como hecho"}
          >
            {item.completed ? (
              <CheckCircle2 size={20} className="text-teal" />
            ) : (
              <Circle size={20} className="text-line hover:text-slate transition-colors" />
            )}
          </button>
        )}

        <button
          onClick={onClick}
          className="w-full text-left flex rounded-2xl overflow-hidden shadow-sm bg-cloud active:scale-[0.99] transition-transform"
        >
          <div className="w-20 shrink-0 flex flex-col items-center justify-center gap-1 py-3 bg-ink">
            <Icon size={16} className="text-gold" />
            <span className="text-[11px] font-medium tracking-wide font-mono text-[#F5F1E8]">{item.time}</span>
          </div>
          <div className="ticket-divider" />
          <div className="flex-1 px-4 py-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-[15px] text-ink font-display ${item.completed ? "line-through opacity-55" : ""}`}>
                {item.title}
              </p>
              <p className="text-[12.5px] flex items-center gap-1 mt-0.5 text-slate">
                <MapPin size={11} /> {item.place}
              </p>
              {item.note && <p className="text-[11.5px] italic mt-1 text-gold">✦ {item.note}</p>}
            </div>
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image} alt=""
                className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setLightboxImg(item.image); }}
              />
            )}
            {ticketImages.length > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ticketImages[0]} alt="Ticket"
                className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-pointer border border-gold/30"
                onClick={(e) => { e.stopPropagation(); setLightboxImg(ticketImages[0]); }}
              />
            )}
            {ticketImages.length > 1 && (
              <span className="text-[10px] font-bold text-gold shrink-0">+{ticketImages.length - 1}</span>
            )}
            <ChevronRight size={16} className="text-line shrink-0" />
          </div>
        </button>

        {/* Google Maps quick link */}
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-9 flex items-center justify-center"
            aria-label="Abrir en Google Maps"
          >
            <Navigation size={16} className="text-teal hover:scale-110 transition-transform" />
          </a>
        )}
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
