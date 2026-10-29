import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarStack, Badge, Button, Card, CardLink, Icon, Illustration, PageHeader, Section, Spinner } from '../../design/components';
import { personName, useMe, useMyTrips, useProfile, useProfiles } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { coverPosition } from '../../lib/image';
import { daysBetween, formatRange, today, tripPhase } from '../../lib/dates';
import { Content } from '../../app/Shell';
import { TripForm } from '../trip/TripForm';
import s from './Home.module.css';

export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  // The saved profile wins over the sign-in account, so a chosen nickname or photo shows here.
  const name = profile?.name || me.name;
  const photo = profile ? profile.photo : me.photo;

  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const current = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'current');
  const upcoming = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'upcoming');
  const past = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();
  const daysAway = past.reduce((n, t) => n + daysBetween(t.startDate, t.endDate) + 1, 0);
  const places = new Set([...past.flatMap((t) => (t.destination ? [t.destination] : [])), ...(profile?.visited ?? [])]
    .map((p) => p.name.split(',')[0].trim().toLowerCase())).size;
  const plan = <PlanCard onPlan={() => setCreating(true)} />;

  return (
    <>
      <Content>
        <PageHeader title="Where to next?" />
        <section className={s.profile} aria-label="You">
          <div className={s.who}>
            {/* With no top bar, the avatar is the way into your profile and settings; the emerald ring marks it as a button. */}
            <Link to="/profile" className={s.me} aria-label="Your profile, travel stats and settings">
              <Avatar name={name} photo={photo} seed={me.uid} size={64} />
            </Link>
            <h2 className="t-title1">{greeting()}, {name.split(' ')[0]}</h2>
          </div>
          <dl className={s.headStats}>
            <div><dt>Trips</dt><dd>{all.length}</dd></div>
            <div><dt>Days away</dt><dd>{daysAway}</dd></div>
            <div><dt>Places</dt><dd>{places}</dd></div>
          </dl>
        </section>

        {trips === null ? <Spinner center /> : (
          <>
            {current.length > 0 && <TripGroup title="Happening now" trips={current} />}
            {upcoming.length > 0 ? <TripGroup title="Upcoming trips" trips={upcoming}>{plan}</TripGroup> : plan}
            <TripGroup title="Past trips" trips={past}>
              {past.length === 0 && (
                <Card className={s.emptyPast} media={<Illustration name="memories" />}>
                  <p className="t-headline">Looks a little empty…</p>
                  <p className="t-subhead t-secondary">Let’s make some memories. Trips you’ve finished will show up here.</p>
                </Card>
              )}
            </TripGroup>
          </>
        )}
      </Content>
      <TripForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/trip/${id}`)} />
    </>
  );
}

/** "Good morning" before noon, "Good afternoon" until 6pm, then "Good evening". */
function greeting(h = new Date().getHours()) {
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// Cities and countries the plan card cycles through.
const DESTINATIONS = ['Tokyo', 'Lisbon', 'Mexico City', 'Iceland', 'Marrakech', 'Kyoto', 'Cape Town', 'Peru', 'Seoul', 'Istanbul', 'New Zealand', 'Hanoi', 'Buenos Aires', 'Greece', 'Bali', 'Copenhagen'];
const LETTER_DELAY = 0.1; // seconds between letters in the wave
const LETTER_MOVE = 0.5;  // how long one letter takes to slide
const HOLD = 3.2;         // how long a name stays before the next one

/**
 * A bright "moment" that invites you to plan a trip. The destination changes
 * letter by letter: each letter slides up 0.1s after the one before, like a wave.
 */
function PlanCard({ onPlan }: { onPlan: () => void }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * DESTINATIONS.length));
  const [leaving, setLeaving] = useState(false);
  const word = `${DESTINATIONS[i]}?`;
  useEffect(() => {
    // Respect "reduce motion": keep one destination instead of cycling.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wave = (word.length - 1) * LETTER_DELAY + LETTER_MOVE;
    const t = leaving
      ? setTimeout(() => { setLeaving(false); setI((n) => (n + 1) % DESTINATIONS.length); }, wave * 1000)
      : setTimeout(() => setLeaving(true), (wave + HOLD) * 1000);
    return () => clearTimeout(t);
  }, [leaving, word]);

  return (
    <Card tone="accent" className={s.plan} media={<Icon name="globe" size={56} strokeWidth={1.4} />}
      action={<Button variant="inverse" size="large" icon="plus" onClick={onPlan}>Plan your next journey</Button>}>
      <h2 className={s.planTitle}>
        <span className="visually-hidden">Plan a new trip</span>
        <span key={`${i}-${leaving}`} className={[s.planWord, leaving && s.leaving].filter(Boolean).join(' ')} aria-hidden="true">
          {[...word].map((ch, n) => (
            <span key={n} className={s.letter} style={{ animationDelay: `${n * LETTER_DELAY}s`, animationDuration: `${LETTER_MOVE}s` }}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </span>
      </h2>
      <p className="t-body">There’s so much to see and do. Let’s plan it right.</p>
    </Card>
  );
}

const whenLabel = (until: number, n: number) => (until > 0 ? `in ${until} day${until === 1 ? '' : 's'}` : until === 0 ? 'Today' : `${n} day${n === 1 ? '' : 's'}`);

function TripGroup({ title, trips, children }: { title: string; trips: Trip[]; children?: React.ReactNode }) {
  const ids = Array.from(new Set(trips.flatMap((t) => t.memberIds)));
  const profiles = useProfiles(ids);
  return (
    <Section title={title}>
      {trips.length > 0 && <div className={s.grid}>
        {trips.map((t) => {
          const n = daysBetween(t.startDate, t.endDate) + 1;
          const until = daysBetween(today(), t.startDate);
          return (
            <CardLink key={t.id} to={`/trip/${t.id}`} flush className={[s.trip, t.coverPhoto && s.withPhoto].filter(Boolean).join(' ')}>
              {/* A cover photo fills the whole card, darkened at the bottom so the text stays readable. */}
              {t.coverPhoto && <div className={s.photo} style={{ backgroundImage: `url(${t.coverPhoto})`, backgroundPosition: coverPosition(t) }} />}
              <div className={s.tripBody}>
                <span className={s.when}>
                  {t.coverPhoto
                    ? <span className={s.photoBadge}>{whenLabel(until, n)}</span>
                    : <Badge>{whenLabel(until, n)}</Badge>}
                </span>
                <span className={s.spacer} />
                <div className="t-title3">{t.name}</div>
                <div className="t-subhead t-secondary">{t.destination?.name.split(',').slice(0, 2).join(',') ?? 'No destination yet'}</div>
                <div className={s.tripFoot}>
                  <span className="t-footnote t-secondary">{formatRange(t.startDate, t.endDate)}</span>
                  <AvatarStack people={t.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))} size={24} />
                </div>
              </div>
            </CardLink>
          );
        })}
      </div>}
      {children}
    </Section>
  );
}
