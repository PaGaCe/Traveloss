"use client";

import { useState } from "react";
import { Utensils, MapPin, Star, X, ImagePlus, Trash2, ExternalLink, MoreHorizontal, Pencil } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import RestaurantDetailSheet from "./RestaurantDetailSheet";

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

const PRICES = ["€", "€€", "€€€", "€€€€"];

function StarRating({ value, onChange, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s === value ? 0 : s)}
          className="p-0.5 transition-transform active:scale-90"
        >
          <Star
            size={size}
            fill={s <= value ? "#FBA006" : "none"}
            className={s <= value ? "text-gold" : "text-line"}
          />
        </button>
      ))}
    </div>
  );
}

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

function CategoryIcon({ category, size = 20 }) {
  const idx = CATEGORIES.indexOf(category);
  if (idx === -1) {
    return <Utensils size={size} />;
  }
  return (
    <img
      src={`/${CATEGORY_FILES[idx]}.png`}
      alt={category}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

function openGoogleMaps(name, place) {
  const q = encodeURIComponent(`${name} ${place || ""}`.trim());
  window.open(`https://www.google.com/maps/search/${q}`, "_blank");
}

export default function RestaurantSection({ trip, accentColor, onUpdateTrip }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [rating, setRating] = useState(0);
  const [website, setWebsite] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const restaurants = trip.restaurants || [];

  const filtered = filter
    ? restaurants.filter((r) => r.category === filter)
    : restaurants;

  let sorted = [...filtered];
  if (sortBy === "price_asc") sorted.sort((a, b) => (a.price || 99) - (b.price || 99));
  if (sortBy === "price_desc") sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
  if (sortBy === "rating_desc") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sortBy === "rating_asc") sorted.sort((a, b) => (a.rating || 99) - (b.rating || 99));

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

  function resetForm() {
    setName("");
    setPlace("");
    setCategory("");
    setPrice(0);
    setRating(0);
    setWebsite("");
    setImage(null);
    setShowAdd(false);
  }

  function handleAdd() {
    if (!name.trim() || !category) return;
    const newRest = {
      id: `r${Date.now()}`,
      name: name.trim(),
      place: place.trim() || undefined,
      category,
      price: price || undefined,
      rating: rating || undefined,
      website: website.trim() || undefined,
      image: image || undefined,
    };
    try {
      onUpdateTrip({ restaurants: [...restaurants, newRest] });
    } catch (err) {
      console.error("Error al guardar restaurante:", err);
    }
    resetForm();
  }

  function handleDelete(id) {
    onUpdateTrip({ restaurants: restaurants.filter((r) => r.id !== id) });
  }

  function handleUpdate(id, updates) {
    onUpdateTrip({
      restaurants: restaurants.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  }

  function formatPrice(level) {
    if (!level) return null;
    return PRICES[level - 1] || "€".repeat(level);
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
            {/* Price selector */}
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
            {/* Rating selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted">Valoración:</span>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <span className="text-[12px] text-muted">{rating}/5</span>
              )}
            </div>
            {/* Website URL */}
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-white border border-line">
              <ExternalLink size={14} className="text-slate shrink-0" />
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Web del restaurante (opcional)"
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
                  type="button"
                  onClick={() => setCategory(cat === category ? "" : cat)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: category === cat ? accentColor : "#F4F4F7",
                    color: category === cat ? "white" : "#5A6478",
                  }}
                >
                  <CategoryIcon category={cat} size={26} />
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={resetForm}
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              background: !filter ? accentColor : "#F4F4F7",
              color: !filter ? "white" : "#5A6478",
            }}
          >
            <MoreHorizontal size={13} />
            Todos
          </button>
          {CATEGORIES.map((cat) => {
            const count = restaurants.filter((r) => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? "" : cat)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: filter === cat ? accentColor : "#F4F4F7",
                  color: filter === cat ? "white" : "#5A6478",
                }}
              >
                <CategoryIcon category={cat} size={36} />
              </button>
            );
          })}
        </div>
      )}

      {/* Sort options */}
      {restaurants.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4 text-[11px]">
          <span className="text-muted font-medium">Ordenar:</span>
          {[
            { key: "default", label: "Por defecto" },
            { key: "price_desc", label: "Precio ↑" },
            { key: "price_asc", label: "Precio ↓" },
            { key: "rating_desc", label: "Valoración ↑" },
            { key: "rating_asc", label: "Valoración ↓" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className="px-2 py-1 rounded-lg font-medium transition-all"
              style={{
                background: sortBy === opt.key ? accentColor : "#F4F4F7",
                color: sortBy === opt.key ? "white" : "#5A6478",
              }}
            >
              {opt.label}
            </button>
          ))}
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
      {sorted.length > 0 && (
        <div className="flex flex-col gap-2">
          {sorted.map((rest) => (
              <div
                key={rest.id}
                onClick={() => setEditingRestaurant(rest)}
                className="bg-cloud rounded-2xl border border-line p-3.5 flex items-start gap-3 cursor-pointer active:scale-[0.99] transition-transform"
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
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-ink">{rest.name}</p>
                  {rest.website && (
                    <a
                      href={rest.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate hover:text-teal transition-colors"
                      title="Abrir web del restaurante"
                    >
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                {rest.place && (
                  <p className="text-[12px] text-slate flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {rest.place}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${accentColor}18`, color: accentColor }}
                  >
                    <CategoryIcon category={rest.category} size={22} />
                    {rest.category}
                  </span>
                  {rest.price && (
                    <span className="text-[11px] font-medium text-muted">
                      {formatPrice(rest.price)}
                    </span>
                  )}
                  {rest.rating > 0 && (
                    <StarRating value={rest.rating} size={10} />
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                {rest.website ? (
                  <a
                    href={rest.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-white/60 text-slate hover:text-teal transition-colors"
                    title="Abrir web"
                  >
                    <ExternalLink size={13} />
                  </a>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); openGoogleMaps(rest.name, rest.place); }}
                    className="p-1.5 rounded-lg hover:bg-white/60 text-slate hover:text-teal transition-colors"
                    title="Buscar en Google Maps"
                  >
                    <MapPin size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingRestaurant && (
        <RestaurantDetailSheet
          restaurant={editingRestaurant}
          accentColor={accentColor}
          onClose={() => setEditingRestaurant(null)}
          onUpdate={(updates) => handleUpdate(editingRestaurant.id, updates)}
          onDelete={(id) => handleDelete(id)}
        />
      )}
    </div>
  );
}
