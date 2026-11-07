import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, LinkButton, PageSkeleton, Tabs, TripHeader, type TabItem } from '../../design/components';
import { useMe, useProfiles, useRole, useSub, useTrip } from '../../data/hooks';
import { useStarMigration } from '../saves/starEvent';
import type { Activity, Album, Comment, Expense, Idea, Profile, Trip } from '../../data/types';
import { daysBetween, formatRange, today } from '../../lib/dates';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { Content } from '../../app/Shell';
import { ActivityPage } from './ActivityPage';
import { Bookings } from './Bookings';
import { Overview } from './Overview';
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
  if (trip === undefined) return <PageSkeleton />;
  if (trip === null)
    return (
      <Content>
        <EmptyState illustration="compass" title="Trip not found" message="It may have been deleted, or you're not a member yet. Ask the organizer for an invite link."
          action={<LinkButton to="/trips" variant="secondary">Back to trips</LinkButton>} />
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
  const me = useMe();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const planPage = useMatch('/trip/:tripId/plan/:activityId');

  useStarMigration(trip.id, activities ?? [], me.uid);
  if (!activities || !ideas || !expenses || !comments || !albums) return <PageSkeleton />;
  const ctx: TripCtx = { trip, activities, ideas, expenses, comments, albums, profiles, canManage, isOwner };
  const nDays = daysBetween(trip.startDate, trip.endDate) + 1;
  const t = today();
  const until = daysBetween(t, trip.startDate);
  const when = t < trip.startDate ? (until === 1 ? 'tomorrow' : `in ${until} days`) : t <= trip.endDate ? `day ${daysBetween(trip.startDate, t) + 1}` : 'done';
  const countries = tripCountries(trip, activities).map((code) => ({ code, name: countryName(code), flag: flagUrl(code) }));

  const base = `/trip/${trip.id}`;
  const section = pathname.slice(base.length + 1).split('/')[0];
  // Figma "Tab Bar": Overview, Itinerary, Ideas, Photos, People (labels only; it scrolls sideways on narrow phones).
  const tabs: TabItem[] = [
    { to: base, label: 'Overview', active: section === '' },
    { to: `${base}/itinerary`, label: 'Itinerary', active: section === 'itinerary' },
    { to: `${base}/ideas`, label: 'Ideas', active: section === 'ideas' },
    { to: `${base}/photos`, label: 'Photos', active: section === 'photos' },
    { to: `${base}/people`, label: 'People', active: section === 'people' },
  ];

  // An event's own page and the bookings lists replace the trip header and tabs.
  if (planPage || section === 'bookings')
    return (
      <Content>
        <Routes>
          <Route path="plan/:activityId" element={<ActivityPage {...ctx} />} />
          <Route path="bookings/:group" element={<Bookings {...ctx} />} />
        </Routes>
      </Content>
    );

  return (
    <>
      <Content>
        {/* Figma "Trip header": back to Trips, the name (Title small) with Edit, the meta line, country chips and who's going */}
        <TripHeader
          title={trip.name}
          back={{ to: '/trips', label: 'Trips' }}
          action={canManage ? { icon: 'pencil', label: 'Edit trip', onClick: () => setEditing(true) } : undefined}
          meta={`${formatRange(trip.startDate, trip.endDate)} · ${nDays} day${nDays === 1 ? '' : 's'} · ${when}`}
          countries={countries}
          going={{ label: `${trip.memberIds.length} going`, to: `${base}/people` }}
        />
        <div className={s.sectionNav}>
          <Tabs items={tabs} label="Trip sections" />
        </div>
        {/* At least a screen tall, so switching to a shorter tab never pulls the page (and the tabs) up. */}
        <div className={s.tabPanel}>
        <Routes>
          <Route index element={<Overview {...ctx} onSetBudget={canManage ? () => setEditing(true) : undefined} />} />
          <Route path="itinerary" element={<Itinerary {...ctx} />} />
          <Route path="ideas" element={<Ideas {...ctx} />} />
          <Route path="budget" element={<Navigate to={base} replace />} />
          <Route path="photos" element={<Photos {...ctx} />} />
          <Route path="info" element={<Navigate to={base} replace />} />
          <Route path="people" element={<People {...ctx} />} />
        </Routes>
        </div>
      </Content>
      <TripForm open={editing} trip={trip} onClose={() => setEditing(false)} onDeleted={isOwner ? () => navigate('/trips') : undefined} />
    </>
  );
}
