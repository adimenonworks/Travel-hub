import { Button, Card, Illustration, LinkButton, ListGroup, PageHeader, PageSection, PageSkeleton } from '../../design/components';
import { useMe, useMyTrips, usePlaces, useProfile } from '../../data/hooks';
import { countryName } from '../../lib/countries';
import { featuredTrip } from '../../lib/trips';
import { Content, useNewTrip, useSave } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import { PlaceRow, PlaceSheet, useCountries } from '../saves/Collections';
import { usePlaceMarks } from '../saves/placeMarks';
import { CountryTile } from './Trips';
import { useState } from 'react';
import s from './Home.module.css';
import ss from '../saves/saves.module.css';

/**
 * Home (Figma "Home — v2"): what's happening now. The greeting, two quick actions side by side (Save a place, Plan a
 * trip), your trip as the phase-aware Hero Card, "Saved for later" (your Collections by country as Tiles) and
 * "Recently saved". With no trip or no saves, an accent Card with an illustration takes their place.
 */
export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const name = profile?.name || me.name;
  const featured = featuredTrip(trips);
  const newTrip = useNewTrip();
  const openSave = useSave();
  // Saved for later: your Collections by country. Recently saved: the newest Places.
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
        <Button size="regular" icon="plus" onClick={() => openSave({ mode: 'link' })}>Save a place</Button>
        <Button size="regular" variant="secondary" icon="calendar" onClick={() => newTrip()}>Plan a trip</Button>
      </nav>
      {trips === null ? <PageSkeleton bare /> : featured ? (
        <PageSection title="Upcoming trip">
          <TripHero trip={featured} />
        </PageSection>
      ) : (
        <Card tone="accent" media={<Illustration name="suitcase" size={120} />} title="Plan your next trip"
          actions={<Button variant="inverse" block icon="plus" onClick={() => newTrip()}>Plan a trip</Button>} />
      )}

      {countries.length === 0 ? (
        <Card tone="accent" media={<Illustration name="map" size={120} />} title="Start saving places for your next trip"
          body="Cafés, bars, stays — anything you find online"
          actions={<Button variant="inverse" block icon="plus" onClick={() => openSave({ mode: 'link' })}>Save a place</Button>} />
      ) : (
        <PageSection title="Saved for later" meta={`${countries.length} ${countries.length === 1 ? 'country' : 'countries'} · ${places.length} place${places.length === 1 ? '' : 's'}`}
          action={<LinkButton to="/trips?show=saved" variant="ghost" size="regular" iconEnd="chevron-right">See all</LinkButton>}>
          <div className={ss.tileRow}>
            {countries.map((c, i) => <CountryTile key={c.code} country={c} index={i} />)}
          </div>
        </PageSection>
      )}

      {recent.length > 0 && (
        <PageSection title="Recently saved">
          <ListGroup label="Recently saved">
            {recent.map((p) => (
              <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred={starred(p)} onClick={() => setOpen(p.id)}
                meta={[p.kind, p.city || (p.countryCode ? countryName(p.countryCode) : null), p.source ? `from ${p.source}` : null].filter(Boolean).join(' · ')} />
            ))}
          </ListGroup>
        </PageSection>
      )}
      <PlaceSheet place={live} onClose={() => setOpen(null)} />
    </Content>
  );
}
