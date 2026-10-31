import type { Place, Trip, Activity } from '../data/types';

// Every circle flag the app ships (circle-flags, MIT). Vite turns each into its own small file, fetched only when shown.
const FLAGS = import.meta.glob('/node_modules/circle-flags/flags/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const byCode: Record<string, string> = {};
for (const [path, url] of Object.entries(FLAGS)) byCode[path.split('/').pop()!.replace('.svg', '')] = url;

const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
const codeByName: Record<string, string> = {};
if (names) for (const code of Object.keys(byCode)) if (code.length === 2) { const n = names.of(code.toUpperCase()); if (n) codeByName[n.toLowerCase()] = code; }

/** The flag image for a two-letter country code, if there is one. */
export const flagUrl = (code?: string) => (code ? byCode[code.toLowerCase()] : undefined);

/** A place's country code: saved with newer places, or looked up from the country name (older places). */
export function countryCodeOf(p?: Place | null): string | undefined {
  if (!p) return undefined;
  if (p.countryCode) return p.countryCode.toLowerCase();
  const name = (p.country ?? p.name.split(',').pop() ?? '').trim().toLowerCase();
  return codeByName[name];
}

/** The display name for a country code ("pt" → "Portugal"). */
export const countryName = (code: string) => names?.of(code.toUpperCase()) ?? code.toUpperCase();

/**
 * The countries a trip visits: its destination's, then any country an event takes you to
 * (a flight to Rome or a hotel in Athens adds Italy and Greece), in the order you'll arrive.
 */
export function tripCountries(trip: Trip, activities: Activity[]): string[] {
  const out: string[] = [];
  const add = (c?: string) => { if (c && !out.includes(c)) out.push(c); };
  add(countryCodeOf(trip.destination));
  [...activities].sort((a, b) => (a.date + (a.startTime || '99')).localeCompare(b.date + (b.startTime || '99'))).forEach((a) => add(countryCodeOf(a.location)));
  return out;
}
