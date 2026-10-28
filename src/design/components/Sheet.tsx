import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
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

/** Bottom sheet on compact widths, centered modal on regular widths. */
export function Sheet({ open, title, onClose, onSubmit, submitLabel = 'Done', submitDisabled, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit && !submitDisabled) await onSubmit();
  };

  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.grabber} />
        <form onSubmit={submit} style={{ display: 'contents' }}>
          <div className={s.header}>
            <Button variant="plain" size="small" onClick={onClose}>{onSubmit ? 'Cancel' : 'Close'}</Button>
            <div className={s.title}>{title}</div>
            {onSubmit ? <Button size="small" type="submit" disabled={submitDisabled}>{submitLabel}</Button> : <span />}
          </div>
          <div className={s.body}>{children}</div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
