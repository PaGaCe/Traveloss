"use client";

import { useState, Fragment, useRef, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Plus, MapPin, List, Map as MapIcon, ArrowLeft, Trash2, ImagePlus,
  Share2, Users, Check, X, Upload, Camera,
} from "lucide-react";
import { useTripsStore } from "../../../lib/useTripsStore";
import { useAuth } from "../../../lib/useAuth";
import { compressImage } from "../../../lib/compressImage";
import ActivityTicket from "../../../components/ActivityTicket";
import ActivityDetailSheet from "../../../components/ActivityDetailSheet";
import AddActivitySheet from "../../../components/AddActivitySheet";
import ShareTripSheet from "../../../components/ShareTripSheet";

const DayMap = dynamic(() => import("../../../components/DayMap"), { ssr: false });

function TricountLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#1DC3F0" />
      <path d="M7 7h4v10H7z" fill="white" />
      <path d="M13 10h4v7h-4z" fill="white" />
    </svg>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id;
  const { user, userId } = useAuth();
  const {
    getTrip, loaded, addDay, renameDay, addActivity, updateActivity,
    updateTrip, deleteTrip, addDayPhoto, removeDayPhoto,
    shareTrip, unshareTrip, getSharedUsers, joinSharedTrip, usingFirebase,
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
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("invite") === "true";

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTricount, setEditingTricount] = useState(false);
  const [tricountDraft, setTricountDraft] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [galleryScope, setGalleryScope] = useState("day");
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (!isInvite || !userId || !tripId || !usingFirebase) return;
    joinSharedTrip(tripId).then((ok) => {
      if (ok) {
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.toString());
      }
    });
  }, [isInvite, userId, tripId, usingFirebase, joinSharedTrip]);

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

  const allPhotos = [];
  for (const d of trip.days) {
    for (const p of (d.gallery || [])) {
      allPhotos.push({ ...p, dayLabel: d.label, dayId: d.id });
    }
  }

  const dayPhotos = day ? (day.gallery || []) : [];
  const displayPhotos = galleryScope === "all" ? allPhotos : dayPhotos;

  function handleTitleSave() {
    if (titleDraft.trim()) updateTrip(tripId, { title: titleDraft.trim() });
    setEditingTitle(false);
  }

  function handleTricountSave() {
    updateTrip(tripId, { tricountUrl: tricountDraft.trim() });
    setEditingTricount(false);
  }

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

  async function handleGalleryUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0 || !day) return;
    setGalleryUploading(true);
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file, { maxWidth: 1200, quality: 0.7 });
        addDayPhoto(tripId, day.id, {
          url: dataUrl,
          caption: "",
          addedAt: Date.now(),
        });
      } catch (err) {
        console.error("Gallery upload error:", err);
      }
    }
    setGalleryUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function handleDeletePhoto(photo) {
    if (galleryScope === "all") {
      removeDayPhoto(tripId, photo.dayId, (trip.days.find((d) => d.id === photo.dayId)?.gallery || []).findIndex((p) => p.addedAt === photo.addedAt));
    } else if (day) {
      removeDayPhoto(tripId, day.id, dayPhotos.findIndex((p) => p.addedAt === photo.addedAt));
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

          {editingTitle && isOwner ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-white text-[24px] font-semibold font-display bg-white/15 rounded-lg px-2 py-1 outline-none flex-1 border border-white/25"
              />
              <button onClick={handleTitleSave} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <X size={14} className="text-white/60" />
              </button>
            </div>
          ) : (
            <h1
              onClick={() => { if (isOwner) { setTitleDraft(trip.title); setEditingTitle(true); } }}
              className={`text-white text-[24px] font-semibold font-display ${isOwner ? "cursor-pointer hover:opacity-80" : ""}`}
            >
              {trip.title}
            </h1>
          )}

          <p className="text-white/85 text-[13px] flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {trip.place} · {trip.dateLabel}
          </p>

          {/* Tricount */}
          {editingTricount && isOwner ? (
            <div className="flex items-center gap-1.5 mt-2">
              <input
                autoFocus
                value={tricountDraft}
                onChange={(e) => setTricountDraft(e.target.value)}
                placeholder="Pega el enlace de Tricount"
                onKeyDown={(e) => { if (e.key === "Enter") handleTricountSave(); if (e.key === "Escape") setEditingTricount(false); }}
                className="text-white text-[13px] bg-white/15 rounded-xl px-3 py-2 outline-none flex-1 border border-white/25 placeholder:text-white/40"
              />
              <button onClick={handleTricountSave} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check size={14} className="text-white" />
              </button>
              <button onClick={() => setEditingTricount(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <X size={14} className="text-white/60" />
              </button>
            </div>
          ) : trip.tricountUrl ? (
            <a
              href={trip.tricountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-white rounded-xl px-4 py-2 transition-all hover:brightness-110 active:scale-95"
              style={{ background: "#1DC3F0" }}
            >
              <TricountLogo size={20} />
              Tricount
            </a>
          ) : isOwner ? (
            <button
              onClick={() => { setTricountDraft(""); setEditingTricount(true); }}
              className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 transition-colors border border-dashed border-white/20"
            >
              <TricountLogo size={18} />
              Añadir Tricount
            </button>
          ) : null}

          <p className="text-white/50 text-[10px] mt-2">
            {usingFirebase ? "☁ Sincronizado" : "💾 Local"}
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
          <button
            onClick={() => setDayView("gallery")}
            className="px-2.5 py-1 rounded-full text-[11.5px] font-medium flex items-center gap-1"
            style={{
              background: dayView === "gallery" ? trip.stampColor : "#F4F4F7",
              color: dayView === "gallery" ? "white" : "#5A6478",
            }}
          >
            <Camera size={12} /> Fotos
          </button>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24">
        <div className="max-w-2xl mx-auto">
          {dayView === "gallery" ? (
            <>
              {/* scope toggle: day vs all */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setGalleryScope("day")}
                  className="px-3 py-1 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: galleryScope === "day" ? `${trip.stampColor}20` : "transparent",
                    color: galleryScope === "day" ? trip.stampColor : "#8A90A0",
                    border: `1px solid ${galleryScope === "day" ? trip.stampColor : "#C5CAD6"}`,
                  }}
                >
                  {day ? day.label : "Día"}
                </button>
                <button
                  onClick={() => setGalleryScope("all")}
                  className="px-3 py-1 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: galleryScope === "all" ? `${trip.stampColor}20` : "transparent",
                    color: galleryScope === "all" ? trip.stampColor : "#8A90A0",
                    border: `1px solid ${galleryScope === "all" ? trip.stampColor : "#C5CAD6"}`,
                  }}
                >
                  Todos ({allPhotos.length})
                </button>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] text-slate font-medium">
                  {displayPhotos.length > 0
                    ? `${displayPhotos.length} foto${displayPhotos.length !== 1 ? "s" : ""}`
                    : galleryScope === "day"
                      ? `Sin fotos en ${day ? day.label : "este día"}`
                      : "Sin fotos en el viaje"}
                </p>
                {galleryScope === "day" && (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={galleryUploading}
                    className="flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ background: trip.stampColor, opacity: galleryUploading ? 0.6 : 1 }}
                  >
                    <Upload size={12} />
                    {galleryUploading ? "Subiendo..." : "Subir fotos"}
                  </button>
                )}
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryUpload}
              />

              {displayPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {displayPhotos.map((photo, idx) => (
                    <div key={`${photo.dayId || ""}-${photo.addedAt}-${idx}`} className="relative aspect-square group">
                      <img
                        src={photo.url}
                        alt={photo.caption || ""}
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => setLightboxImg(photo.url)}
                      />
                      {isOwner && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      )}
                      {galleryScope === "all" && photo.dayLabel && (
                        <span className="absolute bottom-1 left-1 text-[9px] font-medium text-white bg-black/50 rounded px-1 py-0.5">
                          {photo.dayLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-line flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-slate transition-colors"
                  onClick={() => galleryScope === "day" && galleryInputRef.current?.click()}
                >
                  <ImagePlus size={28} className="text-line" />
                  <p className="text-[12.5px] text-slate">
                    {galleryScope === "day"
                      ? "Toca para subir fotos de este día"
                      : "Las fotos de todos los días aparecerán aquí"}
                  </p>
                </div>
              )}
            </>
          ) : !day ? (
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
      {dayView !== "gallery" && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: trip.stampColor }}
        >
          <Plus size={22} color="white" />
        </button>
      )}

      {showAdd && day && (
        <AddActivitySheet
          accentColor={trip.stampColor}
          onClose={() => setShowAdd(false)}
          onSave={(activity) => {
            addActivity(tripId, day.id, activity);
            setShowAdd(false);
          }}
        />
      )}

      {detailItem && day && (
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

      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setLightboxImg(null)}>
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
          <img src={lightboxImg} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
