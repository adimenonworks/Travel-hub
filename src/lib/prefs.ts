/** Settings saved on this device only (like the theme). */
export type MapsApp = 'google' | 'apple' | 'waze';

export const MAPS_APPS: { value: MapsApp; label: string }[] = [
  { value: 'google', label: 'Google Maps' },
  { value: 'apple', label: 'Apple Maps' },
  { value: 'waze', label: 'Waze' },
];

const MAPS_KEY = 'triphub-maps';

export function getMapsApp(): MapsApp {
  try {
    const v = localStorage.getItem(MAPS_KEY);
    return v === 'apple' || v === 'waze' ? v : 'google';
  } catch { return 'google'; }
}

export function setMapsApp(app: MapsApp) {
  try { localStorage.setItem(MAPS_KEY, app); } catch { /* storage blocked */ }
}

export const mapsAppLabel = (app: MapsApp) => MAPS_APPS.find((m) => m.value === app)!.label;
