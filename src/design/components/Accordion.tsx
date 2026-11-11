import { useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { haptic } from '../../lib/native';
import s from './Accordion.module.css';

/**
 * Figma "Accordion": a grey card whose header (title, an optional meta line and a chevron) opens and closes what's
 * inside, e.g. a day of events in Save to Rove. Starts collapsed unless `defaultOpen`. The height eases open; with
 * Reduce Motion it's instant.
 */
export function Accordion({ title, meta, defaultOpen = false, children }: { title: ReactNode; meta?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={[s.accordion, open && s.open].filter(Boolean).join(' ')}>
      <button type="button" className={s.header} aria-expanded={open} aria-controls={id} onClick={() => { haptic('selection'); setOpen((o) => !o); }}>
        <span className={s.text}>
          <span className={s.title}>{title}</span>
          {meta && <span className={s.meta}>{meta}</span>}
        </span>
        <span className={s.chevron} aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
      </button>
      <div id={id} className={s.panel} inert={!open}>
        <div className={s.inner}>{children}</div>
      </div>
    </div>
  );
}
