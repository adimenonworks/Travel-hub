import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import s from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({ options, value, onChange, block, label }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  block?: boolean;
  label: string;
}) {
  // The selected look is one pill that slides between options: measure where the chosen option sits
  // (labels can make options different widths), then move the pill there.
  const group = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number; ready: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = group.current;
    if (!el) return;
    // Measured to the fraction of a pixel, and again whenever the group or any option changes size
    // (e.g. once the web font has loaded).
    const measure = () => {
      const cur = el.querySelector<HTMLElement>('[aria-checked="true"]');
      if (!cur) return setPill(null);
      const box = el.getBoundingClientRect(), r = cur.getBoundingClientRect();
      setPill((prev) => ({ x: r.left - box.left + el.scrollLeft, w: r.width, ready: prev !== null }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [value, options]);

  return (
    <div ref={group} role="radiogroup" aria-label={label} className={[s.control, block && s.block].filter(Boolean).join(' ')}>
      {pill && <span className={[s.thumb, pill.ready && s.animate].filter(Boolean).join(' ')} aria-hidden="true"
        style={{ '--x': `${pill.x}px`, '--w': `${pill.w}px` } as CSSProperties} />}
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={s.option} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
