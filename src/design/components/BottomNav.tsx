import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { nextTransition } from '../../app/navigation';
import s from './BottomNav.module.css';

export type NavTab = { to: string; label: string; icon: IconName; active: (path: string) => boolean };

/**
 * Figma "Bottom Nav": the app's tab bar, floating above the home indicator on a frosted pill.
 * Each tab is a Figma "Nav Item": the current one sits on a grey pill with its filled (brand) icon.
 */
export function BottomNav({ tabs, inline }: { tabs: NavTab[]; /** In the page flow instead of fixed to the bottom (the /#/design page) */ inline?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav className={[s.nav, inline && s.inline].filter(Boolean).join(' ')} aria-label={inline ? 'Example tab bar' : 'Main'}>
      <div className={s.bar}>
        {tabs.map((t) => {
          const on = t.active(pathname);
          return (
            <NavLink key={t.label} to={t.to} className={s.item} aria-current={on ? 'page' : undefined} onClick={() => nextTransition('none')}>
              <Icon name={t.icon} size={24} state={on ? 'filled' : 'default'} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
