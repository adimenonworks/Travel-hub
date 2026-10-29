import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Icon, LinkButton, PageHeader, Spinner, Tabs, type TabItem } from '../../design/components';
import { useProfiles, useRole, useSub, useTrip } from '../../data/hooks';
import type { Activity, Album, Comment, Expense, Idea, Profile, Trip } from '../../data/types';
import { daysBetween, formatRange } from '../../lib/dates';
import { coverPosition } from '../../lib/image';
import { Content } from '../../app/Shell';
import { ActivityPage } from './ActivityPage';
import { Budget } from './Budget';
import { Ideas } from './Ideas';
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const planPage = useMatch('/trip/:tripId/plan/:activityId');

  if (!activities || !ideas || !expenses || !comments || !albums) return <Spinner center />;
  const ctx: TripCtx = { trip, activities, ideas, expenses, comments, albums, profiles, canManage, isOwner };
  const nDays = daysBetween(trip.startDate, trip.endDate) + 1;

  const base = `/trip/${trip.id}`;
  const section = pathname.slice(base.length + 1).split('/')[0];
  const tabs: TabItem[] = [
    { to: base, label: 'Itinerary', active: section === '' },
    { to: `${base}/ideas`, label: 'Ideas', count: ideas.filter((i) => i.status === 'open').length, active: section === 'ideas' },
    { to: `${base}/budget`, label: 'Budget', active: section === 'budget' },
    { to: `${base}/photos`, label: 'Photos', count: albums.length, active: section === 'photos' },
    { to: `${base}/people`, label: 'People', active: section === 'people' },
  ];

  // A plan's own page replaces the trip header and tabs.
  if (planPage)
    return (
      <Content>
        <Routes><Route path="plan/:activityId" element={<ActivityPage {...ctx} />} /></Routes>
      </Content>
    );

  return (
    <>
      <Content>
        <PageHeader
          title={trip.name}
          back={{ to: '/', label: 'Trips' }}
        />
        <div className={s.hero}>
          {trip.coverPhoto && <img src={trip.coverPhoto} alt="" className={s.heroPhoto} style={{ objectPosition: coverPosition(trip) }} />}
          <span><Icon name="pin" size={20} />{trip.destination?.name ?? 'No destination'}</span>
          <span><Icon name="calendar" size={20} />{formatRange(trip.startDate, trip.endDate)} · {nDays} day{nDays === 1 ? '' : 's'}</span>
          <span><Icon name="people" size={20} />{trip.memberIds.length} traveler{trip.memberIds.length === 1 ? '' : 's'}</span>
          {canManage && <Button variant="ghost" icon="pencil" className={s.heroEdit} onClick={() => setEditing(true)}>Edit trip</Button>}
        </div>
        <div className={s.sectionNav}>
          <Tabs items={tabs} label="Trip sections" />
        </div>
        <Routes>
          <Route index element={<Itinerary {...ctx} />} />
          <Route path="ideas" element={<Ideas {...ctx} />} />
          <Route path="budget" element={<Budget {...ctx} />} />
          <Route path="photos" element={<Photos {...ctx} />} />
          <Route path="info" element={<Navigate to={base} replace />} />
          <Route path="people" element={<People {...ctx} />} />
        </Routes>
      </Content>
      <TripForm open={editing} trip={trip} onClose={() => setEditing(false)} onDeleted={isOwner ? () => navigate('/') : undefined} />
    </>
  );
}
