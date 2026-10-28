export type ThemePref = 'auto' | 'light' | 'dark';
export type Accent = 'lime' | 'lemon' | 'tangerine' | 'bubblegum' | 'lavender' | 'sky';

const KEY = 'triphub-theme';
const ACCENT_KEY = 'triphub-accent';

/** Accent choices for Profile → Appearance. Each maps to a bright/deep pair in tokens/semantic.css. */
export const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: 'lime', label: 'Lime', color: 'var(--p-lime)' },
  { value: 'lemon', label: 'Lemon', color: 'var(--p-lemon)' },
  { value: 'tangerine', label: 'Tangerine', color: 'var(--p-tangerine)' },
  { value: 'bubblegum', label: 'Bubblegum', color: 'var(--p-bubblegum)' },
  { value: 'lavender', label: 'Lavender', color: 'var(--p-lavender)' },
  { value: 'sky', label: 'Sky', color: 'var(--p-sky)' },
];

export function getTheme(): ThemePref {
  try { return (localStorage.getItem(KEY) as ThemePref) || 'auto'; } catch { return 'auto'; }
}

export function applyTheme(t: ThemePref) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

export function getAccent(): Accent {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    return ACCENTS.some((a) => a.value === v) ? (v as Accent) : 'lime';
  } catch { return 'lime'; }
}

export function applyAccent(a: Accent) {
  const root = document.documentElement;
  if (a === 'lime') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', a);
  try { localStorage.setItem(ACCENT_KEY, a); } catch { /* ignore */ }
}
