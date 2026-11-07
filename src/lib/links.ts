import { store } from '../data';
import type { LinkPreview } from '../data/types';
import { CapacitorHttp } from '@capacitor/core';
import { countryName } from './countries';
import { isNativeApp } from './native';

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
    const name = mapsPlace(new URL(finalUrl));
    const query = name ?? title.replace(/\s*[|·–—-]\s*[^|·–—-]*$/, '').slice(0, 80);
    let place: FoundPlace | null = null;
    if (query) { try { place = (await searchPlaces(query))[0] ?? null; } catch { /* offline */ } }
    return { url: finalUrl, site, title: title || name || host, image: /^https:\/\//.test(image) ? image : '', place };
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
