import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Bars.module.css';

function useScrolled(threshold = 30) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  return scrolled;
}

/**
 * Navigation bar with an iOS-style large title that collapses into the bar
 * as the page scrolls.
 */
export function PageHeader({ title, subtitle, back, actions, leading }: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
  leading?: ReactNode;
}) {
  const scrolled = useScrolled();
  return (
    <>
      <div className={s.nav} data-scrolled={scrolled}>
        <div className={s.navSide}>
          {back && <Link to={back.to} className={s.back}><Icon name="chevron-left" size={24} />{back.label}</Link>}
          {leading}
        </div>
        <div className={s.navTitle} aria-hidden="true">{title}</div>
        <div className={s.navSide}>{actions}</div>
      </div>
      <header className={s.large}>
        <h1 className={s.largeTitle}>{title}</h1>
        {subtitle && <div className={s.subtitle}>{subtitle}</div>}
      </header>
    </>
  );
}

export type TabItem = { to: string; label: string; icon: IconName; end?: boolean };

/** Bottom tab bar, shown on compact widths only. Renders a spacer so content clears it. */
export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <>
      <div className={s.tabSpacer} />
      <nav className={s.tabbar} aria-label="Sections">
        {items.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={s.tab}>
            <Icon name={t.icon} size={24} />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
