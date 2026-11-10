import { toInstant } from './timezone';
import type { Activity, Trip } from '../data/types';
import { daysBetween as between, formatRange, today as todayDay, tripPhase } from './dates';
import { behaviourOf } from './categories';

/** The trip that matters now: the one you're on, else the next one. Home's hero and the Trip tab both use it. */
export function featuredTrip(trips: Trip[] | null | undefined): Trip | undefined {
  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  return all.find((t) => tripPhase(t.startDate, t.endDate) === 'current') ?? all.find((t) => tripPhase(t.startDate, t.endDate) === 'upcoming');
}

/** The Hero Card's countdown tag: "In 9 days", "Day 3 of 10", then "Done". Rough (month) trips count in months. */
export function heroCountdown(trip: Trip, now = todayDay()): { label: string; icon: 'calendar' } {
  const total = between(trip.startDate, trip.endDate) + 1;
  if (now < trip.startDate) {
    if (trip.dateMode === 'month') {
      const [y1, m1] = now.split('-').map(Number), [y2, m2] = trip.startDate.split('-').map(Number);
      const months = (y2 - y1) * 12 + (m2 - m1);
      return { label: months <= 1 ? 'Next month' : `In ${months} months`, icon: 'calendar' };
    }
    const n = between(now, trip.startDate); return { label: n === 1 ? 'Tomorrow' : `In ${n} days`, icon: 'calendar' };
  }
  if (now <= trip.endDate) return { label: trip.dateMode === 'month' ? 'This month' : `Day ${between(trip.startDate, now) + 1} of ${total}`, icon: 'calendar' };
  return { label: 'Done', icon: 'calendar' };
}

/** A trip's dates as shown under its name: "2 – 11 Nov · 10 days", or "March 2027 · dates to confirm" for a rough trip. */
export function tripDatesLabel(trip: Pick<Trip, 'startDate' | 'endDate' | 'dateMode'>) {
  if (trip.dateMode === 'month') return `${new Date(trip.startDate + 'T12:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} · dates to confirm`;
  const n = between(trip.startDate, trip.endDate) + 1;
  return `${formatRange(trip.startDate, trip.endDate)} · ${n} day${n === 1 ? '' : 's'}`;
}

/** When an event finishes, for sorting what's still to come. An event with no time counts until the day is over. */
const endsAt = (a: Activity) => (a.endTime && a.endTime >= a.startTime ? a.endTime : a.endTime ? '99:99' : a.startTime || '99:99');

/**
 * The next thing in the plan: the first event that hasn't finished yet, by the exact moment (each event's own time
 * zone, so it's right wherever the phone is). An event with no time counts until its day is over. Later legs of a
 * connection are part of the first leg's journey.
 */
export function nextEvent(activities: Activity[], now = Date.now()): Activity | undefined {
  const firstLegs = activities.filter((a) => !a.journeyId || activities.filter((x) => x.journeyId === a.journeyId)
    .every((x) => toInstant(x.date, x.startTime, x.tz) >= toInstant(a.date, a.startTime, a.tz)));
  const ends = (a: Activity) => {
    const t = endsAt(a);
    return t === '99:99' ? toInstant(a.date, '23:59', a.tz) + 60000 : toInstant(a.date, t, a.tz);
  };
  return firstLegs.filter((a) => ends(a) > now)
    .sort((a, b) => toInstant(a.date, a.startTime || '23:59', a.tz) - toInstant(b.date, b.startTime || '23:59', b.tz))[0];
}

/** Straight-line distance between two points in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * A rough "how long to get there" between two events, for the Travel connector: walking under 2 km (about 5 km/h on
 * streets, 1.3× the straight line), otherwise by car (about 25 km/h in town). Only an estimate; null without both places.
 */
export function travelEstimate(from: Activity, to: Activity): { label: string; icon: 'pin' | 'car' } | null {
  // From where the first one ends (a flight's or transfer's destination) to where the next one starts.
  const a = from.to ?? from.location, b = to.location;
  if (!a || !b || ['open', 'note'].includes(behaviourOf(from.category)) || ['open', 'note'].includes(behaviourOf(to.category))) return null;
  const km = distanceKm(a, b) * 1.3;
  if (km > 300) return null; // a flight or a long journey: no walk or drive to estimate
  if (km < 0.05) return null;
  const walk = km < 2;
  const min = Math.max(1, Math.round((km / (walk ? 5 : 25)) * 60));
  const t = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}`.trim();
  return { label: `About ${t} ${walk ? 'walk' : 'by car'}`, icon: walk ? 'pin' : 'car' };
}
