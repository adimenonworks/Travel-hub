// Reads a link without any third-party code: the page's preview tags (Open Graph), TikTok's public oEmbed,
// or the place in a Google Maps link; then one place search (Photon, free) to match the place it's about.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const UA = 'facebookexternalhit/1.1 (+https://adimenonworks.github.io/Travel-hub/; Rove link preview)';
const MAX_BYTES = 1_500_000;

/** Refuse links to private networks (this server's own neighbours), so the function can't be used to reach them. */
export function privateIp(ip) {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return privateIp(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('That doesn’t look like a link.'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only web links can be saved.');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('That link can’t be read.');
  const host = u.hostname;
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((x) => x.address);
  if (!ips.length || ips.some(privateIp)) throw new Error('That link can’t be read.');
  return u;
}

/** GET a page (following up to 4 redirects, each one checked), as text, size-capped. */
async function fetchPage(raw) {
  let url = raw;
  for (let i = 0; i < 5; i++) {
    const u = await checkUrl(url);
    const res = await fetch(u, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en' }, signal: AbortSignal.timeout(8000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location'), u).toString(); continue; }
    if (!res.ok) return { url: u.toString(), html: '' };
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html')) return { url: u.toString(), html: '' };
    const reader = res.body.getReader();
    const chunks = []; let size = 0;
    while (size < MAX_BYTES) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); size += value.length; }
    reader.cancel().catch(() => {});
    return { url: u.toString(), html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error('Too many redirects.');
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).trim();

export function meta(html, ...names) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decode(content);
  }
  return '';
}

/** A Place / LocalBusiness in the page's structured data, if it has one. */
function jsonLdPlace(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const items = [JSON.parse(m[1])].flat().flatMap((x) => (x['@graph'] ? x['@graph'] : [x]));
      for (const it of items) {
        const geo = it.geo; const addr = it.address;
        if (it.name && (geo || addr)) {
          return {
            name: String(it.name),
            lat: geo ? Number(geo.latitude) : undefined, lng: geo ? Number(geo.longitude) : undefined,
            query: [it.name, typeof addr === 'string' ? addr : [addr?.addressLocality, addr?.addressCountry?.name ?? addr?.addressCountry].filter(Boolean).join(', ')].filter(Boolean).join(', '),
          };
        }
      }
    } catch { /* not JSON */ }
  }
  return null;
}

/** "…/maps/place/Ichiran+Shibuya/@35.66,139.70,17z" → the place name and where it is. */
export function mapsPlace(url) {
  const u = new URL(url);
  if (!/(^|\.)google\.[a-z.]+$/.test(u.hostname) || !u.pathname.includes('/maps')) return null;
  const name = u.pathname.match(/\/place\/([^/]+)/)?.[1] ?? u.searchParams.get('q') ?? u.searchParams.get('query');
  const at = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (!name) return null;
  return { name: decodeURIComponent(name.replace(/\+/g, ' ')), lat: at ? Number(at[1]) : undefined, lng: at ? Number(at[2]) : undefined };
}

const FOOD = ['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court', 'ice_cream', 'biergarten', 'bakery', 'confectionery', 'deli', 'wine_bar'];
const STAY = ['hotel', 'hostel', 'guest_house', 'apartment', 'motel', 'chalet', 'camp_site', 'alpine_hut'];
const MOVE = ['station', 'halt', 'bus_station', 'ferry_terminal', 'aerodrome', 'tram_stop'];

/** Which Rove event type a place is, from its map tags. */
function typeOf(key, value) {
  if (FOOD.includes(value)) return 'food';
  if (STAY.includes(value)) return 'stay';
  if (MOVE.includes(value) || key === 'railway' || key === 'aeroway') return 'transport';
  return 'activity';
}

/** One Photon search: the best match's name, city, country and coordinates. Biased towards a point when we have one. */
async function findPlace(q, near) {
  const params = new URLSearchParams({ q, limit: '1', lang: 'en' });
  if (near?.lat != null && near?.lng != null && !Number.isNaN(near.lat)) { params.set('lat', String(near.lat)); params.set('lon', String(near.lng)); }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const f = (await res.json()).features?.[0];
  if (!f) return null;
  const p = f.properties; const [lng, lat] = f.geometry.coordinates;
  const city = p.city ?? p.town ?? p.village ?? p.county ?? p.state ?? '';
  return {
    name: p.name ?? q, city, country: p.country ?? '', countryCode: (p.countrycode ?? '').toLowerCase(), lat, lng,
    type: p.osm_key === 'place' || p.osm_key === 'boundary' ? 'activity' : typeOf(p.osm_key, p.osm_value),
    kind: p.osm_value && p.osm_key !== 'place' ? p.osm_value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '',
    isArea: p.osm_key === 'place' || p.osm_key === 'boundary',
  };
}

const SITE = { 'tiktok.com': 'TikTok', 'instagram.com': 'Instagram', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'google.com': 'Google Maps', 'maps.app.goo.gl': 'Google Maps', 'goo.gl': 'Google Maps' };
const siteOf = (host) => { const h = host.replace(/^www\./, ''); return Object.entries(SITE).find(([k]) => h === k || h.endsWith(`.${k}`))?.[1] ?? h; };

/** Everything Rove shows on the Save to Rove sheet. */
export async function readLinkData(raw) {
  const { url, html } = await fetchPage(raw);
  const host = new URL(url).hostname;
  let site = meta(html, 'og:site_name') || siteOf(host);
  let title = meta(html, 'og:title', 'twitter:title') || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '');
  let image = meta(html, 'og:image', 'og:image:url', 'twitter:image');
  const description = meta(html, 'og:description', 'description', 'twitter:description');

  // TikTok pages need a login; its public oEmbed gives the caption and thumbnail.
  if (/tiktok\.com$/.test(host.replace(/^www\./, '')) || host.endsWith('.tiktok.com')) {
    try {
      const o = await (await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) })).json();
      title = o.title || title; image = o.thumbnail_url || image; site = 'TikTok';
    } catch { /* keep what we have */ }
  }

  // Which place is it about? A Google Maps link says so; structured data next; otherwise search the title.
  const maps = mapsPlace(url);
  const ld = html ? jsonLdPlace(html) : null;
  const cleanTitle = title.replace(/\s*[|·–—-]\s*[^|·–—-]*$/, '').slice(0, 80);
  let place = null;
  for (const [q, near] of [[maps?.name, maps], [ld?.query, ld], [cleanTitle, null]]) {
    if (!q) continue;
    try { place = await findPlace(q, near); } catch { place = null; }
    if (place) break;
  }
  if (maps && place && maps.lat != null) { place.lat = maps.lat; place.lng = maps.lng; }
  if (maps && !title) title = maps.name;

  return {
    url, site, title: title || maps?.name || host, image: /^https:\/\//.test(image) ? image : '', description: description.slice(0, 300),
    place: place && place.countryCode ? place : null,
  };
}
