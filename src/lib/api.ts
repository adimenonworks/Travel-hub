import { toInstant } from './timezone';
import { useEffect, useState } from 'react';
import type { Activity, TripPhoto } from '../data/types';

/**
 * Rove's small server (server/worker.js, a Cloudflare Worker): it holds the Unsplash and RapidAPI keys, so they're
 * never in the app. Its address is VITE_API_BASE in .env.production; until it's set, covers stay illustrations and
 * flights show no live status (the app works the same otherwise).
 */
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';
export const hasApi = !!API_BASE;

// ---------- Unsplash cover photos ----------

/** One landscape photo of a place ("Lisbon Portugal"); null when Unsplash has none; undefined when the lookup failed
 *  (offline, server or key trouble), so the caller tries again later instead of remembering "no photo". */
export async function findCoverPhoto(q: string): Promise<TripPhoto | null | undefined> {
  if (!hasApi || !q.trim()) return undefined;
  try {
    const r = await fetch(`${API_BASE}/cover?q=${encodeURIComponent(q.trim())}`);
    if (r.ok) return (await r.json()) as TripPhoto;
    return r.status === 404 ? null : undefined;
  } catch { return undefined; }
}

/** Unsplash's terms: tell them when a photo is chosen (or swapped in). Fire and forget. */
export function trackCoverDownload(photo: TripPhoto) {
  if (!hasApi) return;
  fetch(`${API_BASE}/cover/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ download_location: photo.downloadLocation }) }).catch(() => {});
}

const UTM = 'utm_source=rove&utm_medium=referral';
/** The photographer's and Unsplash's links, both with Unsplash's referral parameters. */
export const photographerUrl = (p: TripPhoto) => `https://unsplash.com/@${p.username}?${UTM}`;
export const unsplashUrl = `https://unsplash.com/?${UTM}`;

// ---------- Live flight status (AeroDataBox via the server) ----------

export type FlightEnd = { airport: string; city: string; terminal: string; gate: string; belt: string; scheduled: string; revised: string };
export type FlightStatus = { number: string; status: string; airline: string; departure: FlightEnd | null; arrival: FlightEnd | null; updatedAt: string };

const flights = new Map<string, { at: number; value: Promise<FlightStatus | null> }>();
const TEN_MIN = 10 * 60 * 1000;

/** The departure as a time, from the event's date and start time (the airport's local time, as entered). */
const departs = (a: Activity) => (a.startTime ? toInstant(a.date, a.startTime, a.tz) : NaN);
const arrives = (a: Activity) => (a.endTime ? toInstant(a.endDate || a.date, a.endTime, a.toTz ?? a.tz) : departs(a) + 12 * 3600e3);

/** Whether to ask about this flight now: from 24 hours before departure until it has landed (plus an hour). */
export function shouldPoll(a: Activity, now = Date.now()) {
  const d = departs(a);
  return hasApi && !!a.ref && Number.isFinite(d) && now >= d - 24 * 3600e3 && now <= arrives(a) + 3600e3;
}

export function getFlightStatus(number: string, date: string): Promise<FlightStatus | null> {
  const key = `${number}|${date}`, hit = flights.get(key);
  if (hit && Date.now() - hit.at < TEN_MIN) return hit.value;
  const value = fetch(`${API_BASE}/flight?number=${encodeURIComponent(number)}&date=${date}`)
    .then((r) => (r.ok ? (r.json() as Promise<FlightStatus>) : null)).catch(() => null);
  flights.set(key, { at: Date.now(), value });
  return value;
}

/** A flight's live status, refreshed every 10 minutes while it matters (24h out until it lands), else null. */
export function useFlightStatus(a: Activity | undefined) {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  useEffect(() => {
    setStatus(null);
    if (!a || !shouldPoll(a)) return;
    let live = true;
    const load = () => getFlightStatus(a.ref!, a.date).then((s) => { if (live) setStatus(s); });
    load();
    const id = setInterval(() => { if (shouldPoll(a)) load(); }, TEN_MIN);
    // Coming back to Rove (from another app or the lock screen) checks again at once, instead of waiting for the timer.
    const back = () => { if (document.visibilityState === 'visible' && shouldPoll(a)) load(); };
    document.addEventListener('visibilitychange', back);
    return () => { live = false; clearInterval(id); document.removeEventListener('visibilitychange', back); };
  }, [a?.id, a?.ref, a?.date, a?.startTime]); // eslint-disable-line react-hooks/exhaustive-deps
  return status;
}

/**
 * The status Tag on the Journey details card: "Check-in open" (Warning) in the usual check-in window (24 hours to
 * 1 hour before departure), then "On time" (Success), "Delayed" (Warning) or "Cancelled" (Danger). Rove never says
 * whether you've checked in. Without live data it only shows the check-in window.
 */
export function flightTag(a: Activity, live: FlightStatus | null, now = Date.now()): { label: string; tone: 'success' | 'warning' | 'danger' } | undefined {
  const st = (live?.status ?? '').toLowerCase();
  if (st.includes('cancel')) return { label: 'Cancelled', tone: 'danger' };
  const dep = live?.departure;
  const late = st.includes('delay') || (!!dep?.revised && !!dep.scheduled && dep.revised.slice(0, 16) > dep.scheduled.slice(0, 16));
  const d = departs(a);
  if (Number.isFinite(d) && now >= d - 24 * 3600e3 && now < d - 3600e3 && !late) return { label: 'Check-in open', tone: 'warning' };
  if (!live) return undefined;
  if (late) return { label: 'Delayed', tone: 'warning' };
  return { label: 'On time', tone: 'success' };
}

/** "updated 2 min ago" */
export function updatedAgo(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  return min < 1 ? 'updated just now' : min < 60 ? `updated ${min} min ago` : `updated ${Math.round(min / 60)} h ago`;
}
