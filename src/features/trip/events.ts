import type { Activity } from '../../data/types';
import { daysBetween, formatDay, formatTime, today } from '../../lib/dates';
import { categoryInfo, eventType } from '../../lib/categories';
import type { TripCtx } from './TripPage';

/**
 * One event as it shows on a day. A Stay is one event the person adds, but it appears twice in the itinerary:
 * as check-in on its first day (`part: 'in'`) and check-out on its last (`part: 'out'`).
 */
export type DayEntry = { a: Activity; part?: 'in' | 'out' };

const short = (s?: string) => s?.split(',')[0].trim() || undefined;
/** A journey's end under its time: the airport or station code when one is given ("Lisbon (LIS)" → "LIS"), else the place. */
const stop = (s?: string) => s?.match(/\(([^)]+)\)/)?.[1] ?? short(s);
const isStay = (a: Activity) => eventType(a.category) === 'stay' && !!a.endDate && a.endDate > a.date;

/** When an entry happens on its day: check-out uses the stay's end time. */
export const entryTime = (e: DayEntry) => (e.part === 'out' ? e.a.endTime : e.a.startTime);

/**
 * When an entry is over, for "still to come" and the Done state. Check-in and check-out are moments; an event with
 * no time, or one that runs past midnight (ends "earlier" than it starts), counts until the day is over.
 */
export function entryEnd(e: DayEntry) {
  const a = e.a;
  if (e.part === 'in') return a.startTime || '99:99';
  if (e.part === 'out') return a.endTime || '99:99';
  if (a.endDate && a.endDate > a.date) return '99:99';
  return a.endTime && a.endTime >= a.startTime ? a.endTime : a.endTime ? '99:99' : a.startTime || '99:99';
}

/** Everything on one day, in time order (events without a time go last). */
export function eventsOn(activities: Activity[], day: string): DayEntry[] {
  const out: DayEntry[] = [];
  for (const a of activities) {
    if (a.date === day) out.push(isStay(a) ? { a, part: 'in' } : { a });
    else if (isStay(a) && a.endDate === day) out.push({ a, part: 'out' });
  }
  return out.sort((x, y) => (entryTime(x) || '99').localeCompare(entryTime(y) || '99') || x.a.createdAt - y.a.createdAt);
}

/** "1h 20m" between two times on the same day, or undefined. */
function duration(start: string, end: string) {
  if (!start || !end || end <= start) return undefined;
  const [h1, m1] = start.split(':').map(Number), [h2, m2] = end.split(':').map(Number);
  const min = h2 * 60 + m2 - (h1 * 60 + m1);
  return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`;
}

/**
 * An event as a Figma "Event card": the layout, icon, title and meta its type calls for.
 * Flight → Journey (departs → arrives, flight number). Transport → Journey when it has a from and a to, else Standard.
 * Stay → "Check in" / "Check out" on its two days. Note → Note (no place). Food & drink, Activity → Standard.
 */
export function eventCardProps(input: Activity | DayEntry, ctx: TripCtx, showDay = false) {
  const e: DayEntry = 'a' in input ? input : { a: input };
  const a = e.a;
  const type = eventType(a.category);
  const info = categoryInfo(a.category);
  const day = (d: string) => (d === today() ? 'Today' : formatDay(d));
  // "08:30 – 10:00"; with only a start, "17:30 onwards" (a note's time is a moment, so it stays "07:30")
  const range = a.startTime ? `${formatTime(a.startTime)}${a.endTime ? ` – ${formatTime(a.endTime)}` : type === 'note' ? '' : ' onwards'}` : undefined;
  const base = {
    title: a.title, icon: info.icon,
    to: `/trip/${ctx.trip.id}/plan/${a.id}`,
  };
  const withDay = (t?: string) => (showDay ? [day(a.date), t].filter(Boolean).join(', ') : t);

  if (type === 'flight')
    return {
      ...base, layout: 'journey' as const,
      time: withDay(a.ref || undefined), timeIcon: null, place: undefined,
      journey: {
        fromTime: a.startTime ? formatTime(a.startTime) : '—', fromPlace: stop(a.fromText),
        toTime: a.endTime ? `${formatTime(a.endTime)}${a.endDate && a.endDate > a.date ? ` +${daysBetween(a.date, a.endDate)}` : ''}` : '—',
        toPlace: stop(a.toText), mode: 'plane' as const,
      },
    };
  if (type === 'transport' && a.fromText && a.toText)
    return {
      ...base, layout: 'journey' as const, time: withDay(undefined), place: undefined,
      journey: {
        fromTime: a.startTime ? formatTime(a.startTime) : '—', fromPlace: stop(a.fromText),
        toTime: a.endTime ? formatTime(a.endTime) : '—', toPlace: stop(a.toText),
        duration: duration(a.startTime, a.endTime), mode: 'train' as const,
      },
    };
  if (type === 'stay' && isStay(a)) {
    const nights = daysBetween(a.date, a.endDate!);
    if (e.part)
      return {
        ...base, layout: 'standard' as const,
        title: `${e.part === 'in' ? 'Check in' : 'Check out'} · ${a.title}`,
        time: entryTime(e) ? formatTime(entryTime(e)) : undefined,
        place: e.part === 'in' ? `${nights} night${nights === 1 ? '' : 's'}` : short(a.locationText || a.location?.name),
        placeIcon: e.part === 'in' ? null : undefined,
      };
    return { ...base, layout: 'standard' as const, time: `${formatDay(a.date)} → ${formatDay(a.endDate!)}`, place: `${nights} night${nights === 1 ? '' : 's'}`, placeIcon: null };
  }
  if (type === 'note')
    return { ...base, layout: 'note' as const, time: withDay(range), place: a.notes.split('\n')[0] || undefined, placeIcon: null };
  return { ...base, layout: 'standard' as const, time: withDay(range), place: short(a.locationText || a.location?.name) };
}
