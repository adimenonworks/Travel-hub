import { store } from '../data';
import { isNativeApp } from './native';

/**
 * The website is join-only: in a browser (not the iPhone app) with the real database it shows just sign-in, the join
 * page, the privacy policy and the "Get Rove" page. Demo mode (testing on a computer) keeps the whole app; set
 * localStorage "rove:join-only" to "1" to test the join-only website in demo mode.
 */
export function joinOnly() {
  if (isNativeApp) return false;
  if (store.mode === 'firebase') return true;
  try { return localStorage.getItem('rove:join-only') === '1'; } catch { return false; }
}

/** Rove on the App Store. Empty until it's listed: the Get Rove page then says it's coming soon. */
export const APP_STORE_URL = '';

/** The app's own link to a page, e.g. rove://go?path=/join/abc (opens Rove if it's installed). */
export const appLink = (path: string) => `rove://go?path=${encodeURIComponent(path)}`;

const HAS_APP = 'rove:has-app';
/** Has "Open in Rove" worked on this device before? Then it's tried straight away next time. */
export const knownToHaveApp = () => { try { return localStorage.getItem(HAS_APP) === '1'; } catch { return false; } };
export const rememberHasApp = () => { try { localStorage.setItem(HAS_APP, '1'); } catch { /* private mode */ } };
