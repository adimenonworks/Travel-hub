import { useState } from 'react';
import { CountryModal, EventCard, LinkButton, ListGroup, ListItem, PageSection, Tile } from '../../design/components';
import { BOOKING_GROUPS, eventType } from '../../lib/categories';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { emergencyFor } from '../../lib/emergency';
import { nextEvent } from '../../lib/trips';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/**
 * Trip "Overview" tab (Figma "Trip — Overview"): the hub. Next up → Bookings tiles (a plain count of
 * each kind of event) → Good to know (each country's emergency number and entry requirements).
 * "Recently viewed" arrives with documents.
 */
export function Overview(ctx: TripCtx) {
  const { trip, activities } = ctx;
  const base = `/trip/${trip.id}`;
  const next = nextEvent(activities);
  const [country, setCountry] = useState<string | null>(null);
  const docs = activities.reduce((n, a) => n + a.links.length, 0);
  const countries = tripCountries(trip, activities);

  return (
    <div className={s.overview}>

      <PageSection title="Next up" action={<LinkButton to={`${base}/itinerary`} variant="ghost" size="regular" iconEnd="chevron-right">Itinerary</LinkButton>}>
        {next
          ? <EventCard {...eventCardProps(next, ctx, true)} />
          : <ListGroup><ListItem icon="calendar" title="Nothing planned yet" meta="Add events to the itinerary and the next one shows here." to={`${base}/itinerary`} /></ListGroup>}
      </PageSection>

      <PageSection title="Bookings" meta="Your plans, by type">
        <div className={s.tiles}>
          {BOOKING_GROUPS.map((g) => {
            const n = activities.filter((a) => eventType(a.category) === g.type).length;
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
