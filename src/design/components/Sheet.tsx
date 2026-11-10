import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { Button, IconButton } from './Button';
import s from './Sheet.module.css';

type Props = {
  open: boolean;
  title: string;
  /** Figma "Show subtitle" */
  subtitle?: string;
  onClose: () => void;
  /** When set, the sheet body is a form and a confirm button appears top-right. */
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  submitDisabled?: boolean;
  /** Figma "Show secondary action": a second Large button beside the primary, half and half (e.g. Delete). Never stacked. */
  secondary?: ReactNode;
  children: ReactNode;
};

/**
 * Figma "Sheet": a short task over the current screen. Grabber, title (Heading 2) with an optional subtitle and the
 * close Icon button, the content, then the primary action across the bottom ("Show footer", when there's something to save).
 * It glides up on open and slides back down on close (the close button, the scrim, Escape, a drag down, or saving).
 * In the iPhone app it rises with the keyboard as one (see --keyboard-height in Sheet.module.css).
 */
export function Sheet({ open, title, subtitle, onClose, onSubmit, submitLabel = 'Done', submitDisabled, secondary, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Stays mounted while the closing animation plays; a timer covers browsers that skip the animation.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const closing = mounted && !open;
  // While it slides out, show what it showed when open (callers often clear the record they were editing).
  const shown = useRef({ title, subtitle, children });
  if (open) shown.current = { title, subtitle, children };
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setMounted(false), 400);
    return () => clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first text field as the sheet opens, so the keyboard comes up together with it (not after it).
    const focusTimer = setTimeout(() => ref.current?.querySelector<HTMLElement>('input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=time]), textarea')?.focus({ preventScroll: true }), 0);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Keep the sheet above the on-screen keyboard: pin the backdrop to the part of the screen that's still visible
  // (the visual viewport) and bring the field you're typing in into view.
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const fit = () => {
      const el = backdrop.current;
      if (!el) return;
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
      el.style.bottom = 'auto';
      const active = document.activeElement as HTMLElement | null;
      if (active && ref.current?.contains(active)) active.scrollIntoView({ block: 'nearest' });
    };
    fit();
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', fit);
    return () => { vv.removeEventListener('resize', fit); vv.removeEventListener('scroll', fit); };
  }, [open, mounted]);

  // Swipe down to close: drag the sheet's top bar down. Past a quarter of its height (or a quick flick) it closes;
  // otherwise it springs back.
  const drag = useRef<{ y: number; t: number; id: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // the close button stays a plain tap
    drag.current = { y: e.clientY, t: performance.now(), id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (ref.current) ref.current.style.transition = 'none';
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; const el = ref.current; drag.current = null;
    if (!d || !el) return;
    const dy = Math.max(0, e.clientY - d.y);
    const speed = dy / Math.max(1, performance.now() - d.t);
    el.style.transition = '';
    if (dy > el.offsetHeight / 4 || (speed > 0.6 && dy > 24)) onClose(); // slides on down from where it was let go
    else el.style.transform = '';
  };

  if (!mounted) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (open && onSubmit && !submitDisabled) await onSubmit();
  };

  return createPortal(
    <div ref={backdrop} className={[s.backdrop, closing && s.closing].filter(Boolean).join(' ')} inert={closing} onMouseDown={(e) => open && e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-label={shown.current.title}
        onAnimationEnd={(e) => closing && e.target === e.currentTarget && setMounted(false)}>
        <form onSubmit={submit} className={s.form}>
          <div className={s.top} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span className={s.grabber} aria-hidden="true" />
            <div className={s.header}>
              <div className={s.headerText}>
                <h2 className={s.title}>{shown.current.title}</h2>
                {shown.current.subtitle && <p className={s.subtitle}>{shown.current.subtitle}</p>}
              </div>
              <IconButton icon="x" label="Close" onClick={onClose} />
            </div>
          </div>
          <div className={s.body}>
            {shown.current.children}
            {(onSubmit || secondary) && <div className={s.footer}>{secondary}{onSubmit && <Button type="submit" block disabled={submitDisabled}>{submitLabel}</Button>}</div>}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
