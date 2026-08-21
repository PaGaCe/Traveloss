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
import { uploadImageToFirebase } from "../../../lib/uploadImage";
import { firebaseReady } from "../../../lib/firebase";
import ActivityTicket from "../../../components/ActivityTicket";
import ActivityDetailSheet from "../../../components/ActivityDetailSheet";
import AddActivitySheet from "../../../components/AddActivitySheet";
import ShareTripSheet from "../../../components/ShareTripSheet";
import BottomNav from "../../../components/BottomNav";
import CarSection from "../../../components/CarSection";
import HotelSection from "../../../components/HotelSection";
import RestaurantSection from "../../../components/RestaurantSection";
import TranslatorSection from "../../../components/TranslatorSection";
import DatePicker from "../../../components/DatePicker";
import { useToast } from "../../../components/Toast";

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
  const { user, userId, loading: authLoading, signInWithGoogle, authReady } = useAuth();
  const {
    getTrip,
    trips,
    loaded,
    updateTrip,
    deleteTrip,
    leaveSharedTrip,
    dismissTrip,
    restoreTrip,
    addActivity,
    updateActivity,
    deleteActivity,
    addDay,
    deleteDay,
    updateDay,
    renameDay,
    addDayPhoto,
    removeDayPhoto,
    addPhotoToGallery,
    deletePhotoFromGallery,
    shareTrip,
    unshareTrip,
    getSharedUsers,
    joinSharedTrip,
    usingFirebase,
  } = useTripsStore(userId, user?.email);

  const trip = getTrip(tripId);

  const [activeDayId, setActiveDayId] = useState(null);
  const [dayView, setDayView] = useState("timeline");
  const [activeTab, setActiveTab] = useState("itinerary");
  const [showAdd, setShowAdd] = useState(false);
  const [detailItemId, setDetailItemId] = useState(null);
  const [showShare, setShowShare] = useState(false);
  
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [galleryScope, setGalleryScope] = useState("day"); // 'day' | 'all'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  // Edición inline de cabecera
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDest, setEditingDest] = useState(false);
  const [destDraft, setDestDraft] = useState("");
  const [editingDates, setEditingDates] = useState(false);
  const [editingDayDate, setEditingDayDate] = useState(false);
  const [editingTricount, setEditingTricount] = useState(false);
  const [tricountDraft, setTricountDraft] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  
  const coverInputRef = useRef(null);
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("invite") === "true";
  
  const addToast = useToast();
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (!isInvite || !userId || !tripId || !usingFirebase) return;
    let cancelled = false;
    (async () => {
      // Si el viaje estaba descartado (quitar de mi lista), dejar de ocultarlo al reabrir la invitación.
      // Se espera antes de joinSharedTrip para que el snapshot resultante ya lo muestre.
      await restoreTrip(tripId);
      const ok = await joinSharedTrip(tripId);
      if (cancelled) return;
      if (ok) {
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.toString());
      } else {
        setInvitePending(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isInvite, userId, tripId, usingFirebase, joinSharedTrip, restoreTrip]);

  useEffect(() => {
    if (trip) setInvitePending(false);
  }, [trip]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate text-[13px]">Cargando...</p>
      </div>
    );
  }

  if (authReady && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-ink">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden flex flex-col items-center justify-center px-8 py-14">
          <img src="/logo.png" alt="Traveloss" className="w-16 h-16 object-contain mb-3" />
          <p className="text-white text-[15px] font-medium text-center mb-5">
            {isInvite
              ? "Inicia sesión para aceptar la invitación al viaje"
              : "Inicia sesión para ver tu viaje"}
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 bg-white border border-line text-[15px] font-medium text-ink shadow-sm active:scale-[0.98] transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate text-[13px]">Cargando tu viaje...</p>
      </div>
    );
  }

  if (isInvite && invitePending && !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate text-[13px]">Añadiendo el viaje a tu lista...</p>
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
    addToast("Nuevo día añadido", "success");
  }

  function handleDeleteTrip() {
    deleteTrip(tripId);
    addToast("Viaje eliminado", "info");
    router.push("/");
  }

  async function handleDismissTrip() {
    // Esperar a que el dismiss se guarde en Firestore antes de volver al inicio,
    // si no, la home puede releer el doc sin dismissedTrips y el viaje reaparece.
    await dismissTrip(tripId);
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
      addToast("No se pudo procesar la imagen de portada", "error");
    } finally {
      setUploadingCover(false);
    }
  }

  // Sin Firebase Storage, las fotos se guardan incrustadas en base64 dentro del
  // viaje (localStorage o Firestore, con límites de ~5 MB y 1 MB). Si una foto
  // es demasiado grande, el guardado falla en silencio y la foto desaparece al
  // recargar: mejor rechazarla avisando al usuario.
  const MAX_INLINE_PHOTO_CHARS = 300000;

  async function handleGalleryUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0 || !day) return;
    setGalleryUploading(true);
    let added = 0;
    let failed = 0;
    let notInCloud = 0;
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file, { maxWidth: 600, quality: 0.5 });
        let url = dataUrl;
        let uploadedToCloud = false;
        if (firebaseReady) {
          try {
            url = await uploadImageToFirebase(dataUrl, `gallery/${tripId}/${day.id}/${Date.now()}-${file.name}`);
            uploadedToCloud = true;
          } catch (storageErr) {
            console.warn("Storage upload failed, using inline image:", storageErr);
          }
        }
        if (!uploadedToCloud) notInCloud += firebaseReady ? 1 : 0;
        if (url.length > MAX_INLINE_PHOTO_CHARS) {
          failed++;
          continue;
        }
        addDayPhoto(tripId, day.id, {
          url,
          caption: "",
          addedAt: Date.now(),
        });
        added++;
      } catch (err) {
        console.error("Gallery upload error:", err);
        failed++;
      }
    }
    setGalleryUploading(false);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (failed > 0) {
      addToast(
        failed === 1
          ? "1 foto no se pudo guardar (demasiado grande o error al subirla)"
          : `${failed} fotos no se pudieron guardar (demasiado grandes o error al subirlas)`,
        "error",
        6000
      );
    } else if (notInCloud > 0) {
      addToast(
        notInCloud === 1
          ? "Foto añadida, pero no se pudo subir al servidor. Se guarda solo en este dispositivo."
          : `${added} fotos añadidas, pero no se pudieron subir al servidor. Se guardan solo en este dispositivo.`,
        "warning",
        7000
      );
    } else if (added > 0) {
      addToast(added === 1 ? "Foto añadida" : `${added} fotos añadidas`, "success");
    }
  }

  function handleDeletePhoto(photo) {
    if (galleryScope === "all") {
      removeDayPhoto(tripId, photo.dayId, (trip.days.find((d) => d.id === photo.dayId)?.gallery || []).findIndex((p) => p.addedAt === photo.addedAt));
    } else if (day) {
      removeDayPhoto(tripId, day.id, dayPhotos.findIndex((p) => p.addedAt === photo.addedAt));
    }
  }

  function handleUpdateCar(car) {
    updateTrip(tripId, { car });
  }

  function handleUpdateDocs(docs) {
    updateTrip(tripId, { rentalDocs: docs });
  }

  function handleUpdateTranslatorLangs(langs) {
    updateTrip(tripId, { translatorLangs: langs });
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
              <button
                onClick={() => setShowDismissConfirm(true)}
                className="text-white/50 hover:text-coral transition-colors flex items-center gap-1"
                title="Quitar de mi lista"
              >
                <Users size={12} /> <span className="text-[10px]">Quitar de mi lista</span>
              </button>
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

          {editingTitle ? (
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
              onClick={() => { setTitleDraft(trip.title); setEditingTitle(true); }}
              className="text-white text-[24px] font-semibold font-display cursor-pointer hover:opacity-80"
            >
              {trip.title}
            </h1>
          )}

          <p className="text-white/85 text-[13px] flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {trip.place} · {trip.dateLabel}
          </p>

          {/* Tricount */}
          {editingTricount ? (
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
          ) : (
            <button
              onClick={() => { setTricountDraft(""); setEditingTricount(true); }}
              className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 transition-colors border border-dashed border-white/20"
            >
              <TricountLogo size={18} />
              Añadir Tricount
            </button>
          )}

          <p className="text-white/50 text-[10px] mt-2">
            {usingFirebase ? "☁ Sincronizado" : "💾 Local"}
          </p>
        </div>
      </div>

      {/* day stamps — solo en itinerario o galería */}
      {(activeTab === "itinerary" || activeTab === "gallery") && (
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
                <span className="text-[10px] font-semibold leading-none">D{d.label.split(" ")[1]}</span>
                <span className="text-[8.5px] leading-none mt-0.5">{d.date}</span>
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
      )}

      {/* content area - scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24">
        <div className="max-w-2xl mx-auto">

          {/* === ITINERARY TAB === */}
          {activeTab === "itinerary" && (
            <>
              {/* day meta + sub-toggle */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-medium text-ink">{day ? day.label : ""}</span>
                  <span className="text-line">·</span>
                  <div className="w-28">
                    <DatePicker
                      value={day ? day.date : ""}
                      onChange={(val) => day && renameDay(tripId, day.id, val)}
                      accentColor={trip.stampColor}
                      placeholder="Fecha"
                    />
                  </div>
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

              {dayView === "map" ? (
                <DayMap items={day.items} color={trip.stampColor} />
              ) : !day ? (
                <p className="text-center text-[13px] mt-10 text-slate">
                  Aún no hay días en este viaje. Toca &ldquo;+&rdquo; para añadir el primero.
                </p>
              ) : day.items.length === 0 ? (
                <p className="text-center text-[13px] mt-10 text-slate">
                  Aún no hay planes para este día. Toca &ldquo;+&rdquo; para añadir el primero.
                </p>
              ) : (
                [...day.items]
                  .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
                  .map((item) => (
                    <Fragment key={item.id}>
                      <ActivityTicket
                        item={item}
                        onClick={() => setDetailItemId(item.id)}
                        onToggleCompleted={(id, completed) => updateActivity(tripId, day.id, id, { completed })}
                      />
                    </Fragment>
                  ))
              )}
            </>
          )}

          {/* === FOOD TAB === */}
          {activeTab === "food" && (
            <RestaurantSection
              trip={trip}
              accentColor={trip.stampColor}
              onUpdateTrip={(updates) => updateTrip(tripId, updates)}
            />
          )}

          {/* === CAR TAB === */}
          {activeTab === "car" && (
            <CarSection
              car={trip.car}
              rentalDocs={trip.rentalDocs || []}
              accentColor={trip.stampColor}
              onUpdateCar={handleUpdateCar}
              onUpdateDocs={handleUpdateDocs}
            />
          )}

          {/* === HOTELS TAB === */}
          {activeTab === "hotels" && (
            <HotelSection
              trip={trip}
              accentColor={trip.stampColor}
              onUpdateTrip={(updates) => updateTrip(tripId, updates)}
            />
          )}

          {/* === TRANSLATOR TAB === */}
          {activeTab === "translator" && (
            <TranslatorSection
              translatorLangs={trip.translatorLangs}
              accentColor={trip.stampColor}
              onUpdateLangs={handleUpdateTranslatorLangs}
            />
          )}

          {/* === GALLERY TAB === */}
          {activeTab === "gallery" && (
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
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-white" />
                      </button>
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
          )}

        </div>
      </div>

      {/* floating add button (only for itinerary tab, not gallery) */}
      {activeTab === "itinerary" && (
        <button
          onClick={() => setShowAdd(true)}
          className="fixed bottom-[72px] right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30"
          style={{ background: trip.stampColor }}
        >
          <Plus size={22} color="white" />
        </button>
      )}

      {/* bottom navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} accentColor={trip.stampColor} />

      {/* sheets */}
      {showAdd && day && (
        <AddActivitySheet
          accentColor={trip.stampColor}
          onClose={() => setShowAdd(false)}
          onSave={(activity) => {
            addActivity(tripId, day.id, activity);
            addToast("Actividad añadida", "success");
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
          onDelete={() => { deleteActivity(tripId, day.id, detailItem.id); setDetailItemId(null); }}
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

      {showDismissConfirm && (
        <div className="absolute inset-0 z-30 flex flex-col justify-center items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDismissConfirm(false)} />
          <div className="relative z-10 bg-cloud rounded-2xl px-6 py-5 shadow-xl max-w-[280px] w-full">
            <p className="text-[15px] font-semibold text-ink text-center mb-1">¿Quitar de tu lista?</p>
            <p className="text-[13px] text-slate text-center mb-4">
              &ldquo;{trip.title}&rdquo; se ocultará de tu vista. El propietario y otros usuarios seguirán viéndolo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDismissConfirm(false)}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-cloud text-ink"
              >
                Cancelar
              </button>
              <button onClick={handleDismissTrip} className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-ink text-white">
                Quitar
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
