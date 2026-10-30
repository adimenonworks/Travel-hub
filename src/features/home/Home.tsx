import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AvatarStack, Badge, Button, Card, CardLink, COVER_ILLUSTRATIONS, Illustration, LinkButton, PageHeader, Section, Spinner } from '../../design/components';
import { personName, useMe, useMyTrips, useProfile, useProfiles } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { coverPosition } from '../../lib/image';
import { daysBetween, formatRange, today, tripPhase } from '../../lib/dates';
import { Content, useNewTrip } from '../../app/Shell';
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
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <Content>
      <PageHeader title={`${greeting()}, ${name.split(' ')[0]}`}
        subtitle={`${plural(all.length, 'trip')} · ${plural(daysAway, 'day')} away · ${plural(places, 'place')}`} />

      {trips === null ? <Spinner center /> : (
        <>
          {featured && <Hero trip={featured} now={current.includes(featured)} />}
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
              <Card className={s.emptyPast} media={<Illustration name="memories" />}>
                <p className="t-headline">Looks a little empty…</p>
                <p className="t-subhead t-secondary">Let’s make some memories. Trips you’ve finished will show up here.</p>
              </Card>
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

/** The trip's photo, or else one of the illustrated scenes (always the same one for the same trip). */
function Cover({ trip, className }: { trip: Trip; className: string }) {
  if (trip.coverPhoto) return <img src={trip.coverPhoto} alt="" className={className} style={{ objectPosition: coverPosition(trip) }} />;
  let h = 0;
  for (const c of trip.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return <div className={className}><Illustration name={COVER_ILLUSTRATIONS[Math.abs(h) % COVER_ILLUSTRATIONS.length]} /></div>;
}

const place = (t: Trip) => t.destination?.name.split(',').slice(0, 2).join(',') ?? 'No destination yet';

/** The big card for the trip you're on or the next one: cover, countdown and quick links into it. */
function Hero({ trip, now }: { trip: Trip; now: boolean }) {
  const profiles = useProfiles(trip.memberIds);
  const total = daysBetween(trip.startDate, trip.endDate) + 1;
  const until = daysBetween(today(), trip.startDate);
  const [big, small] = now
    ? [`Day ${daysBetween(trip.startDate, today()) + 1}`, `of ${total}`]
    : until === 1 ? ['Tomorrow', ''] : [String(until), 'days to go'];
  const base = `/trip/${trip.id}`;
  return (
    // The brand (accent) card: emerald, with every text, badge and button on it in the dark emerald partner.
    <Card tone="accent" flush className={s.hero} role="region" aria-labelledby="hero-title">
      <Cover trip={trip} className={s.heroCover} />
      <div className={s.heroBody}>
        <div className={s.heroMain}>
          <Badge>{now ? 'Happening now' : 'Next up'}</Badge>
          <h2 id="hero-title" className={`t-title1 ${s.heroTitle}`}><Link to={base} className={s.heroLink}>{trip.name}</Link></h2>
          <p className="t-callout t-secondary">{place(trip)} · {formatRange(trip.startDate, trip.endDate)}</p>
        </div>
        <p className={s.countdown}><span className={s.countBig}>{big}</span> {small && <span className={`t-title3 ${s.countSmall}`}>{small}</span>}</p>
        <div className={s.heroFoot}>
          <div className={s.heroLinks}>
            <LinkButton to={base} variant="inverse" icon="calendar">Itinerary</LinkButton>
            <LinkButton to={`${base}/ideas`} variant="ghost" icon="lightbulb">Ideas</LinkButton>
            <LinkButton to={`${base}/budget`} variant="ghost" icon="wallet">Budget</LinkButton>
          </div>
          <AvatarStack people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))} size={32} />
        </div>
      </div>
    </Card>
  );
}

const whenLabel = (until: number, n: number) => (until > 0 ? `in ${until} day${until === 1 ? '' : 's'}` : until === 0 ? 'Today' : `${n} day${n === 1 ? '' : 's'}`);

/** A trip in the grid: cover on top, then its name, place, dates and who's going. */
function TripCard({ trip }: { trip: Trip }) {
  const profiles = useProfiles(trip.memberIds);
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  const until = daysBetween(today(), trip.startDate);
  return (
    <CardLink to={`/trip/${trip.id}`} flush className={s.trip}>
      <div className={s.coverWrap}>
        <Cover trip={trip} className={s.cover} />
        <span className={s.coverBadge}>{tripPhase(trip.startDate, trip.endDate) === 'current' ? 'Happening now' : whenLabel(until, n)}</span>
      </div>
      <div className={s.tripBody}>
        <div className="t-title3">{trip.name}</div>
        <div className="t-subhead t-secondary">{place(trip)}</div>
        <div className={s.tripFoot}>
          <span className="t-footnote t-secondary">{formatRange(trip.startDate, trip.endDate)}</span>
          <AvatarStack people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))} size={24} />
        </div>
      </div>
    </CardLink>
  );
}

/** A finished trip, smaller, in a row that scrolls sideways. */
function PastCard({ trip }: { trip: Trip }) {
  return (
    <CardLink to={`/trip/${trip.id}`} flush className={s.past}>
      <Cover trip={trip} className={s.pastCover} />
      <div className={s.pastBody}>
        <div className="t-headline">{trip.name}</div>
        <div className="t-footnote t-secondary">{formatRange(trip.startDate, trip.endDate)}</div>
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
    <div className={[s.plan, wide && s.planWide].filter(Boolean).join(' ')}>
      <Illustration name="globe" size={wide ? 120 : 96} />
      <div className={s.planText}>
        <h2 className="t-title2">
          <span className="visually-hidden">Plan a new trip</span>
          <span key={`${i}-${leaving}`} className={[s.planWord, leaving && s.leaving].filter(Boolean).join(' ')} aria-hidden="true">
            {[...word].map((ch, n) => (
              <span key={n} className={s.letter} style={{ animationDelay: `${n * LETTER_DELAY}s`, animationDuration: `${LETTER_MOVE}s` }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </h2>
        <p className="t-subhead t-secondary">There’s so much to see and do. Let’s plan it right.</p>
      </div>
      <Button icon="plus" onClick={newTrip}>Add a trip</Button>
    </div>
  );
}
