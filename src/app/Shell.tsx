import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Avatar, Banner, Icon, Tabs } from '../design/components';
import { store } from '../data';
import { useMe } from '../data/hooks';
import s from './Shell.module.css';

/** App frame: a sticky top bar with the brand, main tabs and your profile, then the page. */
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe();
  const { pathname } = useLocation();
  const tabs = [
    { to: '/', label: 'Trips', active: pathname === '/' || pathname.startsWith('/trip/') },
    { to: '/design', label: 'Design' },
  ];

  return (
    <div className={s.shell}>
      {/* Skip link (WCAG 2.4.1). A button, because a "#main" link would be read as a route by the hash router. */}
      <button type="button" className={s.skip} onClick={() => document.getElementById('main')?.focus()}>Skip to content</button>
      <header className={s.topbar}>
        <div className={s.topbarInner}>
          <Link to="/" className={s.brand} aria-label="Trip Hub, all trips">
            <span className={s.brandMark}><Icon name="plane" size={22} /></span>
            <span className={s.brandName} aria-hidden="true">Trip Hub</span>
          </Link>
          <Tabs items={tabs} label="Main" className={s.tabs} />
          <NavLink to="/profile" className={s.me} aria-label={`Profile: ${me.name}`}>
            <Avatar name={me.name} photo={me.photo} seed={me.uid} size={36} />
            <span className={s.meName} aria-hidden="true">{me.name.split(' ')[0]}</span>
          </NavLink>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={s.main}>
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
