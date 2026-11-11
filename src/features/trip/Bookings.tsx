import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, EventCard, PageHeader, PageSection, SectionHeader, EmptyState } from '../../design/components';
import { ActivityForm } from './ActivityForm';
import { formatDay, today } from '../../lib/dates';
import { BOOKING_GROUPS, bookingGroupOf } from '../../lib/categories';
import { byTime } from './Itinerary';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import { unreadCount, unreadTag, useReads } from '../../lib/reads';
import { useMe } from '../../data/hooks';
import s from './trip.module.css';

/**
 * One Bookings row opened (Figma "Trip — Flights"): that kind of event grouped by date, one Event card each (flights
 * as Journey cards), then "Add a flight" (Secondary). Forwarding booking emails comes later.
 */
export function Bookings(ctx: TripCtx) {
  const { group = '' } = useParams();
  const { trip, activities } = ctx;
  const me = useMe();
  const reads = useReads(me.uid);
  const back = { to: `/trip/${trip.id}`, label: 'Overview' };

  // Older addresses: 'car' is now under Getting around; 'documents' is gone (files live on their events), so it opens Flights
  const g = BOOKING_GROUPS.find((x) => x.key === (group === 'car' ? 'transport' : group)) ?? BOOKING_GROUPS[0];
  const list = activities.filter((a) => bookingGroupOf(a.category) === g.key).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const days = [...new Set(list.map((a) => a.date))];
  const [adding, setAdding] = useState(false);
  const addLabel = ({ flights: 'Add a flight', stays: 'Add a stay', transport: 'Add a way to get around', activities: 'Add an activity', food: 'Add food & drink' } as Record<string, string>)[g.key];
  const t = today();
  return (
    <>
      <PageHeader title={g.title} size="small" back={back} />
      <SectionHeader title={`${list.length} ${list.length === 1 ? g.one : g.many}`} meta={g.key === 'flights' ? 'Tap one for tickets, seats and bags' : 'Tap one for its details, tickets and notes'} />
      {list.length === 0 ? <EmptyState illustration="calendar" title={`No ${g.many} yet`} message={`Add an event to the itinerary and choose its type, and it shows here.`} /> : days.map((d) => (
        <PageSection key={d} title={formatDay(d)}>
          <div className={s.eventList}>
            {list.filter((a) => a.date === d).map((a) => <EventCard key={a.id} {...eventCardProps(a, ctx)} extras={unreadTag(unreadCount(reads, me.uid, a.id, ctx.comments))} />)}
          </div>
        </PageSection>
      ))}
      <Button variant="neutral" block onClick={() => setAdding(true)}>{addLabel}</Button>
      <ActivityForm open={adding} trip={trip} date={t >= trip.startDate && t <= trip.endDate ? t : trip.startDate} draft={{ category: g.add }} onClose={() => setAdding(false)} />
    </>
  );
}
