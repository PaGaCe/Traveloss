"use client";

import { useState, useEffect } from "react";
import { X, Mail, UserMinus, Users, MessageCircle, Send, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";

export default function ShareTripSheet({ tripId, sharedMeta, userId, onClose, onShare, onUnshare, getSharedUsers }) {
  const [email, setEmail] = useState("");
  const [sharedUsers, setSharedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isOwner = !sharedMeta || sharedMeta.ownerId === userId;

  useEffect(() => {
    if (!sharedMeta) return;
    setLoading(true);
    getSharedUsers(tripId)
      .then((users) => setSharedUsers(users))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId, sharedMeta, getSharedUsers]);

  async function handleShare() {
    if (!email.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      await onShare(tripId, email.trim().toLowerCase());
      setSuccess(`Viaje compartido con ${email.trim()}`);
      setEmail("");
      const updated = await getSharedUsers(tripId);
      setSharedUsers(updated);
    } catch (err) {
      setError(err.message || "No se pudo compartir el viaje");
    }
  }

  async function handleUnshare(uid) {
    setError(null);
    try {
      await onUnshare(tripId, uid);
      setSharedUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      setError(err.message || "No se pudo quitar el acceso. Inténtalo de nuevo.");
    }
  }

  async function handleShareWhatsApp() {
    const url = `${window.location.origin}/trip/${tripId}?invite=true`;
    const text = `¡Te invito a ver mi viaje en Traveloss! 🌍\n\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Traveloss", text, url });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const win = window.open(waUrl, "_blank");
    if (!win) {
      window.location.href = waUrl;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-scrim/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div
        className="relative bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-sheet z-10 max-h-[90vh] flex flex-col overflow-hidden pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-line rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-ink/5 flex items-center justify-center text-ink shadow-xs">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ink font-display">Compartir viaje</h2>
              <p className="text-[12px] text-slate font-medium">Invita a tus compañeros de ruta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-ink hover:bg-cloud transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isOwner && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">
                  Invitar por correo electrónico
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-surface transition-all">
                    <Mail size={16} className="text-slate shrink-0" />
                    <input
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                        setSuccess(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleShare()}
                      placeholder="ejemplo@gmail.com"
                      type="email"
                      className="w-full bg-transparent text-[13.5px] outline-none text-ink font-medium"
                    />
                  </div>
                  <button
                    onClick={handleShare}
                    disabled={!email.trim()}
                    className="h-12 px-5 rounded-2xl text-[13.5px] font-bold text-white shadow-soft active:scale-95 transition-all bg-btn disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">Invitar</span>
                  </button>
                </div>
                <p className="text-[11.5px] text-slate mt-1.5 font-medium">
                  El usuario debe haber iniciado sesión con Google para acceder al itinerario.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-coral/10 text-coral rounded-2xl border border-coral/20 text-[12.5px] font-medium">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-teal/10 text-teal rounded-2xl border border-teal/20 text-[12.5px] font-medium">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="pt-2 border-t border-line">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-2 block">
                  Enlace directo de invitación
                </label>
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[14px] font-bold shadow-soft active:scale-[0.98] transition-all"
                >
                  <MessageCircle size={19} />
                  <span>Compartir por WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* Shared members list */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate block">
                Personas con acceso ({sharedUsers.length + (isOwner ? 1 : 0)})
              </label>
              {loading && <span className="text-[11px] text-slate">Cargando...</span>}
            </div>

            <div className="space-y-2">
              {/* Current user */}
              <div className="flex items-center gap-3 rounded-2xl p-3 bg-cloud/60 border border-line">
                <div className="w-9 h-9 rounded-2xl bg-btn text-btnText flex items-center justify-center font-bold text-[13px] shadow-xs">
                  Tú
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-ink truncate">
                    {isOwner ? "Propietario del viaje" : "Colaborador"}
                  </p>
                  <p className="text-[11.5px] text-slate font-medium">Acceso activo</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-surface text-slate border border-line rounded-xl">
                  {isOwner ? "Owner" : "Miembro"}
                </span>
              </div>

              {sharedUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 rounded-2xl p-3 bg-surface border border-line shadow-xs">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-9 h-9 rounded-2xl object-cover border border-line" />
                  ) : (
                    <div className="w-9 h-9 rounded-2xl bg-teal/15 text-teal flex items-center justify-center text-[13px] font-bold">
                      {(u.displayName || u.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-ink truncate">{u.displayName || "Usuario de Traveloss"}</p>
                    <p className="text-[11.5px] text-slate font-medium truncate">{u.email}</p>
                  </div>
                  {isOwner && u.uid !== userId && (
                    <button
                      onClick={() => handleUnshare(u.uid)}
                      className="w-8 h-8 rounded-xl bg-cloud hover:bg-coral/10 text-slate hover:text-coral flex items-center justify-center transition-colors border border-line hover:border-coral/30"
                      title="Quitar acceso"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!isOwner && sharedUsers.length === 0 && !loading && (
            <div className="p-4 rounded-2xl bg-cloud text-center">
              <UserCheck size={24} className="mx-auto text-slate mb-1" />
              <p className="text-[13px] text-slate font-medium">Solo el creador del viaje puede gestionar los accesos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
