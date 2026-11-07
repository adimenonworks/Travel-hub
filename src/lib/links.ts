import { store } from '../data';
import type { LinkPreview } from '../data/types';
import { countryName } from './countries';

type FoundPlace = NonNullable<LinkPreview['place']>;

const FOOD = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court', 'ice_cream', 'biergarten', 'bakery', 'wine_bar'];
const STAY = ['hotel', 'hostel', 'guest_house', 'apartment', 'motel', 'chalet', 'camp_site'];
const MOVE = ['station', 'halt', 'bus_station', 'ferry_terminal', 'aerodrome'];

type PhotonFeature = { properties: Record<string, string | undefined>; geometry: { coordinates: [number, number] } };

function toPlace(f: PhotonFeature, fallback: string): FoundPlace | null {
  const p = f.properties;
  const code = (p.countrycode ?? '').toLowerCase();
  if (!code) return null;
  const area = p.osm_key === 'place' || p.osm_key === 'boundary';
  const v = p.osm_value ?? '';
  return {
    name: p.name ?? fallback,
    city: p.city ?? p.town ?? p.village ?? p.county ?? p.state ?? '',
    country: p.country ?? countryName(code),
    countryCode: code,
    lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
    type: area ? 'activity' : FOOD.includes(v) ? 'food' : STAY.includes(v) ? 'stay' : MOVE.includes(v) ? 'transport' : 'activity',
    kind: !area && v ? v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '',
    isArea: area,
  };
}

/** Search places (Photon, free, no key): restaurants, sights, hotels, cities and countries. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<FoundPlace[]> {
  if (q.trim().length < 2) return [];
  const res = await fetch(`https://photon.komoot.io/api/?${new URLSearchParams({ q: q.trim(), limit: '6', lang: 'en' })}`, { signal });
  if (!res.ok) throw new Error('Place search is unavailable');
  const json = (await res.json()) as { features: PhotonFeature[] };
  return json.features.map((f) => toPlace(f, q)).filter((p): p is FoundPlace => !!p);
}

const SITES: [RegExp, string][] = [[/tiktok\.com$/, 'TikTok'], [/instagram\.com$/, 'Instagram'], [/youtube\.com$|youtu\.be$/, 'YouTube'], [/google\.[a-z.]+$|goo\.gl$/, 'Google Maps']];

/** The site a link is from, as people say it ("TikTok", "cntraveler.com"). */
export function siteOf(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SITES.find(([re]) => re.test(host))?.[1] ?? host;
  } catch { return ''; }
}

/** A link's place name when the link says it: Google Maps /place/<name>/@lat,lng or ?q=. */
function mapsPlace(url: URL) {
  if (!/google\./.test(url.hostname) || !url.pathname.includes('/maps')) return null;
  const name = url.pathname.match(/\/place\/([^/]+)/)?.[1] ?? url.searchParams.get('q') ?? url.searchParams.get('query');
  return name ? decodeURIComponent(name.replace(/\+/g, ' ')) : null;
}

/** The first web link in some text (a share often includes a caption). */
export function findUrl(text: string) {
  return text.match(/https?:\/\/[^\s<>"]+/)?.[0]?.replace(/[).,]+$/, '') ?? null;
}

/**
 * Read a link for Save to Rove: the readLink Cloud Function when it's deployed (title, photo, place); otherwise what
 * the app can tell from the link itself (the site, a Google Maps place name, and a place search for it).
 */
export async function readLink(raw: string): Promise<LinkPreview> {
  const url = raw.trim();
  const fromServer = await store.readLink(url);
  if (fromServer) return fromServer;
  let u: URL | null = null;
  try { u = new URL(url); } catch { /* not a link */ }
  const site = siteOf(url);
  const name = u ? mapsPlace(u) : null;
  const slug = u?.pathname.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ').replace(/\.\w+$/, '') ?? '';
  const title = name ?? (slug && !/^\d+$/.test(slug) && slug.length > 3 ? slug.replace(/^./, (c) => c.toUpperCase()) : site || url);
  let place: FoundPlace | null = null;
  if (name) { try { place = (await searchPlaces(name))[0] ?? null; } catch { /* offline or blocked */ } }
  return { url, site, title, image: '', place };
}
