import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Bars.module.css';

/** Page title block: optional back link, a big heavy title, and actions on the right. */
export function PageHeader({ title, subtitle, back, actions }: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className={s.header}>
      {back && <Link to={back.to} className={s.back}><Icon name="chevron-left" size={20} />{back.label}</Link>}
      <div className={s.titleRow}>
        <div className={s.titleText}>
          <h1 className={s.title}>{title}</h1>
          {subtitle && <div className={s.subtitle}>{subtitle}</div>}
        </div>
        {actions && <div className={s.actions}>{actions}</div>}
      </div>
    </header>
  );
}

/** `active` overrides route matching, e.g. to keep "Trips" lit on a trip's own pages. */
export type TabItem = { to: string; label: string; icon?: IconName; end?: boolean; count?: number; active?: boolean };

/** Pill tabs for navigation. The current page's tab is filled. */
export function Tabs({ items, label, className }: { items: TabItem[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={[s.tabs, className].filter(Boolean).join(' ')}>
      {items.map((t) => {
        const body = (
          <>
            {t.icon && <Icon name={t.icon} size={20} />}
            {t.label}
            {!!t.count && <span className={s.count}>{t.count}</span>}
          </>
        );
        return t.active === undefined
          ? <NavLink key={t.to} to={t.to} end={t.end} className={s.tab}>{body}</NavLink>
          : <Link key={t.to} to={t.to} className={s.tab} aria-current={t.active ? 'page' : undefined}>{body}</Link>;
      })}
    </nav>
  );
}
