import { isTravelling, migratedRoles } from './roles';
import type { Store } from './store';
import type { ChatReads, CollectionRole, CollectionShare, Invite, Profile, SavedPlace, SubName, Trip, User } from './types';
import { randomCode } from './util';

/**
 * Demo backend: all data lives in this browser's localStorage. Each tab can
 * sign in as a different name, and tabs sync through the `storage` event, so
 * you can try collaboration locally before connecting Firebase.
 */
type DB = {
  users: Record<string, Profile>;
  /** Event-chat read state per person (demo mode) */
  reads?: Record<string, ChatReads>;
  places?: Record<string, SavedPlace>;
  trips: Record<string, Trip>;
  subs: Record<string, Record<string, Record<string, Record<string, unknown>>>>; // tripId -> sub -> id -> doc
  invites: Record<string, Invite>;
  shares?: Record<string, CollectionShare>;
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

    async deleteAccount(uid) {
      for (const t of Object.values(db.trips).filter((t) => t.memberIds.includes(uid))) {
        const others = t.memberIds.filter((m) => m !== uid);
        const comments = db.subs[t.id]?.comments ?? {};
        for (const [id, c] of Object.entries(comments)) if ((c as { authorId?: string }).authorId === uid) delete comments[id];
        if (isTravelling(t, uid) && !others.some((m) => isTravelling(t, m))) { delete db.trips[t.id]; delete db.subs[t.id]; }
        else { t.memberIds = others; delete t.roles[uid]; }
      }
      for (const p of Object.values(db.places ?? {})) {
        if (p.ownerId === uid) delete db.places![p.id];
        else if (p.starredBy?.includes(uid)) p.starredBy = p.starredBy.filter((m) => m !== uid);
      }
      delete db.users[uid];
      if (db.reads) delete db.reads[uid];
      save();
      sessionStorage.removeItem(SESSION);
      authCb?.(null);
    },

    watchProfile(uid, cb) {
      return watch(() => db.users[uid] ?? null, cb);
    },
    async getProfiles(uids) {
      return Object.fromEntries(uids.filter((id) => db.users[id]).map((id) => [id, structuredClone(db.users[id])]));
    },
    watchReads(uid, cb) {
      return watch(() => db.reads?.[uid] ?? null, cb);
    },
    async markRead(uid, targetId, at, since) {
      db.reads = db.reads ?? {};
      const r = db.reads[uid] ?? { since, at: {} };
      db.reads[uid] = { ...r, at: { ...r.at, [targetId]: at } };
      save();
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
      db.trips[id] = { ...data, id, createdBy: uid, memberIds: [uid], roles: { [uid]: 'traveller' }, createdAt: Date.now() };
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
    async setDeleted(item, on) {
      const d = (item.kind === 'trip' ? db.trips[item.id] : item.kind === 'event' ? sub(item.tripId, 'activities')[item.id] : db.places?.[item.id]) as { deletedAt?: number; deletedBy?: string } | undefined;
      if (!d) return;
      if (on) { d.deletedAt = Date.now(); d.deletedBy = me(); } else { delete d.deletedAt; delete d.deletedBy; }
      save();
    },
    async leaveTrip(id, uid) {
      const t = db.trips[id];
      const others = t.memberIds.filter((m) => m !== uid);
      // The last traveller leaving deletes the trip (into Recently deleted); they stay on it so they can restore it
      if (isTravelling(t, uid) && !others.some((m) => isTravelling(t, m))) { await this.setDeleted({ kind: 'trip', id }, true); return; }
      t.memberIds = others;
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
    async migrateRoles(trip) {
      const t = db.trips[trip.id];
      if (!t) return;
      t.roles = migratedRoles(t);
      const by = t.createdBy ?? t.ownerId;
      if (by) t.createdBy = by;
      delete t.ownerId;
      save();
    },

    watchSub(tripId, name, cb) {
      return watch(() => Object.values(sub(tripId, name)), cb as (v: unknown[]) => void);
    },
    queueSub(tripId, name, data) {
      const id = randomCode(16);
      sub(tripId, name)[id] = { ...data, id, createdBy: me(), createdAt: Date.now() };
      save();
      return { id, saved: Promise.resolve() };
    },
    queueTrip(data) {
      const id = randomCode(16);
      const uid = me();
      db.trips[id] = { ...data, id, createdBy: uid, memberIds: [uid], roles: { [uid]: 'traveller' }, createdAt: Date.now() };
      save();
      return { id, saved: Promise.resolve() };
    },
    async deleteBudgetData(trip) {
      const t = db.trips[trip.id];
      if (t) { delete t.totalBudget; delete t.dailyBudget; delete t.dayBudgets; delete t.daySpent; }
      if (db.subs[trip.id]) db.subs[trip.id].expenses = {};
      save();
    },
    watchPlaces(uid, cb) {
      return watch(() => Object.values(db.places ?? {}).filter((p) => p.ownerId === uid || p.starredBy?.includes(uid)), cb);
    },
    async getPlaces(ids) {
      return Object.fromEntries(ids.flatMap((id) => (db.places?.[id] ? [[id, structuredClone(db.places[id])]] : [])));
    },
    addPlace(data) {
      const id = randomCode(16);
      (db.places ??= {})[id] = { ...data, id, ownerId: me(), createdAt: Date.now() };
      save();
      return { id, saved: Promise.resolve() };
    },
    async updatePlace(id, patch) {
      if (db.places?.[id]) { db.places[id] = { ...db.places[id], ...patch, id }; save(); }
    },
    async deletePlace(id) {
      if (db.places) { delete db.places[id]; save(); }
    },
    async starPlace(id, uid, on) {
      const p = db.places?.[id];
      if (!p) return;
      const list = (p.starredBy ?? []).filter((x) => x !== uid);
      p.starredBy = on ? [...list, uid] : list;
      save();
    },
    // Demo mode has no Cloud Function: the app reads what it can from the link itself (src/lib/links.ts).
    async readLink() {
      return null;
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
    async setVote(tripId, ideaId, uid, vote) {
      const d = sub(tripId, 'ideas')[ideaId];
      const votes = { ...((d.votes as Record<string, true>) ?? {}) };
      const downvotes = { ...((d.downvotes as Record<string, true>) ?? {}) };
      delete votes[uid];
      delete downvotes[uid];
      if (vote === 1) votes[uid] = true;
      if (vote === -1) downvotes[uid] = true;
      d.votes = votes;
      d.downvotes = downvotes;
      save();
    },

    watchShares(uid, cb) {
      return watch(() => Object.values(db.shares ?? {}).filter((s) => s.ownerId === uid || s.memberIds.includes(uid)), cb);
    },
    watchSharedPlaces(shareId, cb) {
      const cut = shareId.lastIndexOf('_');
      const ownerId = shareId.slice(0, cut), cc = shareId.slice(cut + 1);
      return watch(() => Object.values(db.places ?? {}).filter((p) => p.sharedIn === shareId || (!p.sharedIn && p.ownerId === ownerId && p.countryCode === cc)), cb);
    },
    async shareCollection(countryCode) {
      const id = `${me()}_${countryCode}`;
      const shares = (db.shares ??= {});
      shares[id] ??= { id, ownerId: me(), countryCode, memberIds: [], roles: {}, createdAt: Date.now() };
      save();
      return structuredClone(shares[id]);
    },
    async createCollectionInvite(share, role, label) {
      const code = randomCode();
      db.invites[code] = { code, kind: 'collection', shareId: share.id, countryCode: share.countryCode, role, tripId: '', tripName: label, createdBy: me(), expiresAt: Date.now() + 14 * 86400_000 };
      save();
      return code;
    },
    async setShareRole(share, uid, role) {
      const s = db.shares?.[share.id];
      if (!s) return;
      if (role) { if (!s.memberIds.includes(uid)) s.memberIds.push(uid); s.roles[uid] = role; }
      else { s.memberIds = s.memberIds.filter((x) => x !== uid); delete s.roles[uid]; }
      save();
    },
    async createInvite(trip, role) {
      const code = randomCode();
      db.invites[code] = { code, tripId: trip.id, tripName: trip.name, role, createdBy: me(), expiresAt: Date.now() + 14 * 86400_000 };
      save();
      return code;
    },
    async getInvite(code) {
      return db.invites[code] ?? null;
    },
    async redeemInvite(invite) {
      if (invite.kind === 'collection') {
        const s = db.shares?.[invite.shareId ?? ''];
        if (!s) throw new Error('This collection is no longer shared.');
        if (s.ownerId !== me() && !s.memberIds.includes(me())) { s.memberIds.push(me()); s.roles[me()] = (invite.role as CollectionRole | undefined) ?? 'viewer'; save(); }
        return;
      }
      const t = db.trips[invite.tripId];
      if (!t) throw new Error('This trip no longer exists.');
      const uid = me();
      if (!t.memberIds.includes(uid)) {
        t.memberIds.push(uid);
        t.roles[uid] = invite.role === 'follower' ? 'follower' : 'traveller';
      }
      save();
    },
  };
}
