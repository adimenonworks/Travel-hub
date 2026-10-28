import { useId } from 'react';
import { Icon } from './Icon';
import s from './ColorPicker.module.css';

export type ColorOption<T extends string> = { value: T; label: string; color: string };

/**
 * Round colour swatches backed by native radio buttons, so arrow keys and
 * screen readers work. Each swatch shows its name; the selected one gets a
 * ring and a tick, so the choice never relies on colour alone.
 */
export function ColorPicker<T extends string>({ label, options, value, onChange, showLabels = true }: {
  label: string;
  options: ColorOption<T>[];
  value: T;
  onChange: (v: T) => void;
  showLabels?: boolean;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className={s.legend}>{label}</legend>
      <div className={s.group}>
        {options.map((o) => (
          <label key={o.value} className={s.option}>
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className={s.input} />
            <span className={s.swatch} style={{ background: o.color }} aria-hidden="true">
              {o.value === value && <Icon name="check" size={22} strokeWidth={2.6} />}
            </span>
            <span className={showLabels ? s.name : 'visually-hidden'}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
