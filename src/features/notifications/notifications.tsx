import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, useRef } from 'react';
import { store } from '../../data';
import { useMe, useMyTrips, useProfiles, useSubFor } from '../../data/hooks';
import { peopleOf } from '../../data/eventPeople';
import type { Activity, Notice, Profile, Trip } from '../../data/types';
import { markRead, readsReady, unreadCount, useReads } from '../../lib/reads';
import { noticeText } from '../../lib/notices';

/**
 * The Notification centre's data (people and sharing, item 4), worked out once in the app shell and shared by the Bell
 * on Home, the Home tab's badge and the Notification centre itself.
 *
 * Two kinds of entry: notices other people's devices wrote for you (src/lib/notices.ts), and one row per event you're in
 * with chat messages you haven't read ("3 new messages on Fado night", gone once you open the event).
 * Read state: opening the Notification centre clears the count (owner, 14 Nov 2026), like the iOS badge. It's kept with
 * your chat read state (users/{uid}/private/reads, key "notices"), so it syncs across your devices.
 */
export type Entry = {
  id: string;
  trip: Trip;
  at: number;
  text: string;
  /** Whose change it was (their avatar); none for a chat row */
  by?: string;
  notice?: Notice;
  /** A chat row: the event and how many unread messages */
  chat?: { event: Activity; count: number };
  /** The event it's about, when it still exists */
  event?: Activity;
};

export const NOTICES_KEY = 'notices';
/** Entries older than this aren't shown (the trip's own history keeps the rest). */
/** Entries are kept 30 days (R2); older ones are deleted by whoever they're addressed to. */
const KEEP_DAYS = 30;

type State = {
  entries: Entry[]; unread: number; seen: number; profiles: Record<string, Profile>;
  /** Your read state has arrived from your account: `seen` is real, and marking it seen won't lose what was new */
  ready: boolean; markSeen: () => void;
};
const Ctx = createContext<State>({ entries: [], unread: 0, seen: 0, profiles: {}, ready: false, markSeen: () => {} });
export const useNotifications = () => useContext(Ctx);

function useNoticesFor(tripIds: string[], uid: string) {
  const key = tripIds.join(',');
  const [byTrip, setByTrip] = useState<Record<string, Notice[]>>({});
  useEffect(() => {
    const offs = tripIds.map((id) => store.watchNotices(id, uid, (list) => setByTrip((m) => ({ ...m, [id]: list }))));
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, uid]);
  return byTrip;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const all = useMyTrips();
  const trips = useMemo(() => (all ?? []).filter((t) => !t.deletedAt), [all]);
  const ids = trips.map((t) => t.id);
  const notices = useNoticesFor(ids, me.uid);
  const comments = useSubFor(ids, 'comments');
  const activities = useSubFor(ids, 'activities');
  const reads = useReads(me.uid);
  const people = [...new Set([...trips.flatMap((t) => t.memberIds), ...Object.values(notices).flat().map((n) => n.by)])];
  const profiles = useProfiles(people);
  const seen = reads.at[NOTICES_KEY] ?? reads.since;
  // Delete your entries older than 30 days, once per trip per session (best effort: offline it waits for next time)
  const cleaned = useRef(new Set<string>());
  useEffect(() => {
    const cutoff = Date.now() - KEEP_DAYS * 86400_000;
    for (const [tripId, list] of Object.entries(notices)) {
      if (cleaned.current.has(tripId)) continue;
      const old = list.filter((n) => n.at < cutoff).map((n) => n.id);
      cleaned.current.add(tripId);
      if (old.length) store.deleteNotices(tripId, old).catch(() => { cleaned.current.delete(tripId); });
    }
  }, [notices]);

  const entries = useMemo(() => {
    const since = Date.now() - KEEP_DAYS * 86400_000;
    const out: Entry[] = [];
    for (const trip of trips) {
      const events = activities[trip.id] ?? [];
      for (const n of notices[trip.id] ?? []) {
        if (n.by === me.uid || n.at < since) continue;
        const event = n.eventId ? events.find((a) => a.id === n.eventId) : undefined;
        out.push({ id: n.id, trip, at: n.at, by: n.by, notice: n, event, text: noticeText(n, profiles, trip.name) });
      }
      // Unread chat, on events you're in
      for (const event of events) {
        if (!peopleOf(event, trip).includes(me.uid)) continue;
        const count = unreadCount(reads, me.uid, event.id, comments[trip.id] ?? []);
        if (!count) continue;
        const after = reads.at[event.id] ?? reads.since;
        const at = Math.max(...(comments[trip.id] ?? []).filter((c) => c.targetId === event.id && c.authorId !== me.uid && c.createdAt > after).map((c) => c.createdAt));
        out.push({ id: `chat:${event.id}`, trip, at, event, chat: { event, count }, text: `${count === 1 ? '1 new message' : `${count} new messages`} on ${event.title}` });
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }, [trips, notices, activities, comments, reads, profiles, me.uid]);

  const unread = entries.filter((e) => e.at > seen).length;
  const ready = readsReady(me.uid);
  const value = useMemo<State>(() => ({ entries, unread, seen, profiles, ready, markSeen: () => { markRead(me.uid, NOTICES_KEY); } }), [entries, unread, seen, profiles, ready, me.uid]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
