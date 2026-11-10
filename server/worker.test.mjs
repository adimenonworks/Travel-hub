// node server/worker.test.mjs — checks the Worker's Unsplash and AeroDataBox adapters with stand-in responses.
import assert from 'node:assert/strict';
import { searchCover, lookupFlight, normaliseFlight, fromCache } from './worker.js';

const reply = (status, body) => async (url, init) => ({ ok: status < 400, status, json: async () => body, url, init });

// Unsplash: the query, the filters and the key header; the credit fields come back.
let seen;
const unsplash = async (url, init) => { seen = { url, init }; return reply(200, { results: [{ id: 'ljhCEaHYWJ8', color: '#ccc', urls: { regular: 'https://images.unsplash.com/r', small: 'https://images.unsplash.com/s' }, user: { name: 'Aayush Gupta', username: 'aayushgupta' }, links: { download_location: 'https://api.unsplash.com/photos/ljhCEaHYWJ8/download' } }] })(url, init); };
const photo = await searchCover('Lisbon Portugal', 'KEY', unsplash);
assert.match(seen.url, /query=Lisbon%20Portugal/);
assert.match(seen.url, /orientation=landscape/);
assert.match(seen.url, /content_filter=high/);
assert.equal(seen.init.headers.Authorization, 'Client-ID KEY');
assert.deepEqual(photo, { id: 'ljhCEaHYWJ8', url: 'https://images.unsplash.com/r', small: 'https://images.unsplash.com/s', color: '#ccc', name: 'Aayush Gupta', username: 'aayushgupta', downloadLocation: 'https://api.unsplash.com/photos/ljhCEaHYWJ8/download' });
assert.equal(await searchCover('Nowhere', 'KEY', reply(200, { results: [] })), null);

// AeroDataBox: number and date in the path, RapidAPI headers; the status, terminals, gate and belt come back.
let fseen;
const adb = async (url, init) => { fseen = { url, init }; return reply(200, [{ number: 'TP 1946', status: 'Delayed', airline: { name: 'TAP Air Portugal' },
  departure: { airport: { iata: 'LIS', municipalityName: 'Lisbon' }, terminal: '1', gate: '14', scheduledTime: { local: '2026-11-05 08:30+00:00' }, revisedTime: { local: '2026-11-05 09:05+00:00' } },
  arrival: { airport: { iata: 'OPO', municipalityName: 'Porto' }, terminal: '1', baggageBelt: '3', scheduledTime: { local: '2026-11-05 09:25+00:00' } } }])(url, init); };
const f = await lookupFlight('TP1946', '2026-11-05', 'RKEY', adb);
assert.match(fseen.url, /\/flights\/number\/TP1946\/2026-11-05/);
assert.equal(fseen.init.headers['X-RapidAPI-Key'], 'RKEY');
assert.equal(f.status, 'Delayed');
assert.equal(f.departure.gate, '14');
assert.equal(f.arrival.belt, '3');
assert.equal(f.departure.revised, '2026-11-05 09:05+00:00');
assert.equal(await lookupFlight('XX1', '2026-11-05', 'RKEY', reply(204, null)), null);
assert.equal(normaliseFlight(null), null);
console.log('worker adapters: all checks passed');

// A cached answer saved for one caller must come back with only the next caller's origin (two values break CORS)
const saved = new Response('{}', { headers: { 'access-control-allow-origin': 'https://adimenonworks.github.io', 'content-type': 'application/json' } });
const again = fromCache(new Request('https://x/flight', { headers: { Origin: 'capacitor://localhost' } }), saved);
assert.equal(again.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
assert.equal(again.headers.get('Content-Type'), 'application/json');
