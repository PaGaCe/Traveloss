"use client";

import { useState, useRef, useEffect } from "react";
import {
  Car, Fuel, Users, MapPin, FileText, Upload, X, Check, Pencil,
  Settings, Trash2, ExternalLink, Download, Navigation,
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

export default function CarSection({ car, rentalDocs, accentColor, onUpdateCar, onUpdateDocs }) {
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
    addToast("Coche guardado correctamente", "success");
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
            addToast(`"${file.name}" es demasiado grande (máx 5 MB)`, "warning");
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
            addToast(`"${file.name}" es demasiado grande (máx 10 MB)`, "warning");
            continue;
          }
          dataUrl = await compressImage(file, { maxWidth: 600, quality: 0.5 });
        }
        let url = dataUrl;
        if (firebaseReady) {
          try {
            url = await uploadImageToFirebase(dataUrl, `cars/${Date.now()}-${file.name}`);
          } catch (uploadErr) {
            addToast(`No se pudo subir "${file.name}" a la nube, se guarda localmente`, "warning");
          }
        }
        newDocs.push({
          name: file.name,
          url: url,
          type: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          addedAt: Date.now(),
        });
      } catch (err) {
        addToast(`Error al subir "${file.name}": ${err.message || "Error desconocido"}`, "error");
      }
    }
    onUpdateDocs(newDocs);
    if (newDocs.length > (rentalDocs || []).length) {
      addToast("Documento subido correctamente", "success");
    }
    setUploadingDoc(false);
    if (docInputRef.current) docInputRef.current.value = "";
  }

  function handleRemoveDoc(idx) {
    const updated = (rentalDocs || []).filter((_, i) => i !== idx);
    onUpdateDocs(updated);
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
    const blob = dataUrlToBlob(doc.url);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }

  function downloadDoc(doc) {
    const blob = dataUrlToBlob(doc.url);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  }

  function formatDateTime(date, time) {
    const parts = [];
    if (date) parts.push(date);
    if (time) parts.push(time);
    return parts.join(", ") || "—";
  }

  if (!car && !editing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `${accentColor}18` }}
        >
          <Car size={28} style={{ color: accentColor }} />
        </div>
        <p className="text-[14px] text-slate text-center">
          Añade el coche de alquiler para tener toda la info en un sitio
        </p>
        <button
          onClick={() => { setDraft({ ...EMPTY_CAR }); setEditing(true); }}
          className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: accentColor }}
        >
          Añadir coche
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="px-1 py-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-ink font-display flex items-center gap-2">
            <Car size={16} style={{ color: accentColor }} />
            Coche de alquiler
          </h3>
          {car && (
            <button onClick={() => { setDraft(car); setEditing(false); }} className="text-[12px] text-slate">
              Cancelar
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={draft.model}
            onChange={(e) => handleFieldChange("model", e.target.value)}
            placeholder="Modelo del coche"
            className="w-full rounded-xl px-4 py-3.5 text-[14px] outline-none bg-cloud text-ink border border-line"
          />
          <input
            value={draft.company}
            onChange={(e) => handleFieldChange("company", e.target.value)}
            placeholder="Compañía de alquiler (opcional)"
            className="w-full rounded-xl px-4 py-3.5 text-[14px] outline-none bg-cloud text-ink border border-line"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted mb-1 block">Transmisión</label>
              <div className="flex gap-1.5">
                {TRANSMISSION_OPTIONS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleFieldChange("transmission", t.key)}
                    className="flex-1 px-2 py-2 rounded-lg text-[12px] font-medium transition-colors border"
                    style={{
                      background: draft.transmission === t.key ? accentColor : "#F4F4F7",
                      color: draft.transmission === t.key ? "white" : "#5A6478",
                      borderColor: draft.transmission === t.key ? accentColor : "#C5CAD6",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted mb-1 block">Combustible</label>
              <div className="flex flex-wrap gap-1.5">
                {FUEL_OPTIONS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => handleFieldChange("fuel", f.key)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border"
                    style={{
                      background: draft.fuel === f.key ? accentColor : "#F4F4F7",
                      color: draft.fuel === f.key ? "white" : "#5A6478",
                      borderColor: draft.fuel === f.key ? accentColor : "#C5CAD6",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted mb-1 block">Ocupantes</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleFieldChange("occupants", Math.max(1, (draft.occupants || 2) - 1))}
                className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-ink font-medium text-[16px]"
              >
                −
              </button>
              <span className="text-[18px] font-semibold text-ink w-8 text-center">{draft.occupants || 2}</span>
              <button
                onClick={() => handleFieldChange("occupants", (draft.occupants || 2) + 1)}
                className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-ink font-medium text-[16px]"
              >
                +
              </button>
              <Users size={14} className="text-slate ml-1" />
            </div>
          </div>

          {/* Recogida */}
          <div>
            <label className="text-[11px] font-medium text-muted mb-1.5 block flex items-center gap-1">
              <MapPin size={10} /> Recogida
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <DatePicker
                  value={draft.pickupDate}
                  onChange={(val) => handleFieldChange("pickupDate", val)}
                  accentColor={accentColor}
                  placeholder="Fecha"
                />
              </div>
              <div className="w-28">
                <TimePicker
                  value={draft.pickupTime}
                  onChange={(val) => handleFieldChange("pickupTime", val)}
                  accentColor={accentColor}
                />
              </div>
            </div>
            <div className="relative mt-1.5">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-line">
                <MapPin size={13} className="text-slate shrink-0" />
                <input
                  value={draft.pickupLocation}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, pickupLocation: e.target.value, pickupLat: undefined, pickupLng: undefined }));
                  }}
                  placeholder="Lugar recogida"
                  className="w-full bg-transparent text-[12px] outline-none text-ink"
                />
              </div>
              {pickupSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden border border-line">
                  {pickupSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => pickPickupSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-[11px] text-ink hover:bg-cloud border-b border-line last:border-0"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
              {pickupSearching && <p className="text-[10px] text-slate mt-0.5 ml-1">Buscando...</p>}
              {draft.pickupLat && <p className="text-[10px] text-teal mt-0.5 ml-1">✓ Ubicación fijada</p>}
            </div>
          </div>

          {/* Entrega */}
          <div>
            <label className="text-[11px] font-medium text-muted mb-1.5 block flex items-center gap-1">
              <MapPin size={10} /> Entrega
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <DatePicker
                  value={draft.dropoffDate}
                  onChange={(val) => handleFieldChange("dropoffDate", val)}
                  accentColor={accentColor}
                  placeholder="Fecha"
                />
              </div>
              <div className="w-28">
                <TimePicker
                  value={draft.dropoffTime}
                  onChange={(val) => handleFieldChange("dropoffTime", val)}
                  accentColor={accentColor}
                />
              </div>
            </div>
            <div className="relative mt-1.5">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white border border-line">
                <MapPin size={13} className="text-slate shrink-0" />
                <input
                  value={draft.dropoffLocation}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, dropoffLocation: e.target.value, dropoffLat: undefined, dropoffLng: undefined }));
                  }}
                  placeholder="Lugar entrega"
                  className="w-full bg-transparent text-[12px] outline-none text-ink"
                />
              </div>
              {dropoffSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden border border-line">
                  {dropoffSuggestions.map((s) => (
                    <button
                      key={s.place_id}
                      onClick={() => pickDropoffSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-[11px] text-ink hover:bg-cloud border-b border-line last:border-0"
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
              {dropoffSearching && <p className="text-[10px] text-slate mt-0.5 ml-1">Buscando...</p>}
              {draft.dropoffLat && <p className="text-[10px] text-teal mt-0.5 ml-1">✓ Ubicación fijada</p>}
            </div>
          </div>

          <input
            value={draft.reservationRef}
            onChange={(e) => handleFieldChange("reservationRef", e.target.value)}
            placeholder="Nº de reserva (opcional)"
            className="w-full rounded-xl px-4 py-3 text-[13px] outline-none bg-cloud text-ink border border-line"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-5 rounded-xl py-3.5 text-[14px] font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: accentColor }}
        >
          <Check size={16} /> Guardar coche
        </button>
      </div>
    );
  }

  return (
    <div className="px-1 py-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold text-ink font-display flex items-center gap-2">
          <Car size={16} style={{ color: accentColor }} />
          {car.model || "Coche de alquiler"}
        </h3>
        <button onClick={() => { setDraft(car); setEditing(true); }} className="p-1.5 rounded-lg hover:bg-cloud">
          <Pencil size={14} className="text-slate" />
        </button>
      </div>

      <div className="bg-cloud rounded-2xl border border-line p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${accentColor}18` }}>
            <Car size={18} style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">{car.model}</p>
            <p className="text-[12px] text-slate capitalize">{car.transmission} · {car.fuel}</p>
            {car.company && <p className="text-[12px] text-muted mt-0.5">{car.company}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12.5px] text-muted">
          <span className="flex items-center gap-1"><Users size={12} /> {car.occupants} ocupantes</span>
          <span className="flex items-center gap-1"><Settings size={12} /> {car.transmission}</span>
        </div>

        <div className="border-t border-line pt-3 flex flex-col gap-2">
          <div className="flex items-start gap-2 text-[12.5px]">
            <MapPin size={13} className="text-teal shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-muted">Recogida: <span className="text-ink font-medium">{formatDateTime(car.pickupDate, car.pickupTime)}</span></p>
              <p className="text-slate text-[11.5px]">{car.pickupLocation || "Sin ubicación"}</p>
            </div>
            {car.pickupLat && car.pickupLng && (
              <a
                href={`https://www.google.com/maps?q=${car.pickupLat},${car.pickupLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-cloud"
              >
                <Navigation size={13} style={{ color: accentColor }} />
              </a>
            )}
          </div>
          <div className="flex items-start gap-2 text-[12.5px]">
            <MapPin size={13} className="text-coral shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-muted">Entrega: <span className="text-ink font-medium">{formatDateTime(car.dropoffDate, car.dropoffTime)}</span></p>
              <p className="text-slate text-[11.5px]">{car.dropoffLocation || "Sin ubicación"}</p>
            </div>
            {car.dropoffLat && car.dropoffLng && (
              <a
                href={`https://www.google.com/maps?q=${car.dropoffLat},${car.dropoffLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded-lg hover:bg-cloud"
              >
                <Navigation size={13} style={{ color: accentColor }} />
              </a>
            )}
          </div>
        </div>

        {car.reservationRef && (
          <div className="border-t border-line pt-3">
            <p className="text-[11.5px] text-muted">Reserva: <span className="text-ink font-medium font-mono">{car.reservationRef}</span></p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-medium text-ink flex items-center gap-1.5">
            <FileText size={13} /> Documentos
          </p>
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDoc}
            className="flex items-center gap-1 text-[11.5px] font-medium px-3 py-1.5 rounded-lg text-white"
            style={{ background: accentColor, opacity: uploadingDoc ? 0.6 : 1 }}
          >
            <Upload size={11} />
            {uploadingDoc ? "Subiendo..." : "Subir"}
          </button>
        </div>
        <input ref={docInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleDocUpload} />

        {(rentalDocs || []).length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {rentalDocs.map((doc, idx) => (
              <div
                key={doc.addedAt || idx}
                className="flex items-center gap-1 bg-cloud rounded-xl px-2.5 py-2 border border-line"
              >
                <button
                  onClick={() => openDoc(doc)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-white/60 rounded-lg px-1.5 py-1 transition-colors"
                >
                  <FileText size={14} className="text-slate shrink-0" />
                  <span className="flex-1 text-[12.5px] text-ink truncate">{doc.name}</span>
                  <ExternalLink size={12} className="text-slate shrink-0" />
                </button>
                <button
                  onClick={() => downloadDoc(doc)}
                  className="p-1.5 hover:bg-white/60 rounded-lg shrink-0"
                  title="Descargar"
                >
                  <Download size={13} className="text-teal" />
                </button>
                <button
                  onClick={() => handleRemoveDoc(idx)}
                  className="p-1.5 hover:bg-white/60 rounded-lg shrink-0"
                  title="Eliminar"
                >
                  <Trash2 size={12} className="text-coral" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-slate text-center py-4 border border-dashed border-line rounded-xl">
            Sin documentos subidos
          </p>
        )}
      </div>
    </div>
  );
}
