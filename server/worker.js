/**
 * Rove's small server, a Cloudflare Worker (free plan). It keeps the API keys off the phone and out of the repo:
 * they live only in the Worker's secrets (Settings → Variables and Secrets): UNSPLASH_ACCESS_KEY and RAPIDAPI_KEY.
 * One file, no build step, so it can be pasted into the Cloudflare dashboard. See server/README.md.
 *
 * GET  /cover?q=Lisbon%20Portugal           → one landscape photo of the place (Unsplash search), or 404
 * POST /cover/download { download_location } → tells Unsplash the photo was chosen (required by their API terms)
 * GET  /flight?number=TP1946&date=2026-11-05 → the flight's live status (AeroDataBox via RapidAPI), or 404
 */

const ALLOWED_ORIGINS = ['capacitor://localhost', 'https://adimenonworks.github.io', 'https://travel-hub-a1aa2.web.app', 'http://localhost:5173'];

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

// A cached answer still carries the CORS headers of whoever asked first: replace them (not add a second copy, which
// browsers reject) with this caller's.
export function fromCache(request, hit) {
  const headers = new Headers(hit.headers);
  for (const [k, v] of Object.entries(cors(request))) headers.set(k, v);
  return new Response(hit.body, { status: hit.status, headers });
}

const json = (request, body, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store', ...cors(request) } });

/** Unsplash: the first landscape, safe photo for a place. Only what the app needs, including the credit. */
export async function searchCover(q, key, fetchImpl = fetch) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&content_filter=high&per_page=1`;
  const r = await fetchImpl(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } });
  if (!r.ok) throw new Error(`unsplash ${r.status}`);
  const p = (await r.json()).results?.[0];
  if (!p) return null;
  return {
    id: p.id,
    url: p.urls.regular,
    small: p.urls.small,
    color: p.color ?? null,
    name: p.user.name,
    username: p.user.username,
    downloadLocation: p.links.download_location,
  };
}

/** AeroDataBox: a flight by number and local date, trimmed to what the Journey details card shows. */
export function normaliseFlight(f) {
  if (!f) return null;
  const end = (e) => e && ({
    airport: e.airport?.iata || e.airport?.icao || '',
    city: e.airport?.municipalityName || e.airport?.name || '',
    terminal: e.terminal || '',
    gate: e.gate || '',
    belt: e.baggageBelt || '',
    scheduled: e.scheduledTime?.local || e.scheduledTimeLocal || '',
    revised: e.revisedTime?.local || e.actualTime?.local || e.revisedTimeLocal || '',
  });
  return {
    number: f.number || '',
    status: f.status || 'Unknown', // Expected, CheckIn, Boarding, GateClosed, Departed, EnRoute, Approaching, Arrived, Delayed, Canceled, Diverted…
    airline: f.airline?.name || '',
    departure: end(f.departure),
    arrival: end(f.arrival),
    updatedAt: f.lastUpdatedUtc || new Date().toISOString(),
  };
}

export async function lookupFlight(number, date, key, fetchImpl = fetch) {
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(number.replace(/\s+/g, ''))}/${date}?withAircraftImage=false&withLocation=false`;
  const r = await fetchImpl(url, { headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' } });
  if (r.status === 204 || r.status === 404) return null;
  if (!r.ok) throw new Error(`aerodatabox ${r.status}`);
  const list = await r.json();
  return normaliseFlight(Array.isArray(list) ? list[0] : list);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(request) });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/cover' && request.method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
        if (!q) return json(request, { error: 'q required' }, 400);
        // Unsplash allows 50 requests an hour in demo mode: cache each place for a day at the edge.
        const cache = caches.default, key = new Request(`https://cache.rove/cover?q=${encodeURIComponent(q.toLowerCase())}`);
        const hit = await cache.match(key);
        if (hit) return fromCache(request, hit);
        const photo = await searchCover(q, env.UNSPLASH_ACCESS_KEY);
        const res = json(request, photo ?? { error: 'none' }, photo ? 200 : 404, 86400);
        if (photo) ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      }
      if (url.pathname === '/cover/download' && request.method === 'POST') {
        const { download_location } = await request.json();
        if (typeof download_location !== 'string' || !download_location.startsWith('https://api.unsplash.com/')) return json(request, { error: 'bad location' }, 400);
        await fetch(download_location, { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } });
        return json(request, { ok: true });
      }
      if (url.pathname === '/flight' && request.method === 'GET') {
        const number = (url.searchParams.get('number') || '').toUpperCase(), date = url.searchParams.get('date') || '';
        if (!/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/.test(number) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(request, { error: 'number and date required' }, 400);
        // 600 units a month on the free plan: cache each flight for 10 minutes at the edge, whoever asks.
        const cache = caches.default, key = new Request(`https://cache.rove/flight/${number}/${date}`);
        const hit = await cache.match(key);
        if (hit) return fromCache(request, hit);
        const flight = await lookupFlight(number, date, env.RAPIDAPI_KEY);
        const res = json(request, flight ?? { error: 'not found' }, flight ? 200 : 404, 600);
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      }
      return json(request, { error: 'not found' }, 404);
    } catch (e) {
      return json(request, { error: String(e && e.message || e) }, 502);
    }
  },
};
