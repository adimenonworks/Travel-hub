import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Avatar, Banner, Icon, IconButton } from '../design/components';
import { store } from '../data';
import { useMe, useMyTrips } from '../data/hooks';
import { tripPhase } from '../lib/dates';
import s from './Shell.module.css';

/** App frame: sidebar on regular widths; pages supply their own header and tab bar. */
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe();
  const trips = useMyTrips();
  const { pathname } = useLocation();
  const active = (trips ?? [])
    .filter((t) => tripPhase(t.startDate, t.endDate) !== 'past')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className={s.shell}>
      <aside className={s.sidebar} aria-label="Main">
        <div className={s.brand}><span className={s.brandMark}><Icon name="plane" size={18} /></span>Trip Hub</div>
        <nav className={s.group}>
          <NavLink to="/" end className={s.item}><Icon name="home" size={20} /><span>All trips</span></NavLink>
          <NavLink to="/profile" className={s.item}><Icon name="person" size={20} /><span>Profile</span></NavLink>
          <NavLink to="/design" className={s.item}><Icon name="swatch" size={20} /><span>Design system</span></NavLink>
        </nav>
        {active.length > 0 && (
          <nav className={s.group} aria-label="Upcoming trips">
            <div className={s.groupLabel}>Upcoming</div>
            {active.map((t) => (
              <NavLink key={t.id} to={`/trip/${t.id}`} className={[s.item, pathname.startsWith(`/trip/${t.id}`) && s.active].filter(Boolean).join(' ')}>
                <span className={s.dot} style={{ background: t.coverColor ?? 'var(--color-tint)' }} />
                <span>{t.name}</span>
              </NavLink>
            ))}
          </nav>
        )}
        <div className={s.footer}>
          <Avatar name={me.name} photo={me.photo} seed={me.uid} size={32} />
          <span className={s.footerName}>{me.name}</span>
          <IconButton icon="signout" label="Sign out" size="small" onClick={() => store.signOut()} />
        </div>
      </aside>
      <main className={s.main}>
        {store.mode === 'demo' && (
          <div className={s.demo}>
            <Banner>Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Banner>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function Content({ children }: { children: ReactNode }) {
  return <div className={s.content}>{children}</div>;
}
