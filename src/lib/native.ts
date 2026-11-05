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

/** Native extras for the iPhone app: status bar and keyboard follow the theme; the tab bar hides while typing. No-ops in a browser. */
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
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  Keyboard.addListener('keyboardWillShow', () => document.documentElement.classList.add('keyboard-open'));
  Keyboard.addListener('keyboardWillHide', () => document.documentElement.classList.remove('keyboard-open'));
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

/**
 * A very light "tick" (the iOS selection haptic, as when a picker wheel clicks), e.g. when switching tabs.
 * Does nothing in a browser.
 */
export function selectionTick() {
  if (!isNativeApp) return;
  import('@capacitor/haptics').then(async ({ Haptics }) => {
    try { await Haptics.selectionStart(); await Haptics.selectionChanged(); await Haptics.selectionEnd(); } catch { /* no haptics on this device */ }
  });
}
