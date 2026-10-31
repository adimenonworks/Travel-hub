import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveColor } from '../../lib/colors';
import s from './shared.module.css';

export type MapPin = { lat: number; lng: number; label: string; color?: string; kind?: 'home' };

// Pins are bright fills with a dark ring so they stand out on light and dark map tiles alike.
const homeIcon = () => L.divIcon({
  className: s.homePin,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5"/></svg>`,
});

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
    // Leaflet draws with real colours, not CSS variables.
    const ring = resolveColor('var(--text-brand)');
    const accent = resolveColor('var(--surface-brand)');
    pins.forEach((p) => {
      const marker = p.kind === 'home'
        ? L.marker([p.lat, p.lng], { icon: homeIcon(), zIndexOffset: 1000 })
        : L.circleMarker([p.lat, p.lng], { radius: 9, weight: 3, color: ring, fillColor: p.color ? resolveColor(p.color) : accent, fillOpacity: 1 });
      marker.bindTooltip(p.label).addTo(g);
    });
    if (pins.length > 1) m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), { padding: [32, 32], maxZoom: 14 });
    else if (pins.length === 1) m.setView([pins[0].lat, pins[0].lng], center ? zoom : pins[0].kind === 'home' ? 5 : 13);
    else if (center) m.setView([center.lat, center.lng], zoom);
    else m.setView([20, 0], 1);
    // Leaflet measures its container once; re-measure after layout settles.
    setTimeout(() => m.invalidateSize(), 0);
  }, [key]);

  return <div ref={el} className={s.map} style={{ height }} role="region" aria-label="Map" />;
}
