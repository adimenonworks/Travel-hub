import { Button, Card, EventCard, Illustration, LinkButton, ListGroup, PageHeader, PageSection, PageSkeleton } from '../../design/components';
import { useMe, useMyTrips, usePlaces, useProfile, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { countryName } from '../../lib/countries';
import { timeAgo, tripPhase } from '../../lib/dates';
import { placeCategory } from '../../lib/places';
import { nextEvent } from '../../lib/trips';
import { eventCardProps } from '../trip/events';
import type { TripCtx } from '../trip/TripPage';
import { Content, useNewTrip, useSave } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import { PlaceRow, PlaceSheet, useCountries } from '../saves/Collections';
import { usePlaceMarks } from '../saves/placeMarks';
import { CountryTile } from './Trips';
import { useState } from 'react';
import s from './Home.module.css';
import ss from '../saves/saves.module.css';

/**
 * Home (Figma "Home — v2"): what's happening now. The greeting, two quick actions side by side (Plan a trip, the
 * one Primary, then Save a place: most saves arrive through the share sheet), then your trips: while one is on, "Happening now" (Next up: the next event as the deep-green Next card, as on
 * the trip's Overview, then the trip's card), and "Upcoming trips" (the soonest as a full Hero card, the rest compact).
 * Then "Collections" (your saves by country as Tiles) and "Recently saved". With no trip or no saves, an accent Card
 * with an illustration takes their place.
 */

/** "Next up" on Home while a trip is on: the trip's next event as the deep-green Next card, opening the event. */
function NextUp({ trip }: { trip: Trip }) {
  const activities = useSub(trip.id, 'activities');
  if (!activities) return null;
  const next = nextEvent(activities);
  if (!next) return null;
  const ctx = { trip, activities } as unknown as TripCtx; // eventCardProps only reads the trip and its events
  return (
    <div className={s.nextUp}>
      <h3 className={s.nextUpTitle}>Next up</h3>
      <EventCard {...eventCardProps(next, ctx, true)} state="next" />
    </div>
  );
}
export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const name = profile?.name || me.name;
  // While a trip is on it's "Happening now"; the rest wait under "Upcoming trips" (soonest first)
  const dated = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const happening = dated.find((t) => tripPhase(t.startDate, t.endDate) === 'current');
  const upcoming = dated.filter((t) => tripPhase(t.startDate, t.endDate) === 'upcoming');
  const newTrip = useNewTrip();
  const openSave = useSave();
  // Collections: your saves by country. Recently saved: the newest Places.
  const countries = useCountries() ?? [];
  const places = usePlaces() ?? [];
  const { visited, starred } = usePlaceMarks();
  const [open, setOpen] = useState<string | null>(null);
  const recent = places.filter((p) => p.ownerId === me.uid).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const live = open ? places.find((p) => p.id === open) ?? null : null;

  return (
    <Content>
      <PageHeader title={`Hi, ${name.split(' ')[0]}`} fit />
      <nav className={s.quickActions} aria-label="Quick actions">
        <Button size="small" icon="calendar" onClick={() => newTrip()}>Plan a trip</Button>
        <Button size="small" tone="neutral" icon="plus" onClick={() => openSave({ mode: 'link' })}>Save a place</Button>
      </nav>
      {trips === null ? <PageSkeleton bare /> : happening || upcoming.length > 0 ? (
        <>
          {happening && (
            <PageSection title="Happening now">
              <NextUp trip={happening} />
              <TripHero trip={happening} />
            </PageSection>
          )}
          {upcoming.length > 0 && (
            <PageSection title={upcoming.length === 1 && !happening ? 'Upcoming trip' : 'Upcoming trips'}>
              {upcoming.map((t, i) => <TripHero key={t.id} trip={t} list={!!happening || i > 0} />)}
            </PageSection>
          )}
        </>
      ) : (
        <Card tone="accent" title="Plan your next trip" body="Pick where, when and who. Your saves come with you."
          actions={<Button block iconEnd="chevron-right" onClick={() => newTrip()}>Plan a trip</Button>} />
      )}

      {countries.length === 0 ? (
        <Card media={<Illustration name="map" size={120} />} title="Start saving places for your next trip"
          body="Cafés, bars, stays — anything you find online"
          actions={<Button block onClick={() => openSave({ mode: 'link' })}>Save a place</Button>} />
      ) : (
        <PageSection title="Collections" meta={`${countries.length} place${countries.length === 1 ? '' : 's'} · ${places.length} save${places.length === 1 ? '' : 's'}`}
          action={<LinkButton to="/trips?show=saved" tone="ghost" size="small" iconEnd="chevron-right">See all</LinkButton>}>
          <div className={ss.tileRow}>
            {countries.map((c) => <CountryTile key={c.code} country={c} />)}
          </div>
        </PageSection>
      )}

      {recent.length > 0 && (
        <PageSection title="Recently saved"
          action={<LinkButton to="/trips?show=saved" tone="ghost" size="small" iconEnd="chevron-right">See all</LinkButton>}>
          <ListGroup label="Recently saved">
            {recent.map((p) => (
              <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred={starred(p)} onClick={() => setOpen(p.id)} trailing={timeAgo(p.createdAt)}
                meta={[p.kind || placeCategory(p.category).one, p.city || (p.countryCode ? countryName(p.countryCode) : null), p.source ? `from ${p.source}` : null].filter(Boolean).join(' · ')} />
            ))}
          </ListGroup>
        </PageSection>
      )}
      <PlaceSheet place={live} onClose={() => setOpen(null)} />
    </Content>
  );
}
