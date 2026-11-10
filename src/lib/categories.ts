import type { IconName } from '../design/components';
import type { Activity, Category } from '../data/types';

/**
 * Event groups: how an event behaves (its card layout, form shape and Overview "Bookings" row).
 * Flight and Transport are journeys (from → to); Stay and Car rental are one booking shown twice (check-in / check-out,
 * pick-up / drop-off); Food, Activity and Free time sit at one place and time.
 */
export type EventType = 'flight' | 'transport' | 'car' | 'stay' | 'food' | 'activity' | 'free';

/** The exact kind you pick in "Add to itinerary" (and older stored values, read through LEGACY). */
export type EventKind = 'flight' | 'train' | 'bus' | 'ferry' | 'taxi' | 'car' | 'stay' | 'restaurant' | 'cafe' | 'bar' | 'activity' | 'free' | 'transport';

type KindInfo = { value: EventKind; label: string; icon: IconName; group: EventType; section: string; booking: boolean };

/**
 * The kinds, in the order the picker lists them, grouped under section titles. `booking`: it can have a booking
 * reference. 'transport' is only for older events (no mode known) and isn't offered.
 */
export const EVENT_KINDS: KindInfo[] = [
  { value: 'flight', label: 'Flight', icon: 'plane', group: 'flight', section: 'Travel', booking: true },
  { value: 'train', label: 'Train', icon: 'train', group: 'transport', section: 'Travel', booking: true },
  { value: 'bus', label: 'Bus', icon: 'bus', group: 'transport', section: 'Travel', booking: true },
  { value: 'ferry', label: 'Ferry', icon: 'ferry', group: 'transport', section: 'Travel', booking: true },
  { value: 'taxi', label: 'Taxi', icon: 'taxi', group: 'transport', section: 'Travel', booking: false },
  { value: 'car', label: 'Car rental', icon: 'key', group: 'car', section: 'Travel', booking: true },
  { value: 'stay', label: 'Stay', icon: 'bed', group: 'stay', section: 'Stay', booking: true },
  { value: 'restaurant', label: 'Restaurant', icon: 'utensils', group: 'food', section: 'Food & drink', booking: true },
  { value: 'cafe', label: 'Café', icon: 'coffee', group: 'food', section: 'Food & drink', booking: false },
  { value: 'bar', label: 'Bar', icon: 'cocktail', group: 'food', section: 'Food & drink', booking: false },
  { value: 'activity', label: 'Activity', icon: 'ticket', group: 'activity', section: 'Do', booking: true },
  { value: 'free', label: 'Free time', icon: 'hourglass', group: 'free', section: 'Do', booking: false },
  { value: 'transport', label: 'Transport', icon: 'train', group: 'transport', section: '', booking: true },
];

/** The kinds the picker offers, by section. */
export const PICKER_SECTIONS = ['Travel', 'Stay', 'Food & drink', 'Do'].map((title) => ({ title, kinds: EVENT_KINDS.filter((k) => k.section === title) }));

/** Older stored categories and what they are now. */
const LEGACY: Record<string, EventKind> = { food: 'restaurant', drinks: 'bar', sight: 'activity', other: 'activity', note: 'free' };

/** The exact kind of any stored category, old or new. */
export const eventKind = (c: Category | string): EventKind =>
  LEGACY[c] ?? (EVENT_KINDS.some((k) => k.value === c) ? (c as EventKind) : 'activity');

export const kindInfo = (c: Category | string): KindInfo => EVENT_KINDS.find((k) => k.value === eventKind(c))!;

/** The group of any stored category (what most screens check). */
export const eventType = (c: Category | string): EventType => kindInfo(c).group;

/** The kinds an Idea can be (no Free time). */
export const CATEGORIES = EVENT_KINDS.filter((k) => k.section && k.value !== 'free');

/** A category's group, label and icon. */
export function categoryInfo(c: Category | string): { value: EventType; label: string; icon: IconName } {
  const k = kindInfo(c);
  return { value: k.group, label: k.label, icon: c === 'sight' ? 'camera' : k.icon };
}

/** All stored categories in this group (new and old), for filtering. */
export const categoriesOf = (t: EventType): string[] =>
  [...EVENT_KINDS.filter((k) => k.group === t).map((k) => k.value), ...Object.keys(LEGACY).filter((k) => kindInfo(k).group === t)];

/**
 * The Overview's "Bookings" rows: one per group (Free time has none). Rove doesn't track booked vs not booked,
 * so each row just counts the events of its kind (Documents counts the links and files attached to events).
 */
export const BOOKING_GROUPS: { key: string; title: string; icon: IconName; type: EventType; one: string; many: string }[] = [
  { key: 'flights', title: 'Flights', icon: 'plane', type: 'flight', one: 'flight', many: 'flights' },
  { key: 'stays', title: 'Stays', icon: 'bed', type: 'stay', one: 'stay', many: 'stays' },
  { key: 'transport', title: 'Transport', icon: 'train', type: 'transport', one: 'trip', many: 'trips' },
  { key: 'car', title: 'Car rental', icon: 'key', type: 'car', one: 'rental', many: 'rentals' },
  { key: 'activities', title: 'Activities', icon: 'ticket', type: 'activity', one: 'activity', many: 'activities' },
  { key: 'food', title: 'Food & drink', icon: 'utensils', type: 'food', one: 'reservation', many: 'reservations' },
];

/** Where an event ends up: a journey's or rental's drop-off place, otherwise its place. */
export const endPlace = (a: Activity) => a.to ?? a.location;
