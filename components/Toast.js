"use client";

import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { onPersistError } from "../lib/useTripsStore";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32", icon: "#4CAF50" },
  error: { bg: "#FFEBEE", border: "#EF5350", text: "#C62828", icon: "#EF5350" },
  warning: { bg: "#FFF8E1", border: "#FF9800", text: "#E65100", icon: "#FF9800" },
  info: { bg: "#E3F2FD", border: "#2196F3", text: "#1565C0", icon: "#2196F3" },
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "error", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fallos de guardado (cuota de localStorage, Firestore > 1 MiB, red...)
  // antes pasaban desapercibidos y los datos "desaparecían" al recargar.
  useEffect(
    () => onPersistError((message) => addToast(message, "error", 7000)),
    [addToast]
  );

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[320px] w-full pointer-events-none">
        {toasts.map((t) => {
          const c = COLORS[t.type] || COLORS.error;
          const Icon = ICONS[t.type] || ICONS.error;
          return (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl px-4 py-3 shadow-lg border flex items-start gap-2.5 animate-slide-in"
              style={{ background: c.bg, borderColor: c.border }}
            >
              <Icon size={16} style={{ color: c.icon }} className="shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-medium flex-1" style={{ color: c.text }}>{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="shrink-0 p-0.5">
                <X size={12} style={{ color: c.text }} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return () => {};
  return ctx;
}
