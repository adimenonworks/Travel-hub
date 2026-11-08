// Dates are stored as local calendar strings (YYYY-MM-DD) so a trip day never
// shifts with the viewer's timezone.

export function parseDay(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function toDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const today = () => toDay(new Date());

export function addDays(d: string, n: number) {
  const date = parseDay(d);
  date.setDate(date.getDate() + n);
  return toDay(date);
}

export function daysBetween(start: string, end: string) {
  return Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86400_000);
}

/** Every date from start to end inclusive. */
export function tripDays(start: string, end: string) {
  const n = Math.max(0, daysBetween(start, end));
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

/** What a trip day is called: "Today", "Tomorrow" or "Yesterday" near today, otherwise "Day 3" (its number in the trip). */
export function dayWord(d: string, tripStart: string, now = today()) {
  return d === now ? 'Today' : d === addDays(now, 1) ? 'Tomorrow' : d === addDays(now, -1) ? 'Yesterday' : `Day ${daysBetween(tripStart, d) + 1}`;
}

export function formatDay(d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return parseDay(d).toLocaleDateString(undefined, opts);
}

export function formatRange(start: string, end: string) {
  const s = parseDay(start);
  const e = parseDay(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const a = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
  const b = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${a} – ${b}`;
}

/** A time as Figma shows it everywhere: 24-hour "08:30", "22:15". */
export function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export type TripPhase = 'upcoming' | 'current' | 'past';

export function tripPhase(start: string, end: string, now = today()): TripPhase {
  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'current';
}

/** The Hero Card corner: days until the trip starts, then days left once it has started (counting today), none after. */
export function countdown(start: string, end: string, now = today()): { value: number; label: string } | undefined {
  if (now < start) { const n = daysBetween(now, start); return { value: n, label: n === 1 ? 'Day to go' : 'Days to go' }; }
  if (now <= end) { const n = daysBetween(now, end) + 1; return { value: n, label: n === 1 ? 'Day left' : 'Days left' }; }
  return undefined;
}

/** When something was saved, short, for a row's trailing text: "now", "2h", "Yesterday", "Mon", then "3 Nov". */
export function timeAgo(ms: number, now = Date.now()) {
  const min = Math.round((now - ms) / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const then = new Date(ms), d0 = new Date(now);
  if (toDay(then) === toDay(d0)) return `${Math.round(min / 60)}h`;
  const days = daysBetween(toDay(then), toDay(d0));
  if (days === 1) return 'Yesterday';
  if (days < 7) return then.toLocaleDateString(undefined, { weekday: 'short' });
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
