import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, HeroCard, LinkButton, PageHeader, Spinner, Tabs, type TabItem } from '../../design/components';
import { personName, useProfiles, useRole, useSub, useTrip } from '../../data/hooks';
import type { Activity, Album, Comment, Expense, Idea, Profile, Trip } from '../../data/types';
import { countdown, daysBetween, formatRange, today, tripDays } from '../../lib/dates';
import { countryName, flagUrl, tripCountries } from '../../lib/countries';
import { Content } from '../../app/Shell';
import { TripCover } from '../shared/TripCover';
import { ActivityPage } from './ActivityPage';
import { TripBudget } from './Budget';
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
        <EmptyState illustration="compass" title="Trip not found" message="It may have been deleted, or you're not a member yet. Ask the organizer for an invite link."
          action={<LinkButton to="/" variant="secondary">Back to trips</LinkButton>} />
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
  const { pathname, hash } = useLocation();
  const planPage = useMatch('/trip/:tripId/plan/:activityId');
  const [params] = useSearchParams();
  const loaded = !!(activities && ideas && expenses && comments && albums);
  // Home's "Budget" shortcut lands here with #budget: bring the budget card into view.
  useEffect(() => {
    if (loaded && hash === '#budget') document.getElementById('budget')?.scrollIntoView({ block: 'center' });
  }, [loaded, hash]);

  if (!activities || !ideas || !expenses || !comments || !albums) return <Spinner center />;
  const ctx: TripCtx = { trip, activities, ideas, expenses, comments, albums, profiles, canManage, isOwner };
  const nDays = daysBetween(trip.startDate, trip.endDate) + 1;
  const t = today();
  const days = tripDays(trip.startDate, trip.endDate);
  // The budget card follows the day picked in the itinerary; otherwise today (during the trip) or the first day.
  const fromUrl = params.get('day') ?? '';
  const budgetDay = days.includes(fromUrl) ? fromUrl : days.includes(t) ? t : days[0];
  const count = countdown(trip.startDate, trip.endDate, t);
  const people = trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }));
  const countries = tripCountries(trip, activities).map((code) => ({ code, name: countryName(code), flag: flagUrl(code) }));

  const base = `/trip/${trip.id}`;
  const section = pathname.slice(base.length + 1).split('/')[0];
  const tabs: TabItem[] = [
    { to: base, label: 'Itinerary', icon: 'calendar', active: section === '' },
    { to: `${base}/ideas`, label: 'Ideas', icon: 'lightbulb', count: ideas.filter((i) => i.status === 'open').length, active: section === 'ideas' },
    { to: `${base}/photos`, label: 'Photos', icon: 'photo', count: albums.length, active: section === 'photos' },
    { to: `${base}/people`, label: 'People', icon: 'people', active: section === 'people' },
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
          action={canManage ? { icon: 'pencil', label: 'Edit trip', onClick: () => setEditing(true) } : undefined}
        />
        {/* Figma "Hero Card": cover, name, dates, the countries it visits and who's going. No shortcut buttons inside the trip. */}
        <HeroCard
          image={<TripCover trip={trip} />}
          title={trip.name}
          subtitle={`${formatRange(trip.startDate, trip.endDate)} • ${nDays} day${nDays === 1 ? '' : 's'}`}
          countries={countries}
          people={people}
          count={count}
        />
        <TripBudget ctx={ctx} day={budgetDay} onSetBudget={canManage ? () => setEditing(true) : undefined} />
        <div className={s.sectionNav}>
          <Tabs items={tabs} label="Trip sections" />
        </div>
        {/* At least a screen tall, so switching to a shorter tab never pulls the page (and the tabs) up. */}
        <div className={s.tabPanel}>
        <Routes>
          <Route index element={<Itinerary {...ctx} />} />
          <Route path="ideas" element={<Ideas {...ctx} />} />
          <Route path="budget" element={<Navigate to={base} replace />} />
          <Route path="photos" element={<Photos {...ctx} />} />
          <Route path="info" element={<Navigate to={base} replace />} />
          <Route path="people" element={<People {...ctx} />} />
        </Routes>
        </div>
      </Content>
      <TripForm open={editing} trip={trip} onClose={() => setEditing(false)} onDeleted={isOwner ? () => navigate('/') : undefined} />
    </>
  );
}
