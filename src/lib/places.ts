import { EVENT_TYPES, TYPE_TONE, eventKind, eventType, kindInfo, type EventKind } from './categories';
import type { CategoryTone, IconName } from '../design/components';
import type { Activity, Category, LinkPreview, PlaceCategory, SavedPlace, Trip } from '../data/types';
import { tripCountries, tripStops } from './countries';
import { today } from './dates';

/**
 * Saved places use the same types and categories as events (owner's decision, 11 Nov 2026): a Place's `category` is an
 * event category from Food & drink, Stays or Activities (Restaurant, Airbnb or holiday home, Museum…), picked with the
 * same type → chips picker, in the type's colour. Older saves stored six groups; `shop` and `stay` are read as Shopping
 * and Hotel, and restaurant, cafe, bar and sight already are categories, so nothing in the database needs changing.
 */
export type PlaceType = 'food' | 'stays' | 'activities';
export const PLACE_TYPES = EVENT_TYPES.filter((t): t is typeof t & { value: PlaceType } => t.value === 'food' || t.value === 'stays' || t.value === 'activities');
const OLD: Record<string, EventKind> = { shop: 'shopping', stay: 'hotel' };

/** A Place's category (an event category), reading older values. Anything that isn't a place category counts as a sight. */
export function placeKind(c: PlaceCategory | string | undefined): EventKind {
  const k = eventKind(OLD[c ?? ''] ?? c ?? 'sight');
  const t = eventType(k);
  return t === 'food' || t === 'stays' || t === 'activities' ? k : 'sight';
}
export const placeTypeOf = (c: PlaceCategory | string | undefined) => eventType(placeKind(c)) as PlaceType;

/** A Place's category label, icon, type and colour ("Airbnb or holiday home", the house icon, Stays, violet). */
export function placeCategory(c: PlaceCategory | string | undefined): { value: EventKind; one: string; label: string; icon: IconName; type: PlaceType; tone: CategoryTone } {
  const k = kindInfo(placeKind(c));
  return { value: k.value, one: k.label, label: k.label, icon: k.icon, type: k.type as PlaceType, tone: TYPE_TONE[k.type] };
}
export const placeTypeInfo = (t: PlaceType) => PLACE_TYPES.find((x) => x.value === t)!;

const KEYWORDS: [EventKind, string[]][] = [
  ['winery', ['winery', 'vineyard', 'cellar door', 'wine estate', 'bodega', 'quinta']],
  ['cafe', ['cafe', 'café', 'bakery', 'ice cream', 'coffee', 'tea']],
  ['bar', ['bar', 'pub', 'biergarten', 'wine bar', 'cocktail']],
  ['nightlife', ['nightclub', 'club']],
  ['market', ['food court', 'market', 'street food']],
  ['restaurant', ['restaurant', 'fast food', 'noodle', 'ramen', 'pizza', 'sushi']],
  ['hostel', ['hostel', 'guest house']],
  ['apartment', ['apartment']],
  ['camping', ['camp site', 'camping', 'caravan']],
  ['resort', ['resort']],
  ['hotel', ['hotel', 'motel', 'chalet', 'inn']],
  ['museum', ['museum', 'gallery']],
  ['nature', ['park', 'beach', 'garden', 'lake']],
  ['themepark', ['theme park', 'zoo', 'aquarium']],
  ['spa', ['spa']],
  ['shopping', ['shop', 'mall', 'store', 'boutique']],
];

/** The category Rove detects from the map data when saving ("Fast food" → Restaurant, "Hostel" → Hostel). */
export function detectCategory(p: LinkPreview['place']): EventKind {
  if (!p) return 'sight';
  if (p.category) return placeKind(p.category);
  const k = (p.kind ?? '').toLowerCase();
  for (const [kind, words] of KEYWORDS) if (words.some((w) => k.includes(w))) return kind;
  if (p.type === 'food') return 'restaurant';
  if (p.type === 'stay') return 'hotel';
  return 'sight';
}

/** The event category an idea or event about this Place gets: the Place's own. */
export const eventCategoryOf = (c: PlaceCategory | string | undefined): Category => placeKind(c);

/** The Place category for an event that gets starred without a Place yet: its own, when it's a place category. */
export const placeCategoryOfEvent = (c: Category): EventKind => placeKind(c);

/** "Tokyo" for a saved Place, or "Other places" when no city was found. */
export const cityOf = (p: SavedPlace) => p.city || 'Other places';

/**
 * Visited: a Place is visited once an Event that points at it has a date in the past. Scheduling something isn't
 * visiting it. Built from every event the person can see (all their trips).
 */
export function visitedPlaceIds(activities: Activity[], now = today()) {
  return new Set(activities.filter((a) => a.placeId && a.date < now).map((a) => a.placeId!));
}

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

/** The countries a trip covers, as a set (see `tripCountries`). */
export function tripCountryCodes(trip: Trip, activities: Activity[]) {
  return new Set(tripCountries(trip, activities));
}

/** Does an upcoming trip cover this city? One of its stops, or any of its events, is there. */
export function tripCoversCity(trip: Trip, activities: Activity[], city: string) {
  if (!city) return false;
  const c = city.toLowerCase();
  const hit = (name?: string | null) => !!name && name.split(',')[0].trim().toLowerCase() === c;
  return tripStops(trip).some((p) => hit(p.name)) || activities.some((a) => hit(a.location?.name) || hit(a.locationText) || hit(a.to?.name));
}
