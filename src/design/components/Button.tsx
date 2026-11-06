import type React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Button.module.css';

/** Figma Button "Variant". Inverse is the deep emerald button for brand surfaces; Neutral the dark grey one; Tertiary is outlined. */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'inverse' | 'neutral' | 'tertiary' | 'ghost';
/** Figma Button "Size": Large is 48px tall (Label, 24px icons), Regular 32px (Label small, 16px icons, still a 44px tap area). */
export type ButtonSize = 'regular' | 'large';

type Look = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; /** Leading icon */ icon?: IconName; /** Trailing icon */ iconEnd?: IconName };

const cls = ({ variant = 'primary', size = 'large', block }: Look, iconOnly: boolean, extra?: string) =>
  [s.button, s[variant], s[size], block && s.block, iconOnly && s.iconOnly, extra].filter(Boolean).join(' ');

function Body({ icon, iconEnd, size = 'large', children }: Look & { children?: ReactNode }) {
  const px = size === 'regular' ? 16 : 24;
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
export function LinkButton({ to, href, variant, size, block, icon, iconEnd, label, onClick, children }: Look & {
  /** Runs before the link is followed (call e.preventDefault() to handle the navigation yourself). */ onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Fuller name for screen readers when the visible text is short (e.g. "Email" on a list row). */ label?: string;
  /** Leave out for an icon-only link (then `icon` and `label` are required). */ children?: ReactNode;
} & ({ to: string; href?: never } | { href: string; to?: never })) {
  const c = cls({ variant, size, block }, !children);
  const body = <Body icon={icon} iconEnd={iconEnd} size={size}>{children}</Body>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={c} aria-label={label && `${label} (opens in a new tab)`}>{body}<span className="visually-hidden"> (opens in a new tab)</span></a>;
  return <Link to={to!} className={c} aria-label={label} onClick={onClick}>{body}</Link>;
}

export type IconButtonTone = 'secondary' | 'ghost' | 'on-brand';

/**
 * Figma "Icon button" (Tone Secondary / Ghost / On brand): a 40px circle with a 24px icon, inside a 44px tap area.
 * Secondary and Ghost share the Button's colour tokens; On brand sits on the bright emerald flow screens.
 * `label` is required: it's what screen readers announce.
 */
export function IconButton({ icon, label, tone, variant, state, className, type = 'button', ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  icon: IconName; label: string; tone?: IconButtonTone;
  /** @deprecated use tone */ variant?: 'secondary' | 'ghost';
  /** @deprecated Figma has one size (40px); ignored */ size?: ButtonSize;
  /** Show the filled icon (e.g. a starred event) */ state?: 'default' | 'filled';
}) {
  const t = tone ?? variant ?? 'ghost';
  delete (rest as { size?: unknown }).size;
  return (
    <button type={type} className={[s.iconButton, s[`icon-${t}`], className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={24} state={state} className={s.glyph} />
    </button>
  );
}
