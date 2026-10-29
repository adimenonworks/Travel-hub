/**
 * Trip cover colours: step 300 of each palette (1.6:1 against white), so the
 * dark --text-on-brand ink reads on every one of them. Trips made before the
 * colour simplification stored an older name or a hex value; those map to the nearest.
 */
export const COVER_COLORS = [
  { value: 'emerald', label: 'Emerald' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' },
  { value: 'neutral', label: 'Grey' },
].map((c) => ({ ...c, color: `var(--p-${c.value}-300)` }));

const LEGACY: Record<string, string> = {
  lime: 'green', lemon: 'orange', tangerine: 'orange', bubblegum: 'red', lavender: 'emerald', aqua: 'emerald', sky: 'emerald', sand: 'neutral',
  '#007aff': 'emerald', '#34c759': 'green', '#ff9500': 'orange', '#af52de': 'emerald',
  '#ff2d55': 'red', '#30b0c7': 'emerald', '#5856d6': 'emerald', '#a2845e': 'neutral',
};

/** The cover colour's name, upgrading older names and hex values. */
export function coverName(stored?: string | null): string {
  if (!stored) return 'emerald';
  const name = LEGACY[stored.toLowerCase()] ?? stored;
  return COVER_COLORS.some((c) => c.value === name) ? name : 'emerald';
}

/** A CSS colour for a trip's cover. Text and icons on it use --text-on-brand / --icon-on-brand. */
export const coverColor = (stored?: string | null) => `var(--p-${coverName(stored)}-300)`;

/** Resolve a CSS colour (including var(...)) to a real value, for libraries like Leaflet that can't read variables. */
export function resolveColor(css: string) {
  const name = css.match(/var\((--[^)]+)\)/)?.[1];
  return name ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : css;
}
