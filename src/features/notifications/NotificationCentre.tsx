import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Illustration, LinkButton, ListGroup, ListItem, PageHeader, PageSection } from '../../design/components';
import { useMe } from '../../data/hooks';
import { peopleOf } from '../../data/eventPeople';
import type { Profile, Trip } from '../../data/types';
import { timeAgo } from '../../lib/dates';
import { Content } from '../../app/Shell';
import { useWhosIn } from '../trip/whosIn';
import { useNotifications, type Entry } from './notifications';
import s from './NotificationCentre.module.css';

/**
 * Notification centre (people and sharing, item 4): opened from the Bell on Home. Newest first, grouped by trip (the trip
 * with the newest entry first). Opening it clears the Bell's count; the entries that were new stay marked "New" until
 * you leave. Tapping an entry opens what it's about. "Sam added you to Dinner" also offers I'm out and View.
 * Only in-app for now: a lock-screen push needs the Apple Developer Program (ROADMAP, Later).
 */
export function NotificationCentre() {
  const { entries, seen, profiles, ready, markSeen } = useNotifications();
  // What counted as new when you opened it, kept while you're here. Opening it marks everything seen, but only once
  // your read state has arrived from your account (straight after launch it may not have), so nothing new is lost.
  const [before, setBefore] = useState<number | null>(ready ? seen : null);
  useEffect(() => {
    if (!ready) return;
    if (before === null) setBefore(seen);
    markSeen();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups: { trip: Trip; list: Entry[] }[] = [];
  for (const e of entries) {
    const g = groups.find((x) => x.trip.id === e.trip.id);
    if (g) g.list.push(e); else groups.push({ trip: e.trip, list: [e] });
  }

  return (
    <Content>
      <PageHeader size="small" title="Notifications" back={{ to: '/', label: 'Home' }} />
      {groups.length === 0 ? (
        <Card media={<Illustration name="friends" size={120} />} title="You’re all caught up"
          body="When someone adds you to a plan, moves it or joins a trip, it shows up here." />
      ) : groups.map((g) => <TripGroup key={g.trip.id} trip={g.trip} list={g.list} before={before ?? Infinity} profiles={profiles} />)}
    </Content>
  );
}

function TripGroup({ trip, list, before, profiles }: { trip: Trip; list: Entry[]; before: number; profiles: Record<string, Profile> }) {
  const me = useMe();
  const { imOut, sheet } = useWhosIn(trip, profiles);
  return (
    <PageSection title={trip.name}>
      <ListGroup label={`${trip.name} notifications`}>
        {list.map((e) => {
          const meta = `${e.at > before ? 'New · ' : ''}${timeAgo(e.at)}`;
          const media = e.by
            ? <Avatar name={profiles[e.by]?.name ?? 'Someone'} photo={profiles[e.by]?.photo} size="large" />
            : undefined;
          const to = targetOf(e);
          // "Sam added you to Dinner": I'm out and View, while you're still in it
          if (e.notice?.kind === 'added' && e.event && peopleOf(e.event, trip).includes(me.uid)) {
            const event = e.event;
            return (
              <ListItem key={e.id} media={media} round title={e.text} meta={meta}
                action={<span className={s.actions}>
                  <Button size="small" tone="ghost" onClick={() => imOut(event)}>I’m out</Button>
                  <LinkButton size="small" tone="ghost" to={to}>View</LinkButton>
                </span>} />
            );
          }
          return <ListItem key={e.id} media={media} round icon={e.chat ? 'chat' : undefined} title={e.text} meta={meta} to={to} />;
        })}
      </ListGroup>
      {sheet}
    </PageSection>
  );
}

/** Where an entry leads: its event while it exists, the People tab for joins and roles, else the trip. */
function targetOf(e: Entry) {
  const base = `/trip/${e.trip.id}`;
  // "Sam and Priya are going to Fado night": its day, with the suggestion highlighted (you answer it there)
  if (e.notice?.kind === 'going' && e.event && !e.event.deletedAt) return `${base}/itinerary?day=${e.event.date}&focus=event-${e.event.id}`;
  if (e.event && !e.event.deletedAt && e.notice?.kind !== 'deleted') return `${base}/plan/${e.event.id}`;
  if (e.notice?.kind === 'joined' || e.notice?.kind === 'role') return `${base}/people`;
  if (e.notice?.kind === 'dates') return base;
  return `${base}/itinerary`;
}
