import { useEffect, useState } from 'react';
import { store } from '../data';
import type { ChatReads, Comment } from '../data/types';

/**
 * Which event chats you've read, synced across your devices: the store keeps it in your private profile
 * (users/{uid}/private/reads; demo mode: this browser). New messages are other people's comments posted after you
 * last opened the event. "since" is when this started, so older messages don't all count as new.
 *
 * Earlier versions kept it on the device only (localStorage "rove-reads:<uid>"); the first time this runs, what this
 * device had is moved into your account.
 */
const legacyKey = (uid: string) => `rove-reads:${uid}`;
const latest = new Map<string, ChatReads>(); // the last value seen per person, so screens open with it at once

function legacy(uid: string): ChatReads | null {
  try { const raw = localStorage.getItem(legacyKey(uid)); return raw ? (JSON.parse(raw) as ChatReads) : null; } catch { return null; }
}

/** Until anything is saved: this device's old read state, or "from now on". */
function starting(uid: string): ChatReads {
  return latest.get(uid) ?? legacy(uid) ?? { since: Date.now(), at: {} };
}

/** You've seen everything on this event's chat up to now. */
export function markRead(uid: string, targetId: string) {
  const r = starting(uid);
  const next = { ...r, at: { ...r.at, [targetId]: Date.now() } };
  latest.set(uid, next);
  listeners.forEach((f) => f());
  return store.markRead(uid, targetId, next.at[targetId], r.since).catch(() => { /* offline: Firestore queues it */ });
}
const listeners = new Set<() => void>();

/** How many of other people's messages on `targetId` arrived since you last opened it. */
export function unreadCount(r: ChatReads, uid: string, targetId: string, comments: Comment[]) {
  const after = r.at[targetId] ?? r.since;
  return comments.filter((c) => c.targetId === targetId && c.authorId !== uid && c.createdAt > after).length;
}

/** The read state, live from your account (and updated at once when you open an event here). */
export function useReads(uid: string) {
  const [r, setR] = useState<ChatReads>(() => starting(uid));
  useEffect(() => {
    const local = () => setR(starting(uid));
    listeners.add(local);
    let moved = false;
    const off = store.watchReads(uid, (remote) => {
      if (remote) {
        // Keep the newest time per event from here and from the account (a write from this device may still be on its way)
        const mine = latest.get(uid);
        const at = { ...remote.at };
        if (mine) for (const [k, t] of Object.entries(mine.at)) if (!at[k] || at[k] < t) at[k] = t;
        const merged = { since: remote.since ?? mine?.since ?? Date.now(), at };
        latest.set(uid, merged); setR(merged);
        return;
      }
      // Nothing in the account yet: move this device's old read state there once (or start from now)
      if (moved) return;
      moved = true;
      const first = starting(uid);
      latest.set(uid, first); setR(first);
      const ids = Object.entries(first.at);
      (ids.length ? Promise.all(ids.map(([k, t]) => store.markRead(uid, k, t, first.since))) : store.markRead(uid, '_started', first.since, first.since))
        .then(() => { try { localStorage.removeItem(legacyKey(uid)); } catch { /* fine */ } })
        .catch(() => { /* offline or rules not published: try again next time */ moved = false; });
    });
    return () => { listeners.delete(local); off(); };
  }, [uid]);
  return r;
}

/** The Event card tag for unread messages, e.g. "1 new message". */
export const unreadTag = (n: number) => (n > 0 ? [{ icon: 'chat' as const, label: n === 1 ? '1 new message' : `${n} new messages` }] : []);
