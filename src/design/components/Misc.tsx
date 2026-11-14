import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import s from './Misc.module.css';
import type { CategoryTone } from './Rows';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Figma "Avatar": initials on the light emerald wash with a 2px ring in the surface colour. Size Small (24px), Medium (32)
 * and Large (40); Small and Medium use Label small, Large uses Label. Layout=More is the grey "+2" disc.
 */
export type AvatarSize = 'small' | 'medium' | 'large';
const AVATAR_PX: Record<AvatarSize, number> = { small: 24, medium: 32, large: 40 };

export function Avatar({ name, photo, size = 'medium' }: { name: string; photo?: string | null; size?: AvatarSize; seed?: string }) {
  const px = AVATAR_PX[size];
  const cls = [s.avatar, px === 40 && s.avatarLarge].filter(Boolean).join(' ');
  const style = { '--avatar-size': `${px}px` } as CSSProperties;
  if (photo) return <img className={cls} style={style} src={photo} alt={name} title={name} referrerPolicy="no-referrer" />;
  return <span className={cls} style={style} title={name} role="img" aria-label={name}>{initials(name)}</span>;
}

/** Figma "Avatar stack": up to three Medium (32px) avatars overlapping by 6px, then a "+n" More avatar. */
export function AvatarStack({ people, max = 3 }: { people: { id: string; name: string; photo?: string | null }[]; max?: number }) {
  const size: AvatarSize = 'medium'; /* Figma Avatar stack has one size (Medium avatars) */
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const px = AVATAR_PX[size];
  return (
    <span className={s.stack} role="group" aria-label={`${people.length} ${people.length === 1 ? 'person' : 'people'}: ${people.map((p) => p.name).join(', ')}`}>
      {shown.map((p) => <span key={p.id} aria-hidden="true" style={{ display: 'contents' }}><Avatar name={p.name} photo={p.photo} size={size} /></span>)}
      {extra > 0 && <span aria-hidden="true" className={`${s.avatar} ${s.more}`} style={{ '--avatar-size': `${px}px` } as CSSProperties}>+{extra}</span>}
    </span>
  );
}

/**
 * Figma "Tag" Tone: Neutral, Category, Success, Warning, Danger. Neutral is the default and what the app uses;
 * Success / Warning / Danger only for a real status. (Tint was removed on 13 Nov 2026: brand-tinted tags are banned.)
 */
export type TagTone = 'neutral' | 'success' | 'warning' | 'danger' | 'category';

/** Figma "Tag": a pill with an optional 16px icon and a Label small label. */
export function Tag({ tone = 'neutral', icon, iconState, flag, children }: {
  tone?: TagTone; icon?: IconName; iconState?: 'default' | 'filled'; /** A country flag instead of an icon */ flag?: ReactNode; children: ReactNode;
}) {
  return (
    <span className={[s.badge, s[`badge-${tone}`]].join(' ')}>
      {flag}
      {!flag && icon && <Icon name={icon} size={16} state={iconState} style={{ color: 'inherit' }} />}
      {children}
    </span>
  );
}

/** Figma Chip: a country or filter with a flag or icon. State=Selected is filled deep emerald. */
export function Chip({ selected, icon, flag, onClick, label, type, children }: {
  selected?: boolean; icon?: IconName; /** Image URL of a country flag */ flag?: string;
  /** Figma "Type": when selected, the chip takes an event type's colour (the category chips when adding an event or saving a place). */
  type?: CategoryTone;
  /** Makes the chip a button (e.g. a country chip opens its quick-info modal) */ onClick?: () => void; /** Fuller name for screen readers */ label?: string;
  children: ReactNode;
}) {
  const cls = [s.chip, selected ? s['chip-active'] : s['chip-inactive'], selected && type && type !== 'neutral' && s[`chip-${type}`], onClick && s.chipButton].filter(Boolean).join(' ');
  const body = <>{flag ? <img src={flag} alt="" className={s.chipFlag} /> : icon && <Icon name={icon} size={16} />}{children}</>;
  return onClick
    ? <button type="button" className={cls} onClick={onClick} aria-label={label}>{body}</button>
    : <span className={cls}>{body}</span>;
}

export type BannerTone = 'warning' | 'success' | 'danger' | 'neutral' | 'accent';

/** Figma "Banner" (called Notification until 13 Nov 2026; Tone Warning / Success / Danger / Neutral / Accent): an info icon, an optional label, and a message on a status colour. */
export function Banner({ tone = 'neutral', icon = 'information', label, children }: { tone?: BannerTone; icon?: IconName; label?: ReactNode; children: ReactNode }) {
  return (
    <div className={[s.note, s[`note-${tone}`]].filter(Boolean).join(' ')} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon} size={24} />
      <div className={s.noteText}>
        {label && <div className={s.noteLabel}>{label}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

