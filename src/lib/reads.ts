import { useEffect, useState } from 'react';
import type { Comment } from '../data/types';

/**
 * Which event chats you've read, on this device: when you last opened each event (its comments), by event id.
 * New messages are other people's comments posted after that. The first time this runs, "since" is set to now,
 * so older messages don't all show as new.
 */
type Reads = { since: number; at: Record<string, number> };
const key = (uid: string) => `rove-reads:${uid}`;
const listeners = new Set<() => void>();

function load(uid: string): Reads {
  try {
    const raw = localStorage.getItem(key(uid));
    if (raw) return JSON.parse(raw) as Reads;
  } catch { /* private mode: start fresh */ }
  const fresh = { since: Date.now(), at: {} };
  save(uid, fresh);
  return fresh;
}
function save(uid: string, r: Reads) {
  try { localStorage.setItem(key(uid), JSON.stringify(r)); } catch { /* not kept; still works this session */ }
}

/** You've seen everything on this event's chat up to now. */
export function markRead(uid: string, targetId: string) {
  const r = load(uid);
  r.at[targetId] = Date.now();
  save(uid, r);
  listeners.forEach((f) => f());
}

/** How many of other people's messages on `targetId` arrived since you last opened it. */
export function unreadCount(r: Reads, uid: string, targetId: string, comments: Comment[]) {
  const after = r.at[targetId] ?? r.since;
  return comments.filter((c) => c.targetId === targetId && c.authorId !== uid && c.createdAt > after).length;
}

/** The read state, kept current as events are opened. */
export function useReads(uid: string) {
  const [r, setR] = useState(() => load(uid));
  useEffect(() => {
    const f = () => setR(load(uid));
    listeners.add(f); f();
    return () => { listeners.delete(f); };
  }, [uid]);
  return r;
}

/** The Event card tag for unread messages, e.g. "1 new message". */
export const unreadTag = (n: number) => (n > 0 ? [{ icon: 'chat' as const, label: n === 1 ? '1 new message' : `${n} new messages` }] : []);
