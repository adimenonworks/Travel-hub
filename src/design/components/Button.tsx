import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Button.module.css';

/**
 * `inverse` is the dark button for bright brand surfaces (e.g. the accent card).
 * `ghost` has no fill until hovered: for secondary actions inside a bordered area (e.g. Edit trip in the trip header).
 */
export type ButtonVariant = 'filled' | 'tinted' | 'gray' | 'plain' | 'ghost' | 'destructive' | 'inverse';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'small' | 'medium' | 'regular' | 'large';
  block?: boolean;
  icon?: IconName;
  children?: ReactNode;
};

export function Button({ variant = 'filled', size = 'regular', block, icon, children, className, type = 'button', ...rest }: Props) {
  const cls = [s.button, s[variant], size !== 'regular' && s[size], block && s.block, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'small' ? 18 : 20} />}
      {children}
    </button>
  );
}

/**
 * A link that looks like a button (never wrap a Button in a Link: nested controls confuse screen readers).
 * `to` is an in-app route; `href` is an external site, opened in a new tab.
 */
export function LinkButton({ to, href, variant = 'filled', size = 'regular', icon, label, children }: { variant?: ButtonVariant; size?: 'small' | 'regular' | 'large'; icon?: IconName; /** Fuller name for screen readers when the visible text is short (e.g. "Email" on a list row). */ label?: string; /** Leave out for an icon-only link (then `icon` and `label` are required). */ children?: ReactNode } & ({ to: string; href?: never } | { href: string; to?: never })) {
  const cls = [s.button, s[variant], size !== 'regular' && s[size], !children && s.icon].filter(Boolean).join(' ');
  const body = (
    <>
      {icon && <Icon name={icon} size={size === 'small' ? 18 : children ? 20 : 22} />}
      {children}
    </>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls} aria-label={label && `${label} (opens in a new tab)`}>{body}<span className="visually-hidden"> (opens in a new tab)</span></a>;
  return <Link to={to!} className={cls} aria-label={label}>{body}</Link>;
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: 'small' | 'regular';
};

/** Icon-only button. `label` is required so screen readers can announce it. */
export function IconButton({ icon, label, variant = 'plain', size = 'regular', className, type = 'button', ...rest }: IconButtonProps) {
  const cls = [s.button, s.icon, s[variant], size === 'small' && s.small, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size === 'small' ? 18 : 22} />
    </button>
  );
}
