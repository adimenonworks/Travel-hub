import type { Activity, Category, Trip } from './types';
import { isTravelling, peopleInOrder } from './roles';
import { eventKind, eventType } from '../lib/categories';

/**
 * Who's in each event (people and sharing, item 3). Every event lists its travellers in `people`; only they edit it.
 * Being added means you're in ("silence means yes"); I'm out takes you off it, I'm in puts you back.
 */

/** The trip's travellers, in the order they joined. */
export const travellersOf = (trip: Trip) => peopleInOrder(trip).filter((id) => isTravelling(trip, id));

/** A booking is for whoever it names: a flight or a stay starts with just you (everything else starts with everyone). */
export const isBooking = (category: Category | string) => eventKind(category) === 'flight' || eventType(category) === 'stays';

/** Who's in a new event: everyone for a plan, just you for a booking, the voters plus you for an idea added to a day. */
export function defaultPeople(trip: Trip, me: string, category: Category | string, voters?: string[]): string[] {
  const all = travellersOf(trip);
  if (voters) return all.filter((id) => id === me || voters.includes(id));
  return isBooking(category) ? [me] : all;
}

/**
 * An older event's people, before the migration writes them: a booking keeps who it said was going (or whoever added
 * it); any other plan is everyone's, as plans added by hand are now. Only people still travelling count.
 */
export function migratedPeople(a: Activity, trip: Trip): string[] {
  const all = travellersOf(trip);
  if (!isBooking(a.category)) return all;
  const old = (a.attendeeIds ?? []).filter((id) => all.includes(id));
  return old.length ? old : all.includes(a.createdBy) ? [a.createdBy] : all;
}

/** The travellers in an event (people who have left the trip or now follow it don't count). */
export function peopleOf(a: Activity, trip: Trip): string[] {
  const all = travellersOf(trip);
  return a.people ? all.filter((id) => a.people!.includes(id)) : migratedPeople(a, trip);
}

export const isIn = (a: Activity, trip: Trip, uid: string) => peopleOf(a, trip).includes(uid);

/** Older events that still need `people` written (or still carry the old field). */
export const needsPeopleMigration = (a: Activity) => !a.people || 'attendeeIds' in a;

/** The `added` map after a change of people: newcomers are marked as added by you; anyone who left is dropped. */
export function addedAfter(a: Pick<Activity, 'added'>, before: string[], after: string[], me: string): Record<string, string> {
  const out = Object.fromEntries(Object.entries(a.added ?? {}).filter(([id]) => after.includes(id)));
  for (const id of after) if (!before.includes(id) && id !== me) out[id] = me;
  delete out[me];
  return out;
}

/**
 * Whose itinerary to show first (item 5): yours if you're travelling. A follower has no itinerary of their own, so
 * theirs opens on whoever shared the link they joined with, else whoever started the trip, else the first traveller.
 */
export function startingPerson(trip: Trip, me: string): string {
  const all = travellersOf(trip);
  if (all.includes(me)) return me;
  const by = trip.addedBy?.[me], starter = trip.createdBy ?? trip.ownerId;
  return by && all.includes(by) ? by : starter && all.includes(starter) ? starter : all[0] ?? me;
}
