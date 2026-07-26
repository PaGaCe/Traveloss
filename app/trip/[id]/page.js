"use client";

import { useState, Fragment, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, MapPin, List, Map as MapIcon, ArrowLeft, Trash2, ImagePlus, Share2, Users } from "lucide-react";
import { useTripsStore } from "../../../lib/useTripsStore";
import { useAuth } from "../../../lib/useAuth";
import { compressImage } from "../../../lib/compressImage";
import ActivityTicket from "../../../components/ActivityTicket";
import ActivityDetailSheet from "../../../components/ActivityDetailSheet";
import AddActivitySheet from "../../../components/AddActivitySheet";
import ShareTripSheet from "../../../components/ShareTripSheet";

const DayMap = dynamic(() => import("../../../components/DayMap"), { ssr: false });

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id;
  const { user, userId } = useAuth();
  const {
    getTrip,
    loaded,
    addDay,
    renameDay,
    addActivity,
    updateActivity,
    updateTrip,
    deleteTrip,
    shareTrip,
    unshareTrip,
    getSharedUsers,
    usingFirebase,
  } = useTripsStore(userId, user?.email);

  const trip = getTrip(tripId);

  const [activeDayId, setActiveDayId] = useState(null);
  const [dayView, setDayView] = useState("timeline");
  const [showAdd, setShowAdd] = useState(false);
  const [detailItemId, setDetailItemId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate text-[13px]">Cargando tu viaje...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <div className="text-center">
          <p className="text-ink text-[16px] font-semibold">Viaje no encontrado</p>
          <button onClick={() => router.push("/")} className="text-teal text-[13px] mt-2 underline">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const day = trip.days.find((d) => d.id === activeDayId) || trip.days[0];
  const detailItem = day ? day.items.find((i) => i.id === detailItemId) : null;
  const isOwner = !trip._isShared || (trip._sharedMeta && trip._sharedMeta.ownerId === userId);
  const sharedCount = trip._isShared && trip._sharedMeta ? trip._sharedMeta.sharedWith.length : 0;

  function handleAddDay() {
    const newId = addDay(tripId);
    setActiveDayId(newId);
  }

  function handleDeleteTrip() {
    deleteTrip(tripId);
    router.push("/");
  }

  async function handleCoverPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 800, quality: 0.65 });
      updateTrip(tripId, { image: dataUrl });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingCover(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-cloud">
      {/* header */}
      <div className="relative px-5 pt-6 pb-4">
        {trip.image ? (
          <>
            <img src={trip.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/70" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${trip.stampColor} 0%, #010615 100%)` }}
          />
        )}
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => router.push("/")} className="text-white/80 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1" />
            {isOwner && usingFirebase && (
              <button
                onClick={() => setShowShare(true)}
                className="text-white/60 hover:text-white transition-colors flex items-center gap-1"
                title="Compartir viaje"
              >
                <Share2 size={16} />
                {sharedCount > 0 && (
                  <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5">{sharedCount}</span>
                )}
              </button>
            )}
            {trip._isShared && !isOwner && (
              <span className="text-white/50 text-[10px] flex items-center gap-1">
                <Users size={12} /> Compartido
              </span>
            )}
            <button
              onClick={() => coverInputRef.current && coverInputRef.current.click()}
              className="text-white/60 hover:text-white transition-colors"
              title="Cambiar foto de portada"
            >
              <ImagePlus size={16} />
            </button>
            {isOwner && (
              <button onClick={() => setShowDeleteConfirm(true)} className="text-white/60 hover:text-white transition-colors">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPick} />
          {uploadingCover && <p className="text-white/70 text-[11px] mb-1">Procesando foto...</p>}
          <h1 className="text-white text-[24px] font-semibold font-display">{trip.title}</h1>
          <p className="text-white/85 text-[13px] flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {trip.place} · {trip.dateLabel}
          </p>
          <p className="text-white/70 text-[11px] mt-1">
            {usingFirebase ? "☁️ Sincronizado con Firebase" : "💾 Guardado solo en este navegador"}
          </p>
        </div>
      </div>

      {/* day stamps */}
      <div className="flex gap-3 px-5 py-4 overflow-x-auto bg-cloud border-b border-line/60">
        <div className="max-w-2xl mx-auto flex gap-3">
          {trip.days.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDayId(d.id)}
              className="shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all"
              style={{
                border: `2px dashed ${d.id === (day && day.id) ? trip.stampColor : "#C5CAD6"}`,
                color: d.id === (day && day.id) ? trip.stampColor : "#8A90A0",
                background: d.id === (day && day.id) ? `${trip.stampColor}14` : "transparent",
                transform: d.id === (day && day.id) ? "scale(1.06)" : "scale(1)",
              }}
            >
              <span className="text-[10px] font-semibold leading-none">{d.label.split(" ")[1]}</span>
              <span className="text-[9px] leading-none mt-0.5">{d.date.split(" ")[0]}</span>
            </button>
          ))}
          <button
            onClick={handleAddDay}
            className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-2 border-dashed border-line text-slate"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* day meta + toggle */}
      <div className="px-5 pt-3 flex items-center justify-between max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-medium text-ink">{day ? day.label : ""}</span>
          <span className="text-line">·</span>
          <input
            value={day ? day.date : ""}
            onChange={(e) => day && renameDay(tripId, day.id, e.target.value)}
            className="text-[12.5px] bg-transparent outline-none border-b border-dashed border-line w-24 text-muted"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setDayView("timeline")}
            className="px-2.5 py-1 rounded-full text-[11.5px] font-medium flex items-center gap-1"
            style={{
              background: dayView === "timeline" ? trip.stampColor : "#F4F4F7",
              color: dayView === "timeline" ? "white" : "#5A6478",
            }}
          >
            <List size={12} /> Lista
          </button>
          <button
            onClick={() => setDayView("map")}
            className="px-2.5 py-1 rounded-full text-[11.5px] font-medium flex items-center gap-1"
            style={{
              background: dayView === "map" ? trip.stampColor : "#F4F4F7",
              color: dayView === "map" ? "white" : "#5A6478",
            }}
          >
            <MapIcon size={12} /> Mapa
          </button>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24">
        <div className="max-w-2xl mx-auto">
          {!day ? (
            <p className="text-center text-[13px] mt-10 text-slate">
              Aún no hay días en este viaje. Toca &ldquo;+&rdquo; para añadir el primero.
            </p>
          ) : dayView === "map" ? (
            <DayMap items={day.items} color={trip.stampColor} />
          ) : day.items.length === 0 ? (
            <p className="text-center text-[13px] mt-10 text-slate">
              Aún no hay planes para este día. Toca &ldquo;+&rdquo; para añadir el primero.
            </p>
          ) : (
            day.items.map((item) => (
              <Fragment key={item.id}>
                <ActivityTicket item={item} onClick={() => setDetailItemId(item.id)} />
              </Fragment>
            ))
          )}
        </div>
      </div>

      {/* floating add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ background: trip.stampColor }}
      >
        <Plus size={22} color="white" />
      </button>

        {showAdd && (
          <AddActivitySheet
            accentColor={trip.stampColor}
            onClose={() => setShowAdd(false)}
            onSave={(activity) => {
              addActivity(tripId, day.id, activity);
              setShowAdd(false);
            }}
          />
        )}

        {detailItem && (
          <ActivityDetailSheet
            item={detailItem}
            accentColor={trip.stampColor}
            onClose={() => setDetailItemId(null)}
            onUpdate={(updates) => updateActivity(tripId, day.id, detailItem.id, updates)}
          />
        )}

        {showShare && (
          <ShareTripSheet
            tripId={tripId}
            sharedMeta={trip._sharedMeta}
            userId={userId}
            onClose={() => setShowShare(false)}
            onShare={shareTrip}
            onUnshare={unshareTrip}
            getSharedUsers={getSharedUsers}
          />
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-30 flex flex-col justify-center items-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative z-10 bg-cloud rounded-2xl px-6 py-5 shadow-xl max-w-[280px] w-full">
              <p className="text-[15px] font-semibold text-ink text-center mb-1">¿Eliminar viaje?</p>
              <p className="text-[13px] text-slate text-center mb-4">
                Se eliminará &ldquo;{trip.title}&rdquo; y todos sus días. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-cloud text-ink"
                >
                  Cancelar
                </button>
                <button onClick={handleDeleteTrip} className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-coral text-white">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
