import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Avatar, Banner, Button, Icon } from '../design/components';
import { store } from '../data';
import { useMe, useProfile } from '../data/hooks';
import { TripForm } from '../features/trip/TripForm';
import s from './Shell.module.css';

/** Opens the "New trip" sheet from anywhere (the top bar, the home page's plan tile). */
const NewTripContext = createContext<() => void>(() => {});
export const useNewTrip = () => useContext(NewTripContext);

/**
 * App frame: a slim sticky top bar (brand on the left; New trip and your profile on the right),
 * then the page. The "New trip" sheet lives here so any page can open it.
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

  return (
    <NewTripContext.Provider value={newTrip}>
      <div className={s.shell}>
        <header className={s.bar}>
          <div className={s.barInner}>
            <Link to="/" className={s.brand} aria-label="Trip Hub, all trips">
              <span className={s.mark}><Icon name="plane" size={22} /></span>
              <span className={s.wordmark} aria-hidden="true">Trip Hub</span>
            </Link>
            <div className={s.barActions}>
              <Button size="medium" icon="plus" onClick={newTrip} aria-label="New trip" className={s.newTrip}>
                <span className={s.newTripText}>New trip</span>
              </Button>
              {/* The emerald ring marks the avatar as a button into your profile and settings. */}
              <NavLink to="/profile" className={s.me} aria-label={`Your profile and settings (${name})`}>
                <Avatar name={name} photo={photo} seed={me.uid} size={36} />
              </NavLink>
            </div>
          </div>
        </header>
        <main id="main" className={s.main}>
          {store.mode === 'demo' && (
            <div className={s.demo}>
              <Banner>Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Banner>
            </div>
          )}
          {children}
        </main>
        <TripForm open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/trip/${id}`)} />
      </div>
    </NewTripContext.Provider>
  );
}

export function Content({ children }: { children: ReactNode }) {
  return <div className={s.content}>{children}</div>;
}
