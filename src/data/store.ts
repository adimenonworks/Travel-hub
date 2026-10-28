import type { Invite, NewDoc, Profile, SubCollections, SubName, Trip, User } from './types';

export type Unsubscribe = () => void;

/**
 * Everything the UI needs from a backend. Two implementations: Firebase
 * (real, shared) and local (demo mode, this browser only).
 */
export interface Store {
  readonly mode: 'firebase' | 'demo';

  onAuth(cb: (user: User | null) => void): Unsubscribe;
  signIn(demoName?: string): Promise<void>;
  signOut(): Promise<void>;
  /** An error left over from a redirect sign-in, if any (shown once). */
  takeAuthError?(): Promise<unknown>;

  watchProfile(uid: string, cb: (p: Profile | null) => void): Unsubscribe;
  getProfiles(uids: string[]): Promise<Record<string, Profile>>;
  saveProfile(uid: string, patch: Partial<Omit<Profile, 'id'>>): Promise<void>;

  watchMyTrips(uid: string, cb: (trips: Trip[]) => void): Unsubscribe;
  watchTrip(id: string, cb: (trip: Trip | null) => void, onError?: (e: Error) => void): Unsubscribe;
  createTrip(data: Omit<Trip, 'id' | 'ownerId' | 'memberIds' | 'roles' | 'createdAt'>): Promise<string>;
  updateTrip(id: string, patch: Partial<Trip>): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  leaveTrip(id: string, uid: string): Promise<void>;
  removeMember(trip: Trip, uid: string): Promise<void>;
  setRole(trip: Trip, uid: string, role: 'editor' | 'member'): Promise<void>;

  watchSub<K extends SubName>(tripId: string, name: K, cb: (items: SubCollections[K][]) => void): Unsubscribe;
  addSub<K extends SubName>(tripId: string, name: K, data: NewDoc<SubCollections[K]>): Promise<string>;
  updateSub<K extends SubName>(tripId: string, name: K, id: string, patch: Partial<SubCollections[K]>): Promise<void>;
  deleteSub(tripId: string, name: SubName, id: string): Promise<void>;
  /** Atomically add or remove `uid` from an array field / map field on a sub-document. */
  toggleInArray(tripId: string, name: SubName, id: string, field: string, uid: string, on: boolean): Promise<void>;
  toggleVote(tripId: string, ideaId: string, uid: string, on: boolean): Promise<void>;

  createInvite(trip: Trip): Promise<string>;
  getInvite(code: string): Promise<Invite | null>;
  redeemInvite(invite: Invite): Promise<void>;
}
