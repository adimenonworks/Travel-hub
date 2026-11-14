import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, arrayUnion, arrayRemove, deleteField, Timestamp, writeBatch } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-triphub', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
const db = (u) => env.authenticatedContext(u).firestore();
const anon = env.unauthenticatedContext().firestore();
let pass = 0, fail = 0;
const t = async (name, p) => { try { await p; pass++; console.log('ok  ', name); } catch (e) { fail++; console.log('FAIL', name, e.message); } };

const A = db('alice'), B = db('bob'), C = db('carol');
const trip = { name: 'Lisbon', createdBy: 'alice', memberIds: ['alice'], roles: { alice: 'traveller' }, startDate: '2026-11-01', endDate: '2026-11-05' };

await t('traveller creates trip', assertSucceeds(setDoc(doc(A, 'trips/t1'), trip)));
await t('cannot create a trip started by someone else', assertFails(setDoc(doc(B, 'trips/t2'), trip)));
await t('cannot create a trip as a follower', assertFails(setDoc(doc(A, 'trips/t6'), { ...trip, roles: { alice: 'follower' } })));
await t('older app still creates a trip (ownerId, owner)', assertSucceeds(setDoc(doc(A, 'trips/t7'), { name: 'Old', ownerId: 'alice', memberIds: ['alice'], roles: { alice: 'owner' } })));
await t('traveller creates trip with a cover photo', assertSucceeds(setDoc(doc(A, 'trips/t4'), { ...trip, coverPhoto: 'data:image/jpeg;base64,AAAA' })));
await t('cannot create with a non-image cover', assertFails(setDoc(doc(A, 'trips/t5'), { ...trip, coverPhoto: 'hello' })));
await t('cannot create with extra members', assertFails(setDoc(doc(B, 'trips/t3'), { ...trip, createdBy: 'bob', memberIds: ['bob', 'carol'], roles: { bob: 'traveller' } })));
await t('non-member cannot read trip', assertFails(getDoc(doc(B, 'trips/t1'))));
await t('anon cannot read trip', assertFails(getDoc(doc(anon, 'trips/t1'))));
await t('member list query works', assertSucceeds(getDocs(query(collection(A, 'trips'), where('memberIds', 'array-contains', 'alice')))));
await t('unfiltered trip list denied', assertFails(getDocs(collection(B, 'trips'))));
await t('non-member cannot write activity', assertFails(addDoc(collection(B, 'trips/t1/activities'), { title: 'x' })));
await t('traveller writes activity', assertSucceeds(setDoc(doc(A, 'trips/t1/activities/a1'), { title: 'Tram' })));
await t('non-member cannot read activities', assertFails(getDocs(collection(B, 'trips/t1/activities'))));

await t('non-member cannot join without invite', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'traveller', joinedVia: 'nope' })));
await t('non-member cannot create invite', assertFails(setDoc(doc(B, 'invites/bad'), { tripId: 't1', tripName: 'x', createdBy: 'bob', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('traveller creates invite', assertSucceeds(setDoc(doc(A, 'invites/good'), { tripId: 't1', tripName: 'Lisbon', createdBy: 'alice', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('anyone signed in reads invite', assertSucceeds(getDoc(doc(B, 'invites/good'))));
await t('cannot list invites', assertFails(getDocs(collection(B, 'invites'))));
await t('join cannot grant an unknown role', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'owner', joinedVia: 'good' })));
await t('join cannot change other fields', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'traveller', joinedVia: 'good', name: 'hacked' })));
await t('join cannot add a friend too', assertFails(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob', 'carol'), 'roles.bob': 'traveller', joinedVia: 'good' })));
await t('bob joins with invite as a traveller', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayUnion('bob'), 'roles.bob': 'traveller', joinedVia: 'good' })));
await t('member reads trip', assertSucceeds(getDoc(doc(B, 'trips/t1'))));
await t('any traveller edits an older event (no people yet)', assertSucceeds(updateDoc(doc(B, 'trips/t1/activities/a1'), { attendeeIds: arrayUnion('bob') })));
await t('traveller adds photo album', assertSucceeds(setDoc(doc(B, 'trips/t1/albums/p1'), { title: 'Lisbon', url: 'https://photos.app.goo.gl/x', createdBy: 'bob' })));
await t('non-member cannot add photo album', assertFails(setDoc(doc(C, 'trips/t1/albums/p2'), { title: 'x', url: 'https://x', createdBy: 'carol' })));
await t('non-member cannot read photo albums', assertFails(getDocs(collection(C, 'trips/t1/albums'))));
// Trip content: authors and size limits
await t('member adds a comment as themselves', assertSucceeds(setDoc(doc(B, 'trips/t1/comments/c1'), { targetId: 'a1', text: 'Meet at the stop?', authorId: 'bob', createdBy: 'bob', createdAt: 1 })));
await t('cannot post a comment as someone else', assertFails(setDoc(doc(B, 'trips/t1/comments/c2'), { targetId: 'a1', text: 'hi', authorId: 'alice', createdBy: 'bob', createdAt: 1 })));
await t('comment over 150 characters refused', assertFails(setDoc(doc(B, 'trips/t1/comments/c3'), { targetId: 'a1', text: 'x'.repeat(151), authorId: 'bob', createdBy: 'bob', createdAt: 1 })));
await t('comment of exactly 150 characters allowed', assertSucceeds(setDoc(doc(B, 'trips/t1/comments/c4'), { targetId: 'a1', text: 'x'.repeat(150), authorId: 'bob', createdBy: 'bob', createdAt: 1 })));
await t('a traveller cannot delete someone else\'s comment', assertFails(deleteDoc(doc(A, 'trips/t1/comments/c1'))));
await t('a traveller cannot edit someone else\'s comment', assertFails(updateDoc(doc(A, 'trips/t1/comments/c1'), { text: 'changed' })));
await t('author deletes own comment', assertSucceeds(deleteDoc(doc(B, 'trips/t1/comments/c1'))));
await t('notes over 2,000 characters refused', assertFails(setDoc(doc(B, 'trips/t1/activities/a9'), { title: 'x', notes: 'x'.repeat(2001), createdBy: 'bob' })));
await t('traveller adds an event', assertSucceeds(setDoc(doc(B, 'trips/t1/activities/a2'), { title: 'Fado', createdBy: 'bob' })));
await t('cannot add an event as someone else', assertFails(setDoc(doc(B, 'trips/t1/activities/a3'), { title: 'Fado', createdBy: 'alice' })));
await t('cannot change who added an event', assertFails(updateDoc(doc(B, 'trips/t1/activities/a2'), { createdBy: 'alice' })));
await setDoc(doc(A, 'trips/t1/ideas/i1'), { title: 'Belém', createdBy: 'alice', votes: {} });
await t('traveller votes on someone else\'s idea', assertSucceeds(updateDoc(doc(B, 'trips/t1/ideas/i1'), { 'votes.bob': true })));
await setDoc(doc(A, 'trips/t1/ideas/i9'), { title: 'Sintra', createdBy: 'alice', votes: {} });
await t('traveller deletes someone else\'s idea', assertSucceeds(deleteDoc(doc(B, 'trips/t1/ideas/i9'))));
await t('traveller deletes someone else\'s event', assertSucceeds(deleteDoc(doc(A, 'trips/t1/activities/a2'))));
// Everyone equal: any traveller edits the trip; nobody can rewrite who started it
await t('any traveller renames trip', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { name: 'Lisbon' })));
await t('nobody can change who started the trip', assertFails(updateDoc(doc(B, 'trips/t1'), { createdBy: 'bob' })));
await t('cannot slip in an ownerId either', assertFails(updateDoc(doc(B, 'trips/t1'), { ownerId: 'bob' })));
await t('cannot store an unknown role', assertFails(updateDoc(doc(B, 'trips/t1'), { 'roles.alice': 'boss' })));
// Followers: see the trip and chat, but add, edit and vote on nothing
await t('a traveller adds carol as a follower', assertSucceeds(updateDoc(doc(A, 'trips/t1'), { memberIds: arrayUnion('carol'), 'roles.carol': 'follower' })));
await t('follower reads trip and events', assertSucceeds(getDocs(collection(C, 'trips/t1/activities'))));
await t('follower comments', assertSucceeds(setDoc(doc(C, 'trips/t1/comments/v1'), { targetId: 'a1', text: 'Looks fun', authorId: 'carol', createdBy: 'carol', createdAt: 1 })));
await t('follower edits own comment', assertSucceeds(updateDoc(doc(C, 'trips/t1/comments/v1'), { text: 'Looks great', editedAt: 2 })));
await t('follower cannot add an event', assertFails(setDoc(doc(C, 'trips/t1/activities/v2'), { title: 'x', createdBy: 'carol' })));
await t('follower cannot edit an event', assertFails(updateDoc(doc(C, 'trips/t1/activities/a1'), { title: 'changed' })));
await t('follower cannot vote', assertFails(updateDoc(doc(C, 'trips/t1/ideas/i1'), { 'votes.carol': true })));
await t('follower cannot add an idea', assertFails(setDoc(doc(C, 'trips/t1/ideas/v3'), { title: 'x', createdBy: 'carol' })));
await t('follower cannot add a photo album', assertFails(setDoc(doc(C, 'trips/t1/albums/v4'), { title: 'x', url: 'https://x', createdBy: 'carol' })));
await t('follower cannot rename trip', assertFails(updateDoc(doc(C, 'trips/t1'), { name: 'x' })));
await t('follower cannot make an invite', assertFails(setDoc(doc(C, 'invites/fbad'), { tripId: 't1', tripName: 'x', createdBy: 'carol', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('follower cannot make themselves a traveller', assertFails(updateDoc(doc(C, 'trips/t1'), { 'roles.carol': 'traveller' })));
await t('follower cannot bin the trip', assertFails(updateDoc(doc(C, 'trips/t1'), { deletedAt: 1, deletedBy: 'carol' })));

// Links carry the role: a Following link makes you a follower, and you can't pick Travelling instead
await t('a traveller makes a Following link', assertSucceeds(setDoc(doc(B, 'invites/follow'), { tripId: 't1', tripName: 'Lisbon', role: 'follower', createdBy: 'bob', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('cannot make a link with an unknown role', assertFails(setDoc(doc(B, 'invites/boss'), { tripId: 't1', tripName: 'Lisbon', role: 'owner', createdBy: 'bob', expiresAt: Timestamp.fromMillis(Date.now() + 1e9) })));
await t('a Following link cannot make you a traveller', assertFails(updateDoc(doc(db('fay'), 'trips/t1'), { memberIds: arrayUnion('fay'), 'roles.fay': 'traveller', joinedVia: 'follow' })));
await t('nor an old member', assertFails(updateDoc(doc(db('fay'), 'trips/t1'), { memberIds: arrayUnion('fay'), 'roles.fay': 'member', joinedVia: 'follow' })));
await t('fay joins with a Following link as a follower', assertSucceeds(updateDoc(doc(db('fay'), 'trips/t1'), { memberIds: arrayUnion('fay'), 'roles.fay': 'follower', joinedVia: 'follow' })));
// Who shared the link is recorded (a follower's Itinerary starts on them): only your own entry, only the link's maker
await t('joining cannot say someone else shared the link', assertFails(updateDoc(doc(db('ivy'), 'trips/t1'), { memberIds: arrayUnion('ivy'), 'roles.ivy': 'follower', joinedVia: 'follow', 'addedBy.ivy': 'alice' })));
await t('joining cannot write someone else\'s entry', assertFails(updateDoc(doc(db('ivy'), 'trips/t1'), { memberIds: arrayUnion('ivy'), 'roles.ivy': 'follower', joinedVia: 'follow', 'addedBy.fay': 'bob' })));
await t('ivy joins, recording that bob shared the link', assertSucceeds(updateDoc(doc(db('ivy'), 'trips/t1'), { memberIds: arrayUnion('ivy'), 'roles.ivy': 'follower', joinedVia: 'follow', 'addedBy.ivy': 'bob' })));
await t('a follower from a link cannot edit the trip', assertFails(updateDoc(doc(db('fay'), 'trips/t1'), { name: 'x' })));
await t('a link with no role still lets an older app join as member', assertSucceeds(updateDoc(doc(db('gus'), 'trips/t1'), { memberIds: arrayUnion('gus'), 'roles.gus': 'member', joinedVia: 'good' })));
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'invites/old'), { tripId: 't1', tripName: 'x', createdBy: 'alice', expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
await t('expired invite rejected', assertFails(updateDoc(doc(db('dan'), 'trips/t1'), { memberIds: arrayUnion('dan'), 'roles.dan': 'traveller', joinedVia: 'old' })));

await t('a traveller makes carol a traveller', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { 'roles.carol': 'traveller' })));
await t('a traveller makes alice a follower', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { 'roles.alice': 'follower' })));
await t('a traveller makes alice a traveller again', assertSucceeds(updateDoc(doc(C, 'trips/t1'), { 'roles.alice': 'traveller' })));
const jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
await t('traveller sets a cover photo', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { coverPhoto: jpeg })));
await t('a full-size (300 KB) cover photo is accepted', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { coverPhoto: 'data:image/jpeg;base64,' + 'A'.repeat(299000) })));
await t('traveller removes the cover photo', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { coverPhoto: null })));
await t('cover photo must be an image', assertFails(updateDoc(doc(B, 'trips/t1'), { coverPhoto: 'https://evil.example/x.js' })));
await t('cover photo cannot be huge', assertFails(updateDoc(doc(B, 'trips/t1'), { coverPhoto: 'data:image/jpeg;base64,' + 'A'.repeat(600000) })));
await t('a traveller removes whoever started the trip', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayRemove('alice'), 'roles.alice': deleteField() })));
await t('bob leaves', assertSucceeds(updateDoc(doc(B, 'trips/t1'), { memberIds: arrayRemove('bob'), 'roles.bob': deleteField() })));
await t('ex-member cannot read', assertFails(getDoc(doc(B, 'trips/t1'))));
// Older trips: owner / member / viewer count as traveller / follower, and any traveller migrates them
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'trips/t9'), { name: 'Rome', ownerId: 'alice', memberIds: ['alice', 'bob', 'carol'], roles: { alice: 'owner', bob: 'member', carol: 'viewer' } }));
await t('an old member edits like a traveller', assertSucceeds(updateDoc(doc(B, 'trips/t9'), { name: 'Roma' })));
await t('an old viewer is a follower', assertFails(updateDoc(doc(C, 'trips/t9'), { name: 'x' })));
await t('migration cannot hand the record to someone else', assertFails(updateDoc(doc(B, 'trips/t9'), { createdBy: 'bob', ownerId: deleteField() })));
await t('any traveller migrates an older trip', assertSucceeds(updateDoc(doc(B, 'trips/t9'), { createdBy: 'alice', ownerId: deleteField(), roles: { alice: 'traveller', bob: 'traveller', carol: 'follower' } })));
await t('the person who started it can leave like anyone', assertSucceeds(updateDoc(doc(A, 'trips/t9'), { memberIds: arrayRemove('alice'), 'roles.alice': deleteField() })));
await t('a follower can leave', assertSucceeds(updateDoc(doc(C, 'trips/t9'), { memberIds: arrayRemove('carol'), 'roles.carol': deleteField() })));
// Event change history: append-only, by travellers, as themselves
const ch = { field: 'time', before: { startTime: '13:00', endTime: '' }, after: { startTime: '14:00', endTime: '' }, at: 1 };
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'trips/t10'), { name: 'Porto', createdBy: 'bob', memberIds: ['bob', 'carol'], roles: { bob: 'traveller', carol: 'follower' } }));
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'trips/t10/activities/e9'), { title: 'Fado', createdBy: 'bob' }));
await t('a traveller records a change', assertSucceeds(setDoc(doc(B, 'trips/t10/activities/e9/history/h1'), { ...ch, by: 'bob' })));
await t('cannot record a change as someone else', assertFails(setDoc(doc(B, 'trips/t10/activities/e9/history/h2'), { ...ch, by: 'alice' })));
await t('cannot record an unknown field', assertFails(setDoc(doc(B, 'trips/t10/activities/e9/history/h3'), { ...ch, field: 'notes', by: 'bob' })));
await t('cannot add extra keys to a change', assertFails(setDoc(doc(B, 'trips/t10/activities/e9/history/h4'), { ...ch, by: 'bob', sneaky: 1 })));
await t('a follower cannot record a change', assertFails(setDoc(doc(C, 'trips/t10/activities/e9/history/h5'), { ...ch, by: 'carol' })));
await t('a follower reads the history', assertSucceeds(getDocs(collection(C, 'trips/t10/activities/e9/history'))));
await t('a stranger cannot read the history', assertFails(getDocs(collection(db('dan'), 'trips/t10/activities/e9/history'))));
await t('nobody edits a change', assertFails(updateDoc(doc(B, 'trips/t10/activities/e9/history/h1'), { by: 'bob', after: 'x' })));
await t('nobody deletes a change while the event is live', assertFails(deleteDoc(doc(B, 'trips/t10/activities/e9/history/h1'))));
await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), 'trips/t10/activities/e9'), { deletedAt: 1 }));
await t('a change goes with its event once it is in Recently deleted', assertSucceeds(deleteDoc(doc(B, 'trips/t10/activities/e9/history/h1'))));
// Who's in (item 3): only the travellers in an event change it; others only put themselves in or out
const H = db('hana');
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), 'trips/t11'), { name: 'Rome', createdBy: 'bob', memberIds: ['bob', 'carol', 'hana', 'dan'], roles: { bob: 'traveller', hana: 'traveller', dan: 'traveller', carol: 'follower' } });
  await setDoc(doc(c.firestore(), 'trips/t11/activities/w1'), { title: 'Colosseum', createdBy: 'bob', people: ['bob', 'dan'], added: { dan: 'bob' } });
  await setDoc(doc(c.firestore(), 'trips/t11/activities/w2'), { title: 'Old event', createdBy: 'bob', attendeeIds: ['bob'] });
});
await t('someone in an event edits it', assertSucceeds(updateDoc(doc(B, 'trips/t11/activities/w1'), { title: 'Colosseum tour' })));
await t('a traveller not in it cannot edit it', assertFails(updateDoc(doc(H, 'trips/t11/activities/w1'), { title: 'x' })));
await t('a traveller not in it cannot bin it', assertFails(updateDoc(doc(H, 'trips/t11/activities/w1'), { deletedAt: 1, deletedBy: 'hana' })));
await t('a traveller says I\'m in', assertSucceeds(updateDoc(doc(H, 'trips/t11/activities/w1'), { people: ['bob', 'dan', 'hana'] })));
await t('I\'m out takes only yourself out', assertSucceeds(updateDoc(doc(H, 'trips/t11/activities/w1'), { people: ['bob', 'dan'] })));
await t('cannot take someone else out without being in', assertFails(updateDoc(doc(H, 'trips/t11/activities/w1'), { people: ['bob'] })));
await t('cannot put someone else in without being in', assertFails(updateDoc(doc(H, 'trips/t11/activities/w1'), { people: ['bob', 'dan', 'hana', 'carol'] })));
await t('cannot clear someone else\'s New mark', assertFails(updateDoc(doc(H, 'trips/t11/activities/w1'), { added: {} })));
await t('opening it clears your own New mark', assertSucceeds(updateDoc(doc(db('dan'), 'trips/t11/activities/w1'), { added: {} })));
await t('who\'s in lists only people on the trip', assertFails(updateDoc(doc(B, 'trips/t11/activities/w1'), { people: ['bob', 'zoe'] })));
await t('a follower cannot say I\'m in', assertFails(updateDoc(doc(C, 'trips/t11/activities/w1'), { people: ['bob', 'dan', 'carol'] })));
await t('a new event must include whoever adds it', assertFails(setDoc(doc(H, 'trips/t11/activities/w3'), { title: 'x', createdBy: 'hana', people: ['bob'] })));
await t('a new event with you in it', assertSucceeds(setDoc(doc(H, 'trips/t11/activities/w3'), { title: 'Gelato', createdBy: 'hana', people: ['hana', 'bob'], added: { bob: 'hana' } })));
await t('any traveller migrates an older event', assertSucceeds(updateDoc(doc(H, 'trips/t11/activities/w2'), { people: ['bob', 'hana', 'dan'], attendeeIds: deleteField() })));
await t('someone in it removes it for everyone', assertSucceeds(updateDoc(doc(B, 'trips/t11/activities/w1'), { deletedAt: 1, deletedBy: 'bob' })));
await t('a traveller not in it brings it back from Recently deleted', assertSucceeds(updateDoc(doc(H, 'trips/t11/activities/w1'), { deletedAt: deleteField(), deletedBy: deleteField() })));
const ch2 = { at: 1, field: 'people', before: ['bob'], after: ['bob', 'hana'] };
await t('history: someone in it records a change', assertSucceeds(setDoc(doc(B, 'trips/t11/activities/w1/history/x1'), { ...ch2, by: 'bob' })));
await t('history: a traveller not in it cannot record a change', assertFails(setDoc(doc(H, 'trips/t11/activities/w1/history/x2'), { ...ch2, by: 'hana' })));

// Notification centre (item 4): only the people an entry is for read it; anyone on the trip writes as themselves
const nt = { kind: 'added', to: ['dan'], at: 1, eventId: 'w1', title: 'Colosseum', date: '2026-11-02', startTime: '10:00' };
await t('notices: a traveller tells someone they were added', assertSucceeds(setDoc(doc(B, 'trips/t11/notices/n1'), { ...nt, by: 'bob' })));
await t('notices: a follower writes one too (joined)', assertSucceeds(setDoc(doc(C, 'trips/t11/notices/n2'), { kind: 'joined', to: ['bob', 'dan'], at: 1, by: 'carol' })));
await t('notices: cannot write as someone else', assertFails(setDoc(doc(B, 'trips/t11/notices/n3'), { ...nt, by: 'hana' })));
await t('notices: cannot write to yourself', assertFails(setDoc(doc(B, 'trips/t11/notices/n4'), { ...nt, to: ['bob'], by: 'bob' })));
await t('notices: only to people on the trip', assertFails(setDoc(doc(B, 'trips/t11/notices/n5'), { ...nt, to: ['zoe'], by: 'bob' })));
await t('notices: needs someone to tell', assertFails(setDoc(doc(B, 'trips/t11/notices/n6'), { ...nt, to: [], by: 'bob' })));
await t('notices: known kinds only', assertFails(setDoc(doc(B, 'trips/t11/notices/n7'), { ...nt, kind: 'spam', by: 'bob' })));
await t('notices: no extra keys', assertFails(setDoc(doc(B, 'trips/t11/notices/n8'), { ...nt, by: 'bob', notes: 'secret' })));
await t('notices: a stranger cannot write one', assertFails(setDoc(doc(db('zoe'), 'trips/t11/notices/n9'), { ...nt, by: 'zoe' })));
await t('notices: the person it is for reads it', assertSucceeds(getDoc(doc(db('dan'), 'trips/t11/notices/n1'))));
await t('notices: its writer cannot read it back', assertFails(getDoc(doc(B, 'trips/t11/notices/n1'))));
await t('notices: someone else on the trip cannot read it', assertFails(getDoc(doc(H, 'trips/t11/notices/n1'))));
await t('notices: you list the ones addressed to you', assertSucceeds(getDocs(query(collection(db('dan'), 'trips/t11/notices'), where('to', 'array-contains', 'dan')))));
await t('notices: someone else cannot delete it', assertFails(deleteDoc(doc(H, 'trips/t11/notices/n1'))));
await t('notices: its writer cannot delete it', assertFails(deleteDoc(doc(B, 'trips/t11/notices/n1'))));
await t('notices: the person it is for deletes it (kept 30 days)', assertSucceeds(deleteDoc(doc(db('dan'), 'trips/t11/notices/n1'))));
await t('notices: you cannot list them all', assertFails(getDocs(collection(db('dan'), 'trips/t11/notices'))));
await t('notices: nobody edits one', assertFails(updateDoc(doc(db('dan'), 'trips/t11/notices/n1'), { title: 'x' })));
await t('notices: nobody deletes one while the trip is live', assertFails(deleteDoc(doc(B, 'trips/t11/notices/n1'))));
await t('notices: an event and its notice in one batch', assertSucceeds((async () => {
  const { writeBatch } = await import('firebase/firestore');
  const b = writeBatch(H);
  b.set(doc(H, 'trips/t11/activities/w4'), { title: 'Pizza', createdBy: 'hana', people: ['hana', 'bob'], added: { bob: 'hana' } });
  b.set(doc(H, 'trips/t11/notices/n10'), { kind: 'added', to: ['bob'], at: 2, by: 'hana', eventId: 'w4', title: 'Pizza' });
  await b.commit();
})()));
await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), 'trips/t11'), { deletedAt: 1 }));
await t('notices: a traveller lists them all once the trip is in Recently deleted', assertSucceeds(getDocs(collection(B, 'trips/t11/notices'))));
await t('notices: a follower cannot', assertFails(getDocs(collection(C, 'trips/t11/notices'))));
await t('notices: a traveller deletes them with the trip', assertSucceeds(deleteDoc(doc(B, 'trips/t11/notices/n1'))));
await env.withSecurityRulesDisabled(async (c) => updateDoc(doc(c.firestore(), 'trips/t11'), { deletedAt: deleteField() }));

// Recently deleted: any traveller bins and restores the trip; deleting for good only from there
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'trips/t8'), { name: 'Oslo', createdBy: 'alice', memberIds: ['alice', 'bob', 'carol'], roles: { alice: 'traveller', bob: 'traveller', carol: 'follower' } }));
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'trips/t8/activities/e1'), { title: 'Fjord', createdBy: 'alice' }));
await t('a traveller cannot delete a trip outright', assertFails(deleteDoc(doc(B, 'trips/t8'))));
await t('any traveller bins the trip', assertSucceeds(updateDoc(doc(B, 'trips/t8'), { deletedAt: 1, deletedBy: 'bob' })));
await t('another traveller restores the trip', assertSucceeds(updateDoc(doc(A, 'trips/t8'), { deletedAt: deleteField(), deletedBy: deleteField() })));
await t('a traveller bins someone else\'s event', assertSucceeds(updateDoc(doc(B, 'trips/t8/activities/e1'), { deletedAt: 1, deletedBy: 'bob' })));
await t('a traveller restores it', assertSucceeds(updateDoc(doc(B, 'trips/t8/activities/e1'), { deletedAt: deleteField(), deletedBy: deleteField() })));

// Saved Places (Collections)
const place = { ownerId: 'alice', name: 'Ichiran', category: 'restaurant', city: 'Tokyo', country: 'Japan', countryCode: 'jp', lat: 35.6, lng: 139.7 };
await t('owner saves a place', assertSucceeds(setDoc(doc(A, 'places/p1'), place)));
await t('cannot save a place as someone else', assertFails(setDoc(doc(B, 'places/p2'), place)));
await t('cannot create a place starred for someone else', assertFails(setDoc(doc(A, 'places/p3'), { ...place, starredBy: ['bob'] })));
await t('owner creates a place starred by themselves', assertSucceeds(setDoc(doc(A, 'places/p4'), { ...place, starredBy: ['alice'] })));
await t('anyone signed in reads a place by id', assertSucceeds(getDoc(doc(B, 'places/p1'))));
await t('anon cannot read a place', assertFails(getDoc(doc(anon, 'places/p1'))));
await t('owner lists own places', assertSucceeds(getDocs(query(collection(A, 'places'), where('ownerId', '==', 'alice')))));
await t('cannot list someone else\'s places', assertFails(getDocs(query(collection(B, 'places'), where('ownerId', '==', 'alice')))));
await t('unfiltered place list denied', assertFails(getDocs(collection(B, 'places'))));
await t('owner edits a place', assertSucceeds(updateDoc(doc(A, 'places/p1'), { category: 'cafe' })));
await t('others cannot edit a place', assertFails(updateDoc(doc(B, 'places/p1'), { name: 'x' })));
await t('others star a place for themselves', assertSucceeds(updateDoc(doc(B, 'places/p1'), { starredBy: arrayUnion('bob') })));
await t('starred places list works', assertSucceeds(getDocs(query(collection(B, 'places'), where('starredBy', 'array-contains', 'bob')))));
await t('cannot star a place for someone else', assertFails(updateDoc(doc(B, 'places/p1'), { starredBy: arrayUnion('carol') })));
await t('cannot remove someone else\'s star', assertFails(updateDoc(doc(C, 'places/p1'), { starredBy: arrayRemove('bob') })));
await t('others unstar a place for themselves', assertSucceeds(updateDoc(doc(B, 'places/p1'), { starredBy: arrayRemove('bob') })));
await t('owner cannot hand a place to someone else', assertFails(updateDoc(doc(A, 'places/p1'), { ownerId: 'bob' })));
await t('others cannot delete a place', assertFails(deleteDoc(doc(B, 'places/p1'))));
await t('owner deletes a place', assertSucceeds(deleteDoc(doc(A, 'places/p1'))));
await t('user writes own profile', assertSucceeds(setDoc(doc(A, 'users/alice'), { name: 'Alice', photo: null })));
await t('user cannot write others profile', assertFails(setDoc(doc(B, 'users/alice'), { name: 'x' })));
await t('signed-in user reads a public profile by id', assertSucceeds(getDoc(doc(B, 'users/alice'))));
await t('anon cannot read profiles', assertFails(getDoc(doc(anon, 'users/alice'))));
await t('nobody can list all users', assertFails(getDocs(collection(B, 'users'))));
await t('home city cannot go in the public profile', assertFails(setDoc(doc(A, 'users/alice'), { home: { name: 'Melbourne', lat: -37.8, lng: 145 } }, { merge: true })));
await t('owner writes private places', assertSucceeds(setDoc(doc(A, 'users/alice/private/places'), { homeCity: 'Melbourne', visited: [] })));
await t('owner reads private places', assertSucceeds(getDoc(doc(A, 'users/alice/private/places'))));
await t('others cannot read private places', assertFails(getDoc(doc(B, 'users/alice/private/places'))));
await t('others cannot write private places', assertFails(setDoc(doc(B, 'users/alice/private/places'), { homeCity: 'x' })));
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'users/dave'), { name: 'Dave', photo: null, homeCity: 'Paris', visited: [] }));
await t('old profile can move its places out (migration)', assertSucceeds(updateDoc(doc(db('dave'), 'users/dave'), { homeCity: deleteField(), visited: deleteField() })));
// Deleting an account: saved places a trip still uses go to someone on it; then you leave
await setDoc(doc(A, 'places/p5'), place);
await t('place cannot go to someone off the trip', assertFails(updateDoc(doc(A, 'places/p5'), { ownerId: 'dan', handedVia: 't8' })));
await t('place cannot be handed via a trip you are not on', assertFails(updateDoc(doc(db('dan'), 'places/p5'), { ownerId: 'dan', handedVia: 't8' })));
await t('owner hands a place to a trip-mate', assertSucceeds(updateDoc(doc(A, 'places/p5'), { ownerId: 'bob', handedVia: 't8' })));
await t('alice leaves the trip', assertSucceeds(updateDoc(doc(A, 'trips/t8'), { memberIds: arrayRemove('alice'), 'roles.alice': deleteField() })));
await t('ex-member can no longer read the trip', assertFails(getDoc(doc(A, 'trips/t8'))));
await t('user deletes own profile', assertSucceeds(deleteDoc(doc(A, 'users/alice'))));
await t('a follower cannot delete a binned trip', assertSucceeds(updateDoc(doc(B, 'trips/t8'), { deletedAt: 1, deletedBy: 'bob' })).then(() => assertFails(deleteDoc(doc(C, 'trips/t8')))));
await t('any traveller deletes a binned trip for good', assertSucceeds(deleteDoc(doc(B, 'trips/t8'))));

// Shared collections: an owner, a Member, a Viewer and a stranger
const D = db('dave'), E = db('erin'), F = db('frank'), G = db('gina');
const soon = () => Timestamp.fromMillis(Date.now() + 1e9);
await t('owner shares a collection', assertSucceeds(setDoc(doc(D, 'collectionShares/dave_jp'), { ownerId: 'dave', countryCode: 'jp', memberIds: [], roles: {}, createdAt: 1 })));
await t('cannot share as someone else', assertFails(setDoc(doc(E, 'collectionShares/dave_kr'), { ownerId: 'dave', countryCode: 'kr', memberIds: [], roles: {}, createdAt: 1 })));
await t('owner saves into the shared collection', assertSucceeds(setDoc(doc(D, 'places/dp1'), { ownerId: 'dave', name: 'Ichiran', category: 'restaurant', city: 'Tokyo', countryCode: 'jp', sharedIn: 'dave_jp', createdAt: 1 })));
await t('stranger cannot list a shared collection', assertFails(getDocs(query(collection(G, 'places'), where('sharedIn', '==', 'dave_jp')))));
await t('non-owner cannot make a collection invite', assertFails(setDoc(doc(E, 'invites/cbad'), { kind: 'collection', shareId: 'dave_jp', role: 'member', createdBy: 'erin', expiresAt: soon() })));
await t('owner makes a Member invite', assertSucceeds(setDoc(doc(D, 'invites/cmem'), { kind: 'collection', shareId: 'dave_jp', countryCode: 'jp', role: 'member', tripName: 'Dave\'s Japan', createdBy: 'dave', expiresAt: soon() })));
await t('owner makes a Viewer invite', assertSucceeds(setDoc(doc(D, 'invites/cview'), { kind: 'collection', shareId: 'dave_jp', countryCode: 'jp', role: 'viewer', tripName: 'Dave\'s Japan', createdBy: 'dave', expiresAt: soon() })));
await t('cannot join as Member with a Viewer invite', assertFails(updateDoc(doc(F, 'collectionShares/dave_jp'), { memberIds: arrayUnion('frank'), 'roles.frank': 'member', joinedVia: 'cview' })));
await t('erin joins as a Member', assertSucceeds(updateDoc(doc(E, 'collectionShares/dave_jp'), { memberIds: arrayUnion('erin'), 'roles.erin': 'member', joinedVia: 'cmem' })));
await t('frank joins as a Viewer', assertSucceeds(updateDoc(doc(F, 'collectionShares/dave_jp'), { memberIds: arrayUnion('frank'), 'roles.frank': 'viewer', joinedVia: 'cview' })));
await t('Member lists the shared collection', assertSucceeds(getDocs(query(collection(E, 'places'), where('sharedIn', '==', 'dave_jp')))));
await t('Viewer lists the shared collection', assertSucceeds(getDocs(query(collection(F, 'places'), where('sharedIn', '==', 'dave_jp')))));
await t('Member adds a place to it', assertSucceeds(setDoc(doc(E, 'places/ep1'), { ownerId: 'erin', name: 'Golden Gai', category: 'bar', city: 'Tokyo', countryCode: 'jp', sharedIn: 'dave_jp', createdAt: 2 })));
await t('Member moves the owner\'s place', assertSucceeds(updateDoc(doc(E, 'places/dp1'), { city: 'Kyoto', category: 'cafe' })));
await t('Member cannot rename the owner\'s place', assertFails(updateDoc(doc(E, 'places/dp1'), { name: 'x' })));
await t('Member cannot delete the owner\'s place', assertFails(deleteDoc(doc(E, 'places/dp1'))));
await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'places/dp2'), { ownerId: 'dave', name: 'Senso-ji', category: 'sight', city: 'Tokyo', countryCode: 'jp', createdAt: 1 }));
await t("Member lists the owner's own places in that country", assertSucceeds(getDocs(query(collection(E, 'places'), where('ownerId', '==', 'dave'), where('countryCode', '==', 'jp')))));
await t("stranger cannot list the owner's places there", assertFails(getDocs(query(collection(G, 'places'), where('ownerId', '==', 'dave'), where('countryCode', '==', 'jp')))));
await t("Member moves the owner's own place", assertSucceeds(updateDoc(doc(E, 'places/dp2'), { city: 'Asakusa' })));
await t("owner recategorises a Member's place", assertSucceeds(updateDoc(doc(D, 'places/ep1'), { category: 'cocktail-bar' })));
await t("owner cannot delete a Member's place", assertFails(deleteDoc(doc(D, 'places/ep1'))));
await t('Viewer cannot add a place to it', assertFails(setDoc(doc(F, 'places/fp1'), { ownerId: 'frank', name: 'x', category: 'bar', city: 'Tokyo', countryCode: 'jp', sharedIn: 'dave_jp', createdAt: 3 })));
await t('Viewer cannot move a place', assertFails(updateDoc(doc(F, 'places/dp1'), { city: 'Osaka' })));
await t('Viewer stars a place', assertSucceeds(updateDoc(doc(F, 'places/dp1'), { starredBy: arrayUnion('frank') })));
await t('stranger cannot slip a place into it', assertFails(setDoc(doc(G, 'places/gp1'), { ownerId: 'gina', name: 'x', category: 'bar', city: 'Tokyo', countryCode: 'jp', sharedIn: 'dave_jp', createdAt: 4 })));
await t('Member cannot change roles', assertFails(updateDoc(doc(E, 'collectionShares/dave_jp'), { 'roles.frank': 'member' })));
await t('owner makes the Viewer a Member', assertSucceeds(updateDoc(doc(D, 'collectionShares/dave_jp'), { 'roles.frank': 'member' })));
await t('Viewer-turned-Member leaves', assertSucceeds(updateDoc(doc(F, 'collectionShares/dave_jp'), { memberIds: arrayRemove('frank'), 'roles.frank': deleteField() })));
await t('after leaving, cannot list it', assertFails(getDocs(query(collection(F, 'places'), where('sharedIn', '==', 'dave_jp')))));

// Suggested ideas (item 6): the first I'm in makes the event (suggester + you) and takes the idea off the board; Pass only
// adds yourself to `passed`; "going" entries name who's going
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), 'trips/t11/ideas/s1'), { title: 'Fado', createdBy: 'bob', status: 'open', date: '2026-11-03', startTime: '20:00', votes: {} });
});
{
  const b = writeBatch(H);
  b.set(doc(H, 'trips/t11/activities/s1e'), { title: 'Fado', createdBy: 'hana', people: ['bob', 'hana'], fromIdea: 'bob', passed: [], added: {} });
  b.update(doc(H, 'trips/t11/ideas/s1'), { status: 'approved', activityId: 's1e' });
  b.set(doc(H, 'trips/t11/notices/g1'), { kind: 'going', to: ['dan'], people: ['bob', 'hana'], at: 1, by: 'hana', eventId: 's1e', title: 'Fado' });
  await t('the first I\'m in makes the event, takes the idea off the board and tells the others', assertSucceeds(b.commit()));
}
const D2 = db('dan');
await t('Pass adds only yourself to passed', assertSucceeds(updateDoc(doc(D2, 'trips/t11/activities/s1e'), { passed: ['dan'] })));
await t('Pass cannot add someone else', assertFails(updateDoc(doc(D2, 'trips/t11/activities/s1e'), { passed: ['dan', 'carol'] })));
await t('a traveller not in it says I\'m in after passing', assertSucceeds(updateDoc(doc(D2, 'trips/t11/activities/s1e'), { people: ['bob', 'hana', 'dan'] })));
await t('a follower cannot pass on an event', assertFails(updateDoc(doc(C, 'trips/t11/activities/s1e'), { passed: ['dan', 'carol'] })));
await t('"going" entries name only people on the trip', assertFails(setDoc(doc(B, 'trips/t11/notices/g2'), { kind: 'going', to: ['dan'], people: ['zoe'], at: 1, by: 'bob' })));
await t('a traveller passes on an idea', assertSucceeds(updateDoc(doc(B, 'trips/t11/ideas/s1'), { 'passed.bob': true })));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
