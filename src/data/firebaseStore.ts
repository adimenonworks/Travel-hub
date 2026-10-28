import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import {
  Timestamp, addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs,
  getFirestore, onSnapshot, query, setDoc, updateDoc, where, writeBatch, type DocumentData,
} from 'firebase/firestore';
import type { Store } from './store';
import type { Invite, Profile, SubName, Trip } from './types';
import { randomCode } from './util';

const SUBS: SubName[] = ['activities', 'ideas', 'expenses', 'comments', 'albums'];
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
  const auth = getAuth(app);
  // Surfaces errors from a redirect sign-in that just completed.
  let lastAuthError: unknown = null;
  const redirectResult = getRedirectResult(auth).catch((e) => { lastAuthError = e; return null; });
  const db = getFirestore(app);

  const withId = <T,>(id: string, data: DocumentData) => ({ ...data, id }) as T;

  return {
    mode: 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(auth, async (u) => {
        if (!u) return cb(null);
        const user = { uid: u.uid, name: u.displayName ?? 'Traveler', photo: u.photoURL, email: u.email };
        // Keep the public profile's name/photo in sync with the Google account.
        await setDoc(doc(db, 'users', u.uid), { name: user.name, photo: user.photo }, { merge: true }).catch(() => {});
        cb(user);
      });
    },
    async signIn() {
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
      await signOut(auth);
    },

    watchProfile(uid, cb) {
      return onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? withId<Profile>(s.id, s.data()) : null));
    },
    async getProfiles(uids) {
      const out: Record<string, Profile> = {};
      await Promise.all(uids.map(async (id) => {
        const s = await getDoc(doc(db, 'users', id)).catch(() => null);
        if (s?.exists()) out[id] = withId<Profile>(id, s.data());
      }));
      return out;
    },
    async saveProfile(uid, patch) {
      await setDoc(doc(db, 'users', uid), patch, { merge: true });
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
    async toggleVote(tripId, ideaId, uid, on) {
      await updateDoc(doc(db, 'trips', tripId, 'ideas', ideaId), { [`votes.${uid}`]: on ? true : deleteField() });
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
