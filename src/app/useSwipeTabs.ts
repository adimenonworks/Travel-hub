import { useEffect, useRef } from 'react';
import { haptic } from '../lib/native';

/**
 * Swipe across a box to go to the next or previous view (a day of the Itinerary, Ideas' To decide · Planned · Passed,
 * the Trips page's Upcoming · Collections · Past), like paging on iPhone: the view follows your finger, stretches with
 * resistance when there's nothing further that way, and on release goes to the next one if you dragged past a quarter
 * of the width or flicked; otherwise it springs back. The new view carries on from where you let go (the SlideSwap
 * inside reads `--from`). Up and down still scroll the page. It never starts on a form field, a map, a sheet, a strip
 * that scrolls sideways or the screen's left edge (swipe back). `go(1)` is the next view, `go(-1)` the previous one;
 * `can(dir)` says whether there is one.
 */
export function useSwipeTabs(box: React.RefObject<HTMLElement | null>, go: (dir: 1 | -1) => void, can: (dir: 1 | -1) => boolean = () => true) {
  const latest = useRef({ go, can });
  latest.current = { go, can };
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.touchAction = 'pan-y';
    const view = () => el.querySelector<HTMLElement>('[data-swap]');
    let p: { x: number; y: number; id: number; dir: 'x' | 'y' | null; lx: number; lt: number; v: number; dx: number } | null = null;
    let dragged = false;
    const ownSideways = (t: EventTarget | null) => {
      for (let n = t as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.matches('[data-no-tab-swipe], input, textarea, select, .leaflet-container, [role=dialog], [role=radiogroup]')) return true;
        const st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
      }
      return false;
    };
    const set = (dx: number, animate: boolean) => {
      const v = view(); if (!v) return;
      v.style.transition = animate ? 'transform var(--duration-base) var(--ease-spring)' : 'none';
      v.style.transform = dx ? `translateX(${dx}px)` : '';
    };
    const down = (e: PointerEvent) => {
      dragged = false;
      if ((e.pointerType === 'mouse' && e.button !== 0) || e.clientX <= 24 || ownSideways(e.target)) { p = null; return; }
      p = { x: e.clientX, y: e.clientY, id: e.pointerId, dir: null, lx: e.clientX, lt: e.timeStamp, v: 0, dx: 0 };
    };
    const move = (e: PointerEvent) => {
      if (!p || e.pointerId !== p.id) return;
      const mx = e.clientX - p.x, my = e.clientY - p.y;
      if (!p.dir) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        p.dir = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
        if (p.dir === 'x') { dragged = true; el.dispatchEvent(new CustomEvent('rove:pagerdrag', { bubbles: true })); }
      }
      if (p.dir !== 'x') return;
      const dt = Math.max(1, e.timeStamp - p.lt);
      p.v = 0.7 * ((e.clientX - p.lx) / dt) + 0.3 * p.v; p.lx = e.clientX; p.lt = e.timeStamp;
      const dir: 1 | -1 = mx < 0 ? 1 : -1;
      p.dx = latest.current.can(dir) ? mx : mx * 0.3; // nothing further: it stretches, like iOS
      set(p.dx, false);
    };
    const up = (e: PointerEvent) => {
      if (!p || e.pointerId !== p.id) return;
      const d = p; p = null;
      if (d.dir !== 'x') return;
      const w = el.clientWidth || 1, dir: 1 | -1 = d.dx < 0 ? 1 : -1;
      const flick = Math.abs(d.v) > 0.35 && Math.sign(d.v) === Math.sign(d.dx);
      if (e.type !== 'pointercancel' && latest.current.can(dir) && (Math.abs(d.dx) > w / 4 || flick)) {
        // The next view slides in from where this one was let go
        const v = view();
        if (v) { v.style.transition = 'none'; v.style.transform = ''; v.style.setProperty('--from', `${d.dx}px`); setTimeout(() => v.style.removeProperty('--from'), 400); }
        latest.current.go(dir);
      } else set(0, true); // springs back
    };
    // A drag never counts as a tap on whatever it started on (an event card opens on tap)
    const click = (e: MouseEvent) => { if (dragged) { dragged = false; e.preventDefault(); e.stopPropagation(); } };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', click, true);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('click', click, true);
    };
  }, [box]);
}

/** The tab `dir` steps away from `cur` in `order`, or null at either end (with the selection haptic when it moves). */
export function stepTab<T>(order: readonly T[], cur: T, dir: 1 | -1): T | null {
  const i = order.indexOf(cur) + dir;
  if (i < 0 || i >= order.length) return null;
  haptic('selection');
  return order[i];
}

/** Whether `cur` has a neighbour `dir` away in `order` (for the stretch at either end). */
export const hasStep = <T,>(order: readonly T[], cur: T, dir: 1 | -1) => { const i = order.indexOf(cur) + dir; return i >= 0 && i < order.length; };
