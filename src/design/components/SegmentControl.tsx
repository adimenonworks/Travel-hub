import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { haptic } from '../../lib/native';
import s from './SegmentControl.module.css';

type Option<T extends string> = { value: T; label: string };

/**
 * Figma "Segment control": equal-width segments (like iOS) on a pill outline, and one selected pill that slides
 * between them. Because every segment is the same width, the pill only moves sideways (transform), never resizes, so
 * the slide stays smooth at the screen's full frame rate.
 *
 * Words never split. Big text may wrap between words; when a single word is still wider than its segment (a narrow
 * phone with large text: "Collections" at 320px), the side padding tightens to 8px and then every label shrinks by
 * the same amount until the longest word fits, like iOS's "shrink to fit" (`adjustsFontSizeToFitWidth`).
 */
export function SegmentControl<T extends string>({ options, value, onChange, block, label }: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  block?: boolean;
  label: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  const ref = useRef<HTMLDivElement>(null);
  const labels = options.map((o) => o.label).join('\n');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.classList.remove(s.tight);
      el.style.removeProperty('--fit');
      const room = (tight: boolean) => {
        let scale = 1;
        for (const word of el.querySelectorAll<HTMLElement>(`.${s.word}`)) {
          const box = word.closest('button')!;
          const pad = tight ? 2 * 8 : parseFloat(getComputedStyle(box).paddingLeft) * 2;
          const need = word.getBoundingClientRect().width;
          if (need > 0) scale = Math.min(scale, (box.clientWidth - pad) / need);
        }
        return scale;
      };
      if (room(false) >= 1) return;
      el.classList.add(s.tight);
      const scale = room(true);
      if (scale < 1) el.style.setProperty('--fit', String(Math.floor(scale * 1000) / 1000));
    };
    fit();
    let width = el.clientWidth;
    // Only a change of width (rotation, text size) needs a new fit; the fit itself can change the height
    const ro = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; fit(); } });
    ro.observe(el);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [labels]);
  return (
    <div ref={ref} role="radiogroup" aria-label={label} className={[s.control, block && s.block].filter(Boolean).join(' ')}
      style={{ '--n': options.length, '--i': i } as CSSProperties}>
      <span className={s.thumb} aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={s.option} onClick={() => { if (o.value !== value) haptic('selection'); onChange(o.value); }}>
          {o.label.split(' ').map((w, k) => <span key={k}>{k > 0 && ' '}<span className={s.word}>{w}</span></span>)}
        </button>
      ))}
    </div>
  );
}
