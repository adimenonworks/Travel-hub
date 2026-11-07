import { useSearchParams } from 'react-router-dom';
import { Button, Card, Icon, Illustration, PageHeader, PageSection, PageSkeleton, SegmentedControl, Tile } from '../../design/components';
import { useMyTrips } from '../../data/hooks';
import type { SavedPlace } from '../../data/types';
import { tripPhase } from '../../lib/dates';
import { featuredTrip } from '../../lib/trips';
import { placeCounts, useCountries } from '../saves/Collections';
import { Content, useNewTrip, useSave } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import s from './Home.module.css';
import ss from '../saves/saves.module.css';

type Segment = 'upcoming' | 'saved' | 'past';

const TONES = ['orange', 'green', 'yellow', 'pink'] as const;

/** A country you've saved in, as a Figma "Tile" (accent tone, flag, name, "12 places · 3 cities"); opens its collection. */
export function CountryTile({ country, index }: { country: { code: string; name: string; flag?: string; places: SavedPlace[] }; index: number }) {
  return (
    <Tile tone={TONES[index % 4]} to={`/saved/${country.code || 'unsorted'}`} title={country.name}
      media={country.flag ? <img src={country.flag} alt="" /> : <Icon name="lightbulb" size={24} />}
      meta={placeCounts(country.places)} />
  );
}

/**
 * Trips tab: the library. Upcoming · Saved · Past, "Plan a new trip", then:
 * Upcoming: the trip that matters now as the Hero Card, and the others being planned. Saved: your Collections, one
 * country Tile each. Past: finished trips, newest first.
 */
export function Trips() {
  const trips = useMyTrips();
  const newTrip = useNewTrip();
  const openSave = useSave();
  const [params, setParams] = useSearchParams();
  const show = params.get('show');
  const segment: Segment = show === 'past' || show === 'saved' ? show : 'upcoming';
  const dated = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const countries = useCountries() ?? [];
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
            options={[{ value: 'upcoming', label: `Upcoming · ${upcoming}` }, { value: 'saved', label: `Saved · ${countries.length}` }, { value: 'past', label: `Past · ${past.length}` }]} />
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
              {countries.map((c, i) => <CountryTile key={c.code} country={c} index={i} />)}
              <Tile tone="add" icon="plus" title="Save a place" onClick={() => openSave({ mode: 'link' })} />
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
