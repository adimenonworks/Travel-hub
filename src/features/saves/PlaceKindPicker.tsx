import { Chip } from '../../design/components';
import { TYPE_TONE, type EventKind } from '../../lib/categories';
import { haptic } from '../../lib/native';
import { PLACE_TYPES } from '../../lib/places';
import s from './saves.module.css';

// The same order as Favourites: Food & drink, Stays, Activities
const ORDER = ['food', 'stays', 'activities'] as const;

/**
 * A saved Place's category: every category, grouped under its type (Food & drink, Stays, Activities), with exactly one
 * chosen. The chosen chip takes its type's colour. Used by Save a place and the place sheet.
 */
export function PlaceKindPicker({ value, onChange, id = 'place-kind' }: { value: EventKind; onChange: (k: EventKind) => void; id?: string }) {
  return (
    <section className={s.field} aria-labelledby={id}>
      <h3 className="t-heading-4" id={id}>Category</h3>
      {ORDER.map((v) => PLACE_TYPES.find((t) => t.value === v)!).map((t) => (
        <div key={t.value} className={s.kindGroup}>
          <h4 className={s.kindGroupTitle} id={`${id}-${t.value}`}>{t.label}</h4>
          <div className={s.chipsWrap} role="radiogroup" aria-labelledby={`${id}-${t.value}`}>
            {t.kinds.map((k) => {
              const on = k.value === value;
              return (
                <Chip key={k.value} icon={k.icon} type={TYPE_TONE[t.value]} selected={on} label={`${k.label}${on ? ', selected' : ''}`}
                  onClick={() => { if (on) return; haptic('selection'); onChange(k.value); }}>{k.label}</Chip>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
