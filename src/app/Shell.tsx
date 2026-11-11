import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, Notification, ToastProvider, type NavTab } from '../design/components';
import { store } from '../data';
import { ScreenStack } from './ScreenStack';
import { SwipeBack } from './SwipeBack';
import { ChatAlerts } from './ChatAlerts';
import { NewTrip } from '../features/trip/NewTrip';
import { SaveSheet, type SaveRequest } from '../features/saves/SaveSheet';
import { onOpenPath, onSharedLink } from '../lib/native';
import s from './Shell.module.css';

/** Opens the full-screen New trip flow from anywhere (Home, Trips). */
const NewTripContext = createContext<() => void>(() => {});
export const useNewTrip = () => useContext(NewTripContext);
/** Opens the Save a place sheet: paste a link or search (Save a place), or a link shared from another app. */
const SaveContext = createContext<(r: SaveRequest) => void>(() => {});
export const useSave = () => useContext(SaveContext);

/** Bottom Nav (Figma): Home, Trips (your trips, and each trip's pages) and You. */
const TABS: NavTab[] = [
  { to: '/', label: 'Home', icon: 'home', active: (p) => p === '/' },
  { to: '/trips', label: 'Trips', icon: 'plane', active: (p) => p === '/trips' || p.startsWith('/trip/') },
  { to: '/profile', label: 'You', icon: 'person', active: (p) => p.startsWith('/profile') },
];

/** App frame: the page and the Bottom Nav. The New trip flow lives here so any page can open it. */
export function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const newTrip = () => setCreating(true);
  const [saving, setSaving] = useState<SaveRequest | null>(null);
  // Links shared to Rove from other apps (the iPhone share extension opens rove://save?url=…).
  useEffect(() => onSharedLink((url) => setSaving({ mode: 'link', url })), []);
  // The website's "Open in Rove" (rove://go?path=/join/abc) opens that page here
  useEffect(() => onOpenPath((path) => navigate(path)), [navigate]);
  const { pathname } = useLocation();
  const tabs = TABS;
  const showNav = !pathname.startsWith('/join/') && pathname !== '/design';

  return (
    <NewTripContext.Provider value={newTrip}>
      <SaveContext.Provider value={setSaving}>
      <ToastProvider>
      <ChatAlerts />
      <div className={s.shell}>
        <SwipeBack routes={<div className={[s.main, showNav && s.withNav].filter(Boolean).join(' ')}>{children}</div>}>
          <main id="main" className={[s.main, showNav && s.withNav].filter(Boolean).join(' ')}>
            {store.mode === 'demo' && (
              <div className={s.demo}>
                <Notification state="warning">Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Notification>
              </div>
            )}
            <ScreenStack>{children}</ScreenStack>
          </main>
        </SwipeBack>
        {showNav && <BottomNav tabs={tabs} />}
        <NewTrip open={creating} onClose={() => setCreating(false)} onOpenTrip={(id) => navigate(`/trip/${id}`)} />
        <SaveSheet request={saving} onClose={() => setSaving(null)} />
      </div>
      </ToastProvider>
      </SaveContext.Provider>
    </NewTripContext.Provider>
  );
}

export function Content({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[s.content, className].filter(Boolean).join(' ')}>{children}</div>;
}
