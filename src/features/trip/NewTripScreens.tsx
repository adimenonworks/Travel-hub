import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, StepProgress } from '../../design/components';
import s from './NewTripScreens.module.css';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A step of the New trip flow, full screen (a screen, not a design-system component, since 13 Nov 2026: the Figma
 * "Flow screen" component was deleted; the frames "New trip · step 1–4" on the Screens page show it). The close Icon button
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
 * The celebration at the end of the New trip flow, on deep emerald (a screen, not a design-system component; Figma
 * frame "New trip · celebration" on the Screens page). Confetti falls, the illustration pops in,
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

