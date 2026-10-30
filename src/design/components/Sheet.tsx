import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import s from './Sheet.module.css';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  /** When set, the sheet body is a form and a confirm button appears top-right. */
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  submitDisabled?: boolean;
  children: ReactNode;
};

/**
 * Bottom sheet on compact widths, centered modal on regular widths.
 * It glides in on open and slides back out on close (Cancel, the backdrop, Escape or Save) before it unmounts.
 */
export function Sheet({ open, title, onClose, onSubmit, submitLabel = 'Done', submitDisabled, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Stays mounted while the closing animation plays; a timer covers browsers that skip the animation.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const closing = mounted && !open;
  // While it slides out, show what it showed when open (callers often clear the record they were editing).
  const shown = useRef({ title, children });
  if (open) shown.current = { title, children };
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
    ref.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit && !submitDisabled) await onSubmit();
  };

  return createPortal(
    <div className={[s.backdrop, closing && s.closing].filter(Boolean).join(' ')} onMouseDown={(e) => open && e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-label={shown.current.title}
        onAnimationEnd={(e) => closing && e.target === e.currentTarget && setMounted(false)}>
        <div className={s.grabber} />
        <form onSubmit={submit} style={{ display: 'contents' }}>
          <div className={s.header}>
            <Button variant="plain" size="small" onClick={onClose}>{onSubmit ? 'Cancel' : 'Close'}</Button>
            <div className={s.title}>{shown.current.title}</div>
            {onSubmit ? <Button size="small" type="submit" disabled={submitDisabled}>{submitLabel}</Button> : <span />}
          </div>
          <div className={s.body}>{shown.current.children}</div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
