import { store } from '../data';
import type { LinkPreview } from '../data/types';
import { CapacitorHttp } from '@capacitor/core';
import { countryCodeOf, countryName } from './countries';
import { isNativeApp } from './native';

type FoundPlace = NonNullable<LinkPreview['place']>;

const FOOD = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court', 'ice_cream', 'biergarten', 'bakery', 'wine_bar'];
const STAY = ['hotel', 'hostel', 'guest_house', 'apartment', 'motel', 'chalet', 'camp_site'];
const MOVE = ['station', 'halt', 'bus_station', 'ferry_terminal', 'aerodrome'];

type PhotonFeature = { properties: Record<string, string | undefined>; geometry: { coordinates: [number, number] } };

/** A postcode ("7000", "SW1A 1AA", "H2X 1Y4") is never a city. */
export const looksLikePostcode = (s: string) => /^\s*\d{3,6}\s*$/.test(s) || /^\s*[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\s*$/i.test(s) || /^\s*[A-Z]\d[A-Z]\s?\d[A-Z]\d\s*$/i.test(s);

/** The city from map data: the city, town or village, otherwise the state or province. Never a postcode or county. */
export function cityFrom(p: Record<string, string | undefined>) {
  return [p.city, p.town, p.village, p.state].find((x) => x && !looksLikePostcode(x)) ?? '';
}

function toPlace(f: PhotonFeature, fallback: string): FoundPlace | null {
  const p = f.properties;
  const code = (p.countrycode ?? '').toLowerCase();
  if (!code) return null;
  const area = p.osm_key === 'place' || p.osm_key === 'boundary';
  const v = p.osm_value ?? '';
  return {
    name: p.name ?? fallback,
    city: cityFrom(p),
    country: p.country ?? countryName(code),
    countryCode: code,
    lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
    type: area ? 'activity' : FOOD.includes(v) ? 'food' : STAY.includes(v) ? 'stay' : MOVE.includes(v) ? 'transport' : 'activity',
    kind: !area && v ? v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '',
    isArea: area,
    ...(p.osm_key === 'shop' || v === 'marketplace' || v === 'mall' ? { category: 'shop' as const } : {}),
  };
}

/** Search places (Photon, free, no key): restaurants, sights, hotels, cities and countries. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<FoundPlace[]> {
  if (q.trim().length < 2) return [];
  const ask = () => fetch(`https://photon.komoot.io/api/?${new URLSearchParams({ q: q.trim(), limit: '6', lang: 'en' })}`, { signal });
  let res = await ask();
  if (!res.ok && res.status >= 429) res = await ask(); // busy: one more try
  if (!res.ok) throw new Error('Place search is unavailable');
  const json = (await res.json()) as { features: PhotonFeature[] };
  // Postcode areas aren't places anyone saves.
  return json.features.filter((f) => f.properties.osm_value !== 'postcode').map((f) => toPlace(f, q)).filter((p): p is FoundPlace => !!p);
}

const SITES: [RegExp, string][] = [[/tiktok\.com$/, 'TikTok'], [/instagram\.com$/, 'Instagram'], [/youtube\.com$|youtu\.be$/, 'YouTube'], [/google\.[a-z.]+$|goo\.gl$/, 'Google Maps']];

/** The site a link is from, as people say it ("TikTok", "cntraveler.com"). */
export function siteOf(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SITES.find(([re]) => re.test(host))?.[1] ?? host;
  } catch { return ''; }
}

/**
 * What a Google Maps link says about its place: the name (just the name: Google often adds the full address after a
 * comma, e.g. "?q=Time Out Market, Av. 24 de Julho 49, Lisbon, Portugal"), that address, and the map coordinates
 * (the pin's own "!3d<lat>!4d<lng>", else the view's "@lat,lng"). A Google consent page's ?continue= link counts too.
 */
export function mapsInfo(url: URL): { name: string | null; address: string; lat?: number; lng?: number } | null {
  if (/consent\.google\./.test(url.hostname)) {
    const next = url.searchParams.get('continue');
    try { return next ? mapsInfo(new URL(next)) : null; } catch { return null; }
  }
  // Apple Maps: ?q=<name>&ll=<lat,lng>&address=…, or /place?name=&coordinate=&address=
  if (/(^|\.)maps\.apple\.com$/.test(url.hostname)) {
    const ps = url.searchParams;
    const ll = (ps.get('ll') ?? ps.get('coordinate') ?? ps.get('sll') ?? '').split(',').map(Number);
    const has = ll.length === 2 && ll.every(Number.isFinite);
    return { name: ps.get('name') ?? ps.get('q') ?? null, address: ps.get('address') ?? '', ...(has ? { lat: ll[0], lng: ll[1] } : {}) };
  }
  // Google: www.google.com/maps…, and maps.google.com/?q=… (what the Google Maps iPhone app's share links open)
  if (!/google\./.test(url.hostname) || !(url.pathname.includes('/maps') || /^maps\.google\./.test(url.hostname))) return null;
  const raw = url.pathname.match(/\/(?:place|search)\/([^/]+)/)?.[1] ?? url.searchParams.get('q') ?? url.searchParams.get('query') ?? url.searchParams.get('daddr');
  const text = raw ? decodeURIComponent(raw.replace(/\+/g, ' ')).trim() : '';
  const coordsOnly = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(text);
  const [first, ...rest] = coordsOnly ? [''] : text.split(/\s*,\s*/);
  const full = url.href;
  const pin = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const view = full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const q = coordsOnly ? text.split(',').map(Number) : null;
  const lat = pin ? +pin[1] : q ? q[0] : view ? +view[1] : undefined;
  const lng = pin ? +pin[2] : q ? q[1] : view ? +view[2] : undefined;
  return { name: first || null, address: rest.join(', '), lat, lng };
}

/** The place nearest a point (Photon reverse geocoding, free): gives the city and country for a map pin. */
async function placeAt(lat: number, lng: number): Promise<FoundPlace | null> {
  const res = await fetch(`https://photon.komoot.io/reverse?${new URLSearchParams({ lat: String(lat), lon: String(lng), lang: 'en' })}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { features: PhotonFeature[] };
  return json.features[0] ? toPlace(json.features[0], '') : null;
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/**
 * Find the place a link is about, so its country and city fill in by themselves.
 * With map coordinates: the search result for the name near the pin, else what's at the pin (named after the link).
 * Without: search the name with its address (more precise), then the name alone.
 */
async function findPlace(name: string, address = '', at?: { lat: number; lng: number }, kind = ''): Promise<FoundPlace | null> {
  try {
    if (at) {
      const near = name ? (await searchPlaces(name)).find((p) => km(p, at) < 2) : undefined;
      if (near) return near;
      const here = await placeAt(at.lat, at.lng);
      // Named: only the pin's city and country (the type and kind at the pin are a neighbour's)
      return here ? (name ? { ...here, name, lat: at.lat, lng: at.lng, isArea: false, kind, type: 'activity', category: undefined } : { ...here, lat: at.lat, lng: at.lng }) : null;
    }
    if (!name) return null;
    if (address) {
      // The name with its address, else the address alone (small places often aren't on the open map, but their street
      // is): it gives the right city and country. Never the name alone: "Lēoht, Battery Point TAS, Australia" searched
      // by name found "Leoh" in Ireland.
      const full = (await searchPlaces(`${name}, ${address}`))[0];
      if (full) return { ...full, name, ...(kind && !full.kind ? { kind } : {}) };
      const street = (await searchPlaces(address))[0] ?? (await searchPlaces(address.split(/\s*,\s*/).slice(1).join(', ')))[0];
      // only the street's city and country: its type and kind belong to whatever the map found there
      if (street) return { ...street, name, isArea: false, kind, type: 'activity', category: undefined };
      return fromAddress(name, address, kind);
    }
    return (await searchPlaces(name))[0] ?? null;
  } catch { return address ? fromAddress(name, address, kind) : null; } // offline or blocked
}

/**
 * Last resort when the map search is down: the country from the address's last part ("…, Australia") and the city
 * from the part before it, without its state and postcode ("Battery Point TAS 7004" → "Battery Point"). No map position.
 */
export function fromAddress(name: string, address: string, kind = ''): FoundPlace | null {
  const parts = address.split(/\s*,\s*/).filter(Boolean);
  const code = countryCodeOf({ name: parts[parts.length - 1] ?? '', lat: 0, lng: 0 });
  if (!code) return null;
  const city = (parts[parts.length - 2] ?? '').replace(/\s+[A-Z]{2,3}(\s+\d{3,6})?$|\s+\d{3,6}$/, '').trim();
  return { name, city: looksLikePostcode(city) ? '' : city, country: countryName(code), countryCode: code, lat: NaN, lng: NaN, type: 'activity', kind, isArea: false };
}

/** Google's page title for a place: "Lēoht · 4.4★(283) · Cafe" → its kind ("Cafe"). */
export function kindFromTitle(title: string) {
  const parts = title.split(/\s+·\s+/).slice(1).filter((p) => !/[★☆⭐]|^\d/.test(p));
  return parts.length ? parts[parts.length - 1].trim() : '';
}

/**
 * A place's name from a page title: drops ratings ("4.6★(2,104)"), addresses and site names after a separator
 * ("Time Out Market · Av. 24 de Julho 49, Lisbon" → "Time Out Market"), hashtags, emoji, and keeps the account name of
 * "Name (@handle) on Instagram: caption".
 */
export function cleanTitle(raw: string) {
  let t = raw.replace(/\s+/g, ' ').trim();
  t = t.replace(/^(.*?)\s+(?:\(@[^)]*\)\s+)?on (?:Instagram|TikTok)\b.*$/i, '$1');  // "Name on Instagram: caption" → the account name
  t = t.replace(/[#@][\p{L}\p{N}_]+/gu, ' ');                               // hashtags and handles
  t = t.replace(/\p{Extended_Pictographic}|\uFE0F/gu, ' ');                 // emoji
  const parts = t.split(/\s+[·|•–—]\s+|\s+-\s+|\s*[★☆⭐]|\s\d(?:[.,]\d)?\s*(?:stars?|★)|\s\(\d/);  // ratings, addresses, site names
  t = (parts.find((x) => x.trim() && !/^(tiktok|instagram|youtube|google maps|facebook)$/i.test(x.trim())) ?? parts[0]) ?? '';
  t = t.replace(/^["'“”‘’]+|["'“”‘’.,:;!]+$/g, '').replace(/\s+/g, ' ').trim();
  // "Name, 12 Some Street, City, Country" → "Name" (an address after the name has a number or several commas)
  const bits = t.split(/\s*,\s*/);
  if (bits.length > 1 && (bits.length > 2 || /\d/.test(bits.slice(1).join(' ')))) t = bits[0];
  return t.length > 60 ? `${t.slice(0, 57).replace(/\s+\S*$/, '')}…` : t;
}

/** The first web link in some text (a share often includes a caption). */
export function findUrl(text: string) {
  return text.match(/https?:\/\/[^\s<>"]+/)?.[0]?.replace(/[).,]+$/, '') ?? null;
}

const decode = (t: string) => {
  const el = document.createElement('textarea');
  el.innerHTML = t;
  return el.value.trim();
};

/** A page's preview tag (Open Graph / Twitter / description). */
function meta(html: string, ...names: string[]) {
  for (const n of names) {
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*>`, 'i'))?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decode(content);
  }
  return '';
}

/**
 * In the iPhone app: read the page itself (native networking isn't blocked the way a website's is), the same way the
 * readLink Cloud Function would: its preview tags, TikTok's public oEmbed, a Google Maps place, then one place search.
 * Free, and needs no server.
 */
async function readOnPhone(url: string): Promise<LinkPreview | null> {
  try {
    const res = await CapacitorHttp.get({
      url, responseType: 'text', connectTimeout: 8000, readTimeout: 8000,
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (Rove link preview)', Accept: 'text/html', 'Accept-Language': 'en' },
    });
    const finalUrl = res.url || url;
    const html = typeof res.data === 'string' ? res.data.slice(0, 1_500_000) : '';
    const host = new URL(finalUrl).hostname.replace(/^www\./, '');
    let site = meta(html, 'og:site_name') || siteOf(finalUrl);
    let title = meta(html, 'og:title', 'twitter:title') || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '');
    let image = meta(html, 'og:image', 'og:image:url', 'twitter:image');
    if (/(^|\.)tiktok\.com$/.test(host)) {
      try {
        const o = (await CapacitorHttp.get({ url: `https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`, responseType: 'json' })).data as { title?: string; thumbnail_url?: string };
        title = o.title || title; image = o.thumbnail_url || image; site = 'TikTok';
      } catch { /* keep what we have */ }
    }
    const maps = mapsInfo(new URL(finalUrl)) ?? mapsInfo(new URL(url));
    const clean = cleanTitle(maps?.name ?? title);
    // The page itself: the address (Google puts it in the description) and the map pin (in the static map picture)
    const description = meta(html, 'og:description', 'description');
    const address = maps?.address || (maps && /,/.test(description) && !/★/.test(description) ? description : '');
    const pin = (maps?.lat === undefined ? `${image} ${html.slice(0, 400_000)}` : '').match(/(?:center|markers)=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)|!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const at = maps?.lat !== undefined && maps.lng !== undefined ? { lat: maps.lat, lng: maps.lng }
      : pin ? { lat: +(pin[1] ?? pin[3]), lng: +(pin[2] ?? pin[4]) } : undefined;
    const place = await findPlace(clean, address, maps ? at : undefined, maps ? kindFromTitle(title) : '');
    return { url: finalUrl, site, title: clean || place?.name || host, image: /^https:\/\//.test(image) ? image : '', place };
  } catch {
    return null;
  }
}

/**
 * Read a link for Save to Rove (title, photo, place). The iPhone app reads the page itself; elsewhere the readLink
 * Cloud Function does (only if it's deployed, which needs Firebase's paid Blaze plan; it isn't for now). Failing both,
 * what the app can tell from the link alone: the site, a Google Maps place name, and a place search for it.
 */
export async function readLink(raw: string): Promise<LinkPreview> {
  const url = raw.trim();
  const onPhone = isNativeApp ? await readOnPhone(url) : null;
  if (onPhone) return onPhone;
  const fromServer = await store.readLink(url);
  if (fromServer) return { ...fromServer, title: cleanTitle(fromServer.title) || fromServer.title };
  let u: URL | null = null;
  try { u = new URL(url); } catch { /* not a link */ }
  const site = siteOf(url);
  const maps = u ? mapsInfo(u) : null;
  const name = maps?.name ?? null;
  const slug = u?.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ').replace(/\.\w+$/, '') ?? '';
  const title = name ?? (slug && !/^\d+$/.test(slug) && slug.length > 3 ? slug.replace(/^./, (c) => c.toUpperCase()) : site || url);
  const at = maps?.lat !== undefined && maps.lng !== undefined ? { lat: maps.lat, lng: maps.lng } : undefined;
  const place = maps ? await findPlace(name ?? '', maps.address, at) : null;
  return { url, site, title: name ?? place?.name ?? title, image: '', place };
}

/** The city (or state/province) at a point, from Photon's reverse lookup; '' when unknown or offline. */
export async function cityAt(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?${new URLSearchParams({ lat: String(lat), lon: String(lng), lang: 'en' })}`);
    if (!res.ok) return '';
    const json = (await res.json()) as { features: PhotonFeature[] };
    return json.features.map((f) => cityFrom(f.properties)).find(Boolean) ?? '';
  } catch { return ''; }
}
