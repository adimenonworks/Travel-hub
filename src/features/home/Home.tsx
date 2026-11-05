import { useEffect, useState } from 'react';
import { Banner, Button, Card, HeroCard, Illustration, PageHeader } from '../../design/components';
import { personName, useMe, useMyTrips, useProfile, useProfiles, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { daysBetween, formatRange } from '../../lib/dates';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { Content, useNewTrip } from '../../app/Shell';
import s from './Home.module.css';
import { featuredTrip } from '../../lib/trips';

/**
 * Home (Figma "Home tab"): a greeting; the trip you're on or the next one (Hero Card, White, no cover);
 * then "What's next?": the plan tile and three Banners that invite you to plan. Your trips list lives on the Trips tab.
 */
export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const name = profile?.name || me.name;
  const featured = featuredTrip(trips);
  const newTrip = useNewTrip();

  return (
    <Content className={s.home}>
      <PageHeader title={`Hi, ${name.split(' ')[0]}`} fit />
      <div className={s.sections}>
        {featured && (
          <>
            <section className={s.block}>
              <h2 className={s.bigTitle}>Upcoming</h2>
              <UpcomingTrip trip={featured} />
            </section>
            <hr className={s.divider} />
          </>
        )}
        <h2 className={s.bigTitle}>What’s next?</h2>
        <PlanTile />
        <Banner tone="brand" label="Welcome to Rove" subtext="Have a holiday coming up? Add all your plans, let us handle the day to day."
          media={<span className={s.logo}><BrandMark /></span>}
          action={<Button variant="inverse" onClick={newTrip}>Plan your upcoming holiday</Button>} />
        <Banner tone="orange" label="Craft your dream getaway" subtext="Dream destination? Keep your top links, posts, and places saved, accessible anytime, anywhere."
          media={['jp', 'it', 'mx'].map((c) => <span key={c} className={s.flagDisc}><img src={flagUrl(c)} alt="" /></span>)}
          action={<Button variant="tertiary" onClick={newTrip}>Plan your next holiday</Button>} />
        <Banner tone="green" label="Travel with us… or friends" subtext="Whether you’re heading off on your own or rallying the crew, we’re here to help."
          media={<Illustration name="people" size={96} />}
          action={<Button variant="tertiary" onClick={newTrip}>Plan your upcoming holiday</Button>} />
      </div>
    </Content>
  );
}

/** The trip you're on, or the next one: the Hero Card panel only (Tone=White, no cover). Tapping it opens the trip. */
function UpcomingTrip({ trip }: { trip: Trip }) {
  const profiles = useProfiles(trip.memberIds);
  const activities = useSub(trip.id, 'activities');
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  return (
    <HeroCard tone="white" cover={false} to={`/trip/${trip.id}`}
      title={trip.name}
      subtitle={`${formatRange(trip.startDate, trip.endDate)} • ${n} day${n === 1 ? '' : 's'}`}
      countries={tripCountries(trip, activities ?? []).map((code) => ({ code, name: countryName(code), flag: flagUrl(code) }))}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))} />
  );
}

/** Rove's walker R (the app icon's figure), in the brand text colour. */
function BrandMark() {
  return (
    <svg viewBox="50 24 108 144" width="44" height="58" aria-hidden="true" fill="currentColor">
      <path d="M84.4232 59.0739C92.9967 59.0739 99.9468 52.2745 99.9468 43.8871C99.9468 35.4996 92.9967 28.7002 84.4232 28.7002C75.8498 28.7002 68.8996 35.4996 68.8996 43.8871C68.8996 52.2745 75.8498 59.0739 84.4232 59.0739Z" />
      <path d="M80.3356 69.9116C81.4545 64.0216 87.2419 60.1337 93.2625 61.2281C99.2832 62.3228 103.257 67.9856 102.139 73.8757L96.4341 103.905C96.3784 104.198 96.3097 104.489 96.2295 104.777L94.485 111.034L126.524 146.236C130.596 150.71 130.19 157.567 125.617 161.551C121.043 165.535 114.033 165.137 109.961 160.663L86.3702 134.744L78.2359 157.089C76.1812 162.733 69.8391 165.679 64.0702 163.668C58.3015 161.658 55.2911 155.454 57.3458 149.81L71.6176 110.608L74.7113 99.5067L80.3356 69.9116Z" />
      <path d="M106.046 69.7758C106.266 68.6035 107.311 67.7521 108.529 67.7521H119.594C150.869 67.7521 154.161 111.143 119.594 111.143H101.314C99.7368 111.143 98.546 109.745 98.8307 108.228L106.046 69.7758Z" />
    </svg>
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
function PlanTile() {
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
    <Card className={s.plan}
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
      actions={<Button block onClick={newTrip}>Plan your next holiday</Button>} />
  );
}
