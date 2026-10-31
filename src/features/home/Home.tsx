import { useEffect, useState } from 'react';
import { Button, Card, CardLink, ContentCard, HeroCard, Illustration, LinkButton, PageHeader, Section, Spinner } from '../../design/components';
import { personName, useMe, useMyTrips, useProfile, useProfiles, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { countdown, daysBetween, formatRange, today, tripPhase } from '../../lib/dates';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { Content, useNewTrip } from '../../app/Shell';
import { TripCover } from '../shared/TripCover';
import s from './Home.module.css';

/**
 * Home: a greeting with your numbers, the trip that matters now as a big card, your other trips
 * (each with a cover), a tile that invites you to plan the next one, and a row of past trips.
 */
export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const name = profile?.name || me.name;

  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const current = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'current');
  const upcoming = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'upcoming');
  const past = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();
  const daysAway = past.reduce((n, t) => n + daysBetween(t.startDate, t.endDate) + 1, 0);
  const places = new Set([...past.flatMap((t) => (t.destination ? [t.destination] : [])), ...(profile?.visited ?? [])]
    .map((p) => p.name.split(',')[0].trim().toLowerCase())).size;

  // The trip that matters now: one you're on, else the next one.
  const featured = current[0] ?? upcoming[0];
  const others = [...current, ...upcoming].filter((t) => t !== featured);
  const newTrip = useNewTrip();
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <Content>
      <PageHeader title={`${greeting()}, ${name.split(' ')[0]}`}
        subtitle={`${plural(all.length, 'trip')} · ${plural(daysAway, 'day')} away · ${plural(places, 'place')}`}
        action={{ icon: 'plus', label: 'New trip', onClick: newTrip }} />

      {trips === null ? <Spinner center /> : (
        <>
          {featured && <Hero trip={featured} />}
          {others.length > 0 ? (
            <Section title="Coming up">
              <div className={s.grid}>
                {others.map((t) => <TripCard key={t.id} trip={t} />)}
                <PlanTile />
              </div>
            </Section>
          ) : (
            <PlanTile wide />
          )}
          <Section title="Past trips">
            {past.length > 0 ? (
              <div className={s.pastRow}>{past.map((t) => <PastCard key={t.id} trip={t} />)}</div>
            ) : (
              <Card media={<Illustration name="memories" size={64} square />} title="Looks a little empty…"
                body="Let’s make some memories. Trips you’ve finished will show up here." />
            )}
          </Section>
        </>
      )}
    </Content>
  );
}

/** "Good morning" before noon, "Good afternoon" until 6pm, then "Good evening". */
function greeting(h = new Date().getHours()) {
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const place = (t: Trip) => t.destination?.name.split(',').slice(0, 2).join(',') ?? 'No destination yet';

/** The trip you're on, or the next one, as the Figma Hero Card: shortcuts into its itinerary, budget and ideas. */
function Hero({ trip }: { trip: Trip }) {
  const profiles = useProfiles(trip.memberIds);
  const activities = useSub(trip.id, 'activities');
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  const base = `/trip/${trip.id}`;
  return (
    <HeroCard
      image={<TripCover trip={trip} />}
      title={trip.name}
      subtitle={`${formatRange(trip.startDate, trip.endDate)} • ${n} day${n === 1 ? '' : 's'}`}
      countries={tripCountries(trip, activities ?? []).map((code) => ({ code, name: countryName(code), flag: flagUrl(code) }))}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      count={countdown(trip.startDate, trip.endDate)}
      actions={(size) => <>
        <LinkButton to={base} size={size} icon="calendar">Itinerary</LinkButton>
        <LinkButton to={`${base}#budget`} variant="secondary" size={size} icon="wallet">Budget</LinkButton>
        <LinkButton to={`${base}/ideas`} variant="secondary" size={size} icon="lightbulb">Ideas</LinkButton>
      </>}
    />
  );
}

const whenLabel = (until: number, n: number) => (until > 0 ? `in ${until} day${until === 1 ? '' : 's'}` : until === 0 ? 'Today' : `${n} day${n === 1 ? '' : 's'}`);

/** A trip in the grid (Figma "Content Card"): cover with when it is and who's going, then name, place and dates. */
function TripCard({ trip }: { trip: Trip }) {
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  const until = daysBetween(today(), trip.startDate);
  const profiles = useProfiles(trip.memberIds);
  return (
    <ContentCard to={`/trip/${trip.id}`} cover={<TripCover trip={trip} />}
      when={tripPhase(trip.startDate, trip.endDate) === 'current' ? 'Happening now' : whenLabel(until, n)}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      name={trip.name} place={place(trip)} dates={formatRange(trip.startDate, trip.endDate)} />
  );
}

/** A finished trip, smaller, in a row that scrolls sideways. */
function PastCard({ trip }: { trip: Trip }) {
  return (
    <CardLink to={`/trip/${trip.id}`} flush className={s.past}>
      <TripCover trip={trip} className={s.pastCover} />
      <div className={s.pastBody}>
        <div className="t-heading-4">{trip.name}</div>
        <div className="t-label-small t-secondary">{formatRange(trip.startDate, trip.endDate)}</div>
      </div>
    </CardLink>
  );
}

// Cities and countries the plan tile cycles through.
const DESTINATIONS = ['Tokyo', 'Lisbon', 'Mexico City', 'Iceland', 'Marrakech', 'Kyoto', 'Cape Town', 'Peru', 'Seoul', 'Istanbul', 'New Zealand', 'Hanoi', 'Buenos Aires', 'Greece', 'Bali', 'Copenhagen'];
const LETTER_DELAY = 0.035; // seconds between letters in the wave
const LETTER_MOVE = 0.35;   // how long one letter takes to slide
const CYCLE = 5.6;          // seconds from one place appearing to the next (in, hold, out)

/**
 * Invites you to plan the next trip. The destination changes letter by letter:
 * each letter slides up just after the one before, like a quick wave.
 */
function PlanTile({ wide }: { wide?: boolean }) {
  const newTrip = useNewTrip();
  const [i, setI] = useState(() => Math.floor(Math.random() * DESTINATIONS.length));
  const [leaving, setLeaving] = useState(false);
  const word = `${DESTINATIONS[i]}?`;
  useEffect(() => {
    // Respect "reduce motion": keep one destination instead of cycling.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wave = (word.length - 1) * LETTER_DELAY + LETTER_MOVE;
    const t = leaving
      ? setTimeout(() => { setLeaving(false); setI((n) => (n + 1) % DESTINATIONS.length); }, wave * 1000)
      : setTimeout(() => setLeaving(true), (CYCLE - wave) * 1000);
    return () => clearTimeout(t);
  }, [leaving, word]);

  return (
    <Card type={wide ? 'large' : 'small'} className={s.plan}
      media={<Illustration name="globe" size={64} square />}
      title={<h2 className={s.planTitle}>
        <span className="visually-hidden">Plan a new trip</span>
        <span key={`${i}-${leaving}`} className={[s.planWord, leaving && s.leaving].filter(Boolean).join(' ')} aria-hidden="true">
          {[...word].map((ch, n) => (
            <span key={n} className={s.letter} style={{ animationDelay: `${n * LETTER_DELAY}s`, animationDuration: `${LETTER_MOVE}s` }}>
              {ch === ' ' ? '\u00a0' : ch}
            </span>
          ))}
        </span>
      </h2>}
      body="There’s so much to see and do. Let’s plan it right."
      actions={<Button icon="plus" size={wide ? 'regular' : 'small'} onClick={newTrip}>Add a trip</Button>} />
  );
}
