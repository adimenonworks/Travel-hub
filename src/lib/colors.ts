/**
 * Trip cover colours. New trips store the colour's name ("lime"); trips made
 * before the redesign stored a hex value, which maps to the nearest new colour.
 */
export const COVER_COLORS = [
  { value: 'lime', label: 'Lime' },
  { value: 'lemon', label: 'Lemon' },
  { value: 'tangerine', label: 'Tangerine' },
  { value: 'bubblegum', label: 'Bubblegum' },
  { value: 'lavender', label: 'Lavender' },
  { value: 'aqua', label: 'Aqua' },
  { value: 'sky', label: 'Sky' },
  { value: 'sand', label: 'Sand' },
].map((c) => ({ ...c, color: `var(--p-${c.value})` }));

const LEGACY: Record<string, string> = {
  '#007aff': 'sky', '#34c759': 'lime', '#ff9500': 'tangerine', '#af52de': 'lavender',
  '#ff2d55': 'bubblegum', '#30b0c7': 'aqua', '#5856d6': 'lavender', '#a2845e': 'sand',
};

/** The cover colour's name, upgrading legacy hex values. */
export function coverName(stored?: string | null): string {
  if (!stored) return 'lime';
  const name = LEGACY[stored.toLowerCase()] ?? stored;
  return COVER_COLORS.some((c) => c.value === name) ? name : 'lime';
}

/** A CSS colour for a trip's cover. Text on it should use --color-on-bright. */
export const coverColor = (stored?: string | null) => `var(--p-${coverName(stored)})`;

/** Resolve a CSS colour (including var(...)) to a real value, for libraries like Leaflet that can't read variables. */
export function resolveColor(css: string) {
  const name = css.match(/var\((--[^)]+)\)/)?.[1];
  return name ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : css;
}
