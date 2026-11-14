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
  /** Keep the title on one line: if it doesn't fit, it steps down to the Heading 1 size, then as small as it needs */
  fit?: boolean;
  /** Figma "Size": Large (tabs: Display) or Small (pushed pages and a trip's pages: Heading 1) */
  size?: 'large' | 'small';
  /** Figma "Show leading icon" (Size Small): the event's category icon tile, in its type's colour, before the title */
  icon?: IconName; /** The leading `.Category icon`'s Type */ type?: CategoryTone;
}) {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Page titles never cut off or split a word (owner, 13 Nov 2026), like iOS's "shrink to fit".
  // `fit` (one line): the Display size, else the Heading 1 size, else whatever smaller size fits the line.
  // Otherwise the title wraps between words, and if its longest word is wider than the line (a long place name at
  // 320px with the largest text) the whole title shrinks until that word fits.
  // Measured straight from the page, never through React state, so a measurement can't race a re-render; and it runs
  // again once the title's font has loaded (it isn't requested until something uses it) and whenever the width or
  // the text size changes.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const oneLine = fit && size !== 'small';
    const ctx = oneLine ? null : document.createElement('canvas').getContext('2d');
    const fitTo = (room: number, width: number) => {
      el.style.fontSize = `${Math.floor(parseFloat(getComputedStyle(el).fontSize) * (room / width) * 10) / 10}px`;
    };
    const shrink = () => {
      el.style.removeProperty('font-size');
      const room = el.clientWidth;
      if (!room) return;
      if (oneLine) {
        if (el.scrollWidth <= room) return;
        el.style.fontSize = 'var(--size-heading-1)';
        if (el.scrollWidth > room) fitTo(room, el.scrollWidth);
        return;
      }
      if (!ctx) return;
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const words = (el.textContent ?? '').split(/\s+/).filter(Boolean);
      const widest = Math.max(0, ...words.map((w) => ctx.measureText(w).width));
      if (widest > room) fitTo(room, widest);
    };
    let seen = '';
    const key = () => `${el.clientWidth}|${getComputedStyle(document.documentElement).fontSize}`;
    shrink();
    seen = key();
    // The shrink changes the title's height, which also reaches the observer: only a new width or text size counts
    const ro = new ResizeObserver(() => { const k = key(); if (k !== seen) { seen = k; shrink(); } });
    ro.observe(el);
    const fonts = document.fonts;
    let live = true;
    const again = () => { if (live) shrink(); };
    if (fonts) {
      fonts.addEventListener('loadingdone', again);
      fonts.load(`${getComputedStyle(el).fontWeight} 1em ${getComputedStyle(el).fontFamily}`, el.textContent ?? undefined).then(again, () => {});
      fonts.ready.then(again, () => {});
    }
    return () => { live = false; ro.disconnect(); fonts?.removeEventListener('loadingdone', again); el.style.removeProperty('font-size'); };
  }, [fit, title, size]);
  return (
    <header className={s.header}>
      {back && <div className={s.back}><LinkButton to={back.to} tone="ghost" size="regular" icon="chevron-left" onClick={(e) => { e.preventDefault(); goBack(navigate, back.to); }}>{back.label}</LinkButton></div>}
      <div className={[s.titleRow, size === 'small' && s.titleRowSmall].filter(Boolean).join(' ')}>
        {icon && <span className={s.leadIcon}><CategoryIcon icon={icon} type={type} /></span>}
        <div className={s.titleText}>
          <h1 ref={titleRef} className={[s.title, size === 'small' && s.titleSmall, fit && s.fit].filter(Boolean).join(' ')}>{title}</h1>
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
