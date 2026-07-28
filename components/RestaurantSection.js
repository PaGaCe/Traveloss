"use client";

import { useState } from "react";
import { Utensils, MapPin, X, ImagePlus, Trash2 } from "lucide-react";
import { compressImage } from "../lib/compressImage";

const CATEGORIES = [
  "Desayuno",
  "Café",
  "Cocktel",
  "Italiano",
  "Asiático",
  "Helados",
  "Hamburguesas",
  "Mexicano",
  "Mediterráneo",
  "Tapas",
  "Pizza",
  "Sushi",
  "Parrilla",
  "Saludable",
  "Otros",
];

export default function RestaurantSection({ trip, accentColor, onUpdateTrip }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const restaurants = trip.restaurants || [];

  const filtered = filter
    ? restaurants.filter((r) => r.category === filter)
    : restaurants;

  async function handleImagePick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 800, quality: 0.65 });
      setImage(dataUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  function handleAdd() {
    if (!name.trim() || !category) return;
    const newRest = {
      id: `r${Date.now()}`,
      name: name.trim(),
      place: place.trim() || undefined,
      category,
      image: image || undefined,
    };
    onUpdateTrip({ restaurants: [...restaurants, newRest] });
    setName("");
    setPlace("");
    setCategory("");
    setImage(null);
    setShowAdd(false);
  }

  function handleDelete(id) {
    onUpdateTrip({ restaurants: restaurants.filter((r) => r.id !== id) });
  }

  return (
    <div className="px-1 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-xl text-white transition-all active:scale-95"
          style={{ background: accentColor }}
        >
          <Utensils size={14} />
          Añadir restaurante
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-cloud rounded-2xl border border-line p-4 mb-4">
          <p className="text-[14px] font-semibold text-ink font-display mb-3">Nuevo restaurante</p>
          <div className="flex flex-col gap-2.5">
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
            {/* Image picker */}
            {image ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden bg-white border border-line">
                <img src={image} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => document.getElementById("rest-image-input").click()}
                className="w-full h-20 rounded-xl border-2 border-dashed border-line flex items-center justify-center gap-1.5 text-slate hover:text-muted transition-colors"
              >
                <ImagePlus size={16} />
                <span className="text-[12px]">{uploading ? "Subiendo..." : "Añadir foto"}</span>
              </button>
            )}
            <input
              id="rest-image-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            {/* Category selector */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === category ? "" : cat)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
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
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-medium bg-cloud text-slate border border-line"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !category}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-opacity"
              style={{ background: accentColor, opacity: name.trim() && category ? 1 : 0.5 }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      {restaurants.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setFilter("")}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: !filter ? accentColor : "#F4F4F7",
              color: !filter ? "white" : "#5A6478",
            }}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => {
            const count = restaurants.filter((r) => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? "" : cat)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: filter === cat ? accentColor : "#F4F4F7",
                  color: filter === cat ? "white" : "#5A6478",
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {restaurants.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${accentColor}18` }}
          >
            <Utensils size={28} style={{ color: accentColor }} />
          </div>
          <p className="text-[14px] text-slate text-center">
            Añade restaurantes, bares y cafeterías para organizar tus comidas
          </p>
        </div>
      )}

      {/* Restaurant list */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map((rest) => (
            <div
              key={rest.id}
              className="bg-cloud rounded-2xl border border-line p-3.5 flex items-start gap-3"
            >
              {rest.image ? (
                <img
                  src={rest.image}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white border border-line flex items-center justify-center shrink-0">
                  <Utensils size={18} className="text-slate" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink">{rest.name}</p>
                {rest.place && (
                  <p className="text-[12px] text-slate flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {rest.place}
                  </p>
                )}
                <span
                  className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${accentColor}18`, color: accentColor }}
                >
                  {rest.category}
                </span>
              </div>
              <button
                onClick={() => handleDelete(rest.id)}
                className="p-1.5 rounded-lg hover:bg-white/60 text-line hover:text-coral transition-colors shrink-0"
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
