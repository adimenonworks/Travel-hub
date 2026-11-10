import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { StepProgress } from './Rows';
import s from './Flow.module.css';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Figma "Flow screen" (Step 1–4): a full-screen, bright emerald step of a flow (New trip). The close Icon button
 * (On brand) and Step progress, the title (Display tiny) and subtitle, the content, then the footer: one Inverse
 * button and, only when the step is optional, a Ghost "Skip for now". Content slides 24px and fades between steps.
 */
export function FlowScreen({ step, of, title, subtitle, onClose, children, footer, stepKey }: {
  step: number; of: number; title: string; subtitle?: string; onClose: () => void;
  children: ReactNode; footer: ReactNode;
  /** Changes when the step changes, to replay the step animation */
  stepKey: string | number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div className={s.flow} role="dialog" aria-modal="true" aria-label={title}>
      <div className={s.inner}>
        <div className={s.bar}>
          <StepProgress step={step} of={of} />
          <IconButton icon="x" tone="on-brand" label="Close" onClick={onClose} />
        </div>
        <div key={stepKey} className={s.step}>
          <div className={s.heading}>
            <h1 className={s.title}>{title}</h1>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
          <div className={s.content}>{children}</div>
        </div>
        <div className={s.footer}>{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Counts up from 0 to `to` over 800ms (straight to the number with Reduce Motion). */
function useCountUp(to: number) {
  const [n, setN] = useState(reduceMotion() ? to : 0);
  useEffect(() => {
    if (reduceMotion()) { setN(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return n;
}

const CONFETTI = ['green', 'yellow', 'mid', 'orange', 'pink'] as const;

/**
 * Figma "Celebration screen": success at the end of a flow, on deep emerald. Confetti falls, the illustration pops in,
 * the number counts up; then the primary action and a Ghost secondary one. Reduce Motion: fades only, no confetti.
 */
export function CelebrationScreen({ illustration, title, subtitle, number, numberLabel, primary, secondary }: {
  illustration: ReactNode; title: string; subtitle?: string; number?: number; numberLabel?: string;
  primary: ReactNode; secondary?: ReactNode;
}) {
  const n = useCountUp(number ?? 0);
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: (i * 37) % 100, delay: (i % 7) * 0.08, drift: ((i * 13) % 40) - 20, tone: CONFETTI[i % CONFETTI.length], round: i % 3 === 0, turn: (i * 47) % 360,
  })), []);
  return createPortal(
    <div className={s.celebrate} role="dialog" aria-modal="true" aria-label={title}>
      {!reduceMotion() && (
        <div className={s.confetti} aria-hidden="true">
          {pieces.map((p, i) => (
            <span key={i} className={[s.piece, s[`piece-${p.tone}`], p.round && s.pieceRound].filter(Boolean).join(' ')}
              style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, '--drift': `${p.drift}px`, '--fall': `${180 + ((p.left * 7) % 220)}px`, '--turn': `${p.turn}deg` } as CSSProperties} />
          ))}
        </div>
      )}
      <div className={s.celebrateInner}>
        <div className={s.badge} aria-hidden="true">{illustration}</div>
        <h1 className={s.celebrateTitle}>{title}</h1>
        {subtitle && <p className={s.celebrateSubtitle}>{subtitle}</p>}
        {number !== undefined && (
          <div className={s.count} role="text" aria-label={`${number} ${numberLabel ?? ''}`}>
            <span className={s.countValue} aria-hidden="true">{n}</span>
            {numberLabel && <span className={s.countLabel} aria-hidden="true">{numberLabel}</span>}
          </div>
        )}
        <div className={s.spacer} />
        <div className={s.celebrateFooter}>{primary}{secondary}</div>
      </div>
    </div>,
    document.body,
  );
}

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

