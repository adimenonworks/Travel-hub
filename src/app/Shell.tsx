import { createContext, useContext, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Banner, Button } from '../design/components';
import { store } from '../data';
import { useMe, useProfile } from '../data/hooks';
import { TripForm } from '../features/trip/TripForm';
import s from './Shell.module.css';

/** Opens the "New trip" sheet from anywhere (the top bar, the home page's plan tile). */
const NewTripContext = createContext<() => void>(() => {});
export const useNewTrip = () => useContext(NewTripContext);

/**
 * App frame: a light top bar with no background — on Home "Add a trip" on the left, and your profile
 * on the right everywhere — then the page. The trip sheet lives here so any page can open it.
 */
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe();
  const profile = useProfile(me.uid);
  const navigate = useNavigate();
  // "Add a trip" belongs to Home; inside a trip each page has its own main action.
  const onHome = useLocation().pathname === '/';
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
            {onHome && <Button size="small" icon="plus" onClick={newTrip}>Add a trip</Button>}
            <NavLink to="/profile" className={s.me} aria-label={`Your profile and settings (${name})`}>
              <Avatar name={name} photo={photo} seed={me.uid} size={44} />
            </NavLink>
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
