import { useEffect, useState } from 'react';
import { Avatar, Card, Illustration, ListGroup, ListItem, PageHeader, PageSection } from '../../design/components';
import type { Profile, Trip } from '../../data/types';
import { timeAgo } from '../../lib/dates';
import { Content } from '../../app/Shell';
import { useNotifications, type Entry } from './notifications';

/**
 * Notification centre (people and sharing, item 4): opened from the Bell on Home. Newest first, grouped by trip (the trip
 * with the newest entry first). Opening it clears the Bell's count; the entries that were new stay unread (a dot and a
 * bold title) until you leave. No entry has a button (R2): tapping one opens what it's about. Entries are kept 30 days.
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
  return (
    <PageSection title={trip.name}>
      <ListGroup label={`${trip.name} notifications`}>
        {list.map((e) => {
          // No buttons on any entry (owner's rule, R2): tapping one opens what it's about
          const media = e.by ? <Avatar name={profiles[e.by]?.name ?? 'Someone'} photo={profiles[e.by]?.photo} size="large" /> : undefined;
          return <ListItem key={e.id} media={media} round icon={e.chat ? 'chat' : undefined} title={e.text} meta={timeAgo(e.at)}
            state={e.at > before ? 'unread' : 'read'} to={targetOf(e)} />;
        })}
      </ListGroup>
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
