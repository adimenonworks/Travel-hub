import { useState, type CSSProperties } from 'react';
import { IconButton } from './Button';
import s from './Calendar.module.css';

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Figma "Calendar" of "Calendar day"s (Default / Range / Start / End / Empty): a month with chevrons, M–S, and the
 * weeks. Tap a first day, then a last day; the range between fills with the light emerald band.
 */
export function Calendar({ start, end, onChange, min }: { start: string; end: string; onChange: (start: string, end: string) => void; min?: string }) {
  const first = start || min || new Date().toISOString().slice(0, 10);
  const [view, setView] = useState(() => ({ y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 }));
  const month = new Date(view.y, view.m, 1);
  const lead = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const move = (by: number) => setView(({ y, m }) => { const d = new Date(y, m + by, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pick = (d: string) => {
    if (!start || end || d < start) onChange(d, '');
    else onChange(start, d);
  };
  const label = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return (
    <div className={s.calendar}>
      <div className={s.month}>
        <IconButton icon="chevron-left" label="Previous month" onClick={() => move(-1)} />
        <span className={s.monthName} aria-live="polite">{label}</span>
        <IconButton icon="chevron-right" label="Next month" onClick={() => move(1)} />
      </div>
      <div className={s.grid} role="grid" aria-label={label}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} className={s.weekday} aria-hidden="true">{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} className={s.cell} />;
          const isStart = d === start, isEnd = d === (end || ''), inRange = !!start && !!end && d > start && d < end;
          const state = isStart && end ? 'start' : isEnd ? 'end' : isStart ? 'single' : inRange ? 'range' : 'default';
          const disabled = !!min && d < min;
          return (
            <button key={i} type="button" className={[s.cell, s.day, s[`day-${state}`]].join(' ')} disabled={disabled}
              style={state === 'range' || state === 'end' ? { '--i': Math.round((Date.parse(d) - Date.parse(start!)) / 864e5) } as CSSProperties : undefined}
              aria-pressed={state !== 'default'} aria-label={new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              onClick={() => pick(d)}>
              <span>{Number(d.slice(8))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

