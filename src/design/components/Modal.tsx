import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useLarge } from './TripCards';
import s from './Modal.module.css';

/**
 * Figma "Modal": a short question in a centred card (title, body, optional badge) with a ghost and a primary button.
 * Size=Small below 744px, Large from 744px. Escape or the backdrop cancels.
 */
export function Modal({ open, title, body, badge, cancelLabel = 'Cancel', confirmLabel, onCancel, onConfirm }: {
  open: boolean; title: string; body?: ReactNode; badge?: ReactNode;
  cancelLabel?: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void;
}) {
  const large = useLarge();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button:last-of-type')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const size = large ? 'regular' : 'small';
  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} className={s.modal} role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={s.text}>
          <h2 id="modal-title" className={s.title}>{title}</h2>
          {body && <div className={s.body}>{body}</div>}
        </div>
        {badge}
        <div className={s.buttons}>
          <Button variant="ghost" size={size} block onClick={onCancel}>{cancelLabel}</Button>
          <Button size={size} block onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
