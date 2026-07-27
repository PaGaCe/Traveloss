"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";

const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function parseDisplayDate(str) {
  if (!str) return null;
  const parts = str.trim().toLowerCase().split(" ");
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const mi = MONTH_SHORT.indexOf(parts[1]);
  if (isNaN(day) || mi < 0) return null;
  return { day, month: mi };
}

function displayToISO(display) {
  const parsed = parseDisplayDate(display);
  if (!parsed) return "";
  const year = new Date().getFullYear();
  const mm = String(parsed.month + 1).padStart(2, "0");
  const dd = String(parsed.day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const month = m - 1;
  return `${d} ${MONTH_SHORT[month]}`;
}

export default function DatePicker({ value, onChange, accentColor, placeholder = "Seleccionar fecha" }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    const iso = e.target.value;
    if (iso) {
      onChange(isoToDisplay(iso));
    } else {
      onChange("");
    }
  }

  function handleClick() {
    if (inputRef.current) {
      inputRef.current.showPicker?.();
      inputRef.current.click();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label={value || placeholder}
        className="w-full flex items-center gap-2.5 rounded-xl px-4 py-3.5 bg-white border border-line text-left min-h-[48px]"
      >
        <Calendar size={18} className="text-slate shrink-0" />
        <span className={`text-[15px] font-medium flex-1 ${value ? "text-ink" : "text-slate"}`}>
          {value || placeholder}
        </span>
      </button>

      <input
        ref={inputRef}
        type="date"
        value={displayToISO(value)}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-hidden="true"
        tabIndex={-1}
        style={{ colorScheme: "light" }}
      />
    </div>
  );
}
