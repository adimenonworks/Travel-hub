import { useSearchParams } from 'react-router-dom';
import { SlideSwap } from '../shared/SlideSwap';
import { Button, Card, Icon, Illustration, PageHeader, PageSkeleton, SegmentControl, Tile } from '../../design/components';
import { personName, useMe, useMyTrips, useProfiles, useShares } from '../../data/hooks';
import type { SavedPlace } from '../../data/types';
import { tripPhase } from '../../lib/dates';
import { placeCounts, useCountries } from '../saves/Collections';
import { countryName, flagUrl } from '../../lib/countries';
import { Content, useNewTrip, useSave } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import s from './Home.module.css';
import ss from '../saves/saves.module.css';

type Segment = 'upcoming' | 'saved' | 'past';
const SEGMENTS: Segment[] = ['upcoming', 'saved', 'past'];


/** A country you've saved in, as a Figma "Tile" (Default tone: grey, flag-led, "24 saves · 3 cities"); opens its collection. */
export function CountryTile({ country }: { country: { code: string; name: string; flag?: string; places: SavedPlace[] }; index?: number }) {
  return (
    <Tile to={`/saved/${country.code || 'unsorted'}`} title={country.name}
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
 * Upcoming: a compact Hero card per trip, soonest first, under "Plan a new trip". Saved: your Collections, one country
 * Tile each. Past: compact Hero cards, most recent first (an illustrated empty card until there's one). Segments are tap only.
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
  // Collections other people shared with you: a Tile each ("Japan · Alex's"), after your own
  const me = useMe();
  const theirs = (useShares() ?? []).filter((x) => x.ownerId !== me.uid);
  const owners = useProfiles(theirs.map((x) => x.ownerId));
  const upcoming = dated.filter((t) => tripPhase(t.startDate, t.endDate) !== 'past');
  const past = dated.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();

  return (
    <Content>
      <PageHeader title="Trips" fit />
      {trips === null ? <PageSkeleton bare /> : (
        <div className={s.segments}>
          <SegmentControl label="Show trips" block value={segment} onChange={pick}
            options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'saved', label: 'Collections' }, { value: 'past', label: 'Past' }]} />
          <SlideSwap value={segment} id={segment} rank={SEGMENTS.indexOf(segment)}>{(seg) => <>
          {seg === 'upcoming' && (upcoming.length === 0 ? (
            <Card tone="accent" title="No trips planned yet" body="Pick where, when and who. Your saves come with you."
              actions={<Button block iconEnd="chevron-right" onClick={() => newTrip()}>Plan a trip</Button>} />
          ) : (
            <>
              <div className={s.list}>
                {upcoming.map((t) => <TripHero key={t.id} trip={t} list />)}
                {/* Figma Tile Tone=Add, like Saved's "New place to go" */}
                <Tile layout="add" icon="plus" title="Plan a new trip" onClick={() => newTrip()} />
              </div>
            </>
          ))}
          {seg === 'saved' && (countries.length === 0 && theirs.length === 0 ? (
            <Card media={<Illustration name="map" size={120} />} title="Looks a little empty" body="Save things to organise your future trip"
              actions={<Button block onClick={() => openSave({ mode: 'link' })}>Save a place</Button>} />
          ) : (
            <div className={ss.tileGrid}>
              {countries.map((c) => <CountryTile key={c.code} country={c} />)}
              {theirs.map((x) => (
                <Tile key={x.id} to={`/saved/${x.countryCode}/${x.id}`} title={`${countryName(x.countryCode)} · ${personName(owners, x.ownerId).split(' ')[0]}'s`}
                  media={<img src={flagUrl(x.countryCode)} alt="" />} meta={`Shared with you · ${x.roles[me.uid] === 'member' ? 'Can edit' : 'Can view'}`} />
              ))}
              <Tile layout="add" icon="plus" title="New place to go" onClick={() => openSave({ mode: 'link' })} />
            </div>
          ))}
          {seg === 'past' && (past.length === 0 ? (
            <Card layout="centre" media={<Illustration name="memories" size={120} />} title="No past trips yet" body="When a trip ends it moves here, with its plans and photos, so you can look back on it." />
          ) : (
            <div className={s.list}>{past.map((t) => <TripHero key={t.id} trip={t} list />)}</div>
          ))}
          </>}</SlideSwap>
        </div>
      )}
    </Content>
  );
}
