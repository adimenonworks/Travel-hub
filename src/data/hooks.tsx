import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { store } from './index';
import type { Activity, Profile, Role, SubCollections, SubName, Trip, User } from './types';

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

export function useMyTrips() {
  const me = useMe();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  useEffect(() => store.watchMyTrips(me.uid, setTrips), [me.uid]);
  return trips;
}

export function useTrip(id: string) {
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  useEffect(() => {
    setTrip(undefined);
    return store.watchTrip(id, setTrip, () => setTrip(null));
  }, [id]);
  return trip; // undefined = loading, null = missing or no access
}

export function useSub<K extends SubName>(tripId: string, name: K) {
  const [items, setItems] = useState<SubCollections[K][] | null>(null);
  useEffect(() => store.watchSub(tripId, name, setItems), [tripId, name]);
  return items;
}

/** Activities for several trips, keyed by trip id (used for the travel metrics on Home). */
export function useActivitiesFor(tripIds: string[]) {
  const key = tripIds.join(',');
  const [byTrip, setByTrip] = useState<Record<string, Activity[]>>({});
  useEffect(() => {
    const offs = tripIds.map((id) => store.watchSub(id, 'activities', (items) => setByTrip((m) => ({ ...m, [id]: items }))));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return byTrip;
}

export function useProfile(uid: string) {
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => store.watchProfile(uid, setP), [uid]);
  return p;
}

/** Profiles for a set of user ids, refetched when the set changes. */
export function useProfiles(ids: string[]) {
  const key = [...ids].sort().join(',');
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
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
