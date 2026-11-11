import { Capacitor } from '@capacitor/core';

/** True inside the iPhone app (Capacitor), false in a browser. */
export const isNativeApp = Capacitor.isNativePlatform();

/** The iPhone app's Google sign-in client (public, like the rest of the Firebase config). Set in .env.production. */
export const googleIosClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;

/** The public web address. Links other people open (invites) use it, since the app's own address only works inside the app. */
export const PUBLIC_SITE = 'https://adimenonworks.github.io/Travel-hub/';

/** Is the app showing its dark theme right now (forced in Profile, or following the phone)? */
export const isDark = () => {
  const t = document.documentElement.getAttribute('data-theme');
  return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/** Native extras for the iPhone app: status bar and keyboard follow the theme; the keyboard's height reaches CSS; the tab bar hides while typing. No-ops in a browser. */
export async function setupNative() {
  if (!isNativeApp) return;
  const [{ StatusBar, Style }, { Keyboard, KeyboardStyle }] = await Promise.all([import('@capacitor/status-bar'), import('@capacitor/keyboard')]);
  const sync = () => {
    const dark = isDark();
    // Style.Dark = light text (for a dark page); Style.Light = dark text (for a light page).
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    Keyboard.setStyle({ style: dark ? KeyboardStyle.Dark : KeyboardStyle.Light }).catch(() => {});
  };
  sync();
  // iOS's bar above the keyboard (‹ › Done): Done collapses the keyboard.
  Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // The web view keeps its size while the keyboard is up (resize: 'none'), so the keyboard's height goes to CSS:
  // sheets move up by it with the keyboard's own timing (see Sheet.module.css), and pages get room to scroll past it.
  const root = document.documentElement;
  Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
    root.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    root.classList.add('keyboard-open');
    window.dispatchEvent(new CustomEvent('rove:keyboard', { detail: keyboardHeight }));
  });
  Keyboard.addListener('keyboardWillHide', () => {
    root.style.setProperty('--keyboard-height', '0px');
    root.classList.remove('keyboard-open');
    window.dispatchEvent(new CustomEvent('rove:keyboard', { detail: 0 }));
  });
}

/** The phone's own share sheet in the app; the browser's where it has one. Returns false when there's no share sheet (copy instead). */
export async function shareLink(opts: { title: string; text: string; url: string }): Promise<boolean> {
  if (isNativeApp) {
    const { Share } = await import('@capacitor/share');
    try { await Share.share({ ...opts, dialogTitle: opts.title }); } catch { /* cancelled */ }
    return true;
  }
  if (navigator.share) {
    try { await navigator.share(opts); } catch { /* cancelled */ }
    return true;
  }
  return false;
}

export type Haptic = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

/**
 * The Figma "Haptics map": Selection for the day strip, tabs, chips, calendar days and picking a destination;
 * light/medium impact for votes and Option cards; success / warning / error for outcomes (saved, trip created, failed).
 * Never for list taps, page changes or the Bottom Nav. Does nothing in a browser.
 */
export function haptic(kind: Haptic) {
  if (!isNativeApp) return;
  import('@capacitor/haptics').then(async ({ Haptics, ImpactStyle, NotificationType }) => {
    try {
      if (kind === 'selection') { await Haptics.selectionStart(); await Haptics.selectionChanged(); await Haptics.selectionEnd(); }
      else if (kind === 'light' || kind === 'medium') await Haptics.impact({ style: kind === 'light' ? ImpactStyle.Light : ImpactStyle.Medium });
      else await Haptics.notification({ type: kind === 'success' ? NotificationType.Success : kind === 'warning' ? NotificationType.Warning : NotificationType.Error });
    } catch { /* no haptics on this device */ }
  });
}

/**
 * Links shared to Rove from another app. The iPhone share extension (ios/App/ShareExtension) opens
 * rove://save?url=<link>; the test site accepts the same at #/save?url=<link>. Calls back with each link.
 */
export function onSharedLink(cb: (url: string) => void): () => void {
  const take = (raw: string) => {
    try {
      const u = new URL(raw);
      const link = u.searchParams.get('url');
      if (u.protocol === 'rove:' && link) cb(link);
    } catch { /* not ours */ }
  };
  // On the website (and for testing): #/save?url=…
  const fromHash = () => {
    const m = location.hash.match(/^#\/save\?(.*)$/);
    const link = m && new URLSearchParams(m[1]).get('url');
    if (link) { cb(link); history.replaceState(null, '', `${location.pathname}#/`); }
  };
  fromHash();
  window.addEventListener('hashchange', fromHash);
  let remove: (() => void) | undefined;
  if (isNativeApp) {
    import('@capacitor/app').then(({ App }) => {
      App.getLaunchUrl().then((r) => r?.url && take(r.url)).catch(() => {});
      App.addListener('appUrlOpen', (e) => take(e.url)).then((h) => { remove = () => h.remove(); });
    });
  }
  return () => { window.removeEventListener('hashchange', fromHash); remove?.(); };
}

/**
 * Links that open a page in the app: rove://go?path=/join/abc (the website's "Open in Rove"). Calls back with the path.
 */
export function onOpenPath(cb: (path: string) => void): () => void {
  if (!isNativeApp) return () => {};
  const take = (raw: string) => {
    try {
      const u = new URL(raw);
      const path = u.searchParams.get('path');
      if (u.protocol === 'rove:' && u.host === 'go' && path?.startsWith('/')) cb(path);
    } catch { /* not ours */ }
  };
  let remove: (() => void) | undefined;
  import('@capacitor/app').then(({ App }) => {
    App.getLaunchUrl().then((r) => r?.url && take(r.url)).catch(() => {});
    App.addListener('appUrlOpen', (e) => take(e.url)).then((h) => { remove = () => h.remove(); });
  });
  return () => remove?.();
}

/** A destructive confirmation (delete, remove, leave) with the Warning haptic first, as in the Figma Haptics map. */
export function confirmAction(message: string): boolean {
  haptic('warning');
  return window.confirm(message);
}

/** "Rove 1.0 (12)": the app's version and build on iPhone (from the app itself), else the web build's version. */
export async function appVersion(): Promise<string> {
  if (isNativeApp) {
    try { const { App } = await import('@capacitor/app'); const i = await App.getInfo(); return `Rove ${i.version} (${i.build})`; } catch { /* fall through */ }
  }
  return `Rove ${__APP_VERSION__} (web)`;
}

/**
 * The text on the clipboard. In the iPhone app this reads it natively (@capacitor/clipboard), so tapping a Paste button
 * pastes straight away instead of showing the web view's own "Paste" bubble. In a browser it uses the web clipboard.
 */
export async function readClipboard(): Promise<string> {
  if (isNativeApp) {
    const { Clipboard } = await import('@capacitor/clipboard');
    const { value } = await Clipboard.read();
    return value ?? '';
  }
  return navigator.clipboard.readText();
}
