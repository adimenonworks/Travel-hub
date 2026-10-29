import type { IconName } from '../design/components';
import type { Category } from '../data/types';

// Categories have no colours of their own: they are told apart by icon, shown on the light emerald wash (Badge tone="category").
export const CATEGORIES: { value: Category; label: string; icon: IconName }[] = [
  { value: 'activity', label: 'Activity', icon: 'sun' },
  { value: 'food', label: 'Food', icon: 'pin' },
  { value: 'cafe', label: 'Café', icon: 'clock' },
  { value: 'drinks', label: 'Drinks', icon: 'globe' },
  { value: 'sight', label: 'Sightseeing', icon: 'map' },
  { value: 'transport', label: 'Transport', icon: 'plane' },
  { value: 'stay', label: 'Stay', icon: 'home' },
  { value: 'other', label: 'Other', icon: 'ellipsis' },
];

export const categoryInfo = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];
