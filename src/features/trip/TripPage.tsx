import { useState, type CSSProperties } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { Button, EmptyState, Icon, LinkButton, PageHeader, Spinner, Tabs, type TabItem } from '../../design/components';
import { useProfiles, useRole, useSub, useTrip } from '../../data/hooks';
import type { Activity, Album, Comment, Expense, Idea, Profile, Trip } from '../../data/types';
import { coverColor } from '../../lib/colors';
import { daysBetween, formatRange } from '../../lib/dates';
import { Content } from '../../app/Shell';
import { Budget } from './Budget';
import { Ideas } from './Ideas';
import { Info } from './Info';
import { Itinerary } from './Itinerary';
import { People } from './People';
import { Photos } from './Photos';
import { TripForm } from './TripForm';
import s from './trip.module.css';

export type TripCtx = {
  trip: Trip;
  activities: Activity[];
  ideas: Idea[];
  expenses: Expense[];
  comments: Comment[];
  albums: Album[];
  profiles: Record<string, Profile>;
  canManage: boolean;
  isOwner: boolean;
};

export function TripPage() {
  const { tripId = '' } = useParams();
  const trip = useTrip(tripId);
  if (trip === undefined) return <Spinner center />;
  if (trip === null)
    return (
      <Content>
        <EmptyState icon="info" title="Trip not found" message="It may have been deleted, or you're not a member yet. Ask the organizer for an invite link."
          action={<LinkButton to="/" variant="tinted">Back to trips</LinkButton>} />
      </Content>
    );
  return <TripLoaded trip={trip} />;
}

function TripLoaded({ trip }: { trip: Trip }) {
  const activities = useSub(trip.id, 'activities');
  const ideas = useSub(trip.id, 'ideas');
  const expenses = useSub(trip.id, 'expenses');
  const comments = useSub(trip.id, 'comments');
  const albums = useSub(trip.id, 'albums');
  const profiles = useProfiles(trip.memberIds);
  const { canManage, isOwner } = useRole(trip);
  const [editing, setEditing] = useState(false);

  if (!activities || !ideas || !expenses || !comments || !albums) return <Spinner center />;
  const ctx: TripCtx = { trip, activities, ideas, expenses, comments, albums, profiles, canManage, isOwner };
  const nDays = daysBetween(trip.startDate, trip.endDate) + 1;

  const base = `/trip/${trip.id}`;
  const tabs: TabItem[] = [
    { to: base, label: 'Itinerary', end: true },
    { to: `${base}/ideas`, label: 'Ideas', count: ideas.filter((i) => i.status === 'open').length },
    { to: `${base}/budget`, label: 'Budget' },
    { to: `${base}/photos`, label: 'Photos', count: albums.length },
    { to: `${base}/info`, label: 'Info' },
    { to: `${base}/people`, label: 'People' },
  ];

  return (
    <>
      <Content>
        <PageHeader
          title={trip.name}
          back={{ to: '/', label: 'Trips' }}
          actions={canManage && <Button variant="gray" icon="pencil" onClick={() => setEditing(true)}>Edit trip</Button>}
        />
        <div className={s.hero} style={{ '--trip-color': coverColor(trip.coverColor) } as CSSProperties}>
          {trip.coverPhoto && <img src={trip.coverPhoto} alt="" className={s.heroPhoto} />}
          <span><Icon name="pin" size={20} />{trip.destination?.name ?? 'No destination'}</span>
          <span><Icon name="calendar" size={20} />{formatRange(trip.startDate, trip.endDate)} · {nDays} day{nDays === 1 ? '' : 's'}</span>
          <span><Icon name="people" size={20} />{trip.memberIds.length} traveler{trip.memberIds.length === 1 ? '' : 's'}</span>
        </div>
        <div className={s.sectionNav}>
          <Tabs items={tabs} label="Trip sections" />
        </div>
        <Routes>
          <Route index element={<Itinerary {...ctx} />} />
          <Route path="ideas" element={<Ideas {...ctx} />} />
          <Route path="budget" element={<Budget {...ctx} />} />
          <Route path="photos" element={<Photos {...ctx} />} />
          <Route path="info" element={<Info {...ctx} />} />
          <Route path="people" element={<People {...ctx} />} />
        </Routes>
      </Content>
      <TripForm open={editing} trip={trip} onClose={() => setEditing(false)} />
    </>
  );
}
