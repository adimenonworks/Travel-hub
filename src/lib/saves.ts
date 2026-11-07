import type { Idea, Trip } from '../data/types';
import { countryCodeOf, countryName } from './countries';
import { today } from './dates';

/** The saved place everything with no place goes to; sorting is optional. */
export const UNSORTED = 'Unsorted';

export const isSavedPlace = (t: Trip) => t.status === 'saved';
/** Trips with dates (planned, happening or past): everything except saved places. */
export const plannedTrips = (trips: Trip[] | null | undefined) => (trips ?? []).filter((t) => !isSavedPlace(t));
export const savedPlaces = (trips: Trip[] | null | undefined) => (trips ?? []).filter(isSavedPlace);
/** A planned trip that hasn't ended. */
export const isUpcoming = (t: Trip) => !isSavedPlace(t) && t.endDate >= today();

/** A save's city, for grouping a saved place ("Tokyo"), or null for links and notes. */
export const saveCity = (i: Idea) => (i.place ? i.place.city || i.place.name.split(',')[0] : null);

/** "24 saves · 3 cities" */
export function saveCounts(ideas: Idea[]) {
  const cities = new Set(ideas.map(saveCity).filter(Boolean)).size;
  return `${ideas.length} save${ideas.length === 1 ? '' : 's'}${cities > 1 ? ` · ${cities} cities` : ''}`;
}

/** Accent tone per saved place, cycling like Figma's tiles (orange, green, yellow, pink). */
export const PLACE_TONES = ['orange', 'green', 'yellow', 'pink'] as const;
export const placeTone = (trips: Trip[], t: Trip) => PLACE_TONES[Math.max(0, savedPlaces(trips).sort((a, b) => a.createdAt - b.createdAt).findIndex((x) => x.id === t.id)) % 4];

export type SaveTarget =
  | { kind: 'trip'; trip: Trip; suggested?: boolean }
  | { kind: 'new'; code: string; suggested?: boolean }
  | { kind: 'unsorted'; trip?: Trip; suggested?: boolean };

/** The countries a trip covers: its destination's (saved places and trips alike). */
const tripCode = (t: Trip) => countryCodeOf(t.destination);

/**
 * Where a save can go, best first (the doc's save rules): an upcoming trip in that country (it lands in its Ideas),
 * else the saved place for that country, else "New place to go: <country>"; with no place found, Unsorted.
 * The first one is pre-selected; the person only acts if it's wrong.
 */
export function saveTargets(trips: Trip[], code?: string | null): SaveTarget[] {
  const upcoming = (trips ?? []).filter(isUpcoming).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const places = savedPlaces(trips).filter((t) => t.name !== UNSORTED);
  const unsorted = savedPlaces(trips).find((t) => t.name === UNSORTED);
  const out: SaveTarget[] = [];
  const tripMatch = code ? upcoming.find((t) => tripCode(t) === code) : undefined;
  const placeMatch = code ? places.find((t) => tripCode(t) === code) : undefined;
  if (tripMatch) out.push({ kind: 'trip', trip: tripMatch });
  if (placeMatch) out.push({ kind: 'trip', trip: placeMatch });
  if (code && !placeMatch && !tripMatch) out.push({ kind: 'new', code });
  for (const t of [...places, ...upcoming]) if (t !== tripMatch && t !== placeMatch) out.push({ kind: 'trip', trip: t });
  out.push(code && !placeMatch && tripMatch ? { kind: 'new', code } : { kind: 'unsorted', trip: unsorted });
  if (!code) out.unshift(out.pop()!); // nothing found: Unsorted first
  out[0].suggested = true;
  return out;
}

export const targetLabel = (t: SaveTarget) => (t.kind === 'trip' ? t.trip.name : t.kind === 'new' ? countryName(t.code) : UNSORTED);
