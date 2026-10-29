import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './List.module.css';

/** Rounded list of rows on a surface. */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div role="list" className={[s.list, className].filter(Boolean).join(' ')}>{children}</div>;
}

type RowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  to?: string;
  href?: string;
  onClick?: () => void;
};

export function ListRow({ title, subtitle, icon, leading, trailing, chevron, to, href, onClick }: RowProps) {
  const body = (
    <>
      {icon && (
        <span className={s.leading}>
          <Icon name={icon} size={20} />
        </span>
      )}
      {leading}
      <span className={s.content}>
        <span className={s.title}>{title}</span>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </span>
      {(trailing || chevron) && (
        <span className={s.trailing}>
          {trailing}
          {chevron && <Icon name="chevron-right" size={16} className={s.chevron} />}
        </span>
      )}
    </>
  );
  const inset = { '--row-inset': icon ? 'calc(var(--space-inset) + 52px)' : undefined } as CSSProperties;
  if (to) return <Link role="listitem" to={to} className={`${s.row} ${s.interactive}`} style={inset}>{body}</Link>;
  if (href) return <a role="listitem" href={href} target="_blank" rel="noreferrer" className={`${s.row} ${s.interactive}`} style={inset}>{body}</a>;
  if (onClick) return <button role="listitem" type="button" onClick={onClick} className={`${s.row} ${s.interactive}`} style={inset}>{body}</button>;
  return <div role="listitem" className={s.row} style={inset}>{body}</div>;
}
