import type { CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { selectionTick } from '../../lib/native';
import { Icon, type IconName } from './Icon';
import { nextTransition } from '../../app/navigation';
import s from './BottomNav.module.css';

export type NavTab = { to: string; label: string; icon: IconName; active: (path: string) => boolean };

/**
 * Figma "Bottom Nav": the app's tab bar, floating above the home indicator on a frosted pill.
 * Each tab is a Figma "Nav Item": the current one sits on a grey pill (which slides between tabs) with its filled icon.
 * Tapping a tab gives a light haptic tick; tapping the current tab scrolls it back to the top, as on iPhone.
 */
export function BottomNav({ tabs, inline }: { tabs: NavTab[]; /** In the page flow instead of fixed to the bottom (the /#/design page) */ inline?: boolean }) {
  const { pathname } = useLocation();
  const current = tabs.findIndex((t) => t.active(pathname));
  return (
    <nav className={[s.nav, inline && s.inline].filter(Boolean).join(' ')} aria-label={inline ? 'Example tab bar' : 'Main'}>
      <div className={s.bar} style={{ '--n': tabs.length, '--i': Math.max(current, 0) } as CSSProperties}>
        {/* The grey pill glides to the tab you pick */}
        {current >= 0 && <span className={s.indicator} aria-hidden="true" />}
        {tabs.map((t, i) => {
          const on = i === current;
          return (
            <NavLink key={t.label} to={t.to} className={s.item} aria-current={on ? 'page' : undefined}
              onClick={(e) => { if (on && pathname === t.to) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } selectionTick(); nextTransition('tab'); }}>
              <Icon name={t.icon} size={24} state={on ? 'filled' : 'default'} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
