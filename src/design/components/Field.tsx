import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import s from './Field.module.css';

type Wrap = { label?: string; hint?: ReactNode };

function Wrapper({ id, label, hint, children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={s.field}>
      {label && <label htmlFor={id} className={s.label}>{label}</label>}
      {children}
      {hint && <div className={s.hint}>{hint}</div>}
    </div>
  );
}

export function TextField({ label, hint, id, ...rest }: Wrap & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return <Wrapper id={fid} label={label} hint={hint}><input id={fid} className={s.input} {...rest} /></Wrapper>;
}

export function TextArea({ label, hint, id, ...rest }: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return <Wrapper id={fid} label={label} hint={hint}><textarea id={fid} className={s.input} {...rest} /></Wrapper>;
}

export function Select({ label, hint, id, children, ...rest }: Wrap & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return <Wrapper id={fid} label={label} hint={hint}><select id={fid} className={s.input} {...rest}>{children}</select></Wrapper>;
}

/** Lays fields out side by side, wrapping on narrow screens. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={s.row}>{children}</div>;
}
