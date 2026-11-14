import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType, type Location, type NavigateFunction } from 'react-router-dom';

/**
 * How screens change, like an iPhone app:
 * - opening something (a link, a card) slides the new screen in from the right;
 * - a back button slides the previous screen back in from the left;
 * - the Bottom navigation cross-fades quickly between tabs (no haptic: navigation is silent), and each tab keeps its own scroll position;
 * - swiping in from the left edge drags this screen away over the previous one (SwipeBack in Shell.tsx), like iOS.
 * Each screen also remembers its scroll position, and going back returns you there.
 */
type Kind = 'push' | 'back' | 'tab' | 'none';
let pending: Kind | null = null;
/** Say how the next screen change should look (call just before navigating). */
export const nextTransition = (k: Kind) => { pending = k; };
/** How the screen change now happening will look, without using up the request (ScreenStack reads it while rendering). */
export const peekTransition = (navType: string): Kind => pending ?? (navType === 'PUSH' ? 'push' : 'none');

/** Back, the app way: step back through history when there is somewhere to go back to, else go to the parent screen. */
export function goBack(navigate: NavigateFunction, parent: string) {
  nextTransition('back');
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1); else navigate(parent, { replace: true });
}

/** A screen is the path without a trip's tab (Overview, Itinerary, Ideas, Photos and People are one screen with tabs). */
export const screenKey = (path: string) => path.replace(/^(\/trip\/[^/]+)\/(itinerary|ideas|photos|people|info)$/, '$1');

const scrolls = new Map<string, number>();
/** Where each tab's screen was scrolled to (by path), so coming back to a tab returns you there. */
const tabScrolls = new Map<string, number>();
/** Where a path was last scrolled to (a trip's tabs each remember their own). */
export const savedScroll = (path: string) => tabScrolls.get(path);
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
    const save = () => { scrolls.set(location.key, window.scrollY); tabScrolls.set(location.pathname, window.scrollY); };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [location.key, location.pathname]);
  useLayoutEffect(() => {
    if (prev.current.locKey === location.key) return;
    const sameScreen = prev.current.key === key;
    prev.current = { key, locKey: location.key };
    const k: Kind = sameScreen ? 'none' : pending ?? (navType === 'PUSH' ? 'push' : 'none');
    pending = null;
    setKind(k);
    if (sameScreen) return; // a tab inside the same screen keeps its scroll
    const y = k === 'tab' ? tabScrolls.get(location.pathname) ?? 0 : navType === 'POP' ? scrolls.get(location.key) ?? 0 : 0;
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
  }, [location.key, location.pathname, key, navType]);
  return kind;
}

/**
 * The screens behind this one (by history position), so the edge swipe can draw the previous screen under the
 * current one while it's dragged. Updated on every navigation.
 */
const stack: Location[] = [];
export function rememberLocation(loc: Location) {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  stack[idx] = loc;
  stack.length = idx + 1;
}
/** The previous screen and where it was scrolled to, or null when there's nothing to go back to. */
export function previousScreen(): { location: Location; scrollY: number } | null {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const loc = idx > 0 ? stack[idx - 1] : undefined;
  return loc ? { location: loc, scrollY: scrolls.get(loc.key) ?? 0 } : null;
}
