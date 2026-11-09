import { useEffect, useState } from 'react';

/**
 * Recently viewed (handover v2): the documents, bookings and places you last opened on a trip, newest first.
 * Kept on this device only (localStorage), per trip. `url` is the link, or the in-app route for a booking or place.
 */
export type ViewKind = 'PDF' | 'Email' | 'Link' | 'Booking' | 'Place';
export type Viewed = { url: string; label: string; meta?: string; kind?: ViewKind; at: number };
/** In-app routes start with "/"; everything else opens outside Rove. */
export const isInApp = (v: Viewed) => v.url.startsWith('/');
const KEY = (tripId: string) => `recent:${tripId}`;
const EVENT = 'rove-recent';
const KEEP = 10;

function read(tripId: string): Viewed[] {
  try { const v = JSON.parse(localStorage.getItem(KEY(tripId)) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** Remember that a document or link was opened (the same link moves back to the top). */
export function recordView(tripId: string, v: Omit<Viewed, 'at'>) {
  const list = [{ ...v, at: Date.now() }, ...read(tripId).filter((x) => x.url !== v.url)].slice(0, KEEP);
  try { localStorage.setItem(KEY(tripId), JSON.stringify(list)); } catch { /* storage full or blocked: not remembered */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: tripId }));
}

/** The last few documents and links opened on a trip, kept up to date. */
export function useRecentViews(tripId: string, n = 3) {
  const [list, setList] = useState(() => read(tripId));
  useEffect(() => {
    const update = () => setList(read(tripId));
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update); };
  }, [tripId]);
  return list.slice(0, n);
}
