import type { Store } from './store';
import type { Invite, Profile, SubName, Trip, User } from './types';
import { randomCode } from './util';

/**
 * Demo backend: all data lives in this browser's localStorage. Each tab can
 * sign in as a different name, and tabs sync through the `storage` event, so
 * you can try collaboration locally before connecting Firebase.
 */
type DB = {
  users: Record<string, Profile>;
  trips: Record<string, Trip>;
  subs: Record<string, Record<string, Record<string, Record<string, unknown>>>>; // tripId -> sub -> id -> doc
  invites: Record<string, Invite>;
};

const KEY = 'triphub-demo-db';
const SESSION = 'triphub-demo-user';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* fall through */ }
  return { users: {}, trips: {}, subs: {}, invites: {} };
}

export function createLocalStore(): Store {
  let db = load();
  const listeners = new Set<() => void>();
  let authCb: ((u: User | null) => void) | null = null;

  const emit = () => listeners.forEach((l) => l());
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ }
    emit();
  };
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) { db = load(); emit(); }
  });

  const currentUser = (): User | null => {
    try {
      const raw = sessionStorage.getItem(SESSION);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  };
  const me = () => currentUser()!.uid;

  const watch = <T,>(read: () => T, cb: (v: T) => void) => {
    let last = '';
    const run = () => {
      const v = read();
      const s = JSON.stringify(v);
      if (s !== last) { last = s; cb(structuredClone(v)); }
    };
    listeners.add(run);
    queueMicrotask(run);
    return () => { listeners.delete(run); };
  };
  const sub = (tripId: string, name: SubName) => ((db.subs[tripId] ??= {})[name] ??= {});

  return {
    mode: 'demo',

    onAuth(cb) {
      authCb = cb;
      queueMicrotask(() => cb(currentUser()));
      return () => { authCb = null; };
    },
    async signIn(demoName) {
      const name = demoName?.trim() || 'Traveler';
      // Reuse an existing demo user with the same name so you "log back in".
      const existing = Object.values(db.users).find((u) => u.name.toLowerCase() === name.toLowerCase());
      const uid = existing?.id ?? `demo-${randomCode(8)}`;
      const user: User = { uid, name, photo: null };
      sessionStorage.setItem(SESSION, JSON.stringify(user));
      db.users[uid] = { ...(db.users[uid] ?? { id: uid, photo: null }), id: uid, name };
      save();
      authCb?.(user);
    },
    async signOut() {
      sessionStorage.removeItem(SESSION);
      authCb?.(null);
    },

    watchProfile(uid, cb) {
      return watch(() => db.users[uid] ?? null, cb);
    },
    async getProfiles(uids) {
      return Object.fromEntries(uids.filter((id) => db.users[id]).map((id) => [id, structuredClone(db.users[id])]));
    },
    async saveProfile(uid, patch) {
      db.users[uid] = { ...(db.users[uid] ?? { id: uid, name: 'Traveler', photo: null }), ...patch };
      save();
    },

    watchMyTrips(uid, cb) {
      return watch(() => Object.values(db.trips).filter((t) => t.memberIds.includes(uid)), cb);
    },
    watchTrip(id, cb) {
      return watch(() => {
        const t = db.trips[id];
        return t && t.memberIds.includes(currentUser()?.uid ?? '') ? t : null;
      }, cb);
    },
    async createTrip(data) {
      const id = randomCode(16);
      const uid = me();
      db.trips[id] = { ...data, id, ownerId: uid, memberIds: [uid], roles: { [uid]: 'owner' }, createdAt: Date.now() };
      save();
      return id;
    },
    async updateTrip(id, patch) {
      db.trips[id] = { ...db.trips[id], ...patch, id };
      save();
    },
    async deleteTrip(id) {
      delete db.trips[id];
      delete db.subs[id];
      save();
    },
    async leaveTrip(id, uid) {
      const t = db.trips[id];
      t.memberIds = t.memberIds.filter((m) => m !== uid);
      delete t.roles[uid];
      save();
    },
    async removeMember(trip, uid) {
      await this.leaveTrip(trip.id, uid);
    },
    async setRole(trip, uid, role) {
      db.trips[trip.id].roles[uid] = role;
      save();
    },

    watchSub(tripId, name, cb) {
      return watch(() => Object.values(sub(tripId, name)), cb as (v: unknown[]) => void);
    },
    async addSub(tripId, name, data) {
      const id = randomCode(16);
      sub(tripId, name)[id] = { ...data, id, createdBy: me(), createdAt: Date.now() };
      save();
      return id;
    },
    async updateSub(tripId, name, id, patch) {
      const c = sub(tripId, name);
      c[id] = { ...c[id], ...patch, id };
      save();
    },
    async deleteSub(tripId, name, id) {
      delete sub(tripId, name)[id];
      save();
    },
    async toggleInArray(tripId, name, id, field, uid, on) {
      const d = sub(tripId, name)[id];
      const arr = (d[field] as string[] | undefined) ?? [];
      d[field] = on ? Array.from(new Set([...arr, uid])) : arr.filter((x) => x !== uid);
      save();
    },
    async toggleVote(tripId, ideaId, uid, on) {
      const d = sub(tripId, 'ideas')[ideaId];
      const votes = { ...((d.votes as Record<string, true>) ?? {}) };
      if (on) votes[uid] = true; else delete votes[uid];
      d.votes = votes;
      save();
    },

    async createInvite(trip) {
      const code = randomCode();
      db.invites[code] = { code, tripId: trip.id, tripName: trip.name, createdBy: me(), expiresAt: Date.now() + 14 * 86400_000 };
      save();
      return code;
    },
    async getInvite(code) {
      return db.invites[code] ?? null;
    },
    async redeemInvite(invite) {
      const t = db.trips[invite.tripId];
      if (!t) throw new Error('This trip no longer exists.');
      const uid = me();
      if (!t.memberIds.includes(uid)) {
        t.memberIds.push(uid);
        t.roles[uid] = 'member';
      }
      save();
    },
  };
}
