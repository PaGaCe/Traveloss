"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";

function numberIcon(number, color) {
  return L.divIcon({
    html: `<div style="background:${color};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${number}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function DayMap({ items, color }) {
  const points = items.filter((i) => typeof i.lat === "number" && typeof i.lng === "number");
  const [routeCoords, setRouteCoords] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      if (points.length < 2) {
        setRouteCoords([]);
        return;
      }
      // OSRM demo server público: calcula la ruta real punto a punto en orden.
      const coordsParam = points.map((p) => `${p.lng},${p.lat}`).join(";");
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (!cancelled && data.routes && data.routes[0]) {
          const latlngs = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRouteCoords(latlngs);
        }
      } catch (err) {
        console.error("No se pudo calcular la ruta:", err);
        if (!cancelled) setRouteCoords([]);
      }
    }

    fetchRoute();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => [p.lat, p.lng]))]);

  if (points.length === 0) {
    return (
      <p className="text-center text-[13px] mt-10 text-slate">
        Añade coordenadas a las actividades de este día para verlas en el mapa.
      </p>
    );
  }

  const center = [points[0].lat, points[0].lng];

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm bg-white mb-3">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: 280, width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} pathOptions={{ color, weight: 4, opacity: 0.8, dashArray: "1 8" }} />
        )}
        {points.map((p, i) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={numberIcon(i + 1, color)}>
            <Popup>{p.title}</Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="p-3 flex flex-col gap-1.5">
        {points.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 text-[12px] text-muted">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: color }}
            >
              {i + 1}
            </span>
            {p.title}
          </div>
        ))}
      </div>
      <p className="px-3 pb-3 text-[10.5px] text-slate">
        Ruta calculada con OpenStreetMap/OSRM (servidor de demo público — para tráfico alto en producción,
        conviene alojar tu propio OSRM o usar un servicio de pago).
      </p>
    </div>
  );
}
