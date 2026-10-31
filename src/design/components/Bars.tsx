import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { LinkButton } from './Button';
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
      {back && <div><LinkButton to={back.to} variant="ghost" icon="chevron-left">{back.label}</LinkButton></div>}
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

/** Tabs for switching sections of a page. The current tab is darker and underlined in emerald. */
export function Tabs({ items, label, className }: { items: TabItem[]; label: string; className?: string }) {
  // One underline slides to the current tab: measure where that tab sits, then move the line there.
  const nav = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [line, setLine] = useState<{ x: number; w: number; ready: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    // Measured to the fraction of a pixel, and again whenever the group or any option changes size
    // (e.g. once the web font has loaded).
    const measure = () => {
      const cur = el.querySelector<HTMLElement>('[aria-current="page"]');
      if (!cur) return setLine(null);
      const box = el.getBoundingClientRect(), r = cur.getBoundingClientRect();
      setLine((prev) => ({ x: r.left - box.left + el.scrollLeft, w: r.width, ready: prev !== null }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [pathname, items]);

  return (
    <nav ref={nav} aria-label={label} className={[s.tabs, className].filter(Boolean).join(' ')}>
      {line && <span className={[s.underline, line.ready && s.animate].filter(Boolean).join(' ')} aria-hidden="true"
        style={{ '--x': `${line.x}px`, '--w': `${line.w}px` } as CSSProperties} />}
      {items.map((t) => {
        const body = (
          <>
            {t.icon && <Icon name={t.icon} size={24} />}
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
