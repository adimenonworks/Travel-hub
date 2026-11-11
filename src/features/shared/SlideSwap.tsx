import { useEffect, useState, type ReactNode } from 'react';
import s from './SlideSwap.module.css';

/**
 * Swaps one view for the next with a sideways slide in the direction of travel: a higher `rank` (a later tab or
 * day) comes in from the right, a lower one from the left, while the old view slides out. 250ms, transform only;
 * with Reduce Motion, a 150ms cross-fade. Both views share one grid cell while they swap, so nothing jumps.
 * `id` says when it's a different view; `value` is what's rendered (it can change without a slide).
 */
export function SlideSwap<T>({ value, id, rank, children, className }: {
  value: T; id: string; rank: number; children: (v: T) => ReactNode; className?: string;
}) {
  const [st, setSt] = useState({ cur: value, id, rank, prev: null as { v: T; id: string } | null, dir: 0 });
  if (st.id !== id) setSt({ cur: value, id, rank, prev: { v: st.cur, id: st.id }, dir: Math.sign(rank - st.rank) || 1 });
  else if (st.cur !== value) setSt({ ...st, cur: value });
  useEffect(() => {
    if (!st.prev) return;
    const t = setTimeout(() => setSt((x) => ({ ...x, prev: null })), 260);
    return () => clearTimeout(t);
  }, [st.prev]);

  const views = [...(st.prev ? [{ v: st.prev.v, key: st.prev.id, out: true }] : []), { v: st.cur, key: st.id, out: false }];
  const anim = (out: boolean) => !st.prev ? undefined : out ? (st.dir > 0 ? s.outLeft : s.outRight) : (st.dir > 0 ? s.inRight : s.inLeft);
  return (
    <div className={s.swap} data-swap="">
      {views.map(({ v, key, out }) => (
        <div key={key} className={[className, anim(out)].filter(Boolean).join(' ')} aria-hidden={out || undefined} inert={out || undefined}>
          {children(v)}
        </div>
      ))}
    </div>
  );
}
