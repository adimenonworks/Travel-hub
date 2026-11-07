import { useSearchParams } from 'react-router-dom';
import { Button, Card, Icon, Illustration, PageHeader, PageSkeleton, SegmentedControl, Tile } from '../../design/components';
import { useMyTrips } from '../../data/hooks';
import type { SavedPlace } from '../../data/types';
import { tripPhase } from '../../lib/dates';
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

const SEGMENT_KEY = 'trips:segment';
const remembered = (): Segment | null => {
  try { const v = localStorage.getItem(SEGMENT_KEY); return v === 'upcoming' || v === 'saved' || v === 'past' ? v : null; } catch { return null; }
};

/**
 * Trips tab: the library. Upcoming · Saved · Past (Upcoming first; the segment you picked is remembered on this device).
 * Upcoming: a compact Hero Card per trip, soonest first, under "Plan a new trip". Saved: your Collections, one country
 * Tile each. Past: compact Hero Cards, most recent first.
 */
export function Trips() {
  const trips = useMyTrips();
  const newTrip = useNewTrip();
  const openSave = useSave();
  const [params, setParams] = useSearchParams();
  const show = params.get('show');
  const segment: Segment = show === 'past' || show === 'saved' || show === 'upcoming' ? show : remembered() ?? 'upcoming';
  const pick = (v: Segment) => {
    try { localStorage.setItem(SEGMENT_KEY, v); } catch { /* private mode: not remembered */ }
    setParams(v === 'upcoming' ? {} : { show: v }, { replace: true });
  };
  const dated = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const countries = useCountries() ?? [];
  const upcoming = dated.filter((t) => tripPhase(t.startDate, t.endDate) !== 'past');
  const past = dated.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();

  return (
    <Content>
      <PageHeader title="Trips" fit />
      {trips === null ? <PageSkeleton bare /> : (
        <div className={s.segments}>
          <SegmentedControl label="Show trips" block value={segment} onChange={pick}
            options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'saved', label: 'Saved' }, { value: 'past', label: 'Past' }]} />
          {segment === 'upcoming' && (upcoming.length === 0 ? (
            <Card tone="accent" media={<Illustration name="suitcase" size={120} />} title="No trips planned yet"
              actions={<Button variant="inverse" block icon="plus" onClick={() => newTrip()}>Plan a trip</Button>} />
          ) : (
            <>
              <Button block icon="plus" onClick={() => newTrip()}>Plan a new trip</Button>
              <div className={s.list}>{upcoming.map((t) => <TripHero key={t.id} trip={t} size="compact" />)}</div>
            </>
          ))}
          {segment === 'saved' && (countries.length === 0 ? (
            <Card tone="accent" media={<Illustration name="map" size={120} />} title="Looks a little empty" body="Save things to organise your future trip"
              actions={<Button variant="inverse" block icon="plus" onClick={() => openSave({ mode: 'link' })}>Save a place</Button>} />
          ) : (
            <div className={ss.tileGrid}>
              {countries.map((c, i) => <CountryTile key={c.code} country={c} index={i} />)}
              <Tile tone="add" icon="plus" title="Save a place" onClick={() => openSave({ mode: 'link' })} />
            </div>
          ))}
          {segment === 'past' && (past.length === 0 ? (
            <p className="t-body t-secondary">Trips you’ve taken will show up here</p>
          ) : (
            <div className={s.list}>{past.map((t) => <TripHero key={t.id} trip={t} size="compact" />)}</div>
          ))}
        </div>
      )}
    </Content>
  );
}
