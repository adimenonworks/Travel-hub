import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation, Banner, ToastProvider, type NavTab } from '../design/components';
import { store } from '../data';
import { ScreenStack } from './ScreenStack';
import { SwipeBack } from './SwipeBack';
import { ChatAlerts } from './ChatAlerts';
import { NotificationsProvider, useNotifications } from '../features/notifications/notifications';
import { NewTrip } from '../features/trip/NewTrip';
import { SaveSheet, type SaveRequest } from '../features/saves/SaveSheet';
import { onOpenPath, onSharedLink } from '../lib/native';
import { usePurgeDeleted } from '../features/profile/RecentlyDeleted';
import s from './Shell.module.css';

/** Opens the full-screen New trip flow from anywhere (Home, Trips). */
const NewTripContext = createContext<() => void>(() => {});
export const useNewTrip = () => useContext(NewTripContext);
/** Opens the Save a place sheet: paste a link or search (Save a place), or a link shared from another app. */
const SaveContext = createContext<(r: SaveRequest) => void>(() => {});
export const useSave = () => useContext(SaveContext);

/** Bottom navigation (Figma): Home (with the count of unread notifications), Trips (your trips, and each trip's pages) and You. */
const TABS: NavTab[] = [
  { to: '/', label: 'Home', icon: 'home', active: (p) => p === '/' || p === '/notifications' },
  { to: '/trips', label: 'Trips', icon: 'plane', active: (p) => p === '/trips' || p.startsWith('/trip/') },
  { to: '/profile', label: 'You', icon: 'person', active: (p) => p.startsWith('/profile') },
];

/** App frame: the page and the Bottom navigation. The New trip flow lives here so any page can open it. */
export function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const newTrip = () => setCreating(true);
  const [saving, setSaving] = useState<SaveRequest | null>(null);
  // Links shared to Rove from other apps (the iPhone share extension opens rove://save?url=…).
  useEffect(() => onSharedLink((url) => setSaving({ mode: 'link', url })), []);
  // The website's "Open in Rove" (rove://go?path=/join/abc) opens that page here
  useEffect(() => onOpenPath((path) => navigate(path)), [navigate]);
  usePurgeDeleted();
  const { pathname } = useLocation();
  const showNav = !pathname.startsWith('/join/') && pathname !== '/design';

  return (
    <NewTripContext.Provider value={newTrip}>
      <SaveContext.Provider value={setSaving}>
      <ToastProvider>
      <ChatAlerts />
      <NotificationsProvider>
      <div className={s.shell}>
        <SwipeBack routes={<div className={[s.main, showNav && s.withNav].filter(Boolean).join(' ')}>{children}</div>}>
          <main id="main" className={[s.main, showNav && s.withNav].filter(Boolean).join(' ')}>
            {store.mode === 'demo' && (
              <div className={s.demo}>
                <Banner tone="warning">Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Banner>
              </div>
            )}
            <ScreenStack>{children}</ScreenStack>
          </main>
        </SwipeBack>
        {showNav && <Navigation />}
        <NewTrip open={creating} onClose={() => setCreating(false)} onOpenTrip={(id) => navigate(`/trip/${id}`)} />
        <SaveSheet request={saving} onClose={() => setSaving(null)} />
      </div>
      </NotificationsProvider>
      </ToastProvider>
      </SaveContext.Provider>
    </NewTripContext.Provider>
  );
}

/** The Bottom navigation, with the unread notifications count on Home (owner, 14 Nov 2026: Bell on Home + this badge). */
function Navigation() {
  const { unread } = useNotifications();
  const tabs = TABS.map((t) => (t.to === '/' ? { ...t, badge: unread, badgeLabel: `${unread} new notification${unread === 1 ? '' : 's'}` } : t));
  return <BottomNavigation tabs={tabs} />;
}

export function Content({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[s.content, className].filter(Boolean).join(' ')}>{children}</div>;
}
