import type { ReactNode } from 'react';
import s from './MapCard.module.css';

/**
 * Figma "Map card" (Location card and Collection header merged, 13 Nov 2026): the map viewport (clipped; `onMap` makes it
 * a button that opens the full-screen map), then the title and meta, a `trailing` slot beside them (an Avatar stack, or
 * the Favourite star Icon button) and a `footer` slot (a pair of Buttons: the maps app and Uber). Used by the event page,
 * a saved place's sheet and the top of a country's collection ("6 of 24 visited" is meta text; there is no progress bar).
 */
export function MapCard({ map, onMap, title, meta, trailing, footer }: {
  map?: ReactNode; onMap?: () => void; title: ReactNode; meta?: ReactNode; trailing?: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className={[s.card, !map && s.plain].filter(Boolean).join(' ')}>
      {map && (onMap
        ? <button type="button" className={`${s.map} ${s.mapButton}`} onClick={onMap} aria-label="Open the map">{map}</button>
        : <div className={s.map}>{map}</div>)}
      <div className={s.place}>
        <div className={s.text}>
          <span className="t-heading-3">{title}</span>
          {meta && <span className="t-body t-secondary">{meta}</span>}
        </div>
        {trailing}
      </div>
      {footer && <div className={s.buttons}>{footer}</div>}
    </div>
  );
}
