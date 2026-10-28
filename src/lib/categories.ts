import type { IconName } from '../design/components';
import type { Category } from '../data/types';

export const CATEGORIES: { value: Category; label: string; icon: IconName; color: string }[] = [
  { value: 'activity', label: 'Activity', icon: 'sun', color: 'var(--color-cat-activity)' },
  { value: 'food', label: 'Food', icon: 'pin', color: 'var(--color-cat-food)' },
  { value: 'cafe', label: 'Café', icon: 'clock', color: 'var(--color-cat-cafe)' },
  { value: 'drinks', label: 'Drinks', icon: 'globe', color: 'var(--color-cat-drinks)' },
  { value: 'sight', label: 'Sightseeing', icon: 'map', color: 'var(--color-cat-sight)' },
  { value: 'transport', label: 'Transport', icon: 'plane', color: 'var(--color-cat-transport)' },
  { value: 'stay', label: 'Stay', icon: 'home', color: 'var(--color-cat-stay)' },
  { value: 'other', label: 'Other', icon: 'ellipsis', color: 'var(--color-cat-other)' },
];

export const categoryInfo = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];
