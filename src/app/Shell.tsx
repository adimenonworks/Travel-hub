import { createContext, useContext, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, BottomNav, HeaderProfileContext, Notification, ToastProvider, type NavTab } from '../design/components';
import { store } from '../data';
import { useMe, useMyTrips, useProfile } from '../data/hooks';
import { featuredTrip } from '../lib/trips';
import { screenKey, useScreenTransition } from './navigation';
import { TripForm } from '../features/trip/TripForm';
import s from './Shell.module.css';

/** Opens the "New trip" sheet from anywhere (e.g. the home page's plan tile). */
const NewTripContext = createContext<() => void>(() => {});
export const useNewTrip = () => useContext(NewTripContext);

/**
 * App frame: the page, with your profile picture handed to every Page Header (it sits at the right of the title).
 * The trip sheet lives here so any page can open it.
 */
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe();
  const profile = useProfile(me.uid);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  // The saved profile wins over the sign-in account, so a chosen nickname or photo shows here.
  const name = profile?.name || me.name;
  const photo = profile ? profile.photo : me.photo;
  const newTrip = () => setCreating(true);
  // Bottom Nav: Home, Trip (the trip you're on, else the next one; hidden when there's none) and You.
  const { pathname } = useLocation();
  const trip = featuredTrip(useMyTrips());
  const tabs: NavTab[] = [
    { to: '/', label: 'Home', icon: 'home', active: (p) => p === '/' },
    ...(trip ? [{ to: `/trip/${trip.id}`, label: 'Trip', icon: 'plane' as const, active: (p: string) => p.startsWith('/trip/') }] : []),
    { to: '/profile', label: 'You', icon: 'person', active: (p) => p.startsWith('/profile') },
  ];
  const showNav = !pathname.startsWith('/join/') && pathname !== '/design';
  const transition = useScreenTransition();

  return (
    <NewTripContext.Provider value={newTrip}>
      <HeaderProfileContext.Provider value={
        <NavLink to="/profile" className={s.me} aria-label={`Your profile and settings (${name})`}>
          <Avatar name={name} photo={photo} seed={me.uid} size={32} />
        </NavLink>
      }>
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
        <TripForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/trip/${id}`)} />
      </div>
      </ToastProvider>
      </HeaderProfileContext.Provider>
    </NewTripContext.Provider>
  );
}

export function Content({ children }: { children: ReactNode }) {
  return <div className={s.content}>{children}</div>;
}
