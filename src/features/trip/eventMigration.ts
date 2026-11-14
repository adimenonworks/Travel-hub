import { useEffect } from 'react';
import { store } from '../../data';
import { migratedPeople, needsPeopleMigration } from '../../data/eventPeople';
import type { Activity, Trip } from '../../data/types';

const tried = new Set<string>();

/**
 * People and sharing, item 3: older events kept who's going in `attendeeIds` (usually just whoever added it). The
 * first traveller to open the trip writes `people` for each one (see migratedPeople: plans are everyone's, bookings
 * keep who they named) and drops the old field. Once per trip per app run; a failure is tried again next time. Until
 * then the app reads older events the same way, and the rules let any traveller edit an event without `people`.
 */
export function useEventPeopleMigration(trip: Trip, activities: Activity[] | undefined, isTraveller: boolean) {
  useEffect(() => {
    if (!isTraveller || !activities || tried.has(trip.id)) return;
    const old = activities.filter(needsPeopleMigration);
    if (!old.length) return;
    tried.add(trip.id);
    store.migrateEventPeople(trip.id, old.map((a) => ({ id: a.id, people: a.people ?? migratedPeople(a, trip) }))).catch(() => {});
  }, [trip, activities, isTraveller]);
}
