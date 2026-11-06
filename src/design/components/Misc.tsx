import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Illustration, type IllustrationName } from './Illustration';
import { Card } from './Card';
import s from './Misc.module.css';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Figma "Avatar": initials on the light emerald wash with a 2px ring in the surface colour. Sizes 24, 32 and 40
 * (24 and 32 use Label small, 40 uses Label); any other size snaps to the nearest. Kind=More is the grey "+2" disc.
 */
export function Avatar({ name, photo, size = 32 }: { name: string; photo?: string | null; size?: number; seed?: string }) {
  const px = size <= 28 ? 24 : size < 40 ? 32 : 40;
  const cls = [s.avatar, px === 40 && s.avatarLarge].filter(Boolean).join(' ');
  const style = { '--avatar-size': `${px}px` } as CSSProperties;
  if (photo) return <img className={cls} style={style} src={photo} alt={name} title={name} referrerPolicy="no-referrer" />;
  return <span className={cls} style={style} title={name} role="img" aria-label={name}>{initials(name)}</span>;
}

/** Figma "Avatar Stack": up to three 32px avatars overlapping by 6px, then a "+n" More avatar. */
export function AvatarStack({ people, max = 3, size = 32 }: { people: { id: string; name: string; photo?: string | null }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const px = size <= 28 ? 24 : size < 40 ? 32 : 40;
  return (
    <span className={s.stack} role="group" aria-label={`${people.length} ${people.length === 1 ? 'person' : 'people'}: ${people.map((p) => p.name).join(', ')}`}>
      {shown.map((p) => <span key={p.id} aria-hidden="true" style={{ display: 'contents' }}><Avatar name={p.name} photo={p.photo} size={px} /></span>)}
      {extra > 0 && <span aria-hidden="true" className={`${s.avatar} ${s.more}`} style={{ '--avatar-size': `${px}px` } as CSSProperties}>+{extra}</span>}
    </span>
  );
}

/** Figma "Tags" Tone: Neutral, Tint, Category, Success, Warning, Danger. */
export type BadgeTone = 'neutral' | 'tint' | 'success' | 'warning' | 'danger' | 'category';

/** Figma "Tags": a pill with an optional 16px icon and a Label small label. */
export function Badge({ tone = 'neutral', icon, iconState, flag, children }: {
  tone?: BadgeTone; icon?: IconName; iconState?: 'default' | 'filled'; /** A country flag instead of an icon */ flag?: ReactNode; children: ReactNode;
}) {
  return (
    <span className={[s.badge, s[`badge-${tone}`]].join(' ')}>
      {flag}
      {!flag && icon && <Icon name={icon} size={16} state={iconState} style={{ color: 'inherit' }} />}
      {children}
    </span>
  );
}

/** Figma Chip (Type=Action): a country or filter with a flag or icon. Active is filled deep emerald. */
export function Chip({ active, icon, flag, onClick, label, children }: {
  active?: boolean; icon?: IconName; /** Image URL of a country flag */ flag?: string;
  /** Makes the chip a button (e.g. a country chip opens its quick-info modal) */ onClick?: () => void; /** Fuller name for screen readers */ label?: string;
  children: ReactNode;
}) {
  const cls = [s.chip, active ? s['chip-active'] : s['chip-inactive'], onClick && s.chipButton].filter(Boolean).join(' ');
  const body = <>{flag ? <img src={flag} alt="" className={s.chipFlag} /> : icon && <Icon name={icon} size={16} />}{children}</>;
  return onClick
    ? <button type="button" className={cls} onClick={onClick} aria-label={label}>{body}</button>
    : <span className={cls}>{body}</span>;
}

/** An empty list or missing record: a Card with an illustration, a title, a line of help and an optional action. */
export function EmptyState({ illustration, title, message, action }: { illustration: IllustrationName; title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <Card className={s.empty} media={<Illustration name={illustration} size={120} />} title={title} body={message} actions={action} />
  );
}

export type NotificationState = 'warning' | 'success' | 'error' | 'neutral' | 'brand';

/** Figma Notification: an info icon, an optional label, and a message on a status colour. */
export function Notification({ state = 'neutral', icon = 'info', label, children }: { state?: NotificationState; icon?: IconName; label?: ReactNode; children: ReactNode }) {
  return (
    <div className={[s.note, s[`note-${state}`]].filter(Boolean).join(' ')} role={state === 'error' ? 'alert' : undefined}>
      <Icon name={icon} size={20} />
      <div className={s.noteText}>
        {label && <div className={s.noteLabel}>{label}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
