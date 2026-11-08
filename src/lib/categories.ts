import type { IconName } from '../design/components';
import type { Activity, Category } from '../data/types';

/** The six event types: one for each Overview tile, plus Note (the only one without a place). */
export type EventType = 'flight' | 'stay' | 'transport' | 'food' | 'activity' | 'note';

/**
 * The event types, in the order the "Add to itinerary" picker lists them. Each has the Event card layout it uses
 * and the fields its form asks for. Types have no colours: they're told apart by icon.
 */
export const EVENT_TYPES: { value: EventType; label: string; icon: IconName; hint: string }[] = [
  { value: 'flight', label: 'Flight', icon: 'plane', hint: 'From, to, times and flight number' },
  { value: 'stay', label: 'Stay', icon: 'bed', hint: 'Check-in and check-out in one go' },
  { value: 'transport', label: 'Transport', icon: 'train', hint: 'Train, bus, ferry, tram, taxi or car hire' },
  { value: 'food', label: 'Food & drink', icon: 'utensils', hint: 'Restaurants, cafés and bars' },
  { value: 'activity', label: 'Activity', icon: 'ticket', hint: 'Sights, tours, shows and things to do' },
  { value: 'note', label: 'Note', icon: 'notebook', hint: 'A reminder, with or without a time' },
];

/** Older events used finer types; each folds into one of the six. */
const LEGACY: Record<string, EventType> = { cafe: 'food', drinks: 'food', sight: 'activity', other: 'activity' };

/** The event type of any stored category, old or new. */
export const eventType = (c: Category | string): EventType => (LEGACY[c] ?? (EVENT_TYPES.some((t) => t.value === c) ? c : 'activity')) as EventType;

/** Kept for the idea and cost pickers: the same six types. */
export const CATEGORIES = EVENT_TYPES;

/**
 * A type's label and icon. Café and bar events from before keep their own icon (Coffee, Cocktail): Food & drink
 * picks the icon from the kind of place.
 */
export function categoryInfo(c: Category | string): { value: EventType; label: string; icon: IconName } {
  const t = EVENT_TYPES.find((x) => x.value === eventType(c))!;
  const icon: IconName = c === 'cafe' ? 'coffee' : c === 'drinks' ? 'cocktail' : c === 'sight' ? 'camera' : t.icon;
  return { value: t.value, label: t.label, icon };
}

/** All stored categories that mean this type (new and old), for filtering. */
export const categoriesOf = (t: EventType): string[] => [t, ...Object.keys(LEGACY).filter((k) => LEGACY[k] === t)];

/**
 * The Overview's "Bookings" tiles: one per event type (Note has none). Rove doesn't track booked vs not booked,
 * so each tile just counts the events of its kind (Documents counts the links and files attached to events).
 */
export const BOOKING_GROUPS: { key: string; title: string; icon: IconName; type: EventType; one: string; many: string }[] = [
  { key: 'flights', title: 'Flights', icon: 'plane', type: 'flight', one: 'flight', many: 'flights' },
  { key: 'stays', title: 'Stays', icon: 'bed', type: 'stay', one: 'stay', many: 'stays' },
  { key: 'transport', title: 'Transport', icon: 'train', type: 'transport', one: 'trip', many: 'trips' },
  { key: 'activities', title: 'Activities', icon: 'ticket', type: 'activity', one: 'activity', many: 'activities' },
  { key: 'food', title: 'Food & drink', icon: 'utensils', type: 'food', one: 'reservation', many: 'reservations' },
];

/** Where an event ends up: a flight's or transfer's destination, otherwise its place. */
export const endPlace = (a: Activity) => a.to ?? a.location;
