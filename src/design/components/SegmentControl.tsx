import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { haptic } from '../../lib/native';
import s from './SegmentControl.module.css';

/** `count`: an optional number shown after the label ("To decide · 2"); the first thing to go when space runs out. */
/** How far labels shrink before the counts are dropped (iOS apps typically go to about 75–80%) */
const MIN_FIT = 0.8;

type Option<T extends string> = { value: T; label: string; count?: number };

/**
 * Figma "Segment control": equal-width segments (like iOS) on a pill outline, and one selected pill that slides
 * between them. Because every segment is the same width, the pill only moves sideways (transform), never resizes, so
 * the slide stays smooth at the screen's full frame rate.
 *
 * A label always stays on one line (owner, 13 Nov 2026). When one doesn't fit its segment (a narrow phone with large
 * text: "Collections" or "To decide · 2" at 320px), the side padding tightens to 8px, then every label shrinks by the
 * same amount, like iOS's "shrink to fit" (`adjustsFontSizeToFitWidth`), down to 80%; past that the counts are dropped
 * from view (screen readers still hear them) and the labels shrink as far as they need to.
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
  const labels = options.map((o) => `${o.label}${o.count ?? ''}`).join('\n');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.classList.remove(s.tight, s.noCount);
      el.style.removeProperty('--fit');
      // How much the widest label must shrink to fit its segment (1 = it fits)
      const room = () => {
        let scale = 1;
        for (const text of el.querySelectorAll<HTMLElement>(`.${s.text}`)) {
          const box = text.closest('button')!;
          const pad = parseFloat(getComputedStyle(box).paddingLeft) * 2;
          const need = text.getBoundingClientRect().width;
          if (need > 0) scale = Math.min(scale, (box.clientWidth - pad) / need);
        }
        return scale;
      };
      const shrink = (scale: number) => { if (scale < 1) el.style.setProperty('--fit', String(Math.floor(scale * 1000) / 1000)); };
      if (room() >= 1) return;
      el.classList.add(s.tight);
      const tight = room();
      if (tight >= MIN_FIT || !el.querySelector(`.${s.count}`)) { shrink(tight); return; }
      el.classList.add(s.noCount);
      shrink(room());
    };
    fit();
    // Only a change of width (rotation) or text size needs a new fit; the fit itself can change the height
    const key = () => `${el.clientWidth}|${getComputedStyle(document.documentElement).fontSize}`;
    let seen = key();
    const ro = new ResizeObserver(() => { const k = key(); if (k !== seen) { seen = k; fit(); } });
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
          <span className={s.text}>{o.label}{o.count != null && <span className={s.count}> · {o.count}</span>}</span>
        </button>
      ))}
    </div>
  );
}
