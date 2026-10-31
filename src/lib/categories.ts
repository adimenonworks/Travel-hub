import type { IconName } from '../design/components';
import type { Category } from '../data/types';

// Categories have no colours of their own: they are told apart by icon, shown on the light emerald wash (Badge tone="category").
export const CATEGORIES: { value: Category; label: string; icon: IconName }[] = [
  { value: 'activity', label: 'Activity', icon: 'ticket' },
  { value: 'food', label: 'Food', icon: 'utensils' },
  { value: 'cafe', label: 'Café', icon: 'coffee' },
  { value: 'drinks', label: 'Drinks', icon: 'cocktail' },
  { value: 'sight', label: 'Sightseeing', icon: 'camera' },
  { value: 'transport', label: 'Transport', icon: 'train' },
  { value: 'stay', label: 'Stay', icon: 'bed' },
  { value: 'other', label: 'Other', icon: 'ellipsis' },
];

export const categoryInfo = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];
