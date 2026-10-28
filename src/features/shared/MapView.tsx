import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import s from './shared.module.css';

export type MapPin = { lat: number; lng: number; label: string; color?: string };

/** OpenStreetMap via Leaflet. Fits all pins, or centers on `center`. */
export function MapView({ pins, center, zoom = 12, height = 280 }: { pins: MapPin[]; center?: { lat: number; lng: number }; zoom?: number; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  const key = JSON.stringify([pins, center, zoom]);
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    pins.forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 8, weight: 3, color: '#fff', fillColor: p.color ?? '#007aff', fillOpacity: 1,
      }).bindTooltip(p.label).addTo(g);
    });
    if (pins.length > 1) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [32, 32], maxZoom: 14 });
    else if (pins.length === 1) m.setView([pins[0].lat, pins[0].lng], center ? zoom : 13);
    else if (center) m.setView([center.lat, center.lng], zoom);
    else m.setView([20, 0], 1);
    // Leaflet measures its container once; re-measure after layout settles.
    setTimeout(() => m.invalidateSize(), 0);
  }, [key]);

  return <div ref={el} className={s.map} style={{ height }} role="img" aria-label="Map" />;
}
