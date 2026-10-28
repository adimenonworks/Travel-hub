import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarStack, Button, Card, CardLink, EmptyState, PageHeader, Section, Spinner } from '../../design/components';
import { personName, useMe, useMyTrips, useProfile, useProfiles } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { coverColor } from '../../lib/colors';
import { daysBetween, formatRange, today, tripPhase } from '../../lib/dates';
import { Content } from '../../app/Shell';
import { MapView } from '../shared/MapView';
import { TripForm } from '../trip/TripForm';
import s from './Home.module.css';

export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const current = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'current');
  const upcoming = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'upcoming');
  const past = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();

  const visited = [
    ...past.filter((t) => t.destination).map((t) => ({ ...t.destination!, label: t.name })),
    ...(profile?.visited ?? []).map((p) => ({ ...p, label: p.name })),
  ];
  const daysTraveled = past.reduce((n, t) => n + daysBetween(t.startDate, t.endDate) + 1, 0);
  const next = upcoming[0];

  return (
    <>
      <Content>
        <PageHeader title="Trips" actions={<Button icon="plus" onClick={() => setCreating(true)}>New trip</Button>} />
        <Card tone="accent" className={s.profile}>
          <Avatar name={me.name} photo={me.photo} seed={me.uid} size={64} />
          <div className={s.profileText}>
            <h2 className="t-title1">Hi, {me.name.split(' ')[0]}</h2>
            <div className="t-callout">
              {next ? `${next.name} starts in ${daysBetween(today(), next.startDate)} days` : current.length ? `You're on ${current[0].name} right now` : 'No trips planned yet'}
            </div>
          </div>
          <div className={s.stats}>
            <Stat value={all.length} label="Trips" />
            <Stat value={daysTraveled} label="Days away" />
            <Stat value={new Set(visited.map((v) => v.country ?? v.name)).size} label="Places" />
          </div>
        </Card>

        {trips === null ? <Spinner center /> : all.length === 0 ? (
          <Card>
            <EmptyState icon="plane" title="Plan your first trip" message="Add a destination and dates, then invite your travel crew."
              action={<Button icon="plus" onClick={() => setCreating(true)}>New trip</Button>} />
          </Card>
        ) : (
          <>
            {current.length > 0 && <TripGroup title="Happening now" trips={current} />}
            {upcoming.length > 0 && <TripGroup title="Upcoming" trips={upcoming} />}
            {past.length > 0 && <TripGroup title="Past trips" trips={past} />}
          </>
        )}

        <Section title="Where you've been" action={<Link to="/profile">Add places</Link>}
          footer="Past trips appear here automatically. Add your home and other places from your profile.">
          <MapView pins={[
            ...(profile?.home ? [{ lat: profile.home.lat, lng: profile.home.lng, label: `Home · ${profile.home.name}`, kind: 'home' as const }] : []),
            ...visited.map((v) => ({ lat: v.lat, lng: v.lng, label: v.label })),
          ]} height={260} />
        </Section>
      </Content>
      <TripForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/trip/${id}`)} />
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={s.stat}>
      <div className={s.statValue}>{value}</div>
      <div className="t-footnote">{label}</div>
    </div>
  );
}

function TripGroup({ title, trips }: { title: string; trips: Trip[] }) {
  const ids = Array.from(new Set(trips.flatMap((t) => t.memberIds)));
  const profiles = useProfiles(ids);
  return (
    <Section title={title}>
      <div className={s.grid}>
        {trips.map((t) => {
          const n = daysBetween(t.startDate, t.endDate) + 1;
          const until = daysBetween(today(), t.startDate);
          return (
            <CardLink key={t.id} to={`/trip/${t.id}`} flush>
              <div className={s.cover} style={{ background: coverColor(t.coverColor) }}>
                <span className={s.coverBadge}>{until > 0 ? `in ${until} day${until === 1 ? '' : 's'}` : until === 0 ? 'Today' : `${n} day${n === 1 ? '' : 's'}`}</span>
              </div>
              <div className={s.tripBody}>
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
      </div>
    </Section>
  );
}
