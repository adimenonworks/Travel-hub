import type { Role, StoredRole, Trip } from './types';

/** Someone's role on a trip, reading the older stored names too ('owner', 'editor', 'member' travel; 'viewer' follows). */
export function roleOf(trip: Trip, uid: string): Role | undefined {
  const r: StoredRole | undefined = trip.roles[uid];
  if (!r) return undefined;
  return r === 'viewer' || r === 'follower' ? 'follower' : 'traveller';
}

export const isTravelling = (trip: Trip, uid: string) => roleOf(trip, uid) === 'traveller';

/** Everyone on the trip, travellers first, then followers (each in the order they joined). */
export function peopleInOrder(trip: Trip): string[] {
  return [...trip.memberIds.filter((id) => isTravelling(trip, id)), ...trip.memberIds.filter((id) => !isTravelling(trip, id))];
}

/** Older trips that still need migrating: an old role name, or `ownerId` instead of `createdBy`. */
export function needsRoleMigration(trip: Trip): boolean {
  return 'ownerId' in trip || Object.values(trip.roles).some((r) => r !== 'traveller' && r !== 'follower');
}

/** The migrated roles: owner, editor and member become traveller; viewer becomes follower. */
export function migratedRoles(trip: Trip): Record<string, Role> {
  return Object.fromEntries(Object.keys(trip.roles).map((id) => [id, roleOf(trip, id)!]));
}
