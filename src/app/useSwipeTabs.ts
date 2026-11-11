import { useEffect, useRef } from 'react';
import { haptic } from '../lib/native';

/**
 * Swipe across a box to go to the next or previous tab: a trip's tabs, the Trips page's Upcoming · Saved · Past.
 * A swipe counts when it's mostly sideways, at least 64px and quick. It never starts on anything with its own sideways
 * gesture: an event row (swipe actions), a strip that scrolls sideways (days, chips, the tab bar), a map, a form field,
 * a sheet, or the screen's left edge (iOS swipe back). `go(1)` is the next tab, `go(-1)` the previous one.
 */
export function useSwipeTabs(box: React.RefObject<HTMLElement | null>, go: (dir: 1 | -1) => void) {
  const latest = useRef(go);
  latest.current = go;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let start: { x: number; y: number; t: number } | null = null;
    const ownSideways = (t: EventTarget | null) => {
      for (let n = t as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.matches('[data-no-tab-swipe], input, textarea, select, .leaflet-container, [role=dialog]')) return true;
        const st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
      }
      return false;
    };
    const down = (e: TouchEvent) => {
      const p = e.touches[0];
      start = e.touches.length === 1 && p.clientX > 24 && !ownSideways(e.target) ? { x: p.clientX, y: p.clientY, t: Date.now() } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const p = e.changedTouches[0], dx = p.clientX - start.x, dy = p.clientY - start.y, ms = Date.now() - start.t;
      start = null;
      if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5 || ms > 600) return;
      latest.current(dx < 0 ? 1 : -1);
    };
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchend', up, { passive: true });
    return () => { el.removeEventListener('touchstart', down); el.removeEventListener('touchend', up); };
  }, [box]);
}

/** The tab `dir` steps away from `cur` in `order`, or null at either end (with the selection haptic when it moves). */
export function stepTab<T>(order: readonly T[], cur: T, dir: 1 | -1): T | null {
  const i = order.indexOf(cur) + dir;
  if (i < 0 || i >= order.length) return null;
  haptic('selection');
  return order[i];
}
