"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MapPin,
  Calendar,
  Compass,
  Trash2,
  LogOut,
  Users,
  EyeOff,
  Eye,
  Search,
  X,
  Share2,
  Sparkles,
  Plane,
} from "lucide-react";
import { useAuth } from "../lib/useAuth";
import { useTripsStore } from "../lib/useTripsStore";
import AddTripSheet from "../components/AddTripSheet";

function LoginScreen({ signInWithGoogle, error }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl overflow-hidden flex flex-col items-center justify-center px-8 py-14 shadow-2xl">
        <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-3 mb-4 shadow-inner">
          <img
            src="/logo.png"
            alt="Traveloss"
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-white text-[24px] font-bold font-display tracking-tight text-center mb-1">
          Traveloss
        </h1>
        <p className="text-white/70 text-[13px] text-center mb-7">
          Tu compañero de viaje inteligente y offline
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-3.5 bg-white text-ink text-[15px] font-semibold shadow-md active:scale-[0.98] transition-all hover:bg-slate-50"
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
          Continuar con Google
        </button>

        {error && (
          <p className="text-coral text-[12.5px] mt-3 text-center font-medium">{error}</p>
        )}

        <p className="text-white/45 text-[11.5px] mt-6 text-center leading-relaxed">
          Guarda tus itinerarios, reservas, entradas y fotos con sincronización en tiempo real.
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
  const { trips, loaded, addTrip, deleteTrip, dismissTrip, restoreTrip, dismissedTripsData, usingFirebase } = useTripsStore(
    userId,
    user?.email,
  );
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'shared'

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (filterTab === "shared" && !t._isShared) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || "").toLowerCase().includes(q);
        const matchPlace = (t.place || "").toLowerCase().includes(q);
        return matchTitle || matchPlace;
      }
      return true;
    });
  }, [trips, filterTab, searchQuery]);

  if (authLoading || !loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cloud gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate/30 border-t-ink animate-spin" />
        <p className="text-slate text-[13px] font-medium">Cargando tus viajes...</p>
      </div>
    );
  }

  if (authReady && !user) {
    return (
      <LoginScreen signInWithGoogle={signInWithGoogle} error={authError} />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cloud pb-safe">
      {/* Header with gradient backdrop */}
      <header className="px-5 pt-7 pb-6 bg-gradient-to-b from-ink via-ink to-inkLight text-white shadow-card">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center shadow-inner">
                <img src="/logo.png" alt="Traveloss" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-white text-[20px] font-bold font-display tracking-tight leading-none">
                  Traveloss
                </h1>
                <p className="text-white/60 text-[11px] font-medium mt-0.5">
                  {trips.length} {trips.length === 1 ? "viaje organizado" : "viajes organizados"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-medium text-white/80 border border-white/10">
                <span className={`w-1.5 h-1.5 rounded-full ${usingFirebase ? "bg-teal animate-pulse" : "bg-gold"}`} />
                {usingFirebase ? "Nube" : "Local"}
              </div>

              {user && user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Usuario"}
                  className="w-8 h-8 rounded-full ring-2 ring-white/30 object-cover shadow-xs"
                />
              )}
              {user && (
                <button
                  onClick={signOut}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors active:scale-95"
                  title="Cerrar sesión"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-4">
            <div className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 bg-white/10 border border-white/15 backdrop-blur-md text-white focus-within:bg-white/15 focus-within:border-white/30 transition-all">
              <Search size={16} className="text-white/60 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por destino o nombre..."
                className="w-full bg-transparent text-[13.5px] placeholder:text-white/45 outline-none text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-full hover:bg-white/20 text-white/60"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0 active:scale-95 ${
                filterTab === "all"
                  ? "bg-white text-ink shadow-sm"
                  : "bg-white/10 text-white/75 hover:bg-white/15 border border-white/10"
              }`}
            >
              Todos ({trips.length})
            </button>
            <button
              onClick={() => setFilterTab("shared")}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                filterTab === "shared"
                  ? "bg-white text-ink shadow-sm"
                  : "bg-white/10 text-white/75 hover:bg-white/15 border border-white/10"
              }`}
            >
              <Users size={13} />
              Compartidos ({trips.filter((t) => t._isShared).length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pt-5 pb-28">
        <div className="max-w-2xl mx-auto">
          {trips.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-3xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-4 text-teal shadow-soft">
                <Compass size={32} />
              </div>
              <h2 className="text-[17px] text-ink font-semibold font-display">
                Empieza tu próxima aventura
              </h2>
              <p className="text-[13px] text-slate mt-1.5 max-w-xs mx-auto leading-relaxed">
                Crea un viaje para organizar días, entradas, hoteles, rutas y fotos en un solo lugar.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-[14px] font-semibold shadow-card hover:bg-inkLight active:scale-95 transition-all"
              >
                <Plus size={16} /> Crear mi primer viaje
              </button>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate text-[14px] font-medium">No se encontraron viajes con ese criterio</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterTab("all");
                }}
                className="mt-2 text-teal text-[13px] font-semibold hover:underline"
              >
                Ver todos los viajes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => router.push(`/trip/${trip.id}`)}
                  className="group relative w-full text-left rounded-3xl overflow-hidden shadow-soft hover:shadow-card bg-white border border-line cursor-pointer active:scale-[0.99] transition-all"
                >
                  {trip.image ? (
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={trip.image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
                      
                      {/* Top badges */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-xs backdrop-blur-md"
                          style={{ background: `${trip.stampColor || "#0B0F19"}E6` }}
                        >
                          {trip.days?.length || 0} {trip.days?.length === 1 ? "día" : "días"}
                        </span>
                        
                        {trip._isShared && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10.5px] font-medium border border-white/20">
                            <Users size={11} /> Compartido
                          </span>
                        )}
                      </div>

                      {/* Bottom trip info */}
                      <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-bold text-[17px] text-white font-display truncate leading-snug">
                            {trip.title}
                          </h3>
                          <p className="text-[12.5px] text-white/90 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <MapPin size={12} className="text-white/70 shrink-0" />
                            <span className="truncate">{trip.place || "Destino"}</span>
                          </p>
                          {trip.dateLabel && (
                            <p className="text-[11.5px] text-white/75 flex items-center gap-1.5 mt-0.5">
                              <Calendar size={11} className="text-white/60 shrink-0" />
                              <span>{trip.dateLabel}</span>
                            </p>
                          )}
                        </div>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (trip._isShared) {
                              if (confirm(`¿Quitar "${trip.title}" de tu lista?\nSolo se ocultará de tu vista.`)) {
                                await dismissTrip(trip.id);
                              }
                            } else {
                              if (confirm(`¿Eliminar "${trip.title}" definitivamente?`)) {
                                deleteTrip(trip.id);
                              }
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-black/40 hover:bg-coral/80 text-white/70 hover:text-white flex items-center justify-center transition-colors backdrop-blur-xs shrink-0"
                          title={trip._isShared ? "Quitar de mi lista" : "Eliminar viaje"}
                        >
                          {trip._isShared ? <EyeOff size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-stretch bg-white">
                      <div
                        className="w-2.5 shrink-0"
                        style={{ background: trip.stampColor || "#0B0F19" }}
                      />
                      <div className="flex-1 p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[16px] text-ink font-display truncate">
                              {trip.title}
                            </h3>
                            {trip._isShared && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate/10 text-slate text-[10px] font-semibold shrink-0">
                                <Users size={10} /> Compartido
                              </span>
                            )}
                          </div>

                          <p className="text-[12.5px] text-slate flex items-center gap-1.5 mt-1 font-medium truncate">
                            <MapPin size={12} className="text-slate/70 shrink-0" />
                            <span>{trip.place || "Destino"}</span>
                          </p>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {trip.dateLabel && (
                              <span className="text-[11.5px] text-slate/80 flex items-center gap-1">
                                <Calendar size={11} /> {trip.dateLabel}
                              </span>
                            )}
                            <span className="text-line">·</span>
                            <span className="text-[11.5px] font-semibold text-muted">
                              {trip.days?.length || 0} {trip.days?.length === 1 ? "día" : "días"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (trip._isShared) {
                              if (confirm(`¿Quitar "${trip.title}" de tu lista?\nSe guardará en "Ocultos" y podrás restaurarlo.`)) {
                                await dismissTrip(trip.id);
                              }
                            } else {
                              if (confirm(`¿Eliminar "${trip.title}" definitivamente?`)) {
                                deleteTrip(trip.id);
                              }
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-coral/10 text-slate/60 hover:text-coral flex items-center justify-center transition-colors shrink-0"
                          title={trip._isShared ? "Quitar de mi lista" : "Eliminar viaje"}
                        >
                          {trip._isShared ? <EyeOff size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ocultos (Dismissed Trips) */}
          {dismissedTripsData && dismissedTripsData.length > 0 && (
            <div className="mt-8 pt-6 border-t border-line">
              <div className="flex items-center gap-2 mb-3">
                <EyeOff size={15} className="text-slate" />
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate">
                  Viajes Ocultos ({dismissedTripsData.length})
                </p>
              </div>
              <div className="space-y-2">
                {dismissedTripsData.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-2xl border border-line bg-white/80 px-4 py-3 shadow-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-[14px] text-ink font-display truncate">
                          {trip.title}
                        </p>
                        {trip._isShared && <Users size={12} className="text-slate" />}
                      </div>
                      {trip.place && (
                        <p className="text-[12px] flex items-center gap-1 mt-0.5 text-slate truncate">
                          <MapPin size={11} /> {trip.place}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await restoreTrip(trip.id);
                      }}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl border border-line bg-cloud px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-slate-100 active:scale-95 transition-transform"
                    >
                      <Eye size={13} /> Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Add Trip Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-7 right-6 z-30 w-14 h-14 rounded-2xl flex items-center justify-center shadow-card active:scale-90 transition-all bg-ink hover:bg-inkLight text-white group"
        aria-label="Nuevo viaje"
      >
        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-200" />
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
