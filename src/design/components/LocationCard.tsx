import type { ReactNode } from 'react';
import s from './LocationCard.module.css';

/**
 * Figma "Location card": the map (when there's a position), the place's name with its address or city under it, an
 * optional action beside the name (the Favourite star on an event page), then the ways to get there (the maps app,
 * Uber) together. Used by the event page and a saved place's sheet.
 */
export function LocationCard({ map, title, subtitle, action, buttons }: { map?: ReactNode; title: ReactNode; subtitle?: ReactNode; action?: ReactNode; buttons?: ReactNode }) {
  return (
    <div className={[s.card, !map && s.plain].filter(Boolean).join(' ')}>
      {map && <div className={s.map}>{map}</div>}
      <div className={s.place}>
        <div className={s.text}>
          <span className="t-heading-3">{title}</span>
          {subtitle && <span className="t-body t-secondary">{subtitle}</span>}
        </div>
        {action}
      </div>
      {buttons && <div className={s.buttons}>{buttons}</div>}
    </div>
  );
}
