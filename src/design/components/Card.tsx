import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import s from './Card.module.css';

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Figma Card "Tone": Default (white, subtle border) or Accent (bright emerald). */
  tone?: 'default' | 'accent';
  /** Figma Card "Layout": Start, or Centre for an empty state (an illustration, a title and a line of help, centred). */
  layout?: 'start' | 'centre';
  /** Figma "Show media": an illustration, an avatar or any node (an empty state's Illustration). */
  media?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  /** Up to two buttons (Figma "Show actions", "Show second button"). */
  actions?: ReactNode;
  /** The whole card opens this page (hover and pressed tint it). */
  to?: string;
};

/**
 * Figma "Card": the surface for most things — banners, stat tiles, notes, albums, and empty states (the old Empty
 * state component, merged in on 13 Nov 2026: `layout="centre"` with an Illustration in `media`).
 * With no title/body it is just the surface around its children.
 */
export function Card({ tone = 'default', layout = 'start', media, title, body, actions, to, className, children, ...rest }: CardProps) {
  const structured = title !== undefined || body !== undefined || media || actions;
  const cls = [s.card, tone === 'accent' && s.accent, tone === 'accent' && 'feature', structured && s.structured, layout === 'centre' && s.centre, to && s.interactive, className].filter(Boolean).join(' ');
  if (!structured) return <div className={cls} {...rest}>{children}</div>;
  const inner = (
    <>
      {media && <div className={s.media} aria-hidden="true">{media}</div>}
      <div className={s.content}>
        {title !== undefined && <div className={s.title}>{title}</div>}
        {body !== undefined && body !== null && <div className={s.body}>{body}</div>}
        {children}
      </div>
      {actions && <div className={s.buttons}>{actions}</div>}
    </>
  );
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls} {...rest}>{inner}</div>;
}
