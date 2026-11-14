import { useEffect } from 'react';
import { store } from '../../data';
import { needsRoleMigration } from '../../data/roles';
import type { Trip } from '../../data/types';

const tried = new Set<string>();

/**
 * People and sharing, item 1: there's no owner any more, and the four old roles became two. There's no server to
 * migrate every trip at once, so the first traveller to open an older trip rewrites it: owner, editor and member
 * become traveller, viewer becomes follower, and `ownerId` becomes `createdBy` (a record only). Until then the app and
 * the rules read the old names the same way. Once per trip per app run; a failure (offline, rules not yet published)
 * is tried again next time.
 */
export function useRoleMigration(trip: Trip, isTraveller: boolean) {
  useEffect(() => {
    if (!isTraveller || tried.has(trip.id) || !needsRoleMigration(trip)) return;
    tried.add(trip.id);
    store.migrateRoles(trip).catch(() => {});
  }, [trip, isTraveller]);
}
