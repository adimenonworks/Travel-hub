import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import s from './Misc.module.css';

const avatarColors = ['--p-lime', '--p-sky', '--p-tangerine', '--p-lavender', '--p-bubblegum', '--p-lemon', '--p-aqua', '--p-sand'].map((v) => `var(${v})`);

function colorFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, photo, size = 32, seed }: { name: string; photo?: string | null; size?: number; seed?: string }) {
  const style = { '--avatar-size': `${size}px`, '--avatar-bg': colorFor(seed ?? name) } as CSSProperties;
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

export type BadgeTone = 'neutral' | 'tint' | 'success' | 'warning' | 'danger';

export function Badge({ tone = 'neutral', icon, children, color }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; color?: string }) {
  // A custom colour is a bright fill (category colours), so its text is the dark on-bright ink.
  const style = color ? ({ '--badge-fg': 'var(--color-on-bright)', '--badge-bg': color } as CSSProperties) : undefined;
  return (
    <span className={[s.badge, tone !== 'neutral' && s[`badge-${tone}`]].filter(Boolean).join(' ')} style={style}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIconWrap}><Icon name={icon} size={36} /></span>
      <div className={s.emptyTitle}>{title}</div>
      {message && <div>{message}</div>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  );
}

export function Spinner({ center }: { center?: boolean }) {
  const el = <div className={s.spinner} role="status" aria-label="Loading" />;
  return center ? <div className={s.center}>{el}</div> : el;
}

export function Banner({ icon = 'info', children }: { icon?: IconName; children: ReactNode }) {
  return <div className={s.banner}><Icon name={icon} size={20} /><div>{children}</div></div>;
}
