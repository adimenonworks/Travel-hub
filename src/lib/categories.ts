import type { IconName } from '../design/components';
import type { Category } from '../data/types';

// Categories have no colours of their own: they are told apart by icon, shown on the light emerald wash (Badge tone="category").
export const CATEGORIES: { value: Category; label: string; icon: IconName }[] = [
  { value: 'activity', label: 'Activity', icon: 'ticket' },
  { value: 'food', label: 'Food', icon: 'utensils' },
  { value: 'cafe', label: 'Café', icon: 'coffee' },
  { value: 'drinks', label: 'Drinks', icon: 'cocktail' },
  { value: 'sight', label: 'Sightseeing', icon: 'camera' },
  { value: 'flight', label: 'Flight', icon: 'plane' },
  { value: 'transport', label: 'Transport', icon: 'train' },
  { value: 'stay', label: 'Stay', icon: 'bed' },
  { value: 'other', label: 'Other', icon: 'ellipsis' },
];

export const categoryInfo = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];

/**
 * The Overview's "Bookings" tiles: events grouped by type. Rove doesn't track booked vs not booked, so each tile just
 * counts the events of its kind (Documents counts the links and files attached to events).
 */
export const BOOKING_GROUPS: { key: string; title: string; icon: IconName; categories: Category[]; one: string; many: string }[] = [
  { key: 'flights', title: 'Flights', icon: 'plane', categories: ['flight'], one: 'flight', many: 'flights' },
  { key: 'stays', title: 'Stays', icon: 'bed', categories: ['stay'], one: 'stay', many: 'stays' },
  { key: 'transport', title: 'Transport', icon: 'train', categories: ['transport'], one: 'trip', many: 'trips' },
  { key: 'activities', title: 'Activities', icon: 'ticket', categories: ['activity', 'sight'], one: 'activity', many: 'activities' },
  { key: 'food', title: 'Food & drink', icon: 'utensils', categories: ['food', 'cafe', 'drinks'], one: 'place', many: 'places' },
];
