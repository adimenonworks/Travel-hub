import { getMapsApp, type MapsApp } from './prefs';
import type { Place } from '../data/types';

/** City / region search (Open-Meteo geocoding — free, no key). */
export async function searchCities(q: string, signal?: AbortSignal): Promise<Place[]> {
  if (q.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&name=${encodeURIComponent(q.trim())}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('City search failed');
  const data = (await res.json()) as { results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string }[] };
  return (data.results ?? []).map((r) => ({
    name: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lng: r.longitude,
    country: r.country,
  }));
}

/**
 * Address / venue lookup (OpenStreetMap Nominatim). Their policy allows ~1
 * request per second, so only call this on submit, never per keystroke.
 */
export async function geocodePlace(q: string, near?: Place | null): Promise<Place | null> {
  if (!q.trim()) return null;
  const params = new URLSearchParams({ q: q.trim(), format: 'jsonv2', limit: '1' });
  if (near) {
    const d = 0.5; // bias to roughly 50km around the destination
    params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    return hit ? { name: hit.display_name, lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

/** A link that opens the place in the person's chosen maps app (Profile → Maps). */
export function mapsUrl(q: string, p?: Place | null, app: MapsApp = getMapsApp()) {
  const text = encodeURIComponent(q);
  const ll = p ? `${p.lat},${p.lng}` : '';
  if (app === 'apple') return p ? `https://maps.apple.com/?ll=${ll}&q=${text || ll}` : `https://maps.apple.com/?q=${text}`;
  if (app === 'waze') return p ? `https://waze.com/ul?ll=${ll}&navigate=yes` : `https://waze.com/ul?q=${text}&navigate=yes`;
  return `https://www.google.com/maps/search/?api=1&query=${p ? ll : text}`;
}

/** Opens Uber (app or website) with the place as the drop-off and the rider's current location as pickup. */
export function uberUrl(q: string, p?: Place | null) {
  const u = new URLSearchParams({ action: 'setPickup', pickup: 'my_location' });
  if (p) {
    u.set('dropoff[latitude]', String(p.lat));
    u.set('dropoff[longitude]', String(p.lng));
    u.set('dropoff[nickname]', q || p.name);
  } else {
    u.set('dropoff[formatted_address]', q);
  }
  return `https://m.uber.com/ul/?${u}`;
}
