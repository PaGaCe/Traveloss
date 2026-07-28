"use client";

import { useState } from "react";
import { Utensils, MapPin, X, ImagePlus, Trash2, ExternalLink } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";

const CATEGORIES = [
  "Desayuno", "Café", "Cocktel", "Italiano", "Asiático",
  "Helados", "Hamburguesas", "Mexicano", "Mediterráneo", "Tapas",
  "Pizza", "Sushi", "Parrilla", "Saludable", "Otros",
];

const PRICES = ["€", "€€", "€€€", "€€€€"];

export default function RestaurantDetailSheet({ restaurant, onClose, onUpdate, onDelete, accentColor }) {
  const [name, setName] = useState(restaurant.name || "");
  const [place, setPlace] = useState(restaurant.place || "");
  const [category, setCategory] = useState(restaurant.category || "");
  const [price, setPrice] = useState(restaurant.price || 0);
  const [rating, setRating] = useState(restaurant.rating || 0);
  const [website, setWebsite] = useState(restaurant.website || "");
  const [image, setImage] = useState(restaurant.image || null);
  const [uploading, setUploading] = useState(false);

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
        } catch (storageErr) {
          console.warn("Storage upload failed, using inline image:", storageErr);
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
      category,
      price: price || undefined,
      rating: rating || undefined,
      website: website.trim() || undefined,
      image: image || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative rounded-3xl px-5 pt-5 pb-6 z-10 max-h-[85%] overflow-y-auto bg-cloud max-w-lg mx-4 w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-ink font-display">Editar restaurante</h2>
          <button onClick={onClose}>
            <X size={20} className="text-slate" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none bg-white text-ink border border-line"
          />

          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line">
            <MapPin size={15} className="text-slate shrink-0" />
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Dirección o ubicación"
              className="w-full bg-transparent text-[13px] outline-none text-ink"
            />
          </div>

          {/* Price */}
          <div className="flex gap-1.5">
            {PRICES.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrice(price === i + 1 ? 0 : i + 1)}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  background: price === i + 1 ? accentColor : "#F4F4F7",
                  color: price === i + 1 ? "white" : "#5A6478",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted">Valoración:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s === rating ? 0 : s)}
                  className="p-0.5 transition-transform active:scale-90"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={s <= rating ? "#FBA006" : "none"} stroke={s <= rating ? "#FBA006" : "#C5CAD6"} strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>
            {rating > 0 && <span className="text-[12px] text-muted">{rating}/5</span>}
          </div>

          {/* Website */}
          <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line">
            <ExternalLink size={14} className="text-slate shrink-0" />
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Web del restaurante (opcional)"
              className="w-full bg-transparent text-[13px] outline-none text-ink"
            />
          </div>

          {/* Image */}
          {image ? (
            <div className="relative w-full h-32 rounded-xl overflow-hidden bg-white border border-line">
              <img src={image} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setImage(null)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X size={12} className="text-white" />
              </button>
              <button
                onClick={() => document.getElementById("rest-edit-image-input").click()}
                className="absolute bottom-2 right-2 rounded-full px-3 py-1 text-[11px] font-medium text-white bg-black/60"
              >
                {uploading ? "Subiendo..." : "Cambiar foto"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => document.getElementById("rest-edit-image-input").click()}
              className="w-full h-24 rounded-xl border-2 border-dashed border-line flex items-center justify-center gap-1.5 text-slate hover:text-muted transition-colors"
            >
              <ImagePlus size={16} />
              <span className="text-[12px]">{uploading ? "Subiendo..." : "Añadir foto"}</span>
            </button>
          )}
          <input id="rest-edit-image-input" type="file" accept="image/*" className="hidden" onChange={handleImagePick} />

          {/* Category */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat === category ? "" : cat)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: category === cat ? accentColor : "#F4F4F7",
                  color: category === cat ? "white" : "#5A6478",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => { onDelete(restaurant.id); onClose(); }}
            className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 text-[13px] font-medium bg-coral text-white"
          >
            <Trash2 size={13} /> Eliminar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !category}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-opacity"
            style={{ background: accentColor, opacity: name.trim() && category ? 1 : 0.5 }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
