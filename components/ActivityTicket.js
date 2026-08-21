"use client";

import { useState } from "react";
import { Utensils, Camera, Plane, Bed, Sparkles, MapPin, ChevronRight, Navigation, CheckCircle2, Circle, X, FileText } from "lucide-react";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

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

function normalizeTicket(t) {
  if (t && typeof t === "object") {
    return { url: t.url, name: t.name || "Entrada", type: t.type || "application/pdf" };
  }
  const url = String(t || "");
  return { url, name: "Entrada", type: isPdfUrl(url) ? "application/pdf" : "image/jpeg" };
}

export default function ActivityTicket({ item, onClick, onToggleCompleted }) {
  const [lightboxImg, setLightboxImg] = useState(null);
  const Icon = ICONS[item.type] || Sparkles;
  const hasCoords = item.lat && item.lng;

  const ticketImages = (Array.isArray(item.ticketImages)
    ? item.ticketImages
    : item.ticketImage
      ? [item.ticketImage]
      : []).map(normalizeTicket);

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

  return (
    <div className="mb-2.5">
      {item.travel && (
        <div className="flex items-center gap-1.5 text-[11.5px] font-medium mb-1.5 pl-3 text-slate">
          <Navigation size={12} className="text-teal" />
          <span>{item.travel}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Completed checkbox */}
        {onToggleCompleted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(item.id, !item.completed);
            }}
            className="shrink-0 w-10 h-10 -ml-1 flex items-center justify-center rounded-full active:scale-90 transition-transform text-slate hover:text-ink"
            aria-label={item.completed ? "Marcar como pendiente" : "Marcar como hecho"}
          >
            {item.completed ? (
              <CheckCircle2 size={22} className="text-teal fill-teal/10" />
            ) : (
              <Circle size={22} className="text-slate/40 hover:text-slate transition-colors" />
            )}
          </button>
        )}

        <button
          onClick={onClick}
          className="w-full text-left flex rounded-2xl overflow-hidden shadow-soft hover:shadow-card bg-surface border border-line transition-all active:scale-[0.99] group"
        >
          {/* Time & icon block */}
          <div className="w-[72px] shrink-0 flex flex-col items-center justify-center gap-1.5 py-3 px-1.5 bg-[#0B0F19]">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon size={15} className="text-gold" />
            </div>
            <span className="text-[11px] font-semibold tracking-tight font-mono text-[#F5F1E8]">
              {item.time || "--:--"}
            </span>
          </div>

          <div className="ticket-divider" />

          {/* Activity body */}
          <div className="flex-1 min-w-0 px-3.5 py-3 flex items-center gap-2.5">
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold text-[14.5px] text-ink font-display truncate leading-snug transition-all ${
                  item.completed ? "line-through text-slate opacity-60" : ""
                }`}
              >
                {item.title}
              </p>
              {item.place && (
                <p className="text-[12px] flex items-center gap-1 mt-0.5 text-slate truncate">
                  <MapPin size={11} className="shrink-0 text-slate/70" />
                  <span className="truncate">{item.place}</span>
                </p>
              )}
              {item.note && (
                <p className="text-[11px] font-medium text-coral/90 mt-1 truncate">
                  ✦ {item.note}
                </p>
              )}
            </div>

            {/* Attached Image Thumbnail */}
            {item.image && (
              <img
                src={item.image}
                alt=""
                className="w-12 h-12 rounded-xl object-cover shrink-0 cursor-pointer border border-line shadow-xs hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImg(item.image);
                }}
              />
            )}

            {/* Ticket / PDF Document Icon */}
            {ticketImages.length > 0 && (
              ticketImages[0].type === "application/pdf" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTicket(ticketImages[0]);
                  }}
                  className="w-11 h-11 rounded-xl bg-coral/10 border border-coral/30 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-coral/20 transition-colors"
                  title={ticketImages[0].name}
                  aria-label="Abrir PDF de la entrada"
                >
                  <FileText size={16} className="text-coral" />
                  <span className="text-[8.5px] font-bold text-coral leading-none mt-0.5">PDF</span>
                </button>
              ) : (
                <img
                  src={ticketImages[0].url}
                  alt="Ticket"
                  className="w-11 h-11 rounded-xl object-cover shrink-0 cursor-pointer border border-gold/40 shadow-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImg(ticketImages[0].url);
                  }}
                />
              )
            )}

            {ticketImages.length > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold/15 text-gold shrink-0">
                +{ticketImages.length - 1}
              </span>
            )}

            <ChevronRight size={16} className="text-slate/40 shrink-0 group-hover:text-ink transition-colors" />
          </div>
        </button>

        {/* Google Maps quick link */}
        {hasCoords && (
          <a
            href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-surface border border-line text-teal shadow-soft hover:bg-teal/10 active:scale-95 transition-all"
            aria-label="Abrir en Google Maps"
          >
            <Navigation size={15} />
          </a>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={lightboxImg}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
