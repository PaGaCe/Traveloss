"use client";

import { useState, useEffect } from "react";
import { X, Mail, UserMinus, Users } from "lucide-react";

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
      setSuccess(`Compartido con ${email.trim()}`);
      setEmail("");
      const updated = await getSharedUsers(tripId);
      setSharedUsers(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUnshare(uid) {
    try {
      await onUnshare(tripId, uid);
      setSharedUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch {}
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative rounded-t-3xl px-5 pt-4 pb-8 z-10 bg-white max-h-[88%] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-ink font-display flex items-center gap-2">
            <Users size={18} /> Compartir viaje
          </h2>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        {isOwner && (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-3 bg-cloud">
                <Mail size={15} className="text-slate" />
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleShare()}
                  placeholder="Email del usuario"
                  type="email"
                  className="w-full bg-transparent text-[14px] outline-none text-ink"
                />
              </div>
              <button
                onClick={handleShare}
                disabled={!email.trim()}
                className="px-5 rounded-xl text-[13px] font-semibold text-white transition-opacity bg-ink"
                style={{ opacity: email.trim() ? 1 : 0.5 }}
              >
                Compartir
              </button>
            </div>
            {error && <p className="text-coral text-[12px] mb-2">{error}</p>}
            {success && <p className="text-teal text-[12px] mb-2">{success}</p>}
            <p className="text-[11px] text-slate mb-4">
              El otro usuario debe haber iniciado sesión al menos una vez con Google para poder compartir.
            </p>
          </>
        )}

        {sharedUsers.length > 0 && (
          <div>
            <p className="text-[12px] font-medium text-[#5A6478] mb-2">Personas con acceso</p>
            <div className="flex flex-col gap-2">
              {sharedUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 rounded-xl px-4 py-2.5 bg-cloud">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-line flex items-center justify-center text-[12px] text-slate font-medium">
                      {(u.displayName || u.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{u.displayName || "Sin nombre"}</p>
                    <p className="text-[11.5px] text-slate truncate">{u.email}</p>
                  </div>
                  {isOwner && u.uid !== userId && (
                    <button
                      onClick={() => handleUnshare(u.uid)}
                      className="text-line hover:text-coral transition-colors p-1"
                      title="Quitar acceso"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                  {u.uid === userId && <span className="text-[10px] text-slate">Tú</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isOwner && sharedUsers.length === 0 && !loading && (
          <p className="text-[13px] text-slate text-center mt-4">Solo el propietario puede gestionar los accesos.</p>
        )}
      </div>
    </div>
  );
}
