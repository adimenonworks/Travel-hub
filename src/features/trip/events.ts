import type { Activity } from '../../data/types';
import { daysBetween, formatDay, formatTime, today } from '../../lib/dates';
import { behaviourOf, categoryInfo, eventKind, spanWords } from '../../lib/categories';
import type { TripCtx } from './TripPage';

/**
 * One event as it shows on a day. A Stay (or a Car rental) is one event the person adds, but it appears twice in the
 * itinerary: check-in / pick-up on its first day (`part: 'in'`) and check-out / drop-off on its last (`part: 'out'`).
 */
export type DayEntry = { a: Activity; part?: 'in' | 'out' };

const short = (s?: string) => s?.split(',')[0].trim() || undefined;
/** A journey's end under its time: the airport or station code when one is given ("Lisbon (LIS)" → "LIS"), else the place. */
const stop = (s?: string) => s?.match(/\(([^)]+)\)/)?.[1] ?? short(s);
/** A span (stay, cruise, car rental, campervan) that runs over more than one day shows at its start and its end. */
const isStay = (a: Activity) => behaviourOf(a.category) === 'span' && !!a.endDate && a.endDate > a.date;

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
 * An event as a Figma "Event card", by its behaviour:
 * - journey: Journey card (departs → arrives; a flight's number). Other journeys without a "to" are Standard.
 * - span: "Check-in · 15:00" / "Check-out · 11:00" on its two days (Embark / Disembark for a cruise, Pick-up /
 *   Drop-off for car rental and campervans).
 * - place: Standard. open (free time, rest): Standard, its area or first line of notes. note: the Note layout.
 */
export function eventCardProps(input: Activity | DayEntry, ctx: TripCtx, showDay = false) {
  const e: DayEntry = 'a' in input ? input : { a: input };
  const a = e.a;
  const behaviour = behaviourOf(a.category);
  const kind = eventKind(a.category);
  const info = categoryInfo(a.category);
  const day = (d: string) => (d === today() ? 'Today' : formatDay(d));
  // "08:30 – 10:00"; with only a start, "17:30 onwards" (free time and notes with only a start are a moment: "07:30")
  const moment = behaviour === 'open' || behaviour === 'note';
  const range = a.startTime ? `${formatTime(a.startTime)}${a.endTime ? ` – ${formatTime(a.endTime)}` : moment ? '' : ' onwards'}` : undefined;
  const base = {
    title: a.title, icon: info.icon,
    to: `/trip/${ctx.trip.id}/plan/${a.id}`,
  };
  const withDay = (t?: string) => (showDay ? [day(a.date), t].filter(Boolean).join(', ') : t);
  const arrives = (t: string) => `${formatTime(t)}${a.endDate && a.endDate > a.date ? ` +${daysBetween(a.date, a.endDate)}` : ''}`;

  if (behaviour === 'journey' && (kind === 'flight' || (a.fromText && a.toText)))
    return {
      ...base, layout: 'journey' as const,
      time: withDay(kind === 'flight' ? a.ref || undefined : undefined), timeIcon: kind === 'flight' ? null : undefined, place: undefined,
      journey: {
        fromTime: a.startTime ? formatTime(a.startTime) : '—', fromPlace: stop(a.fromText),
        toTime: a.endTime ? arrives(a.endTime) : '—', toPlace: stop(a.toText),
        ...(kind === 'flight' ? {} : { duration: a.endDate && a.endDate > a.date ? undefined : duration(a.startTime, a.endTime) }),
        mode: info.icon,
      },
    };
  if (behaviour === 'span') {
    const [start, end] = spanWords(a.category);
    const vehicle = kind === 'car' || kind === 'campervan';
    const nights = a.endDate ? daysBetween(a.date, a.endDate) : 0;
    const where = (part?: 'in' | 'out') => short(vehicle ? (part === 'out' ? a.toText || a.fromText || a.locationText : a.fromText || a.locationText) : a.locationText || a.location?.name);
    if (e.part) {
      const word = e.part === 'in' ? start : end;
      return {
        ...base, layout: 'standard' as const,
        time: entryTime(e) ? `${word} · ${formatTime(entryTime(e))}` : word,
        place: !vehicle && e.part === 'in' ? `${nights} night${nights === 1 ? '' : 's'}` : where(e.part),
        placeIcon: !vehicle && e.part === 'in' ? null : undefined,
      };
    }
    if (!vehicle && isStay(a)) return { ...base, layout: 'standard' as const, time: `${formatDay(a.date)} → ${formatDay(a.endDate!)}`, place: `${nights} night${nights === 1 ? '' : 's'}`, placeIcon: null };
    // A one-day rental: one card
    const first = a.endDate && a.endDate > a.date ? (a.startTime ? formatTime(a.startTime) : undefined) : range;
    return { ...base, layout: 'standard' as const, time: withDay(first ? `${start} · ${first}` : start), place: where('in') };
  }
  // Free time and rest: a standard card (so it turns deep green when it's next), its area or the first line of notes
  if (behaviour === 'open')
    return { ...base, layout: 'standard' as const, time: withDay(range), place: short(a.locationText) ?? (a.notes.split('\n')[0] || undefined), placeIcon: a.locationText ? undefined : null };
  // A note: white with a border, its text under the title
  if (behaviour === 'note') {
    // The title is the note's first line; underneath goes the rest of it (older notes kept their text separately)
    const lines = a.notes.split('\n').map((l) => l.trim()).filter(Boolean);
    const rest = lines[0] && a.title.startsWith(lines[0].slice(0, 80)) ? lines.slice(1).join(' ') : lines.join(' ');
    return { ...base, layout: 'note' as const, time: withDay(range), place: rest || undefined, placeIcon: null };
  }
  return { ...base, layout: 'standard' as const, time: withDay(range), place: short(a.locationText || a.location?.name) };
}
