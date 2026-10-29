export type ThemePref = 'auto' | 'light' | 'dark';

const KEY = 'triphub-theme';

export function getTheme(): ThemePref {
  try { return (localStorage.getItem(KEY) as ThemePref) || 'auto'; } catch { return 'auto'; }
}

export function applyTheme(t: ThemePref) {
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}
