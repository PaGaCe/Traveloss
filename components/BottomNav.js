"use client";

import { List, Car, Bed, Languages, Camera } from "lucide-react";

const TABS = [
  { key: "itinerary", icon: List, label: "Itinerario" },
  { key: "car", icon: Car, label: "Coche" },
  { key: "hotels", icon: Bed, label: "Hoteles" },
  { key: "translator", icon: Languages, label: "Traducción" },
  { key: "gallery", icon: Camera, label: "Galería" },
];

export default function BottomNav({ active, onChange, accentColor }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-ink border-t border-white/10">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px]"
              style={{
                color: isActive ? accentColor : "rgba(255,255,255,0.45)",
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              <span
                className="text-[9.5px] font-medium leading-none"
                style={{ fontWeight: isActive ? 600 : 400 }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
