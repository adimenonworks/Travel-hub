import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, arrayUnion, arrayRemove, deleteField, Timestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-triphub', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
const db = (u) => env.authenticatedContext(u).firestore();
const anon = env.unauthenticatedContext().firestore();
let pass = 0, fail = 0;
const t = async (name, p) => { try { await p; pass++; console.log('ok  ', name); } catch (e) { fail++; console.log('FAIL', name, e.message); } };

const A = db('alice'), B = db('bob'), C = db('carol');
const trip = { name: 'Lisbon', ownerId: 'alice', memberIds: ['alice'], roles: { alice: 'owner' }, startDate: '2026-11-01', endDate: '2026-11-05' };

await t('owner creates trip', assertSucceeds(setDoc(doc(A, 'trips/t1'), trip)));
await t('cannot create trip owned by someone else', assertFails(setDoc(doc(B, 'trips/t2'), trip)));
await t('cannot create with extra members', assertFails(setDoc(doc(B, 'trips/t3'), { ...trip, ownerId: 'bob', memberIds: ['bob', 'carol'], roles: { bob: 'owner' } })));
await t('non-member cannot read trip', assertFails(getDoc(doc(B, 'trips/t1'))));
await t('anon cannot read trip', assertFails(getDoc(doc(anon, 'trips/t1'))));
await t('member list query works', assertSucceeds(getDocs(query(collection(A, 'trips'), where('memberIds', 'array-contains', 'alice')))));
await t('unfiltered trip list denied', assertFails(getDocs(collection(B, 'trips'))));
await t('non-member cannot write activity', assertFails(addDoc(collection(B, 'trips/t1/activities'), { title: 'x' })));
await t('owner writes activity', assertSucceeds(setDoc(doc(A, 'trips/t1/activities/a1'), { title: 'Tram' })));
await t('non-member cannot read activities', assertFails(getDocs(collection(B, 'trips/t1/activities'))));

await t('non-member cannot join without invite', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'member', joinedVia: 'nope' })));
await t('non-manager cannot create invite', assertFails(setDoc(doc(B, 'invites/bad'), { tripId: 't1', tripName: 'x', createdBy: 'bob', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('owner creates invite', assertSucceeds(setDoc(doc(A, 'invites/good'), { tripId: 't1', tripName: 'Lisbon', createdBy: 'alice', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('anyone signed in reads invite', assertSucceeds(getDoc(doc(B, 'invites/good'))));
await t('cannot list invites', assertFails(getDocs(collection(B, 'invites'))));
await t('join cannot grant self editor', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'editor', joinedVia: 'good' })));
await t('join cannot change other fields', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'member', joinedVia: 'good', name: 'hacked' })));
await t('join cannot add a friend too', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob', 'carol'), 'roles.bob': 'member', joinedVia: 'good' })));
await t('bob joins with invite', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'member', joinedVia: 'good' })));
await t('member reads trip', assertSucceeds(getDoc(doc(B, 'trips/t1'))));
await t('member writes activity', assertSucceeds(updateDoc(doc(B, 'trips/t1/activities/a1'), { attendeeIds: arrayUnion('bob') })));
await t('member adds photo album', assertSucceeds(setDoc(doc(B, 'trips/t1/albums/p1'), { title: 'Lisbon', url: 'https://photos.app.goo.gl/x', createdBy: 'bob' })));
await t('non-member cannot add photo album', assertFails(setDoc(doc(C, 'trips/t1/albums/p2'), { title: 'x', url: 'https://x', createdBy: 'carol' })));
await t('non-member cannot read photo albums', assertFails(getDocs(collection(C, 'trips/t1/albums'))));
await t('member cannot rename trip', assertFails(updateDoc(doc(B, 'trips/t1'), { name: 'x' })));
await t('member cannot promote self', assertFails(updateDoc(doc(B, 'trips/t1'), { 'roles.bob': 'editor' })));
await t('member cannot delete trip', assertFails(deleteDoc(doc(B, 'trips/t1'))));

await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'invites/old'), { tripId: 't1', tripName: 'x', createdBy: 'alice', expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
await t('expired invite rejected', assertFails(updateDoc(doc(C, 'trips/t1'), { memberIds: arrayUnion('carol'), 'roles.carol': 'member', joinedVia: 'old' })));

await t('owner promotes bob', assertSucceeds(updateDoc(doc(A, 'trips/t1'), { 'roles.bob': 'editor' })));
await t('editor renames trip', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { name: 'Lisbon 2026' })));
await t('editor cannot remove owner', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayRemove('alice'), 'roles.alice': deleteField() })));
await t('editor cannot take ownership', assertFails(updateDoc(doc(B, 'trips/t1'), { ownerId: 'bob' })));
await t('bob leaves', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayRemove('bob'), 'roles.bob': deleteField() })));
await t('ex-member cannot read', assertFails(getDoc(doc(B, 'trips/t1'))));
await t('owner cannot leave (must delete)', assertFails(updateDoc(doc(A, 'trips/t1'), { memberIds: arrayRemove('alice'), 'roles.alice': deleteField() })));
await t('user writes own profile', assertSucceeds(setDoc(doc(A, 'users/alice'), { name: 'Alice' })));
await t('user cannot write others profile', assertFails(setDoc(doc(B, 'users/alice'), { name: 'x' })));
await t('owner deletes trip', assertSucceeds(deleteDoc(doc(A, 'trips/t1'))));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
