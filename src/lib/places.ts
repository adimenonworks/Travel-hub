import type { IconName } from '../design/components';
import type { Activity, Category, LinkPreview, PlaceCategory, SavedPlace, Trip } from '../data/types';
import { countryCodeOf } from './countries';
import { today } from './dates';

/** The fixed Collections categories, in the order the filter Chips list them. */
export const PLACE_CATEGORIES: { value: PlaceCategory; label: string; one: string; icon: IconName }[] = [
  { value: 'restaurant', label: 'Restaurants', one: 'Restaurant', icon: 'utensils' },
  { value: 'cafe', label: 'Cafés', one: 'Café', icon: 'coffee' },
  { value: 'bar', label: 'Bars', one: 'Bar', icon: 'cocktail' },
  { value: 'shop', label: 'Shops', one: 'Shop', icon: 'wallet' },
  { value: 'stay', label: 'Stays', one: 'Stay', icon: 'bed' },
  { value: 'sight', label: 'Sights & activities', one: 'Sight', icon: 'camera' },
];
export const placeCategory = (c: PlaceCategory) => PLACE_CATEGORIES.find((x) => x.value === c) ?? PLACE_CATEGORIES[5];

const RESTAURANT = ['restaurant', 'fast food', 'food court', 'noodle', 'ramen'];
const CAFE = ['cafe', 'bakery', 'ice cream', 'coffee', 'tea'];
const BAR = ['bar', 'pub', 'biergarten', 'wine bar', 'nightclub', 'cocktail'];
const STAY = ['hotel', 'hostel', 'guest house', 'apartment', 'motel', 'chalet', 'camp site', 'resort'];

/** The category Rove detects from the map data when saving ("Fast food" → Restaurants, a shop tag → Shops). */
export function detectCategory(p: LinkPreview['place']): PlaceCategory {
  if (!p) return 'sight';
  if (p.category) return p.category;
  const k = (p.kind ?? '').toLowerCase();
  if (RESTAURANT.some((x) => k.includes(x))) return 'restaurant';
  if (CAFE.some((x) => k.includes(x))) return 'cafe';
  if (BAR.some((x) => k.includes(x))) return 'bar';
  if (STAY.some((x) => k.includes(x))) return 'stay';
  if (p.type === 'food') return 'restaurant';
  if (p.type === 'stay') return 'stay';
  return 'sight';
}

/** The event type an idea or event about this Place gets (cafés and bars keep their own icon). */
export const eventCategoryOf = (c: PlaceCategory): Category =>
  c === 'restaurant' ? 'food' : c === 'cafe' ? 'cafe' : c === 'bar' ? 'drinks' : c === 'stay' ? 'stay' : 'activity';

/** The Place category for an event that gets starred without a Place yet. */
export function placeCategoryOfEvent(c: Category): PlaceCategory {
  return c === 'cafe' ? 'cafe' : c === 'drinks' ? 'bar' : c === 'food' ? 'restaurant' : c === 'stay' ? 'stay' : 'sight';
}

/** "Tokyo" for a saved Place, or "Other places" when no city was found. */
export const cityOf = (p: SavedPlace) => p.city || 'Other places';

/**
 * Visited: a Place is visited once an Event that points at it has a date in the past. Scheduling something isn't
 * visiting it. Built from every event the person can see (all their trips).
 */
export function visitedPlaceIds(activities: Activity[], now = today()) {
  return new Set(activities.filter((a) => a.placeId && a.date < now).map((a) => a.placeId!));
}

export const isStarred = (p: SavedPlace, uid: string) => !!p.starredBy?.includes(uid);

/** Unvisited first, then newest first. */
export function sortPlaces(list: SavedPlace[], visited: Set<string>) {
  return list.slice().sort((a, b) => Number(visited.has(a.id)) - Number(visited.has(b.id)) || b.createdAt - a.createdAt);
}

/** Group by a key, keeping the order keys first appear in. */
export function groupBy<T>(list: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const t of list) { const k = key(t); if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); }
  return [...m.entries()];
}

/** The countries a trip covers: its destination's and every event's (a trip can span several). */
export function tripCountryCodes(trip: Trip, activities: Activity[]) {
  const out = new Set<string>();
  const add = (c?: string) => c && out.add(c);
  add(countryCodeOf(trip.destination));
  for (const a of activities) { add(countryCodeOf(a.location)); add(countryCodeOf(a.to)); }
  return out;
}

/** Does an upcoming trip cover this city? Its destination city, or any of its events, is there. */
export function tripCoversCity(trip: Trip, activities: Activity[], city: string) {
  if (!city) return false;
  const c = city.toLowerCase();
  const hit = (name?: string | null) => !!name && name.split(',')[0].trim().toLowerCase() === c;
  return hit(trip.destination?.name) || activities.some((a) => hit(a.location?.name) || hit(a.locationText) || hit(a.to?.name));
}
