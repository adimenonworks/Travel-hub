import type { Activity, EventChange, Place, Price, TrackedField, TrackedValue } from '../data/types';
import { formatDay, formatTime } from './dates';
import { priceText } from './currency';

/**
 * Per-event change history (people and sharing, item 2): which parts of an event are tracked, how a change is worked
 * out from an edit, how it's put back (Restore and Undo) and how it reads ("Priya moved it to 14:00").
 */
export const TRACKED: TrackedField[] = ['title', 'date', 'time', 'place', 'price', 'people'];

const place = (p: Place | null | undefined): Place | null => (p ? { ...p } : null);
const price = (p: Price | null | undefined): Price | null => (p ? { amount: p.amount, currency: p.currency } : null);

/** An event's value for one tracked part, in the shape history stores (never undefined: Firestore refuses it). */
export function valueOf(a: Partial<Activity>, field: TrackedField): TrackedValue {
  switch (field) {
    case 'title': return a.title ?? '';
    case 'date': return a.date ?? '';
    case 'time': return { startTime: a.startTime ?? '', endTime: a.endTime ?? '' };
    case 'place': return { location: place(a.location), locationText: a.locationText ?? '' };
    case 'price': return price(a.price);
    case 'people': return [...(a.attendeeIds ?? [])].sort();
  }
}

/** The event fields that hold one tracked part. */
const KEYS: Record<TrackedField, (keyof Activity)[]> = {
  title: ['title'], date: ['date'], time: ['startTime', 'endTime'], place: ['location', 'locationText'], price: ['price'], people: ['attendeeIds'],
};

/** The patch that sets one tracked part back to a stored value. */
export function patchFor(field: TrackedField, value: TrackedValue): Partial<Activity> {
  switch (field) {
    case 'title': return { title: value as string };
    case 'date': return { date: value as string };
    case 'time': { const v = value as { startTime: string; endTime: string }; return { startTime: v.startTime, endTime: v.endTime }; }
    case 'place': { const v = value as { location: Place | null; locationText: string }; return { location: v.location, locationText: v.locationText }; }
    case 'price': return { price: value as Price | null };
    case 'people': return { attendeeIds: value as string[] };
  }
}

function placeText(v: { location: Place | null; locationText: string }) { return v.locationText || v.location?.name || 'no place'; }

const same = (x: TrackedValue, y: TrackedValue) => JSON.stringify(x) === JSON.stringify(y);
/** A place counts as changed only when the name people see changes (finding the map position for the same typed
 *  place isn't a change anyone made). */
const samePart = (field: TrackedField, x: TrackedValue, y: TrackedValue) =>
  field === 'place' ? placeText(x as never) === placeText(y as never) : same(x, y);

/** The tracked parts an edit changes, each with its before and after (parts the patch doesn't touch are left out). */
export function changesOf(before: Activity, patch: Partial<Activity>): Omit<EventChange, 'id' | 'by' | 'at'>[] {
  const after = { ...before, ...patch };
  return TRACKED
    .filter((f) => KEYS[f].some((k) => k in patch))
    .map((field) => ({ field, before: valueOf(before, field), after: valueOf(after, field) }))
    .filter((c) => !samePart(c.field, c.before, c.after));
}

/** The patch that undoes a whole edit: every field it set goes back to what the event had before. */
export function undoPatch(before: Activity, patch: Partial<Activity>): Partial<Activity> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(patch) as (keyof Activity)[]) {
    const was = before[k];
    out[k] = was !== undefined ? was : typeof patch[k] === 'string' ? '' : null;
  }
  return out as Partial<Activity>;
}

const timeText = (v: { startTime: string; endTime: string }) =>
  !v.startTime ? 'no time' : v.endTime ? `${formatTime(v.startTime)} – ${formatTime(v.endTime)}` : formatTime(v.startTime);

/** How one change reads: "Priya moved it to 14:00", "Was 13:00". `name` is the first name (or "You"). */
export function describe(c: EventChange, name: string, names: (id: string) => string): { title: string; was: string } {
  const people = (ids: string[]) => ids.length ? ids.map(names).join(', ') : 'nobody';
  const restored = c.restoredFrom ? ' (restored)' : '';
  switch (c.field) {
    case 'title': return { title: `${name} renamed it ${c.after as string}${restored}`, was: `Was ${c.before as string}` };
    case 'date': return { title: `${name} moved it to ${formatDay(c.after as string)}${restored}`, was: `Was ${formatDay(c.before as string)}` };
    case 'time': return { title: `${name} moved it to ${timeText(c.after as never)}${restored}`, was: `Was ${timeText(c.before as never)}` };
    case 'place': return { title: `${name} changed the place to ${placeText(c.after as never)}${restored}`, was: `Was ${placeText(c.before as never)}` };
    case 'price': return { title: c.after ? `${name} set the price to ${priceText(c.after as Price)}${restored}` : `${name} removed the price${restored}`, was: c.before ? `Was ${priceText(c.before as Price)}` : 'Had no price' };
    case 'people': return { title: `${name} changed who's in: ${people(c.after as string[])}${restored}`, was: `Was ${people(c.before as string[])}` };
  }
}
