import type { Activity, NewNotice, Notice, Profile } from '../data/types';
import { formatDay, formatRange, formatTime } from './dates';

/**
 * The Notification centre's entries (people and sharing, item 4). There's no server, so whoever makes a change writes the
 * entries for the people it concerns, in the same save as the change where it can (src/data/*Store.ts). These pure
 * functions decide who hears about what, and how each entry reads.
 */

/** At most this many people per entry (the rules allow 50; a trip never gets near it). */
const MAX_TO = 50;
const only = (ids: string[], not: string) => [...new Set(ids)].filter((id) => id && id !== not).slice(0, MAX_TO);

/**
 * What an event change tells people, worked out from the event before and after (before is null for a new event):
 * - people put in it by someone else hear "Sam added you to Dinner";
 * - people someone else took out of it hear "Sam took you out of Dinner";
 * - when you take yourself out, the people still in it hear "Jo is out of Dinner";
 * - when its day or time changes, the people in it hear "Priya moved Tram 28 to 14:00".
 * Older events without `people` tell nobody (their people aren't known until the migration writes them).
 */
export function eventNotices(before: Activity | null, after: Activity, by: string): NewNotice[] {
  if (!after.people) return [];
  const was = before ? before.people ?? null : [];
  if (was === null) return [];
  const now = after.people;
  const about = { eventId: after.id, title: after.title, date: after.date, startTime: after.startTime ?? '' };
  const out: NewNotice[] = [];
  const added = only(now.filter((id) => !was.includes(id)), by);
  if (added.length) out.push({ kind: 'added', to: added, ...about });
  const removed = only(was.filter((id) => !now.includes(id)), by);
  if (removed.length) out.push({ kind: 'removed', to: removed, ...about });
  if (was.includes(by) && !now.includes(by)) {
    const still = only(now, by);
    if (still.length) out.push({ kind: 'out', to: still, ...about });
  }
  if (before && (before.date !== after.date || (before.startTime ?? '') !== (after.startTime ?? ''))) {
    const stay = only(now.filter((id) => was.includes(id)), by);
    if (stay.length) out.push({ kind: 'moved', to: stay, ...about, prevDate: before.date });
  }
  return out;
}

const first = (profiles: Record<string, Profile>, id: string) => (profiles[id]?.name ?? 'Someone').split(' ')[0];
const day = (d: string) => formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' });

/** How an entry reads: "Sam added you to Dinner at Ramiro · Thu 12 Dec". */
export function noticeText(n: Notice, profiles: Record<string, Profile>, tripName: string) {
  const who = first(profiles, n.by);
  const title = n.title ?? 'an event';
  switch (n.kind) {
    case 'added': return `${who} added you to ${title}${n.date ? ` · ${day(n.date)}` : ''}`;
    case 'removed': return `${who} took you out of ${title}`;
    case 'out': return `${who} is out of ${title}`;
    case 'deleted': return `${who} removed ${title} for everyone`;
    case 'moved': {
      const when = [n.date && n.date !== n.prevDate ? day(n.date) : '', formatTime(n.startTime ?? '')].filter(Boolean).join(', ');
      return `${who} moved ${title}${when ? ` to ${when}` : ''}`;
    }
    case 'joined': return `${who} joined ${tripName}`;
    case 'role': return `${who} made you ${n.role === 'follower' ? 'Following' : 'Travelling'}`;
    case 'dates': return n.startDate && n.endDate ? `${who} changed the dates to ${formatRange(n.startDate, n.endDate)}` : `${who} changed the dates`;
  }
}
