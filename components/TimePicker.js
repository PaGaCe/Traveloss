"use client";

import { useRef } from "react";
import { Clock } from "lucide-react";

export default function TimePicker({ value, onChange, accentColor }) {
  const inputRef = useRef(null);

  function handleClick() {
    if (inputRef.current) {
      inputRef.current.showPicker?.();
      inputRef.current.click();
    }
  }

  function handleChange(e) {
    onChange(e.target.value || "");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label={value || "Seleccionar hora"}
        className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3.5 bg-white border border-line text-left min-h-[48px]"
      >
        <Clock size={18} className="text-slate shrink-0" />
        <span className={`text-[15px] font-medium flex-1 ${value ? "text-ink" : "text-slate"}`}>
          {value || "Hora"}
        </span>
      </button>

      <input
        ref={inputRef}
        type="time"
        value={value || ""}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-hidden="true"
        tabIndex={-1}
        style={{ colorScheme: "light" }}
      />
    </div>
  );
}
