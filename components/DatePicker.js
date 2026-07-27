"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

function parseDisplayDate(str) {
  if (!str) return null;
  const parts = str.trim().toLowerCase().split(" ");
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const mi = MONTH_SHORT.indexOf(parts[1]);
  if (isNaN(day) || mi < 0) return null;
  return { day, month: mi };
}

function toDisplayDate(day, month) {
  return `${day} ${MONTH_SHORT[month]}`;
}

export default function DatePicker({ value, onChange, accentColor, placeholder = "Seleccionar fecha" }) {
  const [open, setOpen] = useState(false);
  const parsed = parseDisplayDate(value);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : now.getMonth());
  const [viewYear, setViewYear] = useState(parsed ? now.getFullYear() : now.getFullYear());

  const firstDay = new Date(viewYear, viewMonth, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function pickDay(d) {
    if (!d) return;
    onChange(toDisplayDate(d, viewMonth));
    setOpen(false);
  }

  const isSelected = parsed && parsed.month === viewMonth;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line text-left"
      >
        <Calendar size={14} className="text-slate shrink-0" />
        <span className={`text-[13px] flex-1 ${value ? "text-ink" : "text-slate"}`}>
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-line z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-cloud">
              <ChevronLeft size={16} className="text-muted" />
            </button>
            <p className="text-[13px] font-semibold text-ink">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-cloud">
              <ChevronRight size={16} className="text-muted" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_LETTERS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-slate py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              const selected = d && isSelected && parsed && parsed.day === d;
              const today = d && viewMonth === now.getMonth() && viewYear === now.getFullYear() && d === now.getDate();
              return (
                <button
                  key={i}
                  onClick={() => pickDay(d)}
                  disabled={!d}
                  className="aspect-square flex items-center justify-center rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: selected ? accentColor : today ? `${accentColor}15` : "transparent",
                    color: selected ? "white" : today ? accentColor : d ? "#333" : "transparent",
                  }}
                >
                  {d || ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
