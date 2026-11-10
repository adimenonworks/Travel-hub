import type { Activity, Place } from '../data/types';
import { behaviourOf } from './categories';

/**
 * Time zones (owner's spec, 10 Nov 2026). Every event keeps its times as typed: the local time of the place it happens
 * (a Lisbon dinner at 19:30 stays 19:30 on a phone still set to Melbourne). Each event also stores its place's IANA
 * zone (`tz`; a journey's arrival zone in `toTz`), so the exact moment can be worked out when it matters: durations
 * across zones, "Next · in 1 hr", the now-line and countdowns. Daylight saving comes from the zone; offsets are never
 * hard-coded. Events saved before this (no `tz`) use the phone's zone, as they always did.
 */

const memo = new Map<string, Promise<string | undefined>>();

/** The IANA zone at a point ("Europe/Lisbon"), from Open-Meteo (free, no key). Cached; undefined offline. */
export function zoneAt(p: Pick<Place, 'lat' | 'lng'> | null | undefined): Promise<string | undefined> {
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return Promise.resolve(undefined);
  const key = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;
  const hit = memo.get(key); if (hit) return hit;
  let stored: string | null = null;
  try { stored = localStorage.getItem(`tz:${key}`); } catch { /* private mode */ }
  if (stored) { const v = Promise.resolve(stored); memo.set(key, v); return v; }
  const ask = (async () => {
    try {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 4000);
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&timezone=auto&forecast_days=1`, { signal: ctl.signal });
      clearTimeout(timer);
      const tz = res.ok ? ((await res.json()) as { timezone?: string }).timezone : undefined;
      if (tz && tz !== 'GMT') { try { localStorage.setItem(`tz:${key}`, tz); } catch { /* ignore */ } return tz; }
    } catch { /* offline: the phone's zone is used */ }
    memo.delete(key);
    return undefined;
  })();
  memo.set(key, ask);
  return ask;
}

const parts = new Map<string, Intl.DateTimeFormat>();
/** A zone's offset from UTC, in minutes, at a moment (e.g. +60 for Lisbon in summer). */
export function offsetMinutes(tz: string, ms: number) {
  let f = parts.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); parts.set(tz, f); }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** The exact moment of a local date and time ("2026-11-10", "19:30") in a zone; the phone's zone without one. */
export function toInstant(date: string, time: string, tz?: string): number {
  const [y, m, d] = date.split('-').map(Number), [h, min] = (time || '00:00').split(':').map(Number);
  if (!tz) return new Date(y, m - 1, d, h, min).getTime();
  const wall = Date.UTC(y, m - 1, d, h, min);
  let at = wall - offsetMinutes(tz, wall) * 60000;
  at = wall - offsetMinutes(tz, at) * 60000; // again, in case the first guess fell on the other side of a clock change
  return at;
}

/** Today's date and the time right now in a zone (the phone's without one): { day: "2026-11-10", time: "19:30" }. */
export function localNow(tz?: string, now = Date.now()): { day: string; time: string } {
  const at = tz ? new Date(now + offsetMinutes(tz, now) * 60000) : null;
  const d = at ?? new Date(now);
  const get = at ? { y: d.getUTCFullYear(), mo: d.getUTCMonth(), da: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }
    : { y: d.getFullYear(), mo: d.getMonth(), da: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
  const pad = (n: number) => String(n).padStart(2, '0');
  return { day: `${get.y}-${pad(get.mo + 1)}-${pad(get.da)}`, time: `${pad(get.h)}:${pad(get.mi)}` };
}

/** "24h 40m", "45m", "3h". */
export function durationLabel(ms: number) {
  const min = Math.round(ms / 60000);
  if (!(min > 0)) return '';
  return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`;
}

/** How long a journey takes, from its departure and arrival moments (correct across zones and the date line). */
export function journeyMs(a: Activity) {
  if (!a.startTime || !a.endTime) return NaN;
  return toInstant(a.endDate || a.date, a.endTime, a.toTz ?? a.tz) - toInstant(a.date, a.startTime, a.tz);
}

/**
 * The zone you're in on a trip day (for free time and notes, which have no place): that night's stay, else the
 * last arrival on or before that day, else the zone of any event that day.
 */
export function zoneOfDay(activities: Activity[], day: string): string | undefined {
  const stay = activities.find((a) => behaviourOf(a.category) === 'span' && a.tz && a.date <= day && (a.endDate ?? a.date) > day);
  if (stay) return stay.tz;
  const arrivals = activities.filter((a) => behaviourOf(a.category) === 'journey' && (a.toTz || a.tz) && (a.endDate || a.date) <= day)
    .sort((x, y) => (x.endDate || x.date).localeCompare(y.endDate || y.date) || (x.endTime || '').localeCompare(y.endTime || ''));
  const last = arrivals[arrivals.length - 1];
  if (last) return last.toTz ?? last.tz;
  return activities.find((a) => a.date === day && a.tz)?.tz;
}

/** Whether a journey crosses the date line: its two zones are more than 12 hours apart. */
export function crossesDateLine(a: Activity) {
  if (!a.tz || !a.toTz || !a.startTime) return false;
  const at = toInstant(a.date, a.startTime, a.tz);
  return Math.abs(offsetMinutes(a.toTz, at) - offsetMinutes(a.tz, at)) > 12 * 60;
}
