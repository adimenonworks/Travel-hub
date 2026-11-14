import type { Activity, EventChange, NewNotice, Notice, Role, Deletable, ChatReads, CollectionRole, CollectionShare, Invite, LinkPreview, NewDoc, Profile, SavedPlace, SubCollections, SubName, Trip, User, Vote } from './types';

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
  /**
   * Delete your account (You → Delete account). You leave every trip; a trip with no other traveller is deleted. You leave the other trips and your messages are deleted. Saved places a trip still uses go
   * to that trip's next member; the rest are deleted, as are your stars, profile and private settings. Last, the
   * sign-in itself is deleted (on Firebase this may ask you to sign in with Google again to confirm it's you).
   */
  deleteAccount(uid: string): Promise<void>;
  /** An error left over from a redirect sign-in, if any (shown once). */
  takeAuthError?(): Promise<unknown>;

  watchProfile(uid: string, cb: (p: Profile | null) => void): Unsubscribe;
  getProfiles(uids: string[]): Promise<Record<string, Profile>>;
  saveProfile(uid: string, patch: Partial<Omit<Profile, 'id'>>): Promise<void>;
  /** Your event-chat read state (private, synced across your devices); null until it's first saved. */
  watchReads(uid: string, cb: (r: ChatReads | null) => void): Unsubscribe;
  /** You've read an event's chat up to `at` (only that event's time changes, so two devices never clash). */
  markRead(uid: string, targetId: string, at: number, since: number): Promise<void>;

  /** Your Notification centre entries on one trip (only the ones addressed to you), live. */
  watchNotices(tripId: string, uid: string, cb: (notices: Notice[]) => void): Unsubscribe;
  /** Tell people about a change you made (Notification centre). Entries with nobody to tell are dropped. Adding,
   *  editing (`updateEvent`) and I'm in / I'm out write their own entries; this is for everything else. */
  addNotices(tripId: string, notices: NewNotice[]): Promise<void>;
  /** Delete entries addressed to you (R2: entries are kept 30 days; whoever they're for clears the old ones). */
  deleteNotices(tripId: string, ids: string[]): Promise<void>;

  watchMyTrips(uid: string, cb: (trips: Trip[]) => void): Unsubscribe;
  watchTrip(id: string, cb: (trip: Trip | null) => void, onError?: (e: Error) => void): Unsubscribe;
  createTrip(data: Omit<Trip, 'id' | 'createdBy' | 'ownerId' | 'memberIds' | 'roles' | 'createdAt'>): Promise<string>;
  updateTrip(id: string, patch: Partial<Trip>): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  /** Move a trip, event or place to Recently deleted (on) or bring it back (off). It's deleted for good after 30 days. */
  setDeleted(item: Deletable, on: boolean): Promise<void>;
  /** Leave a trip. If you're the last traveller, it goes to Recently deleted instead (you stay on it so you can restore it). */
  leaveTrip(id: string, uid: string): Promise<void>;
  removeMember(trip: Trip, uid: string): Promise<void>;
  setRole(trip: Trip, uid: string, role: Role): Promise<void>;
  /** Older trips: owner/editor/member → traveller, viewer → follower, `ownerId` → `createdBy` (any traveller, once). */
  migrateRoles(trip: Trip): Promise<void>;
  /** Older events: writes who's in (`people`) and drops the old `attendeeIds`, in one batch. */
  migrateEventPeople(tripId: string, events: { id: string; people: string[] }[]): Promise<void>;

  watchSub<K extends SubName>(tripId: string, name: K, cb: (items: SubCollections[K][]) => void): Unsubscribe;
  addSub<K extends SubName>(tripId: string, name: K, data: NewDoc<SubCollections[K]>): Promise<string>;
  updateSub<K extends SubName>(tripId: string, name: K, id: string, patch: Partial<SubCollections[K]>): Promise<void>;
  deleteSub(tripId: string, name: SubName, id: string): Promise<void>;
  /** Edit an event and record each changed part (title, date, time, place, price, who's in) in its history, in one
   *  batch. `restoredFrom` marks a Restore. Returns nothing; the history listener shows the new entries. */
  updateEvent(tripId: string, before: Activity, patch: Partial<Activity>, restoredFrom?: string): Promise<void>;
  /** An event's change history, newest first, at most `limit` entries. */
  watchHistory(tripId: string, eventId: string, limit: number, cb: (changes: EventChange[]) => void): Unsubscribe;
  /** The first I'm in on a suggested idea (item 6): makes its event and takes it out of Ideas, at once for everyone. If
   *  someone got there first, nothing is made and their event's id comes back with `made: false` (then just say I'm in). */
  acceptIdea(tripId: string, ideaId: string, event: NewDoc<Activity>, notices: NewNotice[]): Promise<{ id: string; made: boolean }>;
  /** Atomically add or remove `uid` from an array field / map field on a sub-document. */
  toggleInArray(tripId: string, name: SubName, id: string, field: string, uid: string, on: boolean): Promise<void>;
  /** Set one person's vote on an idea: up, down, or none. A person has at most one of the two. */
  setVote(tripId: string, ideaId: string, uid: string, vote: Vote): Promise<void>;

  /**
   * Add without waiting for the server: returns the new id at once and a promise that settles when it's saved.
   * Offline, the write waits in the on-device queue and syncs later (saves still confirm straight away).
   */
  queueSub<K extends SubName>(tripId: string, name: K, data: NewDoc<SubCollections[K]>): { id: string; saved: Promise<void> };
  queueTrip(data: Omit<Trip, 'id' | 'createdBy' | 'ownerId' | 'memberIds' | 'roles' | 'createdAt'>): { id: string; saved: Promise<void> };
  /** Budgeting was removed: delete a trip's stored budget fields and logged costs (travellers only; expenses by anyone). */
  deleteBudgetData(trip: Trip): Promise<void>;
  /** Collections: your saved Places and the ones you've starred (others' Places added to your trips), live. */
  watchPlaces(uid: string, cb: (places: SavedPlace[]) => void): Unsubscribe;
  /** Places by id (e.g. a trip-mate's Place that an idea points at). Missing ones are left out. */
  getPlaces(ids: string[]): Promise<Record<string, SavedPlace>>;
  /** Save a Place without waiting for the server (works offline). */
  addPlace(data: Omit<SavedPlace, 'id' | 'ownerId' | 'createdAt'>): { id: string; saved: Promise<void> };
  updatePlace(id: string, patch: Partial<Omit<SavedPlace, 'id' | 'ownerId'>>): Promise<void>;
  deletePlace(id: string): Promise<void>;
  /** Star or unstar a Place for one person (anyone can star any Place they can see; it only changes their own star). */
  starPlace(id: string, uid: string, on: boolean): Promise<void>;
  /** Read a shared link (title, photo, place) with the readLink Cloud Function. Demo mode and errors: null. */
  readLink(url: string): Promise<LinkPreview | null>;

  /** Shared collections you own or were added to, live. */
  watchShares(uid: string, cb: (shares: CollectionShare[]) => void): Unsubscribe;
  /** Every place in a shared collection (yours and its Members'), live. */
  watchSharedPlaces(shareId: string, cb: (places: SavedPlace[]) => void): Unsubscribe;
  /** Share your collection for a country: makes the share (once) and marks your places there as in it. */
  shareCollection(countryCode: string): Promise<CollectionShare>;
  /** An invite link to your shared collection, as a Member or a Viewer. */
  createCollectionInvite(share: CollectionShare, role: CollectionRole, label: string): Promise<string>;
  /** The owner changes someone's role, or removes them (role null); anyone can remove themselves (leave). */
  setShareRole(share: CollectionShare, uid: string, role: CollectionRole | null): Promise<void>;
  /** A link to join the trip as a traveller or a follower (the link carries the role). */
  createInvite(trip: Trip, role: Role): Promise<string>;
  getInvite(code: string): Promise<Invite | null>;
  redeemInvite(invite: Invite): Promise<void>;
}
