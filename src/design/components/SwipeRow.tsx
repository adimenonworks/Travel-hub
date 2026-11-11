import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { haptic } from '../../lib/native';
import s from './SwipeRow.module.css';

export type SwipeAction = { label: string; icon: IconName; tone: 'neutral' | 'destructive'; onClick: () => void };

/**
 * Figma "Swipe actions": like Mail, swiping a row to the left uncovers its actions (Edit, Delete) on the right;
 * a tap on an open row, or a swipe back, closes it. Only sideways drags belong to the row; up and down still scroll
 * the page. The row is marked so the trip's tab swipe leaves it alone (they never run together).
 * The actions are also on the item's own page, so people who don't swipe (or use a keyboard or screen reader) lose nothing.
 */
export function SwipeRow({ actions, children }: { actions: SwipeAction[]; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; base: number; dir: 'x' | 'y' | null; id: number; lx: number; lt: number; v: number } | null>(null);
  const dragged = useRef(false); // the last press was a sideways drag, so its click isn't a tap
  const width = actions.length * 76; // each action is 76px wide (a 44px tap area with room for its label)

  // Close when something else on the page is touched
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!row.current?.contains(e.target as Node)) { setOpen(false); setDx(0); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  // iOS rubber band: the further past the edge, the harder it pulls back
  const rubber = (over: number) => (1 - 1 / ((Math.abs(over) * 0.55) / width + 1)) * width * Math.sign(over);
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragged.current = false;
    drag.current = { x: e.clientX, y: e.clientY, base: open ? -width : 0, dir: null, id: e.pointerId, lx: e.clientX, lt: e.timeStamp, v: 0 };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    if (!d.dir) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      d.dir = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (d.dir === 'x') { dragged.current = true; setDragging(true); try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* already gone */ } }
    }
    if (d.dir !== 'x') return;
    // Speed of the finger (px per ms), smoothed, so a quick flick counts even when it's short
    const dt = Math.max(1, e.timeStamp - d.lt);
    d.v = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.v; d.lx = e.clientX; d.lt = e.timeStamp;
    // Follow the finger exactly; past either end it stretches like iOS
    const raw = d.base + mx;
    setDx(raw > 0 ? rubber(raw) : raw < -width ? -width + rubber(raw + width) : raw);
  };
  // Let go (or the system took the touch): settle open or closed, using where it is and how fast it was moving
  const settle = (clientX: number | null) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.dir !== 'x') return;
    setDragging(false);
    const now = clientX === null ? (open ? -width : 0) : d.base + (clientX - d.x);
    const projected = now + d.v * 180; // where a flick would carry it
    const opening = clientX !== null && (Math.abs(d.v) > 0.3 ? d.v < 0 : projected < -width / 2);
    if (opening && !open) haptic('light');
    setOpen(opening);
    setDx(opening ? -width : 0);
  };
  const up = (e: React.PointerEvent) => settle(e.type === 'pointercancel' ? null : e.clientX);
  // A tap on an open row closes it instead of opening the item; a drag never counts as a tap
  const click = (e: React.MouseEvent) => {
    if (dragged.current) { dragged.current = false; e.preventDefault(); e.stopPropagation(); return; } // the drag already settled it
    if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); setDx(0); }
  };

  return (
    <div ref={row} className={s.row} data-no-tab-swipe="">
      {/* Hidden until the row moves, so they never show at the card's rounded corners */}
      <div className={s.actions} style={{ width, visibility: dx < 0 ? 'visible' : 'hidden', '--reveal': Math.min(1, -dx / width) } as React.CSSProperties} aria-hidden={!open || undefined} inert={!open || undefined}>
        {actions.map((a) => (
          <button key={a.label} type="button" className={`${s.action} ${s[a.tone]}`}
            onClick={() => { setOpen(false); setDx(0); a.onClick(); }}>
            <Icon name={a.icon} size={24} />
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div className={`${s.front}${dragging ? ` ${s.dragging}` : ''}`} style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={() => { if (drag.current?.dir === 'x') settle(null); }} onClickCapture={click}>
        {children}
      </div>
    </div>
  );
}
