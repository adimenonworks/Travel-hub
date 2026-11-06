import { useState } from 'react';
import { CountryModal, EventCard, LinkButton, ListGroup, ListItem, PageSection, Tile } from '../../design/components';
import type { Activity } from '../../data/types';
import { formatDay, formatTime, today } from '../../lib/dates';
import { money } from '../../lib/format';
import { BOOKING_GROUPS, categoryInfo } from '../../lib/categories';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { emergencyFor } from '../../lib/emergency';
import { nextEvent } from '../../lib/trips';
import { TripBudget } from './Budget';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/** An event as a Figma "Event card" (Standard layout), used on the Overview and in the bookings lists. */
export function eventCardProps(a: Activity, ctx: TripCtx, showDay = false) {
  const time = a.startTime ? `${formatTime(a.startTime)}${a.endTime ? ` – ${formatTime(a.endTime)}` : ''}` : undefined;
  const place = a.locationText || a.location?.name?.split(',')[0];
  const cost = a.cost * Math.max(1, a.attendeeIds.length);
  return {
    title: a.title,
    time: showDay ? [a.date === today() ? 'Today' : formatDay(a.date), time].filter(Boolean).join(', ') : time,
    place,
    amount: cost > 0 ? money(cost, ctx.trip.currency) : undefined,
    icon: categoryInfo(a.category).icon,
    to: `/trip/${ctx.trip.id}/plan/${a.id}`,
  };
}

/**
 * Trip "Overview" tab (Figma "Trip — Overview"): the hub. Budget card → Next up → Bookings tiles (a plain count of
 * each kind of event) → Good to know (each country's emergency number and entry requirements).
 * "Recently viewed" arrives with documents.
 */
export function Overview(ctx: TripCtx & { onSetBudget?: () => void }) {
  const { trip, activities } = ctx;
  const base = `/trip/${trip.id}`;
  const next = nextEvent(activities);
  const [country, setCountry] = useState<string | null>(null);
  const t = today();
  const budgetDay = t >= trip.startDate && t <= trip.endDate ? t : trip.startDate;
  const docs = activities.reduce((n, a) => n + a.links.length, 0);
  const countries = tripCountries(trip, activities);

  return (
    <div className={s.overview}>
      <TripBudget ctx={ctx} day={budgetDay} onSetBudget={ctx.onSetBudget} />

      <PageSection title="Next up" action={<LinkButton to={`${base}/itinerary`} variant="ghost" size="regular" iconEnd="chevron-right">Itinerary</LinkButton>}>
        {next
          ? <EventCard {...eventCardProps(next, ctx, true)} />
          : <ListGroup><ListItem icon="calendar" title="Nothing planned yet" meta="Add events to the itinerary and the next one shows here." to={`${base}/itinerary`} /></ListGroup>}
      </PageSection>

      <PageSection title="Bookings" meta="Your plans, by type">
        <div className={s.tiles}>
          {BOOKING_GROUPS.map((g) => {
            const n = activities.filter((a) => g.categories.includes(a.category)).length;
            return <Tile key={g.key} icon={g.icon} title={g.title} meta={`${n} ${n === 1 ? g.one : g.many}`} to={`${base}/bookings/${g.key}`} />;
          })}
          <Tile icon="doc" title="Documents" meta={`${docs} ${docs === 1 ? 'file or link' : 'files and links'}`} to={`${base}/bookings/documents`} />
        </div>
      </PageSection>

      {countries.length > 0 && (
        <PageSection title="Good to know" meta="Emergency numbers and entry rules">
          <ListGroup label="Countries">
            {countries.map((c) => {
              const e = emergencyFor(c);
              const n = e?.general ?? e?.police;
              return (
                <ListItem key={c} media={flagUrl(c) && <img src={flagUrl(c)} alt="" className={s.flagThumb} />} round
                  title={countryName(c)} meta={`${n ? `Emergency ${n} · ` : ''}entry requirements`}
                  onClick={() => setCountry(c)} label={`${countryName(c)}: emergency number and entry requirements`} />
              );
            })}
          </ListGroup>
        </PageSection>
      )}
      <CountryModal code={country} onClose={() => setCountry(null)} />
    </div>
  );
}
