import type { IconName } from '../design/components';
import type { Category } from '../data/types';

/**
 * Events are picked in two steps: a **type** (one of 7 groups people recognise at a glance) and a **category** inside
 * it (Activities → Museum or gallery). The category sets the icon and the **behaviour**: which card layout and form
 * fields the event uses. `behaviour` always comes from the category, never from what someone types.
 *
 * - journey: from → to (Journey card): flights, trains, buses, ferries, transfers, private drivers
 * - span: one booking shown twice, at its start and end (stays, cruises, car rental, campervans)
 * - place: at one place and time (food, drink, activities, errands, taxis, metro, bike hire)
 * - open: quiet time with no place needed (free time, rest)
 * - note: a note, with an optional time
 */
export type Behaviour = 'journey' | 'span' | 'place' | 'open' | 'note';

/** The 7 types. */
export type EventType = 'flights' | 'transport' | 'stays' | 'food' | 'activities' | 'free' | 'notes';

/** The stored category ids (Activity.category), plus the older values read through LEGACY. */
export type EventKind =
  | 'flight'
  | 'train' | 'bus' | 'ferry' | 'taxi' | 'transfer' | 'metro' | 'driver' | 'bike' | 'car' | 'campervan'
  | 'hotel' | 'apartment' | 'hostel' | 'camping' | 'cruise' | 'friends'
  | 'restaurant' | 'cafe' | 'bar' | 'market' | 'tasting'
  | 'sight' | 'museum' | 'tour' | 'hike' | 'nature' | 'show' | 'sports' | 'festival' | 'themepark' | 'spa' | 'class' | 'adventure' | 'nightlife' | 'shopping' | 'meetup'
  | 'free' | 'rest'
  | 'note' | 'errand';

export type KindInfo = {
  value: EventKind; label: string; icon: IconName; type: EventType; behaviour: Behaviour;
  /** One line under the category chips, saying what it covers. */
  hint: string;
  /** It can have a booking reference (and a price per person). */
  booking: boolean;
};

const k = (value: EventKind, label: string, icon: IconName, type: EventType, behaviour: Behaviour, hint: string, booking = true): KindInfo =>
  ({ value, label, icon, type, behaviour, hint, booking });

/** Every category, by type, the most common first (it's pre-selected in the picker). */
export const EVENT_KINDS: KindInfo[] = [
  k('flight', 'Flight', 'plane', 'flights', 'journey', 'A flight with its number and times. Add a connection for each leg.'),

  k('train', 'Train', 'train', 'transport', 'journey', 'Trains, from city hops to high-speed and sleepers.'),
  k('bus', 'Bus or coach', 'school-bus', 'transport', 'journey', 'Long-distance buses and coaches between towns.'),
  k('ferry', 'Ferry', 'ship', 'transport', 'journey', 'Ferries and boat crossings.'),
  k('taxi', 'Taxi or rideshare', 'taxi', 'transport', 'place', 'A taxi, Uber or Bolt from where you’re picked up.', false),
  k('transfer', 'Airport transfer', 'luggage', 'transport', 'journey', 'A booked ride to or from the airport.'),
  k('metro', 'Metro or tram', 'train-side', 'transport', 'place', 'A local metro, tram or city train ride.', false),
  k('driver', 'Private driver', 'car', 'transport', 'journey', 'A driver booked to take you somewhere.'),
  k('bike', 'Bike or scooter hire', 'bike', 'transport', 'place', 'Bikes or scooters to get around for a while.'),
  k('car', 'Car rental', 'key', 'transport', 'span', 'A hire car: shown at pick-up and drop-off.'),
  k('campervan', 'Campervan', 'truck', 'transport', 'span', 'A campervan or motorhome: shown at pick-up and drop-off.'),

  k('hotel', 'Hotel', 'building', 'stays', 'span', 'Hotels, resorts and B&Bs: shown at check-in and check-out.'),
  k('apartment', 'Apartment', 'building', 'stays', 'span', 'Apartments and holiday rentals like Airbnb.'),
  k('hostel', 'Hostel', 'bed', 'stays', 'span', 'Hostels and guesthouses.'),
  k('camping', 'Camping', 'camping', 'stays', 'span', 'Campsites, glamping and huts.'),
  k('cruise', 'Cruise', 'ship', 'stays', 'span', 'A cruise from embarking to disembarking. Add port calls as activities.'),
  k('friends', 'Staying with friends', 'home-location', 'stays', 'span', 'A friend’s or family’s place.', false),

  k('restaurant', 'Restaurant', 'utensils', 'food', 'place', 'Lunch or dinner somewhere, booked or not.'),
  k('cafe', 'Café', 'coffee', 'food', 'place', 'Coffee, breakfast or a bakery stop.', false),
  k('bar', 'Bar', 'cocktail', 'food', 'place', 'Bars, pubs and rooftops.', false),
  k('market', 'Food market or street food', 'shop', 'food', 'place', 'Food halls, night markets and street stalls.', false),
  k('tasting', 'Tasting', 'glass-cheers', 'food', 'place', 'Wineries, breweries, distilleries and tastings.'),

  k('sight', 'Sight or landmark', 'camera', 'activities', 'place', 'Landmarks, viewpoints, churches and monuments.'),
  k('museum', 'Museum or gallery', 'picture', 'activities', 'place', 'Museums, galleries and exhibitions.'),
  k('tour', 'Tour', 'navigation', 'activities', 'place', 'Guided tours, day trips and boat trips.'),
  k('hike', 'Walk or hike', 'mountains', 'activities', 'place', 'Walks, trails and hikes.', false),
  k('nature', 'Beach or nature', 'sun', 'activities', 'place', 'Beaches, parks, lakes and gardens.', false),
  k('show', 'Show or gig', 'music', 'activities', 'place', 'Concerts, theatre, comedy and gigs.'),
  k('sports', 'Sports event', 'trophy', 'activities', 'place', 'A match, race or game to watch.'),
  k('festival', 'Festival', 'mask', 'activities', 'place', 'Festivals, carnivals and celebrations.'),
  k('themepark', 'Theme park', 'ferris-wheel', 'activities', 'place', 'Theme parks, water parks and zoos.'),
  k('spa', 'Spa or wellness', 'spa', 'activities', 'place', 'Spas, baths, massages and yoga.'),
  k('class', 'Class or workshop', 'e-learning', 'activities', 'place', 'Cooking classes, lessons and workshops.'),
  k('adventure', 'Adventure', 'surfing', 'activities', 'place', 'Diving, surfing, skiing and other thrills.'),
  k('nightlife', 'Nightlife', 'disco-ball', 'activities', 'place', 'Clubs and late nights out.'),
  k('shopping', 'Shopping', 'shopping-bag', 'activities', 'place', 'Shops, malls and markets that aren’t food.', false),
  k('meetup', 'Meet-up or event', 'comment-user', 'activities', 'place', 'Meeting people, or an event you’re going to.', false),

  k('free', 'Free time', 'hourglass', 'free', 'open', 'Time to wander or keep open. No place needed.', false),
  k('rest', 'Rest', 'moon', 'free', 'open', 'A lie-in, a nap or a slow afternoon.', false),

  k('note', 'Note', 'notebook', 'notes', 'note', 'Something to remember, with an optional time.', false),
  k('errand', 'Errand', 'list-check', 'notes', 'place', 'A small task: luggage storage, a SIM card, laundry.', false),
];

/** The 7 types, in the picker's order, with the subtext shown on their Option cards. */
export const EVENT_TYPES: { value: EventType; label: string; icon: IconName; hint: string; kinds: KindInfo[] }[] = ([
  ['flights', 'Flights', 'plane', 'Flights, including connections and layovers'],
  ['transport', 'Getting around', 'train', 'Trains, buses, ferries, taxis, transfers and car hire'],
  ['stays', 'Stays', 'bed', 'Hotels, apartments, hostels, camping and cruises'],
  ['food', 'Food & drink', 'utensils', 'Restaurants, cafés, bars and markets'],
  ['activities', 'Activities', 'ticket', 'Sights, tours, walks, hikes, shows and experiences'],
  ['free', 'Free time', 'hourglass', 'Time to rest, wander or keep open'],
  ['notes', 'Notes & reminders', 'notebook', 'A note, or a small task like luggage storage or picking up a SIM'],
] as const).map(([value, label, icon, hint]) => ({ value, label, icon, hint, kinds: EVENT_KINDS.filter((x) => x.type === value) }));

/** Older stored categories and what they are now. */
const LEGACY: Record<string, EventKind> = { stay: 'hotel', activity: 'sight', transport: 'train', food: 'restaurant', drinks: 'bar', other: 'sight' };

/** The exact category of any stored value, old or new (unknown values count as a sight). */
export const eventKind = (c: Category | string): EventKind =>
  LEGACY[c] ?? (EVENT_KINDS.some((x) => x.value === c) ? (c as EventKind) : 'sight');

export const kindInfo = (c: Category | string): KindInfo => EVENT_KINDS.find((x) => x.value === eventKind(c))!;

/** The type of any stored category (Flights, Getting around, Stays…). */
export const eventType = (c: Category | string): EventType => kindInfo(c).type;

/** How any stored category behaves: its card layout and fields. */
export const behaviourOf = (c: Category | string): Behaviour => kindInfo(c).behaviour;

/** Everyday spending (no price per person, not added to the budget): food & drink, free time and notes. */
export const isEveryday = (c: Category | string) => { const t = eventType(c); return t === 'food' || t === 'free' || t === 'notes'; };

/** The start and end words of a span ("Check-in" / "Check-out"). */
export function spanWords(c: Category | string): [string, string] {
  const kind = eventKind(c);
  return kind === 'cruise' ? ['Embark', 'Disembark'] : kind === 'car' || kind === 'campervan' ? ['Pick-up', 'Drop-off'] : ['Check-in', 'Check-out'];
}

/** The kinds an Idea can be: every category except time and notes. */
export const CATEGORIES = EVENT_KINDS.filter((x) => x.type !== 'free' && x.type !== 'notes');

/** A category's type, label and icon. */
export function categoryInfo(c: Category | string): { value: EventType; label: string; icon: IconName } {
  const x = kindInfo(c);
  return { value: x.type, label: x.label, icon: x.icon };
}

/**
 * The Overview's "Bookings" rows: one per type you book (free time and notes have none). Rove doesn't track booked vs
 * not booked, so each row just counts the events of that type (Documents counts the links and files attached to events).
 * `key` is the address of its list (`/trip/:id/bookings/:key`).
 */
export const BOOKING_GROUPS: { key: string; title: string; icon: IconName; type: EventType; one: string; many: string; add: EventKind }[] = [
  { key: 'flights', title: 'Flights', icon: 'plane', type: 'flights', one: 'flight', many: 'flights', add: 'flight' },
  { key: 'stays', title: 'Stays', icon: 'bed', type: 'stays', one: 'stay', many: 'stays', add: 'hotel' },
  { key: 'transport', title: 'Getting around', icon: 'train', type: 'transport', one: 'booking', many: 'bookings', add: 'train' },
  { key: 'activities', title: 'Activities', icon: 'ticket', type: 'activities', one: 'activity', many: 'activities', add: 'sight' },
  { key: 'food', title: 'Food & drink', icon: 'utensils', type: 'food', one: 'reservation', many: 'reservations', add: 'restaurant' },
];
