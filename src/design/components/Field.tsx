import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
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

/** Figma "Text field" (Layout Input). `icon`: Figma "Show leading icon" + "Leading icon" (the Pin on New trip's search; Search field merged into this on 13 Nov 2026). */
export function TextField({ label, hint, id, icon, ...rest }: Wrap & InputHTMLAttributes<HTMLInputElement> & { icon?: IconName }) {
  const auto = useId();
  const fid = id ?? auto;
  const input = <input id={fid} className={[s.input, icon && s.withIcon].filter(Boolean).join(' ')} {...rest} />;
  return (
    <Wrapper id={fid} label={label} hint={hint}>
      {icon ? <span className={s.iconWrap}><Icon name={icon} size={24} className={s.leadingIcon} />{input}</span> : input}
    </Wrapper>
  );
}

export function TextArea({ label, hint, id, ...rest }: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return <Wrapper id={fid} label={label} hint={hint}><textarea id={fid} className={s.input} {...rest} /></Wrapper>;
}

/** `compact` is 44px tall with smaller text, to match a medium button beside it (e.g. in a list row). */
export function Select({ label, hint, id, compact, children, ...rest }: Wrap & SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }) {
  const auto = useId();
  const fid = id ?? auto;
  return <Wrapper id={fid} label={label} hint={hint}><select id={fid} className={[s.input, compact && s.compact].filter(Boolean).join(' ')} {...rest}>{children}</select></Wrapper>;
}

/** Lays fields out side by side, wrapping on narrow screens. */
export function FieldRow({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  const row = <div className={s.row}>{children}</div>;
  // A hint about the whole row (e.g. price + currency) runs the full width under it.
  return hint ? <div className={s.field}>{row}<div className={s.hint}>{hint}</div></div> : row;
}
