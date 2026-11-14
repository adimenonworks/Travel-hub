import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, StepProgress } from '../../design/components';
import s from './NewTripScreens.module.css';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A step of the New trip flow, full screen (a screen, not a design-system component, since 13 Nov 2026: the Figma
 * "Flow screen" component was deleted; the frames "New trip · step 1–4" on the Screens page show it). The close Icon button
 * (On brand) and Step progress, the title (Display small) and subtitle, the content, then the footer: one Inverse
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
          <IconButton icon="x" tone="on-feature" label="Close" onClick={onClose} />
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

/**
 * The celebration at the end of the New trip flow, on deep emerald (a screen, not a design-system component; Figma
 * frame "New trip · celebration" on the Screens page). The illustration pops in, the number counts up; then the
 * primary action and a Ghost secondary one. Reduce Motion: fades only. (No confetti since 14 Nov 2026, owner.)
 */
export function CelebrationScreen({ illustration, title, subtitle, number, numberLabel, primary, secondary }: {
  illustration: ReactNode; title: string; subtitle?: string; number?: number; numberLabel?: string;
  primary: ReactNode; secondary?: ReactNode;
}) {
  const n = useCountUp(number ?? 0);
  return createPortal(
    <div className={s.celebrate} role="dialog" aria-modal="true" aria-label={title}>
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

