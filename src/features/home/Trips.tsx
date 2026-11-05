import { Button, Card, ContentCard, Divider, HeroCard, Illustration, PageHeader, PageSkeleton, Section } from '../../design/components';
import { personName, useMyTrips, useProfiles, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { countdown, daysBetween, formatRange, today, tripPhase } from '../../lib/dates';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { featuredTrip } from '../../lib/trips';
import { Content, useNewTrip } from '../../app/Shell';
import { TripCover } from '../shared/TripCover';
import s from './Home.module.css';

/**
 * Trips tab (Figma "Trips tab"): "Your trips". The trip you're on or the next one as the Hero Card (Tone=Brand, with its cover),
 * then the other trips coming up and your past trips as Content Cards.
 */
export function Trips() {
  const trips = useMyTrips();
  const newTrip = useNewTrip();
  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const featured = featuredTrip(trips);
  const coming = all.filter((t) => t !== featured && tripPhase(t.startDate, t.endDate) !== 'past');
  const past = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();

  return (
    <Content>
      <PageHeader title="Your trips" fit />
      {trips === null ? <PageSkeleton bare /> : all.length === 0 ? (
        <Card media={<Illustration name="suitcase" size={64} square />} title="No trips yet"
          body="Plan your first one: add the dates and where you’re going, then invite your friends."
          actions={<Button block onClick={newTrip}>Plan a trip</Button>} />
      ) : (
        <>
          {featured && <><FeaturedTrip trip={featured} /><Divider /></>}
          {coming.length > 0 && (
            <Section title="Coming up">
              <div className={s.list}>{coming.map((t) => <TripCard key={t.id} trip={t} />)}</div>
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Past trips">
              <div className={s.pastRow}>{past.map((t) => <div key={t.id} className={s.past}><TripCard trip={t} /></div>)}</div>
            </Section>
          )}
        </>
      )}
    </Content>
  );
}

const place = (t: Trip) => t.destination?.name.split(',').slice(0, 2).join(',') ?? 'No destination yet';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The trip that matters now as the Hero Card (Tone=Brand): its cover and countdown, then the panel that opens it. */
function FeaturedTrip({ trip }: { trip: Trip }) {
  const profiles = useProfiles(trip.memberIds);
  const activities = useSub(trip.id, 'activities');
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  return (
    <HeroCard tone="brand" to={`/trip/${trip.id}`}
      image={<TripCover trip={trip} />}
      title={trip.name}
      subtitle={`${formatRange(trip.startDate, trip.endDate)} • ${plural(n, 'day')}`}
      countries={tripCountries(trip, activities ?? []).map((code) => ({ code, name: countryName(code), flag: flagUrl(code) }))}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      count={countdown(trip.startDate, trip.endDate)} />
  );
}

/** A trip as the Figma "Content Card": cover with when it is (or how long it was) and who's going, then name, place and dates. */
function TripCard({ trip }: { trip: Trip }) {
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  const until = daysBetween(today(), trip.startDate);
  const phase = tripPhase(trip.startDate, trip.endDate);
  const profiles = useProfiles(trip.memberIds);
  const when = phase === 'current' ? 'Happening now' : phase === 'past' ? plural(n, 'day') : until === 0 ? 'Today' : `in ${plural(until, 'day')}`;
  return (
    <ContentCard to={`/trip/${trip.id}`} cover={<TripCover trip={trip} />} when={when}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      name={trip.name} place={place(trip)} dates={formatRange(trip.startDate, trip.endDate)} />
  );
}
