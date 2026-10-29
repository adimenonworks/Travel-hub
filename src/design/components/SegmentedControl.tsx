import type { CSSProperties } from 'react';
import s from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({ options, value, onChange, block, label }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  block?: boolean;
  label: string;
}) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div role="radiogroup" aria-label={label} className={[s.control, block && s.block].filter(Boolean).join(' ')}
      style={{ '--count': options.length, '--index': index } as CSSProperties}>
      {/* The selected look is one pill that slides between options. */}
      {index >= 0 && <span className={s.thumb} aria-hidden="true" />}
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={s.option} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
