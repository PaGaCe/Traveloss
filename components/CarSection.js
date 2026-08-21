"use client";

import { useState, useRef, useEffect } from "react";
import {
  Car, Fuel, Users, MapPin, FileText, Upload, X, Check, Pencil,
  Settings, Trash2, ExternalLink, Download, Navigation, Sparkles
} from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import { useToast } from "./Toast";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";

const FUEL_OPTIONS = [
  { key: "gasolina", label: "Gasolina" },
  { key: "diésel", label: "Diésel" },
  { key: "eléctrico", label: "Eléctrico" },
  { key: "híbrido", label: "Híbrido" },
];

const TRANSMISSION_OPTIONS = [
  { key: "automático", label: "Automático" },
  { key: "manual", label: "Manual" },
];

const EMPTY_CAR = {
  model: "",
  company: "",
  transmission: "automático",
  fuel: "gasolina",
  occupants: 2,
  pickupDate: "",
  pickupTime: "",
  dropoffDate: "",
  dropoffTime: "",
  pickupLocation: "",
  dropoffLocation: "",
  reservationRef: "",
};

export default function CarSection({ car, rentalDocs, accentColor = "#0B0F19", onUpdateCar, onUpdateDocs }) {
  const [editing, setEditing] = useState(!car);
  const [draft, setDraft] = useState(car || { ...EMPTY_CAR });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef(null);
  const addToast = useToast();
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [pickupSearching, setPickupSearching] = useState(false);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [dropoffSearching, setDropoffSearching] = useState(false);

  useEffect(() => {
    const loc = draft.pickupLocation || "";
    if (loc.trim().length < 3 || draft.pickupLat) {
      setPickupSuggestions([]);
      return;
    }
    let cancelled = false;
    setPickupSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(loc)}`
        );
        const data = await res.json();
        if (!cancelled) setPickupSuggestions(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setPickupSearching(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [draft.pickupLocation, draft.pickupLat]);

  useEffect(() => {
    const loc = draft.dropoffLocation || "";
    if (loc.trim().length < 3 || draft.dropoffLat) {
      setDropoffSuggestions([]);
      return;
    }
    let cancelled = false;
    setDropoffSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(loc)}`
        );
        const data = await res.json();
        if (!cancelled) setDropoffSuggestions(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setDropoffSearching(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [draft.dropoffLocation, draft.dropoffLat]);

  function pickPickupSuggestion(s) {
    setDraft((prev) => ({
      ...prev,
      pickupLocation: s.display_name.split(",").slice(0, 2).join(","),
      pickupLat: parseFloat(s.lat),
      pickupLng: parseFloat(s.lon),
    }));
    setPickupSuggestions([]);
  }

  function pickDropoffSuggestion(s) {
    setDraft((prev) => ({
      ...prev,
      dropoffLocation: s.display_name.split(",").slice(0, 2).join(","),
      dropoffLat: parseFloat(s.lat),
      dropoffLng: parseFloat(s.lon),
    }));
    setDropoffSuggestions([]);
  }

  function handleSave() {
    onUpdateCar(draft);
    setEditing(false);
    addToast?.("Coche guardado correctamente", "success");
  }

  function handleFieldChange(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB

  async function handleDocUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingDoc(true);
    const newDocs = [...(rentalDocs || [])];
    for (const file of files) {
      try {
        let dataUrl;
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          if (file.size > MAX_PDF_SIZE) {
            addToast?.(`"${file.name}" es demasiado grande (máx 5 MB)`, "warning");
            continue;
          }
          dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("No se pudo leer el PDF"));
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        } else {
          if (file.size > 10 * 1024 * 1024) {
            addToast?.(`"${file.name}" es demasiado grande (máx 10 MB)`, "warning");
            continue;
          }
          // Alta resolución para ampliar sin pixelar; versión media solo como
          // fallback incrustado (límites de Firestore/localStorage).
          dataUrl = await compressImage(file, { maxWidth: 1920, quality: 0.8 });
        }
        let url = dataUrl;
        if (firebaseReady) {
          try {
            url = await uploadImageToFirebase(dataUrl, `cars/${Date.now()}-${file.name}`);
          } catch (uploadErr) {
            addToast?.(`No se pudo subir "${file.name}" a la nube, se guarda localmente`, "warning");
            url = await compressImage(file, { maxWidth: 900, quality: 0.6 });
          }
        } else {
          url = await compressImage(file, { maxWidth: 900, quality: 0.6 });
        }
        newDocs.push({
          name: file.name,
          url: url,
          type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          addedAt: Date.now(),
        });
      } catch (err) {
        addToast?.(`Error al subir "${file.name}": ${err.message || "Error desconocido"}`, "error");
      }
    }
    onUpdateDocs(newDocs);
    if (newDocs.length > (rentalDocs || []).length) {
      addToast?.("Documento subido correctamente", "success");
    }
    setUploadingDoc(false);
    if (docInputRef.current) docInputRef.current.value = "";
  }

  function handleRemoveDoc(idx) {
    const updated = (rentalDocs || []).filter((_, i) => i !== idx);
    onUpdateDocs(updated);
  }

  function isDataUrl(url) {
    return typeof url === "string" && url.startsWith("data:");
  }

  function dataUrlToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  function openDoc(doc) {
    if (!doc) return;
    if (isDataUrl(doc.url)) {
      const blob = dataUrlToBlob(doc.url);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      window.open(doc.url, "_blank");
    }
  }

  function downloadDoc(doc) {
    if (!doc) return;
    const a = document.createElement("a");
    if (isDataUrl(doc.url)) {
      const blob = dataUrlToBlob(doc.url);
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } else {
      a.href = doc.url;
      a.download = doc.name;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  function formatDateTime(date, time) {
    const parts = [];
    if (date) parts.push(date);
    if (time) parts.push(time);
    return parts.join(", ") || "—";
  }

  if (!car && !editing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl bg-white border border-line shadow-soft text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xs"
          style={{ background: `${accentColor}18` }}
        >
          <Car size={32} style={{ color: accentColor }} />
        </div>
        <h4 className="text-[17px] font-bold text-ink mb-1 font-display">Coche de alquiler</h4>
        <p className="text-[13px] text-slate max-w-xs mb-5">
          Guarda la información de tu vehículo, puntos de recogida, horarios y contratos de alquiler en un solo lugar.
        </p>
        <button
          onClick={() => { setDraft({ ...EMPTY_CAR }); setEditing(true); }}
          className="px-6 py-3 rounded-2xl text-[14px] font-bold text-white shadow-card active:scale-95 transition-all"
          style={{ background: accentColor }}
        >
          Añadir coche de alquiler
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-line shadow-card">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
              style={{ background: `${accentColor}18` }}
            >
              <Car size={18} style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-ink font-display">
                {car ? "Editar coche de alquiler" : "Nuevo coche de alquiler"}
              </h3>
              <p className="text-[11.5px] text-slate font-medium">Completa los datos de la reserva</p>
            </div>
          </div>
          {car && (
            <button
              onClick={() => { setDraft(car); setEditing(false); }}
              className="text-[12.5px] font-medium text-slate hover:text-ink px-3 py-1.5 rounded-xl hover:bg-cloud transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">Modelo del coche</label>
            <input
              value={draft.model}
              onChange={(e) => handleFieldChange("model", e.target.value)}
              placeholder="Ej: Fiat 500, Nissan Qashqai, Toyota Yaris..."
              className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">Compañía de alquiler</label>
            <input
              value={draft.company}
              onChange={(e) => handleFieldChange("company", e.target.value)}
              placeholder="Ej: Sixt, Hertz, Europcar, Centauro..."
              className="w-full rounded-2xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Transmisión</label>
              <div className="flex gap-2">
                {TRANSMISSION_OPTIONS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleFieldChange("transmission", t.key)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all border"
                    style={{
                      background: draft.transmission === t.key ? accentColor : "#F4F4F7",
                      color: draft.transmission === t.key ? "white" : "#4B5565",
                      borderColor: draft.transmission === t.key ? accentColor : "#E2E4E9",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Combustible</label>
              <div className="grid grid-cols-2 gap-1.5">
                {FUEL_OPTIONS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleFieldChange("fuel", f.key)}
                    className="px-2.5 py-2 rounded-xl text-[11.5px] font-semibold transition-all border text-center"
                    style={{
                      background: draft.fuel === f.key ? accentColor : "#F4F4F7",
                      color: draft.fuel === f.key ? "white" : "#4B5565",
                      borderColor: draft.fuel === f.key ? accentColor : "#E2E4E9",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Número de plazas</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleFieldChange("occupants", Math.max(1, (draft.occupants || 2) - 1))}
                className="w-10 h-10 rounded-xl bg-cloud border border-line flex items-center justify-center text-ink font-bold text-[18px] hover:bg-slate-200 active:scale-95 transition-all"
              >
                −
              </button>
              <div className="flex items-center gap-1.5 bg-cloud px-4 py-2 rounded-xl border border-line">
                <Users size={15} className="text-slate" />
                <span className="text-[16px] font-bold text-ink w-6 text-center">{draft.occupants || 2}</span>
                <span className="text-[12px] text-slate font-medium">plazas</span>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange("occupants", (draft.occupants || 2) + 1)}
                className="w-10 h-10 rounded-xl bg-cloud border border-line flex items-center justify-center text-ink font-bold text-[18px] hover:bg-slate-200 active:scale-95 transition-all"
              >
                +
              </button>
            </div>
          </div>

          {/* Recogida */}
          <div className="p-3.5 rounded-2xl bg-cloud border border-line">
            <label className="text-[12px] font-bold text-ink mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal" />
              Punto de recogida
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <DatePicker
                value={draft.pickupDate}
                onChange={(val) => handleFieldChange("pickupDate", val)}
                accentColor={accentColor}
                placeholder="Fecha recogida"
              />
              <TimePicker
                value={draft.pickupTime}
                onChange={(val) => handleFieldChange("pickupTime", val)}
                accentColor={accentColor}
              />
            </div>
            <div className="relative mt-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-line">
                <MapPin size={15} className="text-slate shrink-0" />
                <input
                  value={draft.pickupLocation}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, pickupLocation: e.target.value, pickupLat: undefined, pickupLng: undefined }));
                  }}
                  placeholder="Aeropuerto, oficina o dirección..."
                  className="w-full bg-transparent text-[13px] outline-none text-ink font-medium"
                />
              </div>
              {pickupSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-card z-20 overflow-hidden border border-line">
                  {pickupSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      type="button"
                      onClick={() => pickPickupSuggestion(s)}
                      className="w-full text-left px-3.5 py-2.5 text-[12px] text-ink hover:bg-cloud border-b border-line last:border-0 font-medium"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
              {pickupSearching && <p className="text-[11px] text-slate mt-1 ml-1 animate-pulse">Buscando...</p>}
              {draft.pickupLat && <p className="text-[11px] text-teal font-semibold mt-1 ml-1">✓ Ubicación fijada</p>}
            </div>
          </div>

          {/* Entrega */}
          <div className="p-3.5 rounded-2xl bg-cloud border border-line">
            <label className="text-[12px] font-bold text-ink mb-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-coral" />
              Punto de devolución
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <DatePicker
                value={draft.dropoffDate}
                onChange={(val) => handleFieldChange("dropoffDate", val)}
                accentColor={accentColor}
                placeholder="Fecha entrega"
              />
              <TimePicker
                value={draft.dropoffTime}
                onChange={(val) => handleFieldChange("dropoffTime", val)}
                accentColor={accentColor}
              />
            </div>
            <div className="relative mt-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-line">
                <MapPin size={15} className="text-slate shrink-0" />
                <input
                  value={draft.dropoffLocation}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, dropoffLocation: e.target.value, dropoffLat: undefined, dropoffLng: undefined }));
                  }}
                  placeholder="Aeropuerto, oficina o dirección..."
                  className="w-full bg-transparent text-[13px] outline-none text-ink font-medium"
                />
              </div>
              {dropoffSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-card z-20 overflow-hidden border border-line">
                  {dropoffSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      type="button"
                      onClick={() => pickDropoffSuggestion(s)}
                      className="w-full text-left px-3.5 py-2.5 text-[12px] text-ink hover:bg-cloud border-b border-line last:border-0 font-medium"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
              {dropoffSearching && <p className="text-[11px] text-slate mt-1 ml-1 animate-pulse">Buscando...</p>}
              {draft.dropoffLat && <p className="text-[11px] text-teal font-semibold mt-1 ml-1">✓ Ubicación fijada</p>}
            </div>
          </div>

          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-slate mb-1 block">Número de confirmación / reserva</label>
            <input
              value={draft.reservationRef}
              onChange={(e) => handleFieldChange("reservationRef", e.target.value)}
              placeholder="Ej: RENT-892344-ES"
              className="w-full rounded-2xl px-4 py-3 text-[13.5px] font-mono outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-white transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-6 rounded-2xl py-3.5 text-[15px] font-bold text-white flex items-center justify-center gap-2 shadow-card active:scale-[0.98] transition-all"
          style={{ background: accentColor }}
        >
          <Check size={18} /> Guardar datos del coche
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Car Overview Card */}
      <div className="bg-white rounded-3xl border border-line p-5 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
              style={{ background: `${accentColor}18` }}
            >
              <Car size={24} style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-ink font-display">{car.model || "Coche de alquiler"}</h3>
              {car.company && <p className="text-[13px] text-slate font-medium">{car.company}</p>}
            </div>
          </div>
          <button
            onClick={() => { setDraft(car); setEditing(true); }}
            className="w-9 h-9 rounded-2xl bg-cloud flex items-center justify-center text-slate hover:text-ink hover:bg-slate-200 active:scale-95 transition-all"
            title="Editar coche"
          >
            <Pencil size={15} />
          </button>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cloud border border-line text-[12px] font-semibold text-ink capitalize">
            <Settings size={13} className="text-slate" /> {car.transmission}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cloud border border-line text-[12px] font-semibold text-ink capitalize">
            <Fuel size={13} className="text-slate" /> {car.fuel}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cloud border border-line text-[12px] font-semibold text-ink">
            <Users size={13} className="text-slate" /> {car.occupants} ocupantes
          </span>
        </div>

        {/* Pickup and Dropoff Itinerary Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
          <div className="p-3 rounded-2xl bg-cloud/70 border border-line">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal" /> Recogida
              </span>
              {car.pickupLat && car.pickupLng && (
                <a
                  href={`https://www.google.com/maps?q=${car.pickupLat},${car.pickupLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-teal hover:bg-teal/10 transition-colors"
                >
                  <Navigation size={13} />
                </a>
              )}
            </div>
            <p className="text-[13.5px] font-bold text-ink">{formatDateTime(car.pickupDate, car.pickupTime)}</p>
            <p className="text-[12px] text-slate truncate mt-0.5">{car.pickupLocation || "Sin ubicación fijada"}</p>
          </div>

          <div className="p-3 rounded-2xl bg-cloud/70 border border-line">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-coral flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-coral" /> Devolución
              </span>
              {car.dropoffLat && car.dropoffLng && (
                <a
                  href={`https://www.google.com/maps?q=${car.dropoffLat},${car.dropoffLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-coral hover:bg-coral/10 transition-colors"
                >
                  <Navigation size={13} />
                </a>
              )}
            </div>
            <p className="text-[13.5px] font-bold text-ink">{formatDateTime(car.dropoffDate, car.dropoffTime)}</p>
            <p className="text-[12px] text-slate truncate mt-0.5">{car.dropoffLocation || "Sin ubicación fijada"}</p>
          </div>
        </div>

        {car.reservationRef && (
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-[12px] text-slate font-medium">Nº Reserva:</span>
            <span className="text-[13px] font-bold text-ink font-mono bg-cloud px-2.5 py-1 rounded-lg border border-line">
              {car.reservationRef}
            </span>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-3xl border border-line p-5 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cloud flex items-center justify-center text-ink">
              <FileText size={16} />
            </div>
            <h4 className="text-[15px] font-bold text-ink font-display">Documentos y contratos</h4>
          </div>
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDoc}
            className="flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-xl text-white shadow-xs active:scale-95 transition-all"
            style={{ background: accentColor, opacity: uploadingDoc ? 0.6 : 1 }}
          >
            <Upload size={13} />
            {uploadingDoc ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>
        <input ref={docInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleDocUpload} />

        {(rentalDocs || []).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rentalDocs.map((doc, idx) => (
              <div
                key={doc.addedAt || idx}
                className="flex items-center justify-between gap-2 bg-cloud rounded-2xl p-3 border border-line hover:border-slate/30 transition-all shadow-xs"
              >
                <button
                  onClick={() => openDoc(doc)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center text-ink shrink-0">
                    <FileText size={16} className={doc.type?.includes("pdf") ? "text-coral" : "text-teal"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold text-ink truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate flex items-center gap-1">
                      <span>Ver archivo</span>
                      <ExternalLink size={10} />
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => downloadDoc(doc)}
                    className="w-8 h-8 rounded-xl bg-white border border-line flex items-center justify-center text-slate hover:text-teal active:scale-95 transition-colors"
                    title="Descargar"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleRemoveDoc(idx)}
                    className="w-8 h-8 rounded-xl bg-white border border-line flex items-center justify-center text-slate hover:text-coral active:scale-95 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-line rounded-2xl bg-cloud/40">
            <FileText size={24} className="text-slate mx-auto mb-1.5 opacity-60" />
            <p className="text-[13px] font-medium text-slate">No hay documentos adjuntos</p>
            <p className="text-[11.5px] text-slate/70 mt-0.5">Sube confirmaciones en PDF o fotos del contrato</p>
          </div>
        )}
      </div>
    </div>
  );
}
