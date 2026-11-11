import { useState } from 'react';
import { BudgetCard, CountryModal, EventCard, ListGroup, ListItem, PageSection } from '../../design/components';
import type { IconName } from '../../design/components';
import { useMe, useProfile } from '../../data/hooks';
import type { Place } from '../../data/types';
import { BOOKING_GROUPS, TYPE_TONE, bookingGroupOf, categoryInfo, categoryTone, isEveryday } from '../../lib/categories';
import { countryCodeOf, countryName, flagUrl, tripCountries } from '../../lib/countries';
import { timeAgo } from '../../lib/dates';
import { priceOf, useBudgetTotals } from '../../lib/currency';
import { money } from '../../lib/format';
import { emergencyFor } from '../../lib/emergency';
import { nextEvent } from '../../lib/trips';
import { isInApp, recordView, useRecentViews, type ViewKind } from '../../lib/recent';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import { unreadCount, unreadTag, useReads } from '../../lib/reads';
import s from './trip.module.css';

const KIND_ICON: Record<ViewKind, IconName> = { PDF: 'doc', Email: 'mail', Link: 'link', Booking: 'ticket', Place: 'pin' };

/**
 * Trip "Overview" tab (Figma "Trip — Overview"): Next stop (the next event as the deep green Next card) → Bookings (a
 * list, one row per type with a plain count, each opening that type's list) → Recently viewed (documents, bookings
 * and places you last opened, on this device) → Good to know (each country's emergency number; opens the Country sheet).
 */
export function Overview(ctx: TripCtx) {
  const { trip, activities } = ctx;
  const base = `/trip/${trip.id}`;
  const next = nextEvent(activities);
  const [country, setCountry] = useState<string | null>(null);
  const recent = useRecentViews(trip.id);
  // Budget (per person): the prices of the events you book ahead, by group. Food, drink and free time are everyday spending.
  const priced = activities.flatMap((a) => { const g = bookingGroupOf(a.category); const p = isEveryday(a.category) ? null : priceOf(a, trip); return p && p.amount > 0 ? [{ price: p, group: g }] : []; });
  const totals = useBudgetTotals(trip.budget, priced);
  const left = (trip.budget?.amount ?? 0) - totals.planned;
  const over = left < 0;
  const budgetNote = totals.unconverted ? `${totals.unconverted} price${totals.unconverted === 1 ? '' : 's'} in other currencies will be added once rates load` : 'Per person, from the prices on your bookings';
  const me = useMe();
  const reads = useReads(me.uid);
  const home = useProfile(me.uid)?.home ?? null;
  // Good to know is about where you're going: your home country (a flight out of Melbourne) is left out, unless the whole trip is at home.
  const homeCode = home ? countryCodeOf(home) : null;
  const all = tripCountries(trip, activities);
  const countries = all.some((c) => c !== homeCode) ? all.filter((c) => c !== homeCode) : all;
  // A spot on the trip in the chosen country, for its local time
  const spots: Place[] = [trip.destination, ...activities.flatMap((a) => [a.location, a.to])].filter((p): p is Place => !!p);
  const spot = country ? spots.find((p) => countryCodeOf(p) === country) ?? null : null;

  return (
    <div className={s.overview}>

      <PageSection title="Next stop">
        {next
          ? <EventCard {...eventCardProps(next, ctx, true)} state="next" extras={unreadTag(unreadCount(reads, me.uid, next.id, ctx.comments))} />
          : <ListGroup><ListItem icon="calendar" title="Nothing planned yet" meta="Add events to the itinerary and the next one shows here." to={`${base}/itinerary`} /></ListGroup>}
      </PageSection>

      {trip.budget && (
        <PageSection title="Budget" meta={budgetNote}>
          <BudgetCard label={over ? 'Over budget' : 'Left to spend'} amount={money(Math.round(Math.abs(left)), trip.budget.currency)} over={over}
            caption={`of ${money(trip.budget.amount, trip.budget.currency)} per person · ${money(Math.round(totals.planned), trip.budget.currency)} planned`}
            ratio={trip.budget.amount > 0 ? totals.planned / trip.budget.amount : 1}
            rows={BOOKING_GROUPS.filter((g) => g.key !== 'food' && (totals.byGroup[g.key] ?? 0) > 0).map((g) => ({ icon: g.icon, label: g.title, tone: TYPE_TONE[g.type], amount: money(Math.round(totals.byGroup[g.key]), trip.budget!.currency) }))} />
        </PageSection>
      )}

      <PageSection title="Bookings" meta="Tickets, confirmations and PDFs, by type">
        <ListGroup label="Bookings">
          {BOOKING_GROUPS.map((g) => {
            const n = activities.filter((a) => bookingGroupOf(a.category) === g.key).length;
            return <ListItem key={g.key} icon={g.icon} tone={TYPE_TONE[g.type]} title={g.title} meta={`${n} ${n === 1 ? g.one : g.many}`} to={`${base}/bookings/${g.key}`} />;
          })}
        </ListGroup>
      </PageSection>

      {recent.length > 0 && (
        <PageSection title="Recently viewed">
          <ListGroup label="Recently viewed">
            {recent.map((v) => {
              const kind = v.kind ?? 'Link';
              const trailing = `${kind} · ${timeAgo(v.at)}`;
              // A booking you opened shows in its event type's icon and colour
              const ev = activities.find((a) => v.url.endsWith(`/plan/${a.id}`));
              return isInApp(v)
                ? <ListItem key={v.url} size="compact" icon={ev ? categoryInfo(ev.category).icon : KIND_ICON[kind]} tone={ev ? categoryTone(ev.category) : undefined} title={v.label} trailing={trailing} to={v.url} />
                : <ListItem key={v.url} size="compact" icon={KIND_ICON[kind]} title={v.label} trailing={trailing} href={v.url} label={`${v.label} (opens in a new tab)`}
                    onClick={() => recordView(trip.id, { url: v.url, label: v.label, meta: v.meta, kind })} />;
            })}
          </ListGroup>
        </PageSection>
      )}

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
      <CountryModal code={country} onClose={() => setCountry(null)} place={spot} home={home ? { ...home, countryCode: countryCodeOf(home) } : null} />
    </div>
  );
}
