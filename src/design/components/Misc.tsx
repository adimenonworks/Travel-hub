import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { Illustration, type IllustrationName } from './Illustration';
import { Card } from './Card';
import s from './Misc.module.css';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Initials on the light emerald wash. `seed` is accepted for older callers; every avatar now shares one colour. */
export function Avatar({ name, photo, size = 32 }: { name: string; photo?: string | null; size?: number; seed?: string }) {
  // Figma Avatar: initials are Label small up to Medium (32), 16px at Large (48), 26.67px at Extra large (72).
  const style = { '--avatar-size': `${size}px`, fontSize: size >= 72 ? size * 0.37 : size >= 48 ? size / 3 : undefined } as CSSProperties;
  if (photo) return <img className={s.avatar} style={style} src={photo} alt={name} title={name} referrerPolicy="no-referrer" />;
  return <span className={s.avatar} style={style} title={name} role="img" aria-label={name}>{initials(name)}</span>;
}

export function AvatarStack({ people, max = 4, size = 28 }: { people: { id: string; name: string; photo?: string | null }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className={s.stack}>
      {shown.map((p) => <Avatar key={p.id} name={p.name} photo={p.photo} seed={p.id} size={size} />)}
      {extra > 0 && <span className={`${s.avatar} ${s.more}`} style={{ '--avatar-size': `${size}px` } as CSSProperties}>+{extra}</span>}
    </span>
  );
}

/** Figma Badge "Tone". Neutral is a white pill with a soft shadow (for sitting on photos and covers). */
export type BadgeTone = 'neutral' | 'tint' | 'success' | 'warning' | 'danger' | 'category' | 'inverse';

/** Figma Badge: Small (Label small, 16px icon) or Large (Label, 24px icon). Categories always carry their icon. */
export function Badge({ tone = 'neutral', size = 'small', icon, iconState, flag, children }: {
  tone?: BadgeTone; size?: 'small' | 'large'; icon?: IconName; iconState?: 'default' | 'filled'; /** A country flag instead of an icon */ flag?: ReactNode; children: ReactNode;
}) {
  return (
    <span className={[s.badge, s[`badge-${tone}`], size === 'large' && s.badgeLarge].filter(Boolean).join(' ')}>
      {flag}
      {!flag && icon && <Icon name={icon} size={size === 'large' ? 24 : 16} state={iconState} style={{ color: 'inherit' }} />}
      {children}
    </span>
  );
}

/** An empty list or missing record: a Card with an illustration, a title, a line of help and an optional action. */
export function EmptyState({ illustration, title, message, action }: { illustration: IllustrationName; title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <Card type="small" className={s.empty} media={<Illustration name={illustration} size={120} />} title={title} body={message} actions={action} />
  );
}

export function Spinner({ center }: { center?: boolean }) {
  const el = <div className={s.spinner} role="status" aria-label="Loading" />;
  return center ? <div className={s.center}>{el}</div> : el;
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
