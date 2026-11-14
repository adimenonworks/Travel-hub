import { useState } from 'react';
import { OptionCard, Sheet, useToast } from '../../design/components';
import { store } from '../../data';
import { addedAfter, peopleOf } from '../../data/eventPeople';
import { personName, useMe } from '../../data/hooks';
import type { Activity, Profile, Trip } from '../../data/types';
import { confirmAction, haptic } from '../../lib/native';

/** "Priya", "Priya and Sam", "Priya, Sam and Leo" (first names). */
export function namesOf(ids: string[], profiles: Record<string, Profile>, me: string) {
  const names = ids.map((id) => (id === me ? 'you' : personName(profiles, id).split(' ')[0]));
  return new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(names);
}

/** "2 of 4 going", or "Just you" when you're the only one. */
export function goingText(ids: string[], travellers: number, me: string) {
  return ids.length === 1 && ids[0] === me ? 'Just you' : `${ids.length} of ${travellers} going`;
}

/**
 * I'm in, I'm out and Delete for one event (people and sharing, item 3), each with an Undo toast. They change only your
 * own place in it, and are recorded in its Changes like any other edit. Delete on an event others are in asks first:
 * Just me (I'm out, the default) or Remove for everyone (Recently deleted). Render `sheet` once wherever this is used.
 */
export function useWhosIn(trip: Trip, profiles: Record<string, Profile>) {
  const me = useMe();
  const toast = useToast();
  const [deleting, setDeleting] = useState<{ a: Activity; onDeleted?: (a: Activity) => void } | null>(null);
  const [everyone, setEveryone] = useState(false);
  const failed = () => toast({ tone: 'danger', label: "Couldn't save. Check your connection" });

  const setPeople = async (a: Activity, people: string[]) => {
    const before = peopleOf(a, trip);
    const patch = { people, added: addedAfter(a, before, people, me.uid) };
    await store.updateEvent(trip.id, { ...a, people: before }, patch);
    return { ...a, ...patch } as Activity;
  };
  const undo = (now: Activity, was: Activity) => () => {
    store.updateEvent(trip.id, now, { people: peopleOf(was, trip), added: was.added ?? {} }).catch(() => {});
  };

  const imIn = async (a: Activity) => {
    haptic('light');
    try {
      const now = await setPeople(a, [...peopleOf(a, trip), me.uid]);
      toast({ icon: 'check', label: `You’re in: ${a.title}`, action: { label: 'Undo', onClick: undo(now, a) } });
    } catch { failed(); }
  };

  const imOut = async (a: Activity) => {
    haptic('light');
    const others = peopleOf(a, trip).filter((id) => id !== me.uid);
    try {
      const now = await setPeople(a, others);
      toast({ label: others.length ? `You’re out. It stays for ${namesOf(others, profiles, me.uid)}` : 'You’re out', action: { label: 'Undo', onClick: undo(now, a) } });
    } catch { failed(); }
  };

  const binIt = async (a: Activity, onDeleted?: (a: Activity) => void) => {
    const item = { kind: 'event' as const, tripId: trip.id, id: a.id };
    try {
      await store.setDeleted(item, true);
      // The others in it hear "Sam removed Fado night for everyone"
      const others = peopleOf(a, trip).filter((id) => id !== me.uid);
      if (others.length) store.addNotices(trip.id, [{ kind: 'deleted', to: others, eventId: a.id, title: a.title, date: a.date, startTime: a.startTime ?? '' }]).catch(() => {});
      toast({ icon: 'trash', label: 'Event deleted', action: { label: 'Undo', onClick: () => { store.setDeleted(item, false).catch(() => {}); } } });
      onDeleted?.(a);
    } catch { toast({ tone: 'danger', label: "Couldn't delete. Check your connection" }); }
  };

  /** Delete: straight to Recently deleted when only you are in it, else Just me or Remove for everyone. */
  const remove = (a: Activity, onDeleted?: (a: Activity) => void) => {
    const others = peopleOf(a, trip).filter((id) => id !== me.uid);
    if (!others.length) {
      if (confirmAction(`Delete "${a.title}"? It stays in Recently deleted for 30 days.`)) binIt(a, onDeleted);
      return;
    }
    setEveryone(false);
    setDeleting({ a, onDeleted });
  };

  const others = deleting ? peopleOf(deleting.a, trip).filter((id) => id !== me.uid) : [];
  const theirs = namesOf(others, profiles, me.uid);
  const sheet = (
    <Sheet open={!!deleting} title={deleting ? `Delete ${deleting.a.title}?` : 'Delete'} subtitle={`${theirs} ${others.length === 1 ? 'is' : 'are'} in it too.`}
      onClose={() => setDeleting(null)} submitLabel={everyone ? 'Remove for everyone' : 'Remove me'}
      onSubmit={async () => {
        const d = deleting;
        setDeleting(null);
        if (!d) return;
        if (everyone) await binIt(d.a, d.onDeleted); else await imOut(d.a);
      }}>
      <OptionCard icon="sign-out" label="Just me" description={`You’re out. It stays on ${theirs}’s itinerary.`}
        selected={!everyone} onClick={() => { haptic('light'); setEveryone(false); }} />
      <OptionCard icon="trash" label="Remove for everyone" description="It goes to Recently deleted for 30 days, where anyone can bring it back."
        selected={everyone} onClick={() => { haptic('light'); setEveryone(true); }} />
    </Sheet>
  );

  return { imIn, imOut, remove, sheet };
}
