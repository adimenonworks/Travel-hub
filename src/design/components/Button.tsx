import type React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { Badge } from './Misc';
import s from './Button.module.css';

/** Figma Button "Tone". Inverse is the deep emerald button for brand surfaces; Neutral the dark grey one; Tertiary is outlined. */
export type ButtonTone = 'primary' | 'destructive' | 'inverse' | 'neutral' | 'tertiary' | 'ghost';
/** Figma Button "Size": Small is 32px (Label, 16px icons, still a 44px tap area) and the default; Large is 48px (Label, 24px icons), the default for full-width (block) buttons. */
export type ButtonSize = 'small' | 'large';

type Look = { tone?: ButtonTone; size?: ButtonSize; block?: boolean; /** Leading icon */ icon?: IconName; /** Trailing icon */ iconEnd?: IconName;
  /** Working on it: the trailing icon becomes a small spinner (e.g. Create my trip, then the screen floods green) */ loading?: boolean };

const sizeOf = (size: ButtonSize | undefined, block?: boolean): ButtonSize => size ?? (block ? 'large' : 'small');
const cls = ({ tone = 'primary', size, block }: Look, iconOnly: boolean, extra?: string) =>
  [s.button, s[tone], s[sizeOf(size, block)], block && s.block, iconOnly && s.iconOnly, extra].filter(Boolean).join(' ');

function Body({ icon, iconEnd, size, block, loading, children }: Look & { children?: ReactNode }) {
  const px = sizeOf(size, block) === 'small' ? 16 : 24;
  return (
    <>
      {icon && <Icon name={icon} size={px} className={s.glyph} />}
      {children}
      {loading ? <span className={s.spinner} style={{ width: px, height: px }} aria-hidden="true" /> : iconEnd && <Icon name={iconEnd} size={px} className={s.glyph} />}
    </>
  );
}

export function Button({ tone, size, block, icon, iconEnd, loading, children, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & Look) {
  return (
    <button type={type} className={cls({ tone, size, block }, !children, className)} aria-busy={loading || undefined} {...rest}>
      <Body icon={icon} iconEnd={iconEnd} size={size} block={block} loading={loading}>{children}</Body>
    </button>
  );
}

/**
 * A link that looks like a button (never wrap a Button in a Link: nested controls confuse screen readers).
 * `to` is an in-app route; `href` is an external site, opened in a new tab.
 */
export function LinkButton({ to, href, tone, size, block, icon, iconEnd, label, onClick, children }: Look & {
  /** Runs before the link is followed (call e.preventDefault() to handle the navigation yourself). */ onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Fuller name for screen readers when the visible text is short (e.g. "Email" on a list row). */ label?: string;
  /** Leave out for an icon-only link (then `icon` and `label` are required). */ children?: ReactNode;
} & ({ to: string; href?: never } | { href: string; to?: never })) {
  const c = cls({ tone, size, block }, !children);
  const body = <Body icon={icon} iconEnd={iconEnd} size={size} block={block}>{children}</Body>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={c} aria-label={label && `${label} (opens in a new tab)`}>{body}<span className="visually-hidden"> (opens in a new tab)</span></a>;
  return <Link to={to!} className={c} aria-label={label} onClick={onClick}>{body}</Link>;
}

/** Figma Icon button tones */
export type IconButtonTone = 'secondary' | 'ghost' | 'on-feature' | 'primary';

/**
 * Figma "Icon button" (Tone Secondary / Ghost / On feature / Primary): a 40px circle with a 24px icon, inside a 44px tap area.
 * Secondary is the neutral grey circle, Ghost is clear; On feature sits on the deep green New trip flow (feature/surface-sunken, feature/icon); Primary is
 * emerald, for the one main action in a row (Send a comment).
 * `label` is required: it's what screen readers announce.
 */
export function IconButton({ icon, label, tone, state, size = 'large', badge, className, type = 'button', ...rest }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> & {
  icon: IconName; label: string; tone?: IconButtonTone;
  /** Figma Icon button Size: Large (default) a 40px circle with a 24px icon; Small a 32px circle with a 16px icon
   *  (still a 44px tap area), e.g. deleting a comment */ size?: 'small' | 'large';
  /** Show the filled icon (e.g. a starred event) */ state?: 'default' | 'filled';
  /** Figma "Show Badge": a count over the icon (e.g. unread notifications on the Bell); 0 shows none. Say it in `label`. */
  badge?: number;
}) {
  const t = tone ?? 'ghost';
  return (
    <button type={type} className={[s.iconButton, size === 'small' && s.iconSmall, s[`icon-${t}`], className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size === 'small' ? 16 : 24} state={state} className={s.glyph} />
      {!!badge && <Badge count={badge} className={s.badge} />}
    </button>
  );
}
