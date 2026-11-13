import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { goBack } from '../../app/navigation';
import { Icon, type IconName } from './Icon';
import { IconButton, LinkButton } from './Button';
import { CategoryIcon, type CategoryTone } from './Rows';
import { haptic } from '../../lib/native';
import s from './Bars.module.css';

/** Kept for older callers; the Figma Page header no longer shows your profile picture (the You tab does). */

/**
 * Figma "Page header": an optional ghost back button, then the title row: the title (Type=Title Large: Display 48;
 * Title small: Heading 1, both in the brand text colour) with an optional Label subtitle, and one optional secondary icon button.
 */
export function PageHeader({ title, subtitle, meta, back, action, fit, size = 'large', icon, type }: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Figma "Show meta": a Body line under the title row (a trip's dates: "2 – 11 Nov · 10 days"). This is the old Trip header, merged in on 13 Nov 2026. */
  meta?: ReactNode;
  back?: { to: string; label: string };
  /** Figma "Show trailing": the one optional button, e.g. edit the trip */
  action?: { icon: IconName; label: string; onClick: () => void };
  /** Keep the title on one line: if it doesn't fit, it steps down to the Heading 1 size */
  fit?: boolean;
  /** Figma "Size": Large (tabs: Display) or Small (pushed pages and a trip's pages: Heading 1) */
  size?: 'large' | 'small';
  /** Figma "Show leading icon" (Size Small): the event's category icon tile, in its type's colour, before the title */
  icon?: IconName; /** The leading `.Category icon`'s Type */ type?: CategoryTone;
}) {
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
  // Words never split (owner, 13 Nov 2026): if the longest word is wider than the line (a long place name at 320px
  // with the largest text), the whole title shrinks until that word fits, like iOS's "shrink to fit".
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (fit || !el) return;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    let seen = '';
    const shrink = () => {
      el.style.removeProperty('font-size');
      const room = el.clientWidth;
      if (!room) return;
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const words = (el.textContent ?? '').split(/\s+/).filter(Boolean);
      const widest = Math.max(0, ...words.map((w) => ctx.measureText(w).width));
      if (widest > room) el.style.fontSize = `${Math.floor(parseFloat(cs.fontSize) * (room / widest) * 10) / 10}px`;
    };
    shrink();
    // Measure again when the width or the text size changes (not when the shrink itself changes the height)
    const ro = new ResizeObserver(() => {
      const key = `${el.clientWidth}|${getComputedStyle(document.documentElement).fontSize}`;
      if (key !== seen) { seen = key; shrink(); }
    });
    ro.observe(el);
    document.fonts?.ready.then(shrink).catch(() => {});
    return () => ro.disconnect();
  }, [fit, title, size]);
  return (
    <header className={s.header}>
      {back && <div className={s.back}><LinkButton to={back.to} tone="ghost" size="regular" icon="chevron-left" onClick={(e) => { e.preventDefault(); goBack(navigate, back.to); }}>{back.label}</LinkButton></div>}
      <div className={[s.titleRow, size === 'small' && s.titleRowSmall].filter(Boolean).join(' ')}>
        {icon && <span className={s.leadIcon}><CategoryIcon icon={icon} type={type} /></span>}
        <div className={s.titleText}>
          <h1 ref={titleRef} className={[s.title, size === 'small' && s.titleSmall, fit && s.fit, fit && smaller && s.fitSmaller].filter(Boolean).join(' ')}>{title}</h1>
          {subtitle && <div className={s.subtitle}>{subtitle}</div>}
        </div>
        {action && (
          <div className={s.actions}>
            <IconButton icon={action.icon} label={action.label} tone="secondary" onClick={action.onClick} />
          </div>
        )}
      </div>
      {meta && <div className={s.meta}>{meta}</div>}
    </header>
  );
}

/** `active` overrides route matching, e.g. to keep "Trips" lit on a trip's own pages. */
export type TabItem = { to: string; label: string; icon?: IconName; end?: boolean; count?: number; active?: boolean };

/** Tabs for switching sections of a page. The current tab is darker and underlined in emerald. */
/** `replace`: switching tabs replaces the history entry, so Back leaves the screen instead of walking back through tabs. */
export function Tabs({ items, label, className, replace }: { items: TabItem[]; label: string; className?: string; replace?: boolean }) {
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
          ? <NavLink key={t.to} to={t.to} end={t.end} replace={replace} className={s.tab}>{body}</NavLink>
          : <Link key={t.to} to={t.to} replace={replace} className={s.tab} aria-current={t.active ? 'page' : undefined} onClick={() => { if (!t.active) haptic('selection'); }}>{body}</Link>;
      })}
    </nav>
  );
}
