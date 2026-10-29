import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarStack, Badge, Button, Card, CardLink, Icon, PageHeader, Section, Spinner, type IconName } from '../../design/components';
import { personName, useActivitiesFor, useMe, useMyTrips, useProfile, useProfiles } from '../../data/hooks';
import type { Activity, Category, Place, Trip } from '../../data/types';
import { categoryInfo } from '../../lib/categories';
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
  const plan = <PlanCard onPlan={() => setCreating(true)} />;

  return (
    <>
      <Content>
        <PageHeader title="Where to next?" />
        <section className={s.profile} aria-label="You">
          {/* With no top bar, the avatar is the way into your profile and settings; the emerald ring marks it as a button. */}
          <Link to="/profile" className={s.me} aria-label="Your profile and settings">
            <Avatar name={name} photo={photo} seed={me.uid} size={64} />
          </Link>
          <h2 className="t-title1">Hi, {name.split(' ')[0]}</h2>
        </section>

        {trips === null ? <Spinner center /> : (
          <>
            {current.length > 0 && <TripGroup title="Happening now" trips={current} />}
            {upcoming.length > 0 ? <TripGroup title="Upcoming" trips={upcoming}>{plan}</TripGroup> : plan}
            <TripGroup title="Past trips" trips={past}>
              {past.length === 0 && <div className={s.emptyPast}>Looks a little empty… let’s make some memories.</div>}
            </TripGroup>
            <TravelStats trips={[...past, ...current]} home={profile?.home ?? null} visited={profile?.visited ?? []} meId={me.uid} />
          </>
        )}
      </Content>
      <TripForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/trip/${id}`)} />
    </>
  );
}

// Cities and countries the plan card cycles through.
const DESTINATIONS = ['Tokyo', 'Lisbon', 'Mexico City', 'Iceland', 'Marrakech', 'Kyoto', 'Cape Town', 'Peru', 'Seoul', 'Istanbul', 'New Zealand', 'Hanoi', 'Buenos Aires', 'Greece', 'Bali', 'Copenhagen'];

/** A bright "moment" that invites you to plan a trip: the destination in the title changes every few seconds. */
function PlanCard({ onPlan }: { onPlan: () => void }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * DESTINATIONS.length));
  useEffect(() => {
    // Respect "reduce motion": keep one destination instead of cycling.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % DESTINATIONS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <Card tone="accent" className={s.plan}>
      <h2 className={s.planTitle}>
        <span className="visually-hidden">Plan a new trip</span>
        <span key={i} className={s.planPlace} aria-hidden="true">{DESTINATIONS[i]}?</span>
      </h2>
      <p className="t-body">There’s so much to see and do. Let’s plan it right.</p>
      <div><Button variant="inverse" size="large" icon="plus" onClick={onPlan}>Plan your next journey</Button></div>
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

/** Great-circle distance in miles. */
function miles(a: Place, b: Place) {
  const r = Math.PI / 180, R = 3958.8;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fmt = (n: number) => new Intl.NumberFormat(undefined, { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: n >= 100000 ? 1 : 0 }).format(n);

/**
 * Your travels in numbers, from past and current trips. Places count itinerary
 * plans that have happened and that you went to (or that nobody marked attendance for).
 */
function TravelStats({ trips, home, visited, meId }: { trips: Trip[]; home: Place | null; visited: Place[]; meId: string }) {
  const byTrip = useActivitiesFor(trips.map((t) => t.id));
  const t0 = today();
  const seen: Activity[] = Object.values(byTrip).flat().filter((a) => a.date <= t0 && (a.attendeeIds.length === 0 || a.attendeeIds.includes(meId)));
  const count = (c: Category) => seen.filter((a) => a.category === c).length;
  const places = [...trips.flatMap((t) => (t.destination ? [t.destination] : [])), ...visited];
  const countries = new Set(places.map((p) => p.country ?? p.name.split(',').pop()!.trim())).size;
  const cities = new Set(places.map((p) => p.name.split(',')[0].trim().toLowerCase())).size;
  const pastOnly = trips.filter((t) => t.endDate < t0);
  const days = pastOnly.reduce((n, t) => n + daysBetween(t.startDate, t.endDate) + 1, 0);
  const travelled = home ? Math.round(pastOnly.reduce((n, t) => n + (t.destination ? 2 * miles(home, t.destination) : 0), 0)) : null;

  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: 'plane', value: fmt(pastOnly.length), label: pastOnly.length === 1 ? 'Trip taken' : 'Trips taken' },
    { icon: 'globe', value: fmt(countries), label: countries === 1 ? 'Country' : 'Countries' },
    { icon: 'pin', value: fmt(cities), label: cities === 1 ? 'City' : 'Cities' },
    { icon: 'calendar', value: fmt(days), label: days === 1 ? 'Day away' : 'Days away' },
    { icon: 'map', value: travelled === null ? '—' : fmt(travelled), label: 'Miles travelled' },
    ...(['sight', 'food', 'cafe', 'drinks', 'activity'] as const).map((c) => ({ icon: categoryInfo(c).icon, value: fmt(count(c)), label: STAT_LABEL[c] })),
  ];
  return (
    <Section title="Your travels" footer={travelled === null ? <>Add your home city in <Link to="/profile">Profile</Link> to count miles travelled.</> : 'Miles are there and back from your home city.'}>
      <div className={s.stats}>
        {stats.map((st) => (
          <div key={st.label} className={s.stat}>
            <span className={s.statIcon}><Icon name={st.icon} size={18} /></span>
            <span className={s.statValue}>{st.value}</span>
            <span className="t-footnote t-secondary">{st.label}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

const STAT_LABEL: Record<'sight' | 'food' | 'cafe' | 'drinks' | 'activity', string> = { sight: 'Sights seen', food: 'Restaurants', cafe: 'Cafés', drinks: 'Bars', activity: 'Activities' };
