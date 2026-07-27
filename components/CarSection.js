"use client";

import { useState, useRef } from "react";
import {
  Car, Fuel, Users, MapPin, FileText, Upload, X, Check, Pencil,
  Settings, Trash2,
} from "lucide-react";
import { compressImage } from "../lib/compressImage";
import DatePicker from "./DatePicker";

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
  transmission: "automático",
  fuel: "gasolina",
  occupants: 2,
  pickupDate: "",
  dropoffDate: "",
  pickupLocation: "",
  dropoffLocation: "",
  reservationRef: "",
};

export default function CarSection({ car, rentalDocs, accentColor, onUpdateCar, onUpdateDocs }) {
  const [editing, setEditing] = useState(!car);
  const [draft, setDraft] = useState(car || { ...EMPTY_CAR });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef(null);

  function handleSave() {
    onUpdateCar(draft);
    setEditing(false);
  }

  function handleFieldChange(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDocUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingDoc(true);
    const newDocs = [...(rentalDocs || [])];
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file, { maxWidth: 1200, quality: 0.7 });
        newDocs.push({
          name: file.name,
          url: dataUrl,
          addedAt: Date.now(),
        });
      } catch (err) {
        console.error("Doc upload error:", err);
      }
    }
    onUpdateDocs(newDocs);
    setUploadingDoc(false);
    if (docInputRef.current) docInputRef.current.value = "";
  }

  function handleRemoveDoc(idx) {
    const updated = (rentalDocs || []).filter((_, i) => i !== idx);
    onUpdateDocs(updated);
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
            className="w-full rounded-xl px-4 py-3 text-[14px] outline-none bg-cloud text-ink border border-line"
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

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted mb-1 block flex items-center gap-1">
                <MapPin size={10} /> Recogida
              </label>
              <DatePicker
                value={draft.pickupDate}
                onChange={(val) => handleFieldChange("pickupDate", val)}
                accentColor={accentColor}
                placeholder="Fecha recogida"
              />
              <input
                value={draft.pickupLocation}
                onChange={(e) => handleFieldChange("pickupLocation", e.target.value)}
                placeholder="Lugar recogida"
                className="w-full rounded-xl px-3 py-2.5 text-[12px] outline-none bg-white text-ink border border-line mt-1.5"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted mb-1 block flex items-center gap-1">
                <MapPin size={10} /> Entrega
              </label>
              <DatePicker
                value={draft.dropoffDate}
                onChange={(val) => handleFieldChange("dropoffDate", val)}
                accentColor={accentColor}
                placeholder="Fecha entrega"
              />
              <input
                value={draft.dropoffLocation}
                onChange={(e) => handleFieldChange("dropoffLocation", e.target.value)}
                placeholder="Lugar entrega"
                className="w-full rounded-xl px-3 py-2.5 text-[12px] outline-none bg-white text-ink border border-line mt-1.5"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted mb-1 block flex items-center gap-1">
                <MapPin size={10} /> Lugar recogida
              </label>
              <input
                value={draft.pickupLocation}
                onChange={(e) => handleFieldChange("pickupLocation", e.target.value)}
                placeholder="Ej: Aeropuerto"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none bg-cloud text-ink border border-line"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-muted mb-1 block flex items-center gap-1">
                <MapPin size={10} /> Lugar entrega
              </label>
              <input
                value={draft.dropoffLocation}
                onChange={(e) => handleFieldChange("dropoffLocation", e.target.value)}
                placeholder="Ej: Aeropuerto"
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none bg-cloud text-ink border border-line"
              />
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
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12.5px] text-muted">
          <span className="flex items-center gap-1"><Users size={12} /> {car.occupants} ocupantes</span>
          <span className="flex items-center gap-1"><Settings size={12} /> {car.transmission}</span>
        </div>

        <div className="border-t border-line pt-3 flex flex-col gap-2">
          <div className="flex items-start gap-2 text-[12.5px]">
            <MapPin size={13} className="text-teal shrink-0 mt-0.5" />
            <div>
              <p className="text-muted">Recogida: <span className="text-ink font-medium">{car.pickupDate || "—"}</span></p>
              <p className="text-slate text-[11.5px]">{car.pickupLocation || "Sin ubicación"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-[12.5px]">
            <MapPin size={13} className="text-coral shrink-0 mt-0.5" />
            <div>
              <p className="text-muted">Entrega: <span className="text-ink font-medium">{car.dropoffDate || "—"}</span></p>
              <p className="text-slate text-[11.5px]">{car.dropoffLocation || "Sin ubicación"}</p>
            </div>
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
              <div key={doc.addedAt || idx} className="flex items-center gap-2 bg-cloud rounded-xl px-3 py-2.5 border border-line">
                <FileText size={14} className="text-slate shrink-0" />
                <span className="flex-1 text-[12.5px] text-ink truncate">{doc.name}</span>
                <button onClick={() => handleRemoveDoc(idx)} className="p-1 hover:bg-white/60 rounded-lg">
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
