"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MapPin,
  Calendar,
  Compass,
  Trash2,
  LogOut,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/useAuth";
import { useTripsStore } from "../lib/useTripsStore";
import AddTripSheet from "../components/AddTripSheet";

function LoginScreen({ signInWithGoogle, error }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#C5CAD6]">
      <div className="w-full max-w-sm bg-cloud rounded-3xl shadow-xl overflow-hidden flex flex-col items-center justify-center px-8 py-16">
        <img
          src="/logo.png"
          alt="Traveloss"
          className="w-20 h-20 object-contain mb-4"
        />

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 bg-white border border-line text-[15px] font-medium text-ink shadow-sm active:scale-[0.98] transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Iniciar sesión con Google
        </button>

        {error && (
          <p className="text-coral text-[12.5px] mt-3 text-center">{error}</p>
        )}

        <p className="text-slate text-[11.5px] mt-6 text-center leading-relaxed">
          Guarda tus viajes en la nube y accede desde cualquier dispositivo.
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const {
    user,
    userId,
    loading: authLoading,
    signInWithGoogle,
    signOut,
    authReady,
    error: authError,
  } = useAuth();
  const { trips, loaded, addTrip, deleteTrip, usingFirebase } = useTripsStore(
    userId,
    user?.email,
  );
  const [showAdd, setShowAdd] = useState(false);

  if (authLoading || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate text-[13px]">Cargando...</p>
      </div>
    );
  }

  if (authReady && !user) {
    return (
      <LoginScreen signInWithGoogle={signInWithGoogle} error={authError} />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cloud">
      {/* header */}
      <div className="px-5 pt-6 pb-5 bg-gradient-to-br from-ink to-inkLight">
        <div className="max-w-2xl mx-auto flex items-center gap-2 mb-1">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
          <h1 className="text-white text-[22px] font-semibold font-display">
            Traveloss
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {user && user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="w-7 h-7 rounded-full ring-2 ring-white/30"
              />
            )}
            {user && (
              <button
                onClick={signOut}
                className="text-white/50 hover:text-white transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="max-w-2xl mx-auto">
          <p className="text-white/70 text-[12.5px] mt-0.5">
            Tus viajes en un solo lugar
          </p>
          <p className="text-white/50 text-[11px] mt-1">
            {usingFirebase
              ? "☁️ Sincronizado con Firebase"
              : "💾 Guardado solo en este navegador"}
          </p>
        </div>
      </div>

      {/* trip list */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24">
        <div className="max-w-2xl mx-auto">
          {trips.length === 0 ? (
            <div className="text-center mt-16">
              <Compass size={40} className="text-line mx-auto mb-3" />
              <p className="text-[14px] text-ink font-medium">
                No hay viajes aún
              </p>
              <p className="text-[12.5px] text-slate mt-1">
                Crea tu primer viaje para empezar
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/trip/${trip.id}`)}
                  className="relative w-full text-left rounded-2xl overflow-hidden shadow-sm active:scale-[0.99] transition-transform"
                >
                  {trip.image ? (
                    <>
                      <img
                        src={trip.image}
                        alt=""
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-0 flex items-end px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-[16px] text-white font-display">
                              {trip.title}
                            </p>
                            {trip._isShared && (
                              <Users size={12} className="text-white/70" />
                            )}
                          </div>
                          <p className="text-[12px] text-white/80 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {trip.place}
                          </p>
                          <p className="text-[11.5px] text-white/65 flex items-center gap-1 mt-0.5">
                            <Calendar size={10} /> {trip.dateLabel} ·{" "}
                            {trip.days.length} día
                            {trip.days.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {!trip._isShared && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar "${trip.title}"?`))
                                deleteTrip(trip.id);
                            }}
                            className="text-white/40 hover:text-coral transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex bg-cloud">
                      <div
                        className="w-2 shrink-0"
                        style={{ background: trip.stampColor }}
                      />
                      <div className="flex-1 px-4 py-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-[16px] text-ink font-display">
                                {trip.title}
                              </p>
                              {trip._isShared && (
                                <Users size={12} className="text-slate" />
                              )}
                            </div>
                            <p className="text-[12.5px] flex items-center gap-1 mt-0.5 text-slate">
                              <MapPin size={11} /> {trip.place}
                            </p>
                            <p className="text-[12px] flex items-center gap-1 mt-0.5 text-slate">
                              <Calendar size={11} /> {trip.dateLabel} ·{" "}
                              {trip.days.length} día
                              {trip.days.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {!trip._isShared && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`¿Eliminar "${trip.title}"?`))
                                  deleteTrip(trip.id);
                              }}
                              className="text-line hover:text-coral transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* floating add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform bg-ink"
      >
        <Plus size={22} color="white" />
      </button>

      {showAdd && (
        <AddTripSheet
          onClose={() => setShowAdd(false)}
          onSave={(trip) => {
            addTrip(trip);
            setShowAdd(false);
            router.push(`/trip/${trip.id}`);
          }}
        />
      )}
    </div>
  );
}
