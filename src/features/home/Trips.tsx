import { useSearchParams } from 'react-router-dom';
import { Button, Card, Icon, Illustration, PageHeader, PageSection, PageSkeleton, SegmentedControl, Tile } from '../../design/components';
import { useMyTrips, useSubFor } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { tripPhase } from '../../lib/dates';
import { countryCodeOf, flagUrl } from '../../lib/countries';
import { featuredTrip } from '../../lib/trips';
import { placeTone, plannedTrips, saveCounts, savedPlaces } from '../../lib/saves';
import { Content, useNewTrip, useSave } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import s from './Home.module.css';
import ss from '../saves/saves.module.css';

type Segment = 'upcoming' | 'saved' | 'past';

/** A saved place as a Figma "Tile" (accent tone, flag, name, "24 saves · 3 cities"). */
export function PlaceTile({ trip, trips, ideas }: { trip: Trip; trips: Trip[]; ideas?: { status: string }[] }) {
  const code = countryCodeOf(trip.destination);
  return (
    <Tile tone={placeTone(trips, trip)} to={`/trip/${trip.id}`} title={trip.name}
      media={code && flagUrl(code) ? <img src={flagUrl(code)} alt="" /> : <Icon name="lightbulb" size={24} />}
      meta={saveCounts((ideas ?? []).filter((i) => i.status !== 'rejected') as never[])} />
  );
}

/**
 * Trips tab (Figma "Trips tab — Upcoming / Saved"): the library. Upcoming · Saved · Past, "Plan a new trip", then:
 * Upcoming: the trip that matters now as the Hero Card, and the others being planned. Saved: places to go one day as
 * Tiles, and "New place to go". Past: finished trips, newest first.
 */
export function Trips() {
  const trips = useMyTrips();
  const newTrip = useNewTrip();
  const openSave = useSave();
  const [params, setParams] = useSearchParams();
  const show = params.get('show');
  const segment: Segment = show === 'past' || show === 'saved' ? show : 'upcoming';
  const dated = plannedTrips(trips).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const places = savedPlaces(trips).sort((a, b) => a.createdAt - b.createdAt);
  const saves = useSubFor(places.map((t) => t.id), 'ideas');
  const featured = featuredTrip(trips);
  const planned = dated.filter((t) => t !== featured && tripPhase(t.startDate, t.endDate) !== 'past');
  const past = dated.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();
  const upcoming = (featured ? 1 : 0) + planned.length;

  return (
    <Content>
      <PageHeader title="Trips" fit />
      {trips === null ? <PageSkeleton bare /> : (
        <div className={s.segments}>
          <SegmentedControl label="Show trips" block value={segment} onChange={(v) => setParams(v === 'upcoming' ? {} : { show: v }, { replace: true })}
            options={[{ value: 'upcoming', label: `Upcoming · ${upcoming}` }, { value: 'saved', label: `Saved · ${places.length}` }, { value: 'past', label: `Past · ${past.length}` }]} />
          <Button block icon="plus" onClick={() => newTrip()}>Plan a new trip</Button>
          {segment === 'upcoming' && (upcoming === 0 ? (
            <Card media={<Illustration name="suitcase" size={120} />} title="No trips coming up"
              body="Plan one: pick where you’re going and when, then invite the people coming with you." />
          ) : (
            <>
              {featured && <TripHero trip={featured} />}
              {planned.length > 0 && (
                <PageSection title="Being planned" meta={`${planned.length} more ${planned.length === 1 ? 'trip' : 'trips'} coming up`}>
                  <div className={s.list}>{planned.map((t) => <TripHero key={t.id} trip={t} cover={false} />)}</div>
                </PageSection>
              )}
            </>
          ))}
          {segment === 'saved' && (
            <div className={ss.tileGrid}>
              {places.map((t) => <PlaceTile key={t.id} trip={t} trips={trips} ideas={saves[t.id]} />)}
              <Tile tone="add" icon="plus" title="New place to go" onClick={() => openSave({ mode: 'country' })} />
            </div>
          )}
          {segment === 'past' && (past.length === 0 ? (
            <Card media={<Illustration name="memories" size={120} />} title="No past trips yet" body="Trips you’ve been on show up here, with their photos." />
          ) : (
            <div className={s.list}>{past.map((t) => <TripHero key={t.id} trip={t} />)}</div>
          ))}
        </div>
      )}
    </Content>
  );
}
