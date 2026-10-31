/** Resolve a CSS colour (including var(...)) to a real value, for libraries like Leaflet that can't read variables. */
export function resolveColor(css: string) {
  const name = css.match(/var\((--[^)]+)\)/)?.[1];
  return name ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : css;
}
