"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

export default function TimePicker({ value, onChange, accentColor }) {
  const [open, setOpen] = useState(false);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  const parsed = value ? value.split(":") : ["", ""];
  const initH = parsed[0] !== "" ? parseInt(parsed[0], 10) : -1;
  const initM = parsed[1] !== "" ? parseInt(parsed[1], 10) : -1;

  const [selH, setSelH] = useState(initH);
  const [selM, setSelM] = useState(initM);

  const hours = [];
  for (let h = 0; h < 24; h++) hours.push(h);
  const minutes = [];
  for (let m = 0; m < 60; m += 5) minutes.push(m);

  useEffect(() => {
    if (open && hoursRef.current) {
      const idx = selH >= 0 ? selH : 8;
      const itemH = hoursRef.current.children[idx];
      if (itemH) itemH.scrollIntoView({ block: "center" });
    }
  }, [open, selH]);

  useEffect(() => {
    if (open && minutesRef.current) {
      const idx = minutes.indexOf(selM >= 0 ? selM : 0);
      const itemM = minutesRef.current.children[idx >= 0 ? idx : 0];
      if (itemM) itemM.scrollIntoView({ block: "center" });
    }
  }, [open, selM]);

  function handleConfirm() {
    const h = selH >= 0 ? String(selH).padStart(2, "0") : "00";
    const m = selM >= 0 ? String(selM).padStart(2, "0") : "00";
    onChange(`${h}:${m}`);
    setOpen(false);
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line text-left"
      >
        <Clock size={14} className="text-slate shrink-0" />
        <span className={`text-[14px] font-medium flex-1 ${value ? "text-ink" : "text-slate"}`}>
          {value || "Seleccionar hora"}
        </span>
        <ChevronDown size={14} className="text-slate" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-line z-50 p-3">
          <div className="flex gap-3">
            {/* Hours scroll */}
            <div className="flex-1">
              <p className="text-[10px] font-medium text-muted text-center mb-1 uppercase tracking-wide">Hora</p>
              <div
                ref={hoursRef}
                className="h-40 overflow-y-auto rounded-xl border border-line snap-y snap-mandatory"
              >
                {hours.map((h) => {
                  const active = selH === h;
                  return (
                    <button
                      key={h}
                      onClick={() => setSelH(h)}
                      className="w-full py-2 text-[15px] font-medium snap-center transition-colors"
                      style={{
                        background: active ? accentColor : "transparent",
                        color: active ? "white" : "#333",
                      }}
                    >
                      {pad(h)}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="text-[20px] font-bold text-ink self-center mt-4">:</span>

            {/* Minutes scroll */}
            <div className="flex-1">
              <p className="text-[10px] font-medium text-muted text-center mb-1 uppercase tracking-wide">Min</p>
              <div
                ref={minutesRef}
                className="h-40 overflow-y-auto rounded-xl border border-line snap-y snap-mandatory"
              >
                {minutes.map((m) => {
                  const active = selM === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelM(m)}
                      className="w-full py-2 text-[15px] font-medium snap-center transition-colors"
                      style={{
                        background: active ? accentColor : "transparent",
                        color: active ? "white" : "#333",
                      }}
                    >
                      {pad(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-cloud text-slate border border-line"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white"
              style={{ background: accentColor }}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
