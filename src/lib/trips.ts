import type { Trip } from '../data/types';
import { tripPhase } from './dates';

/** The trip that matters now: the one you're on, else the next one. Home's hero and the Trip tab both use it. */
export function featuredTrip(trips: Trip[] | null | undefined): Trip | undefined {
  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  return all.find((t) => tripPhase(t.startDate, t.endDate) === 'current') ?? all.find((t) => tripPhase(t.startDate, t.endDate) === 'upcoming');
}
