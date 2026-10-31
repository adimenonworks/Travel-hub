import { tripDays } from '../../lib/dates';
import type { TripCtx } from './TripPage';

/**
 * The trip's money, for the whole group. The organizer sets one total; each day's budget is worked out from it:
 * what's left of the total (after costs not tied to a day and the days already planned), shared over the days to come.
 * Activity prices are per person, so they count once for each person going; expenses are group totals.
 */
export function tripBudget({ trip, activities, expenses }: Pick<TripCtx, 'trip' | 'activities' | 'expenses'>) {
  const days = tripDays(trip.startDate, trip.endDate);
  const members = Math.max(1, trip.memberIds.length);
  const total = trip.totalBudget ?? trip.dailyBudget * members * days.length;
  const spendOn = (d: string) =>
    activities.filter((a) => a.date === d).reduce((n, a) => n + a.cost * Math.max(1, a.attendeeIds.length), 0)
    + expenses.filter((e) => e.date === d).reduce((n, e) => n + e.amount, 0);
  const tripWide = expenses.filter((e) => !days.includes(e.date)).reduce((n, e) => n + e.amount, 0);
  const perDay = days.map(spendOn);
  const planned = perDay.reduce((n, x) => n + x, 0) + tripWide;

  /** One day's budget, what's left of it, and how close it is to running out (orange under half, red under a fifth). */
  const forDay = (d: string) => {
    const i = Math.max(0, days.indexOf(d));
    const before = perDay.slice(0, i).reduce((n, x) => n + x, 0);
    const daily = (total - tripWide - before) / (days.length - i);
    const left = daily - perDay[i];
    const share = daily > 0 ? left / daily : -1;
    const level: 'ok' | 'low' | 'over' = share >= 0.5 ? 'ok' : share >= 0.2 ? 'low' : 'over';
    return { daily: Math.round(daily), left: Math.round(left), level };
  };
  return { total, planned, tripWide, forDay };
}
