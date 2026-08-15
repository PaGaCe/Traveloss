"use client";

import { useRef, useState } from "react";
import { Utensils, MapPin, Star, X, ImagePlus, Trash2, ExternalLink, MoreHorizontal, Plus, ChevronDown, Check, Globe } from "lucide-react";
import { compressImage } from "../lib/compressImage";
import { uploadImageToFirebase } from "../lib/uploadImage";
import { firebaseReady } from "../lib/firebase";
import { useToast } from "./Toast";
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

function StarRating({ value, onChange, size = 15 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s === value ? 0 : s)}
          className="p-0.5 transition-transform active:scale-90"
        >
          <Star
            size={size}
            fill={s <= value ? "#F59E0B" : "none"}
            className={s <= value ? "text-amber-500" : "text-line"}
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

function RestaurantCard({ rest, accentColor, openGoogleMaps, setEditingRestaurant, setLightboxImg, formatPrice }) {
  return (
    <div
      onClick={() => setEditingRestaurant(rest)}
      className="bg-white rounded-3xl border border-line p-4 flex items-center gap-3.5 cursor-pointer shadow-soft hover:shadow-card active:scale-[0.99] transition-all group"
    >
      {rest.image ? (
        <img
          src={rest.image}
          alt=""
          className="w-16 h-16 rounded-2xl object-cover shrink-0 cursor-pointer shadow-xs border border-line"
          onClick={(e) => { e.stopPropagation(); setLightboxImg(rest.image); }}
        />
      ) : (
        <div
          className="w-16 h-16 rounded-2xl border border-line flex items-center justify-center shrink-0 shadow-xs"
          style={{ background: `${accentColor}0D` }}
        >
          <CategoryIcon category={rest.category} size={28} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14.5px] font-bold text-ink truncate group-hover:text-teal transition-colors">{rest.name}</p>
          {rest.website && (
            <a
              href={rest.website.startsWith("http") ? rest.website : `https://${rest.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate hover:text-teal transition-colors p-1"
              title="Abrir web del restaurante"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {rest.place && (
          <p className="text-[12px] text-slate flex items-center gap-1 mt-0.5 truncate font-medium">
            <MapPin size={12} className="shrink-0 text-slate" /> {rest.place}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: `${accentColor}14`, color: accentColor }}
          >
            <CategoryIcon category={rest.category} size={14} />
            {rest.category}
          </span>
          {rest.zone && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-cloud text-slate border border-line">
              <Globe size={11} />
              {rest.zone}
            </span>
          )}
          {rest.price && (
            <span className="text-[11.5px] font-bold text-ink px-1.5 py-0.5 bg-cloud rounded-lg">
              {formatPrice(rest.price)}
            </span>
          )}
          {rest.rating > 0 && (
            <div className="flex items-center gap-1 ml-auto sm:ml-0">
              <Star size={12} fill="#F59E0B" className="text-amber-500" />
              <span className="text-[11.5px] font-bold text-ink">{rest.rating}/5</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
        <button
          onClick={(e) => { e.stopPropagation(); openGoogleMaps(rest.name, rest.place); }}
          className="w-8 h-8 rounded-xl bg-cloud hover:bg-white text-slate hover:text-teal flex items-center justify-center transition-colors border border-line"
          title="Ver en Google Maps"
        >
          <MapPin size={14} />
        </button>
      </div>
    </div>
  );
}

export default function RestaurantSection({ trip, accentColor = "#0B0F19", onUpdateTrip }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [filter, setFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [zone, setZone] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [rating, setRating] = useState(0);
  const [website, setWebsite] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const addToast = useToast();

  const restaurants = trip.restaurants || [];
  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;

  const zones = [...new Set(restaurants.map((r) => r.zone).filter(Boolean))].sort();

  const filtered = restaurants.filter((r) => {
    if (filter && r.category !== filter) return false;
    if (zoneFilter && r.zone !== zoneFilter) return false;
    return true;
  });

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

  function resetForm() {
    setName("");
    setPlace("");
    setZone("");
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
      zone: zone.trim() || undefined,
      category,
      price: price || undefined,
      rating: rating || undefined,
      website: website.trim() || undefined,
      image: image || undefined,
    };
    try {
      onUpdateTrip({ restaurants: [...restaurants, newRest] });
      addToast("Restaurante añadido correctamente", "success");
    } catch (err) {
      addToast("Error al guardar restaurante", "error");
    }
    resetForm();
  }

  function handleDelete(id) {
    const current = restaurantsRef.current;
    onUpdateTrip({ restaurants: current.filter((r) => r.id !== id) });
    addToast("Restaurante eliminado", "success");
  }

  function handleUpdate(id, updates) {
    const current = restaurantsRef.current;
    onUpdateTrip({
      restaurants: current.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  }

  function formatPrice(level) {
    if (!level) return null;
    return PRICES[level - 1] || "€".repeat(level);
  }

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-ink font-display">Gastronomía y Restaurantes</h2>
          <p className="text-[12.5px] text-slate font-medium">Lugares recomendados, cafeterías y bares</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-[13px] font-bold px-4 py-2.5 rounded-2xl text-white shadow-soft hover:shadow-card active:scale-95 transition-all"
          style={{ background: accentColor }}
        >
          <Plus size={15} />
          <span>Añadir</span>
        </button>
      </div>

      {/* Add form card */}
      {showAdd && (
        <div className="bg-white rounded-3xl border border-line p-5 shadow-card animate-slide-up space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <p className="text-[15px] font-bold text-ink font-display">Nuevo restaurante o café</p>
            <button onClick={resetForm} className="text-slate hover:text-ink p-1">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Osteria Francescana"
                className="w-full rounded-2xl px-4 py-3 text-[13.5px] outline-none bg-cloud text-ink border border-line focus:border-ink focus:bg-white font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Ubicación</label>
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
                    placeholder="Ej. Centro, Trastevere..."
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
                <div className="flex items-center gap-3 bg-cloud rounded-2xl px-4 py-2.5 border border-line">
                  <StarRating value={rating} onChange={setRating} size={18} />
                  {rating > 0 ? (
                    <span className="text-[13px] font-bold text-ink">{rating}/5</span>
                  ) : (
                    <span className="text-[12px] text-slate">Sin puntuar</span>
                  )}
                </div>
              </div>
            </div>

            {/* Website URL */}
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

            {/* Image picker */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1 block">Foto o menú</label>
              {image ? (
                <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-cloud border border-line shadow-xs">
                  <img src={image} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxImg(image)} />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/70 backdrop-blur-xs text-white flex items-center justify-center hover:bg-ink transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => document.getElementById("rest-image-input").click()}
                  className="w-full h-20 rounded-2xl border-2 border-dashed border-line flex items-center justify-center gap-2 text-slate hover:text-ink hover:border-slate/40 transition-colors bg-cloud/50 font-medium"
                >
                  <ImagePlus size={18} />
                  <span className="text-[13px]">{uploading ? "Subiendo foto..." : "Subir fotografía del local o platos"}</span>
                </button>
              )}
              <input
                id="rest-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />
            </div>

            {/* Category selector */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1.5 block">Categoría de comida</label>
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

          <div className="flex gap-3 pt-3 border-t border-line">
            <button
              onClick={resetForm}
              className="flex-1 rounded-2xl py-3 text-[13.5px] font-bold bg-cloud text-slate border border-line hover:bg-line/40 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !category}
              className="flex-1 rounded-2xl py-3 text-[13.5px] font-bold text-white shadow-soft active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: accentColor }}
            >
              <Check size={16} />
              <span>Guardar restaurante</span>
            </button>
          </div>
        </div>
      )}

      {/* Category filter scroll */}
      {restaurants.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter("")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold transition-all whitespace-nowrap border ${
              !filter ? "border-transparent text-white shadow-xs" : "bg-white text-slate border-line hover:border-slate/30"
            }`}
            style={{
              background: !filter ? accentColor : undefined,
            }}
          >
            <MoreHorizontal size={14} />
            <span>Todos</span>
          </button>
          {CATEGORIES.map((cat) => {
            const count = restaurants.filter((r) => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? "" : cat)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12px] font-bold transition-all whitespace-nowrap border ${
                  filter === cat ? "border-transparent text-white shadow-xs" : "bg-white text-slate border-line hover:border-slate/30"
                }`}
                style={{
                  background: filter === cat ? accentColor : undefined,
                }}
              >
                <CategoryIcon category={cat} size={18} />
                <span>{cat}</span>
                <span className="text-[10px] opacity-70 ml-0.5 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Zone filter & Sort Bar */}
      {restaurants.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Zone filter */}
          {zones.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                onClick={() => setZoneFilter("")}
                className={`px-3 py-1.5 rounded-xl text-[11.5px] font-semibold transition-all whitespace-nowrap border ${
                  !zoneFilter ? "bg-ink text-white border-ink" : "bg-white text-slate border-line"
                }`}
              >
                Todas las zonas
              </button>
              {zones.map((z) => {
                const count = restaurants.filter((r) => r.zone === z).length;
                return (
                  <button
                    key={z}
                    onClick={() => setZoneFilter(zoneFilter === z ? "" : z)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold transition-all whitespace-nowrap border ${
                      zoneFilter === z ? "bg-ink text-white border-ink" : "bg-white text-slate border-line"
                    }`}
                  >
                    <span>{z}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          ) : <div />}

          {/* Sort selector */}
          <div className="flex items-center gap-1.5 text-[11.5px] shrink-0 self-end sm:self-auto">
            <span className="text-slate font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-line rounded-xl px-2.5 py-1.5 text-[12px] font-semibold text-ink outline-none cursor-pointer"
            >
              <option value="default">Por defecto</option>
              <option value="rating_desc">Mayor valoración ★</option>
              <option value="rating_asc">Menor valoración ★</option>
              <option value="price_asc">Menor precio €</option>
              <option value="price_desc">Mayor precio €</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty state */}
      {restaurants.length === 0 && !showAdd && (
        <div className="bg-white rounded-3xl border border-line p-10 text-center shadow-soft flex flex-col items-center justify-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3 shadow-xs"
            style={{ background: `${accentColor}14` }}
          >
            <Utensils size={28} style={{ color: accentColor }} />
          </div>
          <h3 className="text-[16px] font-bold text-ink font-display mb-1">Sin restaurantes guardados</h3>
          <p className="text-[13px] text-slate max-w-sm mb-5">
            Añade tus cafeterías, bares de tapas o restaurantes favoritos para tenerlos siempre a mano en el mapa.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[13.5px] font-bold text-white shadow-soft hover:shadow-card active:scale-95 transition-all"
            style={{ background: accentColor }}
          >
            <Plus size={16} />
            <span>Añadir primer restaurante</span>
          </button>
        </div>
      )}

      {/* Restaurant list */}
      {sorted.length > 0 && (
        <div className="space-y-4">
          {zoneFilter ? (
            /* Single zone view */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sorted.map((rest) => (
                <RestaurantCard
                  key={rest.id}
                  rest={rest}
                  accentColor={accentColor}
                  openGoogleMaps={openGoogleMaps}
                  setEditingRestaurant={setEditingRestaurant}
                  setLightboxImg={setLightboxImg}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
          ) : (
            /* Grouped by zone */
            (() => {
              const grouped = {};
              const noZone = [];
              for (const r of sorted) {
                if (r.zone) {
                  if (!grouped[r.zone]) grouped[r.zone] = [];
                  grouped[r.zone].push(r);
                } else {
                  noZone.push(r);
                }
              }
              const zoneNames = Object.keys(grouped).sort();
              return (
                <div className="space-y-6">
                  {zoneNames.map((z) => (
                    <div key={z} className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Globe size={15} style={{ color: accentColor }} />
                        <span className="text-[14px] font-bold text-ink font-display">{z}</span>
                        <span className="text-[11.5px] font-semibold text-slate bg-cloud px-2 py-0.5 rounded-full border border-line">
                          {grouped[z].length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {grouped[z].map((rest) => (
                          <RestaurantCard
                            key={rest.id}
                            rest={rest}
                            accentColor={accentColor}
                            openGoogleMaps={openGoogleMaps}
                            setEditingRestaurant={setEditingRestaurant}
                            setLightboxImg={setLightboxImg}
                            formatPrice={formatPrice}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {noZone.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-[14px] font-bold text-slate font-display">Otros lugares</span>
                        <span className="text-[11.5px] font-semibold text-slate bg-cloud px-2 py-0.5 rounded-full border border-line">
                          {noZone.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {noZone.map((rest) => (
                          <RestaurantCard
                            key={rest.id}
                            rest={rest}
                            accentColor={accentColor}
                            openGoogleMaps={openGoogleMaps}
                            setEditingRestaurant={setEditingRestaurant}
                            setLightboxImg={setLightboxImg}
                            formatPrice={formatPrice}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
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
