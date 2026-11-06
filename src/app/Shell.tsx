import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, Notification, ToastProvider, type NavTab } from '../design/components';
import { store } from '../data';
import { screenKey, useScreenTransition } from './navigation';
import { NewTrip } from '../features/trip/NewTrip';
import s from './Shell.module.css';

/** Opens the full-screen New trip flow from anywhere (Home, Trips). */
const NewTripContext = createContext<() => void>(() => {});
export const useNewTrip = () => useContext(NewTripContext);

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
  const { pathname } = useLocation();
  const tabs = TABS;
  const showNav = !pathname.startsWith('/join/') && pathname !== '/design';
  const transition = useScreenTransition();

  return (
    <NewTripContext.Provider value={newTrip}>
      <ToastProvider>
      <div className={s.shell}>
        <main id="main" className={[s.main, showNav && s.withNav].filter(Boolean).join(' ')}>
          {store.mode === 'demo' && (
            <div className={s.demo}>
              <Notification state="warning">Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Notification>
            </div>
          )}
          <div key={screenKey(pathname)} className={transition === 'none' ? undefined : s[transition]}>{children}</div>
        </main>
        {showNav && <BottomNav tabs={tabs} />}
        <NewTrip open={creating} onClose={() => setCreating(false)} onOpenTrip={(id) => navigate(`/trip/${id}`)} />
      </div>
      </ToastProvider>
    </NewTripContext.Provider>
  );
}

export function Content({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[s.content, className].filter(Boolean).join(' ')}>{children}</div>;
}
