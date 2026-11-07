import { Button, Card, Illustration, LinkButton, ListGroup, PageHeader, PageSection, PageSkeleton, QuickAction } from '../../design/components';
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
 * Home (Figma "Home — v2"): what's happening now. The greeting, your trip as the phase-aware Hero Card, quick actions
 * (Save a link, Add a place, Plan a trip, Invite), "Saved for later" (your saved places as Tiles) and "Recently saved".
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
      {trips === null ? <PageSkeleton bare /> : featured ? (
        <PageSection title="Upcoming trip" action={<LinkButton to="/trips" variant="ghost" size="regular" iconEnd="chevron-right">All trips</LinkButton>}>
          <TripHero trip={featured} />
        </PageSection>
      ) : (
        <Card media={<Illustration name="suitcase" size={120} />} title="Where to next?"
          body="Plan a trip: pick where you’re going and when, then invite the people coming with you."
          actions={<Button block icon="plus" onClick={() => newTrip()}>Plan a new trip</Button>} />
      )}
      <nav className={s.quickActions} aria-label="Quick actions">
        <QuickAction icon="link" label="Save a link" onClick={() => openSave({ mode: 'link' })} />
        <QuickAction icon="pin" label="Add a place" onClick={() => openSave({ mode: 'place' })} />
        <QuickAction icon="calendar" label="Plan a trip" onClick={() => newTrip()} />
        {featured && <QuickAction icon="people" label="Invite" to={`/trip/${featured.id}/people`} />}
      </nav>

      {countries.length > 0 && (
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
