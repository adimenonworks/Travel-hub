import type { CSSProperties } from 'react';
import { haptic } from '../../lib/native';
import s from './SegmentControl.module.css';

type Option<T extends string> = { value: T; label: string };

/**
 * Figma "Segment control": equal-width segments (like iOS) on a pill outline, and one selected pill that slides
 * between them. Because every segment is the same width, the pill only moves sideways (transform), never resizes, so
 * the slide stays smooth at the screen's full frame rate.
 */
export function SegmentControl<T extends string>({ options, value, onChange, block, label }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  block?: boolean;
  label: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={label} className={[s.control, block && s.block].filter(Boolean).join(' ')}
      style={{ '--n': options.length, '--i': i } as CSSProperties}>
      <span className={s.thumb} aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={s.option} onClick={() => { if (o.value !== value) haptic('selection'); onChange(o.value); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
