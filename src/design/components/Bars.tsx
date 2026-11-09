import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { goBack } from '../../app/navigation';
import { Icon, type IconName } from './Icon';
import { IconButton, LinkButton } from './Button';
import { haptic } from '../../lib/native';
import s from './Bars.module.css';

/** Kept for older callers; the Figma Page Header no longer shows your profile picture (the You tab does). */
export const HeaderProfileContext = createContext<ReactNode>(null);

/**
 * Figma "Page Header": an optional ghost back button, then the title row: the title (Type=Title Large: Display 48;
 * Title small: Heading 1, both in the brand text colour) with an optional Label subtitle, and one optional secondary icon button.
 */
export function PageHeader({ title, subtitle, back, action, fit, size = 'large' }: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  /** The one optional button, e.g. edit the trip */
  action?: { icon: IconName; label: string; onClick: () => void };
  /** Keep the title on one line: if it doesn't fit, it steps down to the Heading 1 size */
  fit?: boolean;
  /** Figma "Type": large = Title Large (tabs), small = Title small (a trip's pages) */
  size?: 'large' | 'small';
}) {
  useContext(HeaderProfileContext);
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [smaller, setSmaller] = useState(false);
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!fit || !el || size === 'small') return;
    const check = () => { setSmaller(false); requestAnimationFrame(() => setSmaller(el.scrollWidth > el.clientWidth)); };
    check();
    document.fonts?.ready.then(check); // measure again once the display font has loaded
    const ro = new ResizeObserver(check);
    ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [fit, title, size]);
  return (
    <header className={s.header}>
      {back && <div className={s.back}><LinkButton to={back.to} variant="ghost" size="regular" icon="chevron-left" onClick={(e) => { e.preventDefault(); goBack(navigate, back.to); }}>{back.label}</LinkButton></div>}
      <div className={s.titleRow}>
        <div className={s.titleText}>
          <h1 ref={titleRef} className={[s.title, size === 'small' && s.titleSmall, fit && s.fit, fit && smaller && s.fitSmaller].filter(Boolean).join(' ')}>{title}</h1>
          {subtitle && <div className={s.subtitle}>{subtitle}</div>}
        </div>
        {action && (
          <div className={s.actions}>
            <IconButton icon={action.icon} label={action.label} tone="brand" onClick={action.onClick} />
          </div>
        )}
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
      // Keep the current tab in view when the bar scrolls sideways (e.g. People after a swipe on a narrow phone)
      if (r.left < box.left) el.scrollTo({ left: el.scrollLeft + r.left - box.left - 16, behavior: 'smooth' });
      else if (r.right > box.right) el.scrollTo({ left: el.scrollLeft + r.right - box.right + 16, behavior: 'smooth' });
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
          : <Link key={t.to} to={t.to} className={s.tab} aria-current={t.active ? 'page' : undefined} onClick={() => { if (!t.active) haptic('selection'); }}>{body}</Link>;
      })}
    </nav>
  );
}
