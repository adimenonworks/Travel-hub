import { useEffect } from 'react';
import { store } from '../../data';
import type { Trip } from '../../data/types';

const done = new Set<string>();

/**
 * Budgeting was removed (and the owner chose to delete the old data). The first time a traveller opens a trip that
 * still holds budget numbers or logged costs, they're deleted for good. Once per trip per device.
 */
export function useBudgetCleanup(trip: Trip, isTraveller: boolean) {
  useEffect(() => {
    if (!isTraveller || done.has(trip.id)) return;
    let flag = '';
    try { flag = localStorage.getItem(`budgetCleaned:${trip.id}`) ?? ''; } catch { /* storage blocked */ }
    const hasFields = ['totalBudget', 'dailyBudget', 'dayBudgets', 'daySpent'].some((k) => k in trip);
    if (flag && !hasFields) return;
    done.add(trip.id);
    store.deleteBudgetData(trip)
      .then(() => { try { localStorage.setItem(`budgetCleaned:${trip.id}`, '1'); } catch { /* fine */ } })
      .catch(() => done.delete(trip.id)); // offline: try again next time
  }, [trip, isTraveller]);
}
