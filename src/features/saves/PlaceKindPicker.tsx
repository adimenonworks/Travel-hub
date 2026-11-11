import { Chip } from '../../design/components';
import { TYPE_TONE, type EventKind } from '../../lib/categories';
import { haptic } from '../../lib/native';
import { PLACE_TYPES, placeTypeOf } from '../../lib/places';
import s from './saves.module.css';

/**
 * A saved Place's category, picked like an event's: the type (Food & drink, Stays, Activities) as chips, then that
 * type's categories (Restaurant, Café… / Hotel, Airbnb or holiday home…), the chosen ones in the type's colour.
 * Used by Save a place and the place sheet.
 */
export function PlaceKindPicker({ value, onChange, id = 'place-kind' }: { value: EventKind; onChange: (k: EventKind) => void; id?: string }) {
  const type = placeTypeOf(value);
  const info = PLACE_TYPES.find((t) => t.value === type)!;
  const tone = TYPE_TONE[type];
  return (
    <div className={s.field}>
      <h3 className={s.label} id={id}>Category</h3>
      <div className={s.chipsWrap} role="group" aria-labelledby={id}>
        {PLACE_TYPES.map((t) => (
          <Chip key={t.value} icon={t.icon} tone={TYPE_TONE[t.value]} active={t.value === type} label={`${t.label}${t.value === type ? ', selected' : ''}`}
            onClick={() => { if (t.value === type) return; haptic('selection'); onChange(t.kinds[0].value); }}>{t.label}</Chip>
        ))}
      </div>
      <div className={s.chipsWrap} role="group" aria-label={`${info.label} categories`}>
        {info.kinds.map((k) => (
          <Chip key={k.value} icon={k.icon} tone={tone} active={k.value === value} label={`${k.label}${k.value === value ? ', selected' : ''}`}
            onClick={() => { haptic('selection'); onChange(k.value); }}>{k.label}</Chip>
        ))}
      </div>
    </div>
  );
}
