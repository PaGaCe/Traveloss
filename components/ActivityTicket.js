"use client";

import { Utensils, Camera, Plane, Bed, Sparkles, MapPin, ChevronRight, Navigation } from "lucide-react";

const ICONS = { food: Utensils, sight: Camera, flight: Plane, stay: Bed, activity: Sparkles };

export default function ActivityTicket({ item, onClick }) {
  const Icon = ICONS[item.type] || Sparkles;

  return (
    <div className="mb-3">
      {item.travel && (
        <div className="flex items-center gap-2 text-[11.5px] mb-2 pl-1 text-slate">
          <Navigation size={12} /> {item.travel}
        </div>
      )}
      <button
        onClick={onClick}
        className="w-full text-left flex rounded-2xl overflow-hidden shadow-sm bg-white active:scale-[0.99] transition-transform"
      >
        <div className="w-20 shrink-0 flex flex-col items-center justify-center gap-1 py-3 bg-ink">
          <Icon size={16} className="text-gold" />
          <span className="text-[11px] font-medium tracking-wide font-mono text-[#F5F1E8]">{item.time}</span>
        </div>
        <div className="ticket-divider" />
        <div className="flex-1 px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-ink font-display">{item.title}</p>
            <p className="text-[12.5px] flex items-center gap-1 mt-0.5 text-slate">
              <MapPin size={11} /> {item.place}
            </p>
            {item.note && <p className="text-[11.5px] italic mt-1 text-gold">✦ {item.note}</p>}
          </div>
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
          )}
          <ChevronRight size={16} className="text-line shrink-0" />
        </div>
      </button>
    </div>
  );
}
