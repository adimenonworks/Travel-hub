import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  GoogleAuthProvider, browserLocalPersistence, getAuth, getRedirectResult, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged,
  signInWithCredential, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth';
import {
  Timestamp, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocFromCache, getDocs,
  initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, setDoc, updateDoc, where, writeBatch, type DocumentData,
} from 'firebase/firestore';
import type { Store } from './store';
import type { ChatReads, Invite, LinkPreview, Profile, SavedPlace, SubName, Trip } from './types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { randomCode } from './util';
import { googleIosClientId, isNativeApp } from '../lib/native';

const SUBS: SubName[] = ['activities', 'ideas', 'expenses', 'comments', 'albums'];
// Profile fields only their owner may read; they live in users/{uid}/private/places.
const PRIVATE_FIELDS = ['home', 'homeCity', 'visited', 'currency'] as const;
const INVITE_DAYS = 14;

// Errors from the sign-in flow that mean "try a full-page redirect instead of a popup".
const USE_REDIRECT = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'];

export function createFirebaseStore(config: FirebaseOptions): Store {
  // When served from Firebase Hosting, sign in through the same domain. That
  // avoids browsers (notably Safari on iPhone) blocking the cross-site storage
  // the sign-in flow needs.
  const host = location.hostname;
  const sameSiteAuth = host.endsWith('.web.app') || host.endsWith('.firebaseapp.com');
  const app = initializeApp(sameSiteAuth ? { ...config, authDomain: host } : config);
  // In the iPhone app there are no pop-ups or redirects: sign-in happens natively (see signIn) and the session is
  // kept on the device. getAuth() would try to load the web pop-up helper, which never loads inside the app.
  const auth = isNativeApp ? initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }) : getAuth(app);
  // Surfaces errors from a redirect sign-in that just completed (web only).
  let lastAuthError: unknown = null;
  const redirectResult = isNativeApp ? Promise.resolve(null) : getRedirectResult(auth).catch((e) => { lastAuthError = e; return null; });
  // Offline: keep a copy of everything you've opened on the device, and queue changes made without signal.
  // They show straight away and save when the connection comes back.
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

  const withId = <T,>(id: string, data: DocumentData) => ({ ...data, id }) as T;

  return {
    mode: 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(auth, async (u) => {
        if (!u) return cb(null);
        const google = { uid: u.uid, name: u.displayName ?? 'Traveler', photo: u.photoURL, email: u.email };
        // The saved profile wins once it exists, so a nickname or photo chosen in Profile
        // isn't replaced by the Google account's on the next sign-in. Google's fill the gaps.
        const ref = doc(db, 'users', u.uid);
        // Open straight away from what's saved on the phone; the server's copy (if newer) follows a moment later.
        const cached = await getDocFromCache(ref).catch(() => null);
        if (cached?.exists()) { const c = cached.data(); cb({ ...google, name: (typeof c.name === 'string' && c.name) || google.name, photo: 'photo' in c ? (c.photo as string | null) : google.photo }); }
        const snap = await getDoc(ref).catch(() => null);
        const saved = snap?.exists() ? snap.data() : null;
        const name = (typeof saved?.name === 'string' && saved.name) || google.name;
        const photo = saved && 'photo' in saved ? (saved.photo as string | null) : google.photo;
        if (!saved || saved.name !== name || !('photo' in saved)) await setDoc(ref, { name, photo }, { merge: true }).catch(() => {});
        cb({ ...google, name, photo });
      });
    },
    async signIn() {
      if (isNativeApp) {
        // Google's own sign-in sheet on the iPhone, then hand its ID token to Firebase.
        if (!googleIosClientId) throw Object.assign(new Error('iPhone sign-in is not set up yet.'), { code: 'app/ios-client-missing' });
        const { SocialLogin } = await import('@capgo/capacitor-social-login');
        await SocialLogin.initialize({ google: { iOSClientId: googleIosClientId } });
        const res = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
        const idToken = 'idToken' in res.result ? res.result.idToken : null;
        if (!idToken) throw Object.assign(new Error('Google did not return a sign-in token.'), { code: 'app/no-id-token' });
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        return;
      }
      await redirectResult;
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (USE_REDIRECT.includes(code)) await signInWithRedirect(auth, provider);
        else throw e;
      }
    },
    async takeAuthError() {
      await redirectResult;
      const e = lastAuthError;
      lastAuthError = null;
      return e;
    },
    async signOut() {
      if (isNativeApp) {
        const { SocialLogin } = await import('@capgo/capacitor-social-login');
        await SocialLogin.logout({ provider: 'google' }).catch(() => {});
      }
      await signOut(auth);
    },

    // A profile is two documents: the public one (name, photo) and the owner's
    // private one (home, visited). Older profiles kept everything in the public
    // one; those fields move to the private one on first load. If the published
    // rules don't allow the private document yet, everything stays public as before.
    watchProfile(uid, cb) {
      const publicRef = doc(db, 'users', uid);
      const privateRef = doc(db, 'users', uid, 'private', 'places');
      let pub: DocumentData | null | undefined;
      let priv: DocumentData | undefined;
      let privateAllowed = false;
      let migrated = false;
      const emit = () => {
        if (pub === undefined || priv === undefined) return;
        cb(pub === null && !Object.keys(priv).length ? null : withId<Profile>(uid, { ...pub, ...priv }));
        const legacy = PRIVATE_FIELDS.filter((k) => pub && k in pub);
        if (privateAllowed && !migrated && legacy.length && auth.currentUser?.uid === uid) {
          migrated = true;
          const moved = Object.fromEntries(legacy.filter((k) => !(k in priv!)).map((k) => [k, pub![k]]));
          setDoc(privateRef, moved, { merge: true })
            .then(() => updateDoc(publicRef, Object.fromEntries(legacy.map((k) => [k, deleteField()]))))
            .catch(() => { migrated = false; });
        }
      };
      const offPublic = onSnapshot(publicRef, (s) => { pub = s.exists() ? s.data() : null; emit(); }, () => { pub = null; emit(); });
      const offPrivate = onSnapshot(privateRef,
        (s) => { privateAllowed = true; priv = s.exists() ? s.data() : {}; emit(); },
        () => { priv = {}; emit(); });
      return () => { offPublic(); offPrivate(); };
    },
    async getProfiles(uids) {
      const out: Record<string, Profile> = {};
      await Promise.all(uids.map(async (id) => {
        const s = await getDoc(doc(db, 'users', id)).catch(() => null);
        if (s?.exists()) out[id] = withId<Profile>(id, s.data());
      }));
      return out;
    },
    watchReads(uid, cb) {
      // Private (users/{uid}/private/reads): only you can read or write it, as with your home city.
      return onSnapshot(doc(db, 'users', uid, 'private', 'reads'),
        (snap) => cb(snap.exists() ? (snap.data() as ChatReads) : null),
        () => cb(null));
    },
    async markRead(uid, targetId, at, since) {
      // A merge that sets only this event's time (and "since" if it isn't there yet), so devices never overwrite each other.
      const ref = doc(db, 'users', uid, 'private', 'reads');
      await setDoc(ref, { since, at: { [targetId]: at } }, { merge: true });
    },
    async saveProfile(uid, patch) {
      const rest: DocumentData = patch;
      const isPrivate = (k: string) => (PRIVATE_FIELDS as readonly string[]).includes(k);
      const pub = Object.fromEntries(Object.entries(rest).filter(([k]) => !isPrivate(k)));
      const priv = Object.fromEntries(Object.entries(rest).filter(([k]) => isPrivate(k)));
      if (Object.keys(priv).length) {
        try {
          await setDoc(doc(db, 'users', uid, 'private', 'places'), priv, { merge: true });
        } catch {
          // Rules not updated yet: keep the old behaviour so saving still works.
          Object.assign(pub, priv);
        }
      }
      if (!Object.keys(pub).length) return;
      const ref = doc(db, 'users', uid);
      try {
        await setDoc(ref, pub, { merge: true });
      } catch (e) {
        // The rules only allow name and photo on the public profile. An older version could leave other fields there
        // (home, visited…), and then every save is refused. Move private ones to the private document, drop the rest, retry.
        if ((e as { code?: string })?.code !== 'permission-denied') throw e;
        const now = (await getDoc(ref)).data() ?? {};
        const extra = Object.keys(now).filter((k) => k !== 'name' && k !== 'photo');
        if (!extra.length) throw e;
        const moved = Object.fromEntries(extra.filter(isPrivate).map((k) => [k, now[k]]));
        if (Object.keys(moved).length) await setDoc(doc(db, 'users', uid, 'private', 'places'), moved, { merge: true });
        await updateDoc(ref, { ...Object.fromEntries(extra.map((k) => [k, deleteField()])), ...pub });
      }
    },

    watchMyTrips(uid, cb) {
      const q = query(collection(db, 'trips'), where('memberIds', 'array-contains', uid));
      return onSnapshot(q, (s) => cb(s.docs.map((d) => withId<Trip>(d.id, d.data()))));
    },
    watchTrip(id, cb, onError) {
      return onSnapshot(doc(db, 'trips', id), (s) => cb(s.exists() ? withId<Trip>(s.id, s.data()) : null), (e) => onError?.(e));
    },
    async createTrip(data) {
      const uid = auth.currentUser!.uid;
      const ref = await addDoc(collection(db, 'trips'), {
        ...data, ownerId: uid, memberIds: [uid], roles: { [uid]: 'owner' }, createdAt: Date.now(),
      });
      return ref.id;
    },
    async updateTrip(id, patch) {
      const { id: _id, ...rest } = patch;
      await updateDoc(doc(db, 'trips', id), rest);
    },
    async deleteTrip(id) {
      for (const name of SUBS) {
        const snap = await getDocs(collection(db, 'trips', id, name));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      await deleteDoc(doc(db, 'trips', id));
    },
    async leaveTrip(id, uid) {
      await updateDoc(doc(db, 'trips', id), { memberIds: arrayRemove(uid), [`roles.${uid}`]: deleteField() });
    },
    async removeMember(trip, uid) {
      await updateDoc(doc(db, 'trips', trip.id), { memberIds: arrayRemove(uid), [`roles.${uid}`]: deleteField() });
    },
    async setRole(trip, uid, role) {
      await updateDoc(doc(db, 'trips', trip.id), { [`roles.${uid}`]: role });
    },

    watchSub(tripId, name, cb) {
      return onSnapshot(collection(db, 'trips', tripId, name), (s) => cb(s.docs.map((d) => withId(d.id, d.data()))));
    },
    queueSub(tripId, name, data) {
      const ref = doc(collection(db, 'trips', tripId, name));
      const saved = setDoc(ref, { ...data, createdBy: auth.currentUser!.uid, createdAt: Date.now() });
      return { id: ref.id, saved };
    },
    queueTrip(data) {
      const uid = auth.currentUser!.uid;
      const ref = doc(collection(db, 'trips'));
      const saved = setDoc(ref, { ...data, ownerId: uid, memberIds: [uid], roles: { [uid]: 'owner' }, createdAt: Date.now() });
      return { id: ref.id, saved };
    },
    async deleteBudgetData(trip) {
      const fields = (['totalBudget', 'dailyBudget', 'dayBudgets', 'daySpent'] as const).filter((k) => k in trip);
      if (fields.length) await updateDoc(doc(db, 'trips', trip.id), Object.fromEntries(fields.map((k) => [k, deleteField()])));
      const old = await getDocs(collection(db, 'trips', trip.id, 'expenses'));
      await Promise.all(old.docs.map((d) => deleteDoc(d.ref)));
    },
    watchPlaces(uid, cb) {
      // Two live queries merged: Places you saved, and other people's Places you've starred.
      let own: SavedPlace[] = [], starred: SavedPlace[] = [];
      const emit = () => cb([...own, ...starred.filter((p) => !own.some((o) => o.id === p.id))]);
      const toList = (docs: { id: string; data: () => DocumentData }[]) => docs.map((d) => withId<SavedPlace>(d.id, d.data()));
      const offOwn = onSnapshot(query(collection(db, 'places'), where('ownerId', '==', uid)), (q) => { own = toList(q.docs); emit(); }, () => { own = []; emit(); });
      const offStar = onSnapshot(query(collection(db, 'places'), where('starredBy', 'array-contains', uid)), (q) => { starred = toList(q.docs); emit(); }, () => {});
      return () => { offOwn(); offStar(); };
    },
    async getPlaces(ids) {
      const out: Record<string, SavedPlace> = {};
      await Promise.all([...new Set(ids)].map(async (id) => {
        try { const d = await getDoc(doc(db, 'places', id)); if (d.exists()) out[id] = withId<SavedPlace>(id, d.data()); } catch { /* no access or offline */ }
      }));
      return out;
    },
    addPlace(data) {
      const ref = doc(collection(db, 'places'));
      const saved = setDoc(ref, { ...data, ownerId: auth.currentUser!.uid, createdAt: Date.now() });
      return { id: ref.id, saved };
    },
    async updatePlace(id, patch) {
      await updateDoc(doc(db, 'places', id), patch);
    },
    async deletePlace(id) {
      await deleteDoc(doc(db, 'places', id));
    },
    async starPlace(id, uid, on) {
      await updateDoc(doc(db, 'places', id), { starredBy: on ? arrayUnion(uid) : arrayRemove(uid) });
    },
    async readLink(url) {
      try {
        // The function runs in Sydney (functions/index.js); it needs the paid (Blaze) plan to be deployed.
        const call = httpsCallable<{ url: string }, LinkPreview>(getFunctions(app, 'australia-southeast1'), 'readLink', { timeout: 20000 });
        return (await call({ url })).data;
      } catch {
        return null;
      }
    },
    async addSub(tripId, name, data) {
      const ref = await addDoc(collection(db, 'trips', tripId, name), { ...data, createdBy: auth.currentUser!.uid, createdAt: Date.now() });
      return ref.id;
    },
    async updateSub(tripId, name, id, patch) {
      const { id: _id, ...rest } = patch as Record<string, unknown>;
      await updateDoc(doc(db, 'trips', tripId, name, id), rest);
    },
    async deleteSub(tripId, name, id) {
      await deleteDoc(doc(db, 'trips', tripId, name, id));
    },
    async toggleInArray(tripId, name, id, field, uid, on) {
      await updateDoc(doc(db, 'trips', tripId, name, id), { [field]: on ? arrayUnion(uid) : arrayRemove(uid) });
    },
    async setVote(tripId, ideaId, uid, vote) {
      await updateDoc(doc(db, 'trips', tripId, 'ideas', ideaId), {
        [`votes.${uid}`]: vote === 1 ? true : deleteField(),
        [`downvotes.${uid}`]: vote === -1 ? true : deleteField(),
      });
    },

    async createInvite(trip) {
      const code = randomCode();
      await setDoc(doc(db, 'invites', code), {
        tripId: trip.id,
        tripName: trip.name,
        createdBy: auth.currentUser!.uid,
        expiresAt: Timestamp.fromMillis(Date.now() + INVITE_DAYS * 86400_000),
      });
      return code;
    },
    async getInvite(code) {
      const s = await getDoc(doc(db, 'invites', code));
      if (!s.exists()) return null;
      const d = s.data();
      return { code, tripId: d.tripId, tripName: d.tripName, createdBy: d.createdBy, expiresAt: (d.expiresAt as Timestamp).toMillis() } satisfies Invite;
    },
    async redeemInvite(invite) {
      const uid = auth.currentUser!.uid;
      await updateDoc(doc(db, 'trips', invite.tripId), {
        memberIds: arrayUnion(uid),
        [`roles.${uid}`]: 'member',
        joinedVia: invite.code,
      });
    },
  };
}
