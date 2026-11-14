import { useEffect, useState } from 'react';
import { Accordion, Button, ListGroup, ListItem, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Activity, EventChange, Profile, TrackedField } from '../../data/types';
import type { IconName } from '../../design/components/Icon';
import { describe, patchFor } from '../../lib/eventHistory';
import { timeAgo } from '../../lib/dates';
import { haptic } from '../../lib/native';

const ICON: Record<TrackedField, IconName> = { title: 'pencil', date: 'calendar', time: 'clock', place: 'pin', price: 'wallet', people: 'people' };
const LIMIT = 20;

/**
 * Event detail → **Changes** (people and sharing, item 2): the event's last 20 changes, newest first, in a collapsed
 * Accordion at the bottom of the page (before the chat). Each row says who changed what and what it was, and travellers
 * get **Restore**, which puts that part back as it was; the restore is recorded as a change too. Hidden until there's one.
 */
export function EventChanges({ tripId, event, profiles, canRestore }: { tripId: string; event: Activity; profiles: Record<string, Profile>; canRestore: boolean }) {
  const me = useMe();
  const toast = useToast();
  const [changes, setChanges] = useState<EventChange[]>([]);
  useEffect(() => store.watchHistory(tripId, event.id, LIMIT, setChanges), [tripId, event.id]);
  if (changes.length === 0) return null;

  const first = (id: string) => (id === me.uid ? 'You' : personName(profiles, id).split(' ')[0]);
  const names = (id: string) => (id === me.uid ? 'you' : personName(profiles, id).split(' ')[0]);
  const restore = async (c: EventChange) => {
    try {
      await store.updateEvent(tripId, event, patchFor(c.field, c.before), c.id);
      haptic('success');
      toast({ icon: 'check', label: 'Restored' });
    } catch { toast({ tone: 'danger', label: "Couldn't restore. Check your connection" }); }
  };
  const last = changes[0];
  const meta = `${changes.length}${changes.length === LIMIT ? '+' : ''} change${changes.length === 1 ? '' : 's'} · last by ${names(last.by)}, ${timeAgo(last.at)}`;

  return (
    <Accordion title="Changes" meta={meta}>
      <ListGroup label="Changes">
        {changes.map((c) => {
          const { title, was } = describe(c, first(c.by), names);
          return (
            <ListItem key={c.id} icon={ICON[c.field]} title={title} meta={`${was} · ${timeAgo(c.at)}`}
              action={canRestore ? <Button tone="ghost" size="small" onClick={() => restore(c)} aria-label={`Restore: ${was}`}>Restore</Button> : undefined} />
          );
        })}
      </ListGroup>
    </Accordion>
  );
}
