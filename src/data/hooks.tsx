import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store } from './index';
import type { CollectionShare, Profile, Role, SavedPlace, SubCollections, SubName, Trip, User } from './types';

type AuthState = { user: User | null; loading: boolean };
const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  useEffect(() => store.onAuth((user) => setState({ user, loading: false })), []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** The signed-in user. Only call below a route guard that guarantees sign-in. */
export function useMe(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useMe() used while signed out');
  return user;
}

/*
 * Last-known values, kept for the whole session. A screen that opens again (switching tabs, going back) starts from
 * what it showed before instead of a blank skeleton, then the live listener updates it. This stops the flash on tab changes.
 */
const memo = new Map<string, unknown>();
function useCached<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (memo.has(key) ? (memo.get(key) as T) : fallback));
  const [k, setK] = useState(key);
  if (k !== key) { setK(key); setV(memo.has(key) ? (memo.get(key) as T) : fallback); }
  return [v, (next: T) => { memo.set(key, next); setV(next); }];
}

/** Things in Recently deleted are hidden everywhere else */
const live = <T extends { deletedAt?: number }>(list: T[] | null) => (list ? list.filter((x) => !x.deletedAt) : list);

/** Your trips, including ones in Recently deleted (for that page) */
export function useMyTripsAll() {
  const me = useMe();
  const [trips, setTrips] = useCached<Trip[] | null>(`trips:${me.uid}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchMyTrips(me.uid, setTrips), [me.uid]);
  return trips;
}

export function useMyTrips() {
  const all = useMyTripsAll();
  return useMemo(() => live(all), [all]);
}

export function useTrip(id: string) {
  const [trip, setTrip] = useCached<Trip | null | undefined>(`trip:${id}`, undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchTrip(id, setTrip, () => setTrip(null)), [id]);
  return trip?.deletedAt ? null : trip; // undefined = loading, null = missing, deleted or no access
}

export function useSub<K extends SubName>(tripId: string, name: K) {
  const [items, setItems] = useCached<SubCollections[K][] | null>(`sub:${tripId}:${name}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchSub(tripId, name, setItems), [tripId, name]);
  return useMemo(() => live(items as (SubCollections[K] & { deletedAt?: number })[] | null), [items]);
}

/** Activities for several trips, keyed by trip id (used for the travel metrics on Home). */
/** One kind of sub-collection for several trips at once (e.g. the saves of every saved place), by trip id. */
export function useSubFor<K extends SubName>(tripIds: string[], name: K, includeDeleted = false) {
  const key = tripIds.join(',');
  const [byTrip, setByTrip] = useState<Record<string, SubCollections[K][]>>(() =>
    Object.fromEntries(tripIds.flatMap((id) => (memo.has(`sub:${id}:${name}`) ? [[id, memo.get(`sub:${id}:${name}`) as SubCollections[K][]]] : []))));
  useEffect(() => {
    const offs = tripIds.map((id) => store.watchSub(id, name, (items) => { memo.set(`sub:${id}:${name}`, items); setByTrip((m) => ({ ...m, [id]: items })); }));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name]);
  return useMemo(() => includeDeleted ? byTrip
    : Object.fromEntries(Object.entries(byTrip).map(([id, l]) => [id, live(l as (SubCollections[K] & { deletedAt?: number })[])!])) as Record<string, SubCollections[K][]>, [byTrip, includeDeleted]);
}

export const useActivitiesFor = (tripIds: string[]) => useSubFor(tripIds, 'activities');

export function useProfile(uid: string) {
  const [p, setP] = useCached<Profile | null>(`profile:${uid}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchProfile(uid, setP), [uid]);
  return p;
}

/** Profiles for a set of user ids, refetched when the set changes. */
export function useProfiles(ids: string[]) {
  const key = [...ids].sort().join(',');
  const [profiles, setProfiles] = useCached<Record<string, Profile>>(`profiles:${key}`, {});
  useEffect(() => {
    let live = true;
    store.getProfiles(key ? key.split(',') : []).then((p) => live && setProfiles(p));
    return () => { live = false; };
  }, [key]);
  return profiles;
}

export function useRole(trip: Trip): { role: Role | undefined; canManage: boolean; isOwner: boolean; canContribute: boolean } {
  const me = useMe();
  return useMemo(() => {
    const role = trip.roles[me.uid];
    // Everyone but a Viewer is a Planner (owner, organiser and member are stored, but plan alike); only whoever created the
    // trip can delete it, and that rank is never shown
    return { role, canManage: !!role && role !== 'viewer', isOwner: role === 'owner', canContribute: !!role && role !== 'viewer' };
  }, [trip.roles, me.uid]);
}

export function personName(profiles: Record<string, Profile>, id: string) {
  return profiles[id]?.name || 'Someone';
}

/** Your Collections: Places you saved and the ones you starred, live (cached for the session). */
/** Your places, including ones in Recently deleted (for that page) */
export function usePlacesAll() {
  const me = useMe();
  const [places, setPlaces] = useCached<SavedPlace[] | null>(`places:${me.uid}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchPlaces(me.uid, setPlaces), [me.uid]);
  return places;
}

export function usePlaces() {
  const all = usePlacesAll();
  return useMemo(() => live(all), [all]);
}

/** Shared collections you own or were added to (null while loading). */
export function useShares() {
  const me = useMe();
  const [shares, setShares] = useCached<CollectionShare[] | null>(`shares:${me.uid}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchShares(me.uid, setShares), [me.uid]);
  return shares;
}

/** Every place in one shared collection (yours and its Members'); [] with no share. */
export function useSharedPlaces(shareId: string | undefined) {
  const [places, setPlaces] = useCached<SavedPlace[] | null>(`shared:${shareId ?? ''}`, shareId ? null : []);
  useEffect(() => {
    if (!shareId) { setPlaces([]); return; }
    return store.watchSharedPlaces(shareId, setPlaces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);
  return useMemo(() => live(places), [places]);
}

/**
 * Places by id, for ideas and events that point at one: your own from Collections, anyone else's (a trip-mate's
 * Place added to a shared trip) fetched once.
 */
export function usePlacesById(ids: string[]) {
  const mine = usePlaces();
  const key = [...new Set(ids)].sort().join(',');
  const [others, setOthers] = useState<Record<string, SavedPlace>>({});
  useEffect(() => {
    const own = new Set((mine ?? []).map((p) => p.id));
    const missing = key ? key.split(',').filter((id) => !own.has(id) && !others[id]) : [];
    if (missing.length) store.getPlaces(missing).then((got) => setOthers((m) => ({ ...m, ...Object.fromEntries(Object.entries(got).filter(([, p]) => !p.deletedAt)) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mine]);
  return useMemo(() => ({ ...others, ...Object.fromEntries((mine ?? []).map((p) => [p.id, p])) }), [others, mine]);
}
