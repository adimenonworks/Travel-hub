export type ThemePref = 'auto' | 'light' | 'dark';
export type Accent = 'emerald' | 'lime' | 'lemon' | 'tangerine' | 'bubblegum' | 'lavender' | 'sky';

const KEY = 'triphub-theme';
// v2: earlier versions saved 'lime' on every visit, so that value can't tell a real choice apart.
const ACCENT_KEY = 'triphub-accent-v2';
const OLD_ACCENT_KEY = 'triphub-accent';

/** Accent choices for Profile → Appearance. Each maps to a bright/deep pair in tokens/semantic.css. */
export const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: 'emerald', label: 'Emerald', color: 'var(--p-emerald)' },
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
  const valid = (v: string | null): v is Accent => ACCENTS.some((a) => a.value === v);
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    if (valid(v)) return v;
    // Keep a colour picked before v2, except 'lime', which used to be saved automatically.
    const old = localStorage.getItem(OLD_ACCENT_KEY);
    return valid(old) && old !== 'lime' ? old : 'emerald';
  } catch { return 'emerald'; }
}

/** Shows an accent. Pass `save` when the user picked it, so it's remembered on this device. */
export function applyAccent(a: Accent, save = false) {
  const root = document.documentElement;
  if (a === 'emerald') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', a);
  if (save) try { localStorage.setItem(ACCENT_KEY, a); } catch { /* ignore */ }
}
