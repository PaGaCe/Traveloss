"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export default function DayMap({ items = [], color = "#0B0F19" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  const points = items.filter((i) => typeof i.lat === "number" && typeof i.lng === "number");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || points.length === 0) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const center = [points[0].lat, points[0].lng];
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(center, 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      points.forEach((p, i) => {
        const icon = L.divIcon({
          html: `<div style="background:${color || '#0B0F19'};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${i + 1}</div>`,
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([p.lat, p.lng], { icon })
          .bindPopup(`<b>${p.title || "Lugar"}</b>${p.place ? `<br/><span style="font-size:11px;color:#64748B">${p.place}</span>` : ""}`)
          .addTo(map);
      });

      if (points.length > 1) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [36, 36] });

        const coordsParam = points.map((p) => `${p.lng},${p.lat}`).join(";");
        fetch(`https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`)
          .then((res) => res.json())
          .then((data) => {
            if (!cancelled && mapRef.current && data?.routes?.[0]) {
              const latlngs = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
              L.polyline(latlngs, { color: color || "#0B0F19", weight: 4, opacity: 0.85, dashArray: "2 6" }).addTo(mapRef.current);
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, JSON.stringify(points.map((p) => [p.lat, p.lng])), color]);

  if (points.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-line shadow-soft">
        <p className="text-[13px] text-slate">
          Añade coordenadas o busca ubicación en las actividades de este día para verlas en el mapa interactivo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden shadow-soft bg-white border border-line mb-4">
      <div ref={containerRef} className="w-full h-[280px] bg-slate/10 relative z-0" />
      <div className="p-4 flex flex-col gap-2 border-t border-line">
        {points.map((p, i) => (
          <div key={p.id || i} className="flex items-center gap-2.5 text-[13px] text-ink font-medium">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs"
              style={{ background: color || "#0B0F19" }}
            >
              {i + 1}
            </span>
            <span className="truncate">{p.title}</span>
            {p.place && (
              <span className="text-[11px] text-slate truncate ml-auto">{p.place}</span>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 pb-3 flex items-center justify-between text-[11px] text-slate">
        <span>Ruta punto a punto calculada con OpenStreetMap</span>
      </div>
    </div>
  );
}
