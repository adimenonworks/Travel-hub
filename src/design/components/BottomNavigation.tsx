import { useRef, useState, type CSSProperties } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { haptic } from '../../lib/native';
import { Icon, type IconName } from './Icon';
import { nextTransition } from '../../app/navigation';
import s from './BottomNavigation.module.css';

export type NavTab = { to: string; label: string; icon: IconName; active: (path: string) => boolean };

/**
 * Figma "Bottom navigation": the app's tab bar, a frosted pill (Elevation/Floating bar) floating 16px from the sides and bottom,
 * always on top while the page scrolls under it. Each tab is a Figma ".Navigation item": the current one sits on a grey pill
 * (which slides between tabs) with its filled icon. Tapping the current tab scrolls it back to the top, as on iPhone.
 * You can also press and drag along the bar, like iOS: the pill follows your finger, the tab under it lights up (a
 * selection tick as it crosses each one), and letting go opens the nearest tab. Once dragging it keeps hold wherever
 * your thumb goes on the screen (above or beside the bar) until you lift it. Taps stay silent.
 */
export function BottomNavigation({ tabs, inline }: { tabs: NavTab[]; /** In the page flow instead of fixed to the bottom (the /#/design page) */ inline?: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = tabs.findIndex((t) => t.active(pathname));
  // Dragging the pill: where it is (px from the first slot) and which tab it's over
  const bar = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; id: number; drag: boolean } | null>(null);
  const dragged = useRef(false);
  const [drag, setDrag] = useState<{ px: number; over: number } | null>(null);
  const slot = () => {
    const el = bar.current!; const r = el.getBoundingClientRect(); const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    return { left: r.left + pad, w: (r.width - 2 * pad) / tabs.length };
  };
  const follow = (clientX: number) => {
    const { left, w } = slot();
    const px = Math.max(0, Math.min((tabs.length - 1) * w, clientX - left - w / 2));
    const over = Math.round(px / w);
    setDrag((d) => { if (!d || d.over !== over) haptic('selection'); return { px, over }; });
  };
  const down = (e: React.PointerEvent) => {
    if (inline || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragged.current = false;
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false };
  };
  const move = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.drag) {
      if (Math.abs(e.clientX - p.x) < 6) return;
      if (Math.abs(e.clientY - p.y) > Math.abs(e.clientX - p.x)) { press.current = null; return; }
      p.drag = true; dragged.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    follow(e.clientX);
  };
  const up = () => {
    const p = press.current;
    press.current = null;
    if (!p?.drag) return;
    // Letting go, or iOS taking the touch away, snaps to the nearest tab: the drag is never lost halfway
    const over = drag?.over ?? current;
    setDrag(null);
    if (over >= 0 && over !== current) { nextTransition('tab'); navigate(tabs[over].to); }
  };
  const shown = drag ? drag.over : current;
  return (
    <nav className={[s.nav, inline && s.inline].filter(Boolean).join(' ')} aria-label={inline ? 'Example tab bar' : 'Main'}>
      <div ref={bar} className={[s.bar, drag && s.dragging].filter(Boolean).join(' ')} style={{ '--n': tabs.length, '--i': Math.max(current, 0) } as CSSProperties}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {/* The grey pill glides to the tab you pick, or follows your finger while you drag it */}
        {current >= 0 && <span className={s.indicator} aria-hidden="true" style={drag ? { transform: `translateX(${drag.px}px) scale(1.06)` } : undefined} />}
        {tabs.map((t, i) => {
          const on = i === shown;
          return (
            <NavLink key={t.label} to={t.to} className={s.item} aria-current={i === current ? 'page' : undefined}
              onClick={(e) => { if (dragged.current) { dragged.current = false; e.preventDefault(); return; } if (on && pathname === t.to) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } nextTransition('tab'); }}>
              <Icon name={t.icon} size={24} state={on ? 'filled' : 'default'} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
