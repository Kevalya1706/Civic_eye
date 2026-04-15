import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TicketRow } from "@/hooks/useTickets";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function getPinColor(score: number) {
  if (score >= 80) return "#ef4444";
  if (score >= 50) return "#eab308";
  return "#22c55e";
}

function createPinIcon(score: number) {
  const color = getPinColor(score);
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">${Math.round(score)}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface Props {
  tickets: TicketRow[];
  onTicketSelect?: (id: string) => void;
  selectedTicketId?: string | null;
  showHeatmap: boolean;
}

export default function AdminMap({ tickets, onTicketSelect, selectedTicketId, showHeatmap }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([19.8762, 75.3433], 13);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri Satellite",
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OSM",
      maxZoom: 19,
      opacity: 0.35,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }

    if (tickets.length === 0) return;

    if (showHeatmap) {
      try {
        const heat = (L as any).heatLayer(
          tickets.map(t => [t.lat, t.lng, t.priority_score / 100]),
          { radius: 35, blur: 25, maxZoom: 17, gradient: { 0.2: "#22c55e", 0.5: "#eab308", 0.8: "#ef4444", 1: "#dc2626" } }
        );
        heat.addTo(map);
        heatLayerRef.current = heat;
      } catch { /* heat plugin not loaded */ }
    } else {
      tickets.forEach(t => {
        const marker = L.marker([t.lat, t.lng], { icon: createPinIcon(t.priority_score) });
        marker.bindPopup(`<strong>${t.category}</strong><br/>${t.address}<br/>S-Score: ${Math.round(t.priority_score)}`);
        marker.on("click", () => onTicketSelect?.(t.id));

        // 10m accuracy circle
        const circle = L.circle([t.lat, t.lng], {
          radius: 10, color: getPinColor(t.priority_score), fillOpacity: 0.12, weight: 1, dashArray: "4",
        });

        markers.addLayer(marker);
        markers.addLayer(circle);

        if (t.id === selectedTicketId) {
          marker.openPopup();
        }
      });
    }

    // Fit bounds
    if (tickets.length > 0) {
      const bounds = L.latLngBounds(tickets.map(t => [t.lat, t.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [tickets, showHeatmap, selectedTicketId, onTicketSelect]);

  return <div ref={mapRef} className="h-full w-full rounded-xl" />;
}
