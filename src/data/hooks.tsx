import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store } from './index';
import type { Profile, Role, SavedPlace, SubCollections, SubName, Trip, User } from './types';

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

export function useMyTrips() {
  const me = useMe();
  const [trips, setTrips] = useCached<Trip[] | null>(`trips:${me.uid}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchMyTrips(me.uid, setTrips), [me.uid]);
  return trips;
}

export function useTrip(id: string) {
  const [trip, setTrip] = useCached<Trip | null | undefined>(`trip:${id}`, undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchTrip(id, setTrip, () => setTrip(null)), [id]);
  return trip; // undefined = loading, null = missing or no access
}

export function useSub<K extends SubName>(tripId: string, name: K) {
  const [items, setItems] = useCached<SubCollections[K][] | null>(`sub:${tripId}:${name}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchSub(tripId, name, setItems), [tripId, name]);
  return items;
}

/** Activities for several trips, keyed by trip id (used for the travel metrics on Home). */
/** One kind of sub-collection for several trips at once (e.g. the saves of every saved place), by trip id. */
export function useSubFor<K extends SubName>(tripIds: string[], name: K) {
  const key = tripIds.join(',');
  const [byTrip, setByTrip] = useState<Record<string, SubCollections[K][]>>(() =>
    Object.fromEntries(tripIds.flatMap((id) => (memo.has(`sub:${id}:${name}`) ? [[id, memo.get(`sub:${id}:${name}`) as SubCollections[K][]]] : []))));
  useEffect(() => {
    const offs = tripIds.map((id) => store.watchSub(id, name, (items) => { memo.set(`sub:${id}:${name}`, items); setByTrip((m) => ({ ...m, [id]: items })); }));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, name]);
  return byTrip;
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

export function useRole(trip: Trip): { role: Role | undefined; canManage: boolean; isOwner: boolean } {
  const me = useMe();
  return useMemo(() => {
    const role = trip.roles[me.uid];
    return { role, canManage: role === 'owner' || role === 'editor', isOwner: role === 'owner' };
  }, [trip.roles, me.uid]);
}

export function personName(profiles: Record<string, Profile>, id: string) {
  return profiles[id]?.name || 'Someone';
}

/** Your Collections: Places you saved and the ones you starred, live (cached for the session). */
export function usePlaces() {
  const me = useMe();
  const [places, setPlaces] = useCached<SavedPlace[] | null>(`places:${me.uid}`, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => store.watchPlaces(me.uid, setPlaces), [me.uid]);
  return places;
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
    if (missing.length) store.getPlaces(missing).then((got) => setOthers((m) => ({ ...m, ...got })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mine]);
  return useMemo(() => ({ ...others, ...Object.fromEntries((mine ?? []).map((p) => [p.id, p])) }), [others, mine]);
}
