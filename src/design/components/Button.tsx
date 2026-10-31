import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Button.module.css';

/** Figma Button "Variant". Inverse is the dark button that sits on a brand (emerald) surface. */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'inverse' | 'ghost';
/** Figma Button "Size": Regular is 48px tall, Small 40px (both keep a 44px tap area). */
export type ButtonSize = 'small' | 'regular';

type Look = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; /** Leading icon */ icon?: IconName; /** Trailing icon */ iconEnd?: IconName };

const cls = ({ variant = 'primary', size = 'regular', block }: Look, iconOnly: boolean, extra?: string) =>
  [s.button, s[variant], s[size], block && s.block, iconOnly && s.iconOnly, extra].filter(Boolean).join(' ');

function Body({ icon, iconEnd, size = 'regular', children }: Look & { children?: ReactNode }) {
  const px = size === 'small' ? 16 : 24;
  return (
    <>
      {icon && <Icon name={icon} size={px} className={s.glyph} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={px} className={s.glyph} />}
    </>
  );
}

export function Button({ variant, size, block, icon, iconEnd, children, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return (
    <button type={type} className={cls({ variant, size, block }, !children, className)} {...rest}>
      <Body icon={icon} iconEnd={iconEnd} size={size}>{children}</Body>
    </button>
  );
}

/**
 * A link that looks like a button (never wrap a Button in a Link: nested controls confuse screen readers).
 * `to` is an in-app route; `href` is an external site, opened in a new tab.
 */
export function LinkButton({ to, href, variant, size, block, icon, iconEnd, label, children }: Look & {
  /** Fuller name for screen readers when the visible text is short (e.g. "Email" on a list row). */ label?: string;
  /** Leave out for an icon-only link (then `icon` and `label` are required). */ children?: ReactNode;
} & ({ to: string; href?: never } | { href: string; to?: never })) {
  const c = cls({ variant, size, block }, !children);
  const body = <Body icon={icon} iconEnd={iconEnd} size={size}>{children}</Body>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={c} aria-label={label && `${label} (opens in a new tab)`}>{body}<span className="visually-hidden"> (opens in a new tab)</span></a>;
  return <Link to={to!} className={c} aria-label={label}>{body}</Link>;
}

/** Icon-only Button (Figma Button with "Show text" off). `label` is required so screen readers can announce it. */
export function IconButton({ icon, label, variant = 'ghost', size = 'regular', state, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName; label: string; variant?: ButtonVariant; size?: ButtonSize; /** Show the filled icon (e.g. a starred event) */ state?: 'default' | 'filled';
}) {
  return (
    <button type={type} className={cls({ variant, size }, true, className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={24} state={state} className={s.glyph} />
    </button>
  );
}
