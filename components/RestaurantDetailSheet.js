"use client";

import { useState } from "react";
import { Utensils, MapPin, X, ImagePlus, Trash2, ExternalLink, Star, Check, Globe } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import { useToast } from "./Toast";

const CATEGORIES = [
  "Desayuno", "Café", "Cocktel", "Italiano", "Asiático",
  "Helados", "Hamburguesas", "Mexicano", "Mediterráneo", "Tapas",
  "Pizza", "Sushi", "Parrilla", "Saludable", "Otros",
];

const CATEGORY_FILES = [
  "01_cafe_croissant",   // Desayuno
  "02_cafe_para_llevar", // Café
  "03_coctel",           // Cocktel
  "04_pasta",            // Italiano
  "05_noodles",          // Asiático
  "06_helado",           // Helados
  "07_hamburguesa",      // Hamburguesas
  "08_taco",             // Mexicano
  "09_ensalada_griega",  // Mediterráneo
  "10_canape",           // Tapas
  "11_pizza",            // Pizza
  "12_sushi",            // Sushi
  "13_bistec",           // Parrilla
  "14_ensalada_verde",   // Saludable
  "15_puntos_vacio",     // Otros
];

function CategoryIcon({ category, size = 18 }) {
  const idx = CATEGORIES.indexOf(category);
  if (idx === -1) return <Utensils size={size} />;
  return (
    <img
      src={`/${CATEGORY_FILES[idx]}.png`}
      alt={category}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

const PRICES = ["€", "€€", "€€€", "€€€€"];

export default function RestaurantDetailSheet({ restaurant, onClose, onUpdate, onDelete, accentColor = "#0B0F19" }) {
  const [name, setName] = useState(restaurant.name || "");
  const [place, setPlace] = useState(restaurant.place || "");
  const [zone, setZone] = useState(restaurant.zone || "");
  const [category, setCategory] = useState(restaurant.category || "");
  const [price, setPrice] = useState(restaurant.price || 0);
  const [rating, setRating] = useState(restaurant.rating || 0);
  const [website, setWebsite] = useState(restaurant.website || "");
  const [image, setImage] = useState(restaurant.image || null);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const addToast = useToast();

  async function handleImagePick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      if (firebaseReady) {
        try {
          const url = await uploadImageToFirebase(dataUrl, `restaurants/${Date.now()}-${file.name}`);
          setImage(url);
        } catch {
          addToast("No se pudo subir la foto a la nube, se guarda localmente", "warning");
          setImage(dataUrl);
        }
      } else {
        setImage(dataUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    if (!name.trim() || !category) return;
    onUpdate({
      name: name.trim(),
      place: place.trim() || undefined,
      zone: zone.trim() || undefined,
      category,
      price: price || undefined,
      rating: rating || undefined,
      website: website.trim() || undefined,
      image: image || undefined,
    });
    addToast("Restaurante actualizado correctamente", "success");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-sheet z-10 max-h-[90vh] flex flex-col overflow-hidden pb-safe animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-line rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ background: `${accentColor}18` }}
            >
              <Utensils size={20} style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-ink font-display">Editar restaurante</h2>
              <p className="text-[12px] text-slate font-medium">Modifica detalles, puntuación o foto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-ink hover:bg-cloud transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del restaurante"
              className="w-full rounded-2xl px-4 py-3 text-[13.5px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Ubicación / Dirección</label>
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-white">
                <MapPin size={16} className="text-slate shrink-0" />
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Dirección o calle"
                  className="w-full bg-transparent text-[13.5px] outline-none text-ink font-medium"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Zona / Barrio</label>
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-white">
                <Globe size={16} className="text-slate shrink-0" />
                <input
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="Ej. Centro, Malasaña..."
                  className="w-full bg-transparent text-[13.5px] outline-none text-ink font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Nivel de precio</label>
              <div className="flex gap-2">
                {PRICES.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrice(price === i + 1 ? 0 : i + 1)}
                    className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold transition-all border ${
                      price === i + 1 ? "border-transparent text-white shadow-xs" : "bg-cloud text-slate border-line hover:border-slate/30"
                    }`}
                    style={{
                      background: price === i + 1 ? accentColor : undefined,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Valoración</label>
              <div className="flex items-center gap-2.5 bg-cloud rounded-2xl px-4 py-2.5 border border-line">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s === rating ? 0 : s)}
                      className="p-0.5 transition-transform active:scale-90"
                    >
                      <Star
                        size={17}
                        fill={s <= rating ? "#F59E0B" : "none"}
                        className={s <= rating ? "text-amber-500" : "text-line"}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 ? (
                  <span className="text-[13px] font-bold text-ink">{rating}/5</span>
                ) : (
                  <span className="text-[12px] text-slate">Sin puntuar</span>
                )}
              </div>
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Sitio Web</label>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-cloud border border-line focus-within:border-ink focus-within:bg-white">
              <ExternalLink size={16} className="text-slate shrink-0" />
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full bg-transparent text-[13.5px] outline-none text-ink font-medium"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Fotografía</label>
            {image ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-cloud border border-line shadow-xs">
                <img src={image} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxImg(image)} />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/70 backdrop-blur-xs text-white flex items-center justify-center hover:bg-ink transition-colors"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={() => document.getElementById("rest-edit-image-input").click()}
                  className="absolute bottom-2 right-2 rounded-xl px-3 py-1.5 text-[11.5px] font-bold text-white bg-ink/80 backdrop-blur-xs shadow-xs"
                >
                  {uploading ? "Subiendo..." : "Cambiar foto"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => document.getElementById("rest-edit-image-input").click()}
                className="w-full h-20 rounded-2xl border-2 border-dashed border-line flex items-center justify-center gap-2 text-slate hover:text-ink hover:border-slate/40 transition-colors bg-cloud/50 font-medium"
              >
                <ImagePlus size={18} />
                <span className="text-[13px]">{uploading ? "Subiendo foto..." : "Subir fotografía"}</span>
              </button>
            )}
            <input id="rest-edit-image-input" type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat === category ? "" : cat)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[12px] font-bold transition-all border ${
                    category === cat
                      ? "border-transparent text-white shadow-xs"
                      : "bg-cloud text-slate border-line hover:border-slate/30"
                  }`}
                  style={{
                    background: category === cat ? accentColor : undefined,
                  }}
                >
                  <CategoryIcon category={cat} size={18} />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-line bg-cloud/40 flex items-center gap-3 shrink-0">
          <button
            onClick={() => { onDelete(restaurant.id); onClose(); }}
            className="flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-[13.5px] font-bold bg-white text-coral border border-coral/30 hover:bg-coral/10 active:scale-95 transition-all shadow-xs"
          >
            <Trash2 size={16} />
            <span>Eliminar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !category}
            className="flex-1 rounded-2xl py-3.5 text-[14.5px] font-bold text-white shadow-soft active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: accentColor }}
          >
            <Check size={16} />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 backdrop-blur-md p-4 animate-fade-in" onClick={() => setLightboxImg(null)}>
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
          <img src={lightboxImg} alt="" className="max-w-[92vw] max-h-[85vh] object-contain rounded-3xl shadow-sheet" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
