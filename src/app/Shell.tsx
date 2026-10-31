import { createContext, useContext, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar, HeaderProfileContext, Notification, ToastProvider, useLarge } from '../design/components';
import { store } from '../data';
import { useMe, useProfile } from '../data/hooks';
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
  // Figma Page Header: Extra large avatar (72) from 744px, Large (48) on phones.
  const large = useLarge();

  return (
    <NewTripContext.Provider value={newTrip}>
      <HeaderProfileContext.Provider value={
        <NavLink to="/profile" className={s.me} aria-label={`Your profile and settings (${name})`}>
          <Avatar name={name} photo={photo} seed={me.uid} size={large ? 72 : 48} />
        </NavLink>
      }>
      <ToastProvider>
      <div className={s.shell}>
        <main id="main" className={s.main}>
          {store.mode === 'demo' && (
            <div className={s.demo}>
              <Notification state="warning">Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Notification>
            </div>
          )}
          {children}
        </main>
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
