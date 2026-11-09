import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useMatch, useNavigate, useParams, type Location } from 'react-router-dom';
import { savedScroll } from '../../app/navigation';
import { haptic } from '../../lib/native';
import { SlideSwap } from '../shared/SlideSwap';
import { EmptyState, LinkButton, PageSkeleton, Tabs, TripHeader, type TabItem } from '../../design/components';
import { useMe, useProfiles, useRole, useSub, useTrip } from '../../data/hooks';
import { useStarMigration } from '../saves/starEvent';
import type { Activity, Album, Comment, Idea, Profile, Trip } from '../../data/types';
import { useBudgetCleanup } from './budgetCleanup';
import { tripDatesLabel } from '../../lib/trips';
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
  const comments = useSub(trip.id, 'comments');
  const albums = useSub(trip.id, 'albums');
  const profiles = useProfiles(trip.memberIds);
  const { canManage, isOwner } = useRole(trip);
  const me = useMe();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const planPage = useMatch('/trip/:tripId/plan/:activityId');

  useStarMigration(trip.id, activities ?? [], me.uid);
  useBudgetCleanup(trip, canManage);
  if (!activities || !ideas || !comments || !albums) return <PageSkeleton />;
  const ctx: TripCtx = { trip, activities, ideas, comments, albums, profiles, canManage, isOwner };

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
        {/* Figma "Trip header": back to Trips, the name (Title small) with Edit, then the dates only */}
        <TripHeader
          title={trip.name}
          back={{ to: '/trips', label: 'Trips' }}
          action={canManage ? { icon: 'pencil', label: 'Edit trip', onClick: () => setEditing(true) } : undefined}
          meta={tripDatesLabel(trip)}
        />
        <div className={s.sectionNav}>
          <Tabs items={tabs} label="Trip sections" />
        </div>
        <TabPanels location={location} section={section}>
          {(loc) => (
            <Routes location={loc}>
              <Route index element={<Overview {...ctx} />} />
              <Route path="itinerary" element={<Itinerary {...ctx} />} />
              <Route path="ideas" element={<Ideas {...ctx} />} />
              <Route path="budget" element={<Navigate to={base} replace />} />
              <Route path="photos" element={<Photos {...ctx} />} />
              <Route path="info" element={<Navigate to={base} replace />} />
              <Route path="people" element={<People {...ctx} />} />
            </Routes>
          )}
        </TabPanels>
      </Content>
      <TripForm open={editing} trip={trip} onClose={() => setEditing(false)} onDeleted={isOwner ? () => navigate('/trips') : undefined} />
    </>
  );
}

const TAB_ORDER = ['', 'itinerary', 'ideas', 'photos', 'people'];

/**
 * The trip's tabs as nested views under one header and Tab Bar that never unmount (SlideSwap slides the panel in
 * the direction of travel). Each tab comes back at its own scroll position; a tab not seen yet opens at its top,
 * with the Tab Bar in view.
 */
function TabPanels({ location, section, children }: { location: Location; section: string; children: (loc: Location) => React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useTabSwipe(box, section, location.pathname);
  const shown = useRef(location.pathname);
  useLayoutEffect(() => {
    if (shown.current === location.pathname) return;
    shown.current = location.pathname;
    // A new tab opens at its top, just under the stuck Tab Bar (bar = the sticky element right above the panels).
    const el = box.current, bar = el?.previousElementSibling;
    let top = 0;
    if (el && bar && el.parentElement) {
      const b = getComputedStyle(bar);
      const under = (parseFloat(b.top) || 0) + bar.getBoundingClientRect().height + (parseFloat(b.marginBottom) || 0) + (parseFloat(getComputedStyle(el.parentElement).rowGap) || 0);
      top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - under);
    }
    window.scrollTo(0, savedScroll(location.pathname) ?? Math.min(window.scrollY, top));
  }, [location.pathname]);
  return (
    <div ref={box}>
      <SlideSwap value={location} id={location.pathname} rank={TAB_ORDER.indexOf(section)} className={s.tabPanel}>{children}</SlideSwap>
    </div>
  );
}

/**
 * Swipe across a trip's tab content to go to the next or previous tab (the panel then slides as when a tab is tapped).
 * A swipe counts when it's mostly sideways, at least 64px and quick; it doesn't start on anything that has its own
 * sideways gesture: an event row (swipe actions), a strip that scrolls sideways (days, chips, the tab bar), a map,
 * a form field, or the screen's left edge (iOS swipe back).
 */
function useTabSwipe(box: React.RefObject<HTMLDivElement | null>, section: string, pathname: string) {
  const navigate = useNavigate();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const base = pathname.slice(0, pathname.length - (section ? section.length + 1 : 0));
    let start: { x: number; y: number; t: number } | null = null;
    const ownSideways = (t: EventTarget | null) => {
      for (let n = t as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.matches('[data-no-tab-swipe], input, textarea, select, .leaflet-container, [role=dialog]')) return true;
        const st = getComputedStyle(n);
        if (/(auto|scroll)/.test(st.overflowX) && n.scrollWidth > n.clientWidth + 1) return true;
      }
      return false;
    };
    const down = (e: TouchEvent) => {
      const p = e.touches[0];
      start = e.touches.length === 1 && p.clientX > 24 && !ownSideways(e.target) ? { x: p.clientX, y: p.clientY, t: Date.now() } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const p = e.changedTouches[0], dx = p.clientX - start.x, dy = p.clientY - start.y, ms = Date.now() - start.t;
      start = null;
      if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5 || ms > 600) return;
      const i = TAB_ORDER.indexOf(section) + (dx < 0 ? 1 : -1);
      if (i < 0 || i >= TAB_ORDER.length) return;
      haptic('selection');
      navigate(TAB_ORDER[i] ? `${base}/${TAB_ORDER[i]}` : base);
    };
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchend', up, { passive: true });
    return () => { el.removeEventListener('touchstart', down); el.removeEventListener('touchend', up); };
  }, [box, section, pathname, navigate]);
}
