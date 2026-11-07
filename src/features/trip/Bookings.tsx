import { useParams } from 'react-router-dom';
import { EventCard, ListGroup, ListItem, PageHeader, PageSection, SectionHeader, EmptyState } from '../../design/components';
import { formatDay } from '../../lib/dates';
import { hostOf, isPdf } from '../../lib/format';
import { recordView } from '../../lib/recent';
import { BOOKING_GROUPS, eventType } from '../../lib/categories';
import { byTime } from './Itinerary';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/**
 * One "Bookings" tile opened (Figma "Trip — Flights"): that kind of event, day by day, as Event cards.
 * Documents lists every link and file attached to the trip's events.
 */
export function Bookings(ctx: TripCtx) {
  const { group = '' } = useParams();
  const { trip, activities } = ctx;
  const back = { to: `/trip/${trip.id}`, label: 'Overview' };

  if (group === 'documents') {
    const docs = activities.slice().sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b)).flatMap((a) => a.links.map((l) => ({ a, l })));
    return (
      <>
        <PageHeader title="Documents" size="small" back={back} />
        <SectionHeader title={`${docs.length} ${docs.length === 1 ? 'file or link' : 'files and links'}`} meta="Attached to your events. Open an event to add more." />
        {docs.length === 0 ? <EmptyState illustration="ticket" title="Nothing attached yet" message="Add tickets, confirmations and booking links to an event and they show here." /> : (
          <ListGroup label="Documents">
            {docs.map(({ a, l }, i) => (
              <ListItem key={`${a.id}-${i}`} icon={isPdf(l.url) ? 'doc' : 'link'} title={l.label || hostOf(l.url)}
                meta={`${a.title} · ${formatDay(a.date)}`} trailing={isPdf(l.url) ? 'PDF' : undefined} href={l.url}
                onClick={() => recordView(trip.id, { url: l.url, kind: isPdf(l.url) ? 'PDF' : 'Link', label: l.label || hostOf(l.url), meta: a.title })}
                label={`${l.label || hostOf(l.url)}, for ${a.title} (opens in a new tab)`} />
            ))}
          </ListGroup>
        )}
      </>
    );
  }

  const g = BOOKING_GROUPS.find((x) => x.key === group) ?? BOOKING_GROUPS[0];
  const list = activities.filter((a) => eventType(a.category) === g.type).sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
  const days = [...new Set(list.map((a) => a.date))];
  return (
    <>
      <PageHeader title={g.title} size="small" back={back} />
      <SectionHeader title={`${list.length} ${list.length === 1 ? g.one : g.many}`} meta="Tap one for its details, tickets and notes" />
      {list.length === 0 ? <EmptyState illustration="calendar" title={`No ${g.many} yet`} message={`Add an event to the itinerary and choose its type, and it shows here.`} /> : days.map((d) => (
        <PageSection key={d} title={formatDay(d)}>
          <div className={s.eventList}>
            {list.filter((a) => a.date === d).map((a) => <EventCard key={a.id} {...eventCardProps(a, ctx)} />)}
          </div>
        </PageSection>
      ))}
    </>
  );
}
