import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType, type NavigateFunction } from 'react-router-dom';

/**
 * How screens change, like an iPhone app:
 * - opening something (a link, a card) slides the new screen in from the right;
 * - a back button slides the previous screen back in from the left;
 * - the Bottom Nav switches instantly, and so does the phone's own swipe-back (iOS animates that itself).
 * Each screen also remembers its scroll position, and going back returns you there.
 */
type Kind = 'push' | 'back' | 'none';
let pending: Kind | null = null;
/** Say how the next screen change should look (call just before navigating). */
export const nextTransition = (k: Kind) => { pending = k; };

/** Back, the app way: step back through history when there is somewhere to go back to, else go to the parent screen. */
export function goBack(navigate: NavigateFunction, parent: string) {
  nextTransition('back');
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1); else navigate(parent, { replace: true });
}

/** A screen is the path without a trip's tab (Itinerary, Ideas, Photos and People are one screen with tabs). */
export const screenKey = (path: string) => path.replace(/^(\/trip\/[^/]+)\/(ideas|photos|people|budget|info)$/, '$1');

const scrolls = new Map<string, number>();
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

/** Returns the class for the incoming screen's slide, and handles scroll memory. */
export function useScreenTransition(): Kind {
  const location = useLocation();
  const navType = useNavigationType();
  const key = screenKey(location.pathname);
  const prev = useRef({ key, locKey: location.key });
  const [kind, setKind] = useState<Kind>('none');
  // Remember where each history entry was scrolled to
  useLayoutEffect(() => {
    // Saved while scrolling, not on leaving: by then the next screen has replaced this one and the position is cut short.
    const save = () => scrolls.set(location.key, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [location.key]);
  useLayoutEffect(() => {
    if (prev.current.locKey === location.key) return;
    const sameScreen = prev.current.key === key;
    prev.current = { key, locKey: location.key };
    const k: Kind = sameScreen ? 'none' : pending ?? (navType === 'PUSH' ? 'push' : 'none');
    pending = null;
    setKind(k);
    if (sameScreen) return; // a tab inside the same screen keeps its scroll
    const y = navType === 'POP' ? scrolls.get(location.key) ?? 0 : 0;
    window.scrollTo(0, y);
    if (y <= 0) return;
    // The screen may still be loading (a short skeleton). Keep trying for up to a second, until it's tall enough,
    // and stop as soon as the person scrolls themselves.
    let stop = false; const end = performance.now() + 1000;
    const quit = () => { stop = true; };
    window.addEventListener('touchstart', quit, { once: true, passive: true }); window.addEventListener('wheel', quit, { once: true, passive: true });
    const tick = () => {
      if (stop) return;
      window.scrollTo(0, y);
      if (Math.abs(window.scrollY - y) > 1 && performance.now() < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [location.key, key, navType]);
  return kind;
}
