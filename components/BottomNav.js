"use client";

import { List, Car, Bed, Languages, Camera, Utensils } from "lucide-react";

const TABS = [
  { key: "itinerary", icon: List, label: "Itinerario" },
  { key: "car", icon: Car, label: "Coche" },
  { key: "food", icon: Utensils, label: "Comida" },
  { key: "hotels", icon: Bed, label: "Hoteles" },
  { key: "translator", icon: Languages, label: "Traducción" },
  { key: "gallery", icon: Camera, label: "Galería" },
];

export default function BottomNav({ active, onChange, activeTab, onChangeTab, accentColor }) {
  const currentActive = active || activeTab;
  const handleChange = onChange || onChangeTab || (() => {});
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-ink/95 backdrop-blur-xl border-t border-white/10 shadow-2xl transition-all duration-200"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)",
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-between px-3 pt-1.5 pb-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentActive === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleChange(tab.key)}
              className="relative flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-2xl transition-all duration-200 min-w-[50px] active:scale-90"
              style={{
                color: isActive ? (accentColor || "#F59E0B") : "rgba(255,255,255,0.48)",
              }}
              aria-label={tab.label}
            >
              {isActive && (
                <span
                  className="absolute inset-0 rounded-2xl opacity-15 pointer-events-none"
                  style={{ background: accentColor || "#F59E0B" }}
                />
              )}
              <Icon
                size={19}
                strokeWidth={isActive ? 2.4 : 1.75}
                className="transition-transform duration-200 shrink-0"
                style={{
                  transform: isActive ? "translateY(-1px) scale(1.05)" : "scale(1)",
                }}
              />
              <span
                className="text-[10px] tracking-tight leading-none transition-all duration-200 whitespace-nowrap"
                style={{
                  fontWeight: isActive ? 600 : 400,
                  opacity: isActive ? 1 : 0.8,
                }}
              >
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: accentColor || "#F59E0B" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
