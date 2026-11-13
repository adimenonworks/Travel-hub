import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Card.module.css';

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Figma Card "Tone": Default (white, subtle border) or Accent (bright emerald). */
  tone?: 'default' | 'accent';
  /** Figma Card "Layout": Start, or Centre for an empty state (an illustration, a title and a line of help, centred). */
  layout?: 'start' | 'centre';
  /** No padding (content such as a photo runs to the edges). */
  flush?: boolean;
  /** The Media slot: an icon on the light emerald tile, or any node (an illustration, an avatar). */
  icon?: IconName;
  media?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  /** Up to two buttons (Figma "Show actions", "Show second button"). */
  actions?: ReactNode;
  /** @deprecated use actions */
  action?: ReactNode;
  /** The whole card opens this page (hover and pressed tint it). */
  to?: string;
};

/**
 * Figma "Card": the surface for most things — banners, stat tiles, notes, albums, and empty states (the old Empty
 * state component, merged in on 13 Nov 2026: `layout="centre"` with an Illustration in `media`).
 * With no title/body it is just the surface around its children.
 */
export function Card({ tone = 'default', layout = 'start', flush, icon, media, title, body, actions, action, to, className, children, ...rest }: CardProps) {
  const btns = actions ?? action;
  const structured = title !== undefined || body !== undefined || icon || media || btns;
  const cls = [s.card, tone === 'accent' && s.accent, tone === 'accent' && 'surface-dark', flush && s.flush, structured && s.structured, layout === 'centre' && s.centre, to && s.interactive, className].filter(Boolean).join(' ');
  if (!structured) return <div className={cls} {...rest}>{children}</div>;
  const mediaNode = media ?? (icon && <span className={s.mediaTile}><Icon name={icon} size={16} /></span>);
  const inner = (
    <>
      {mediaNode && <div className={s.media} aria-hidden="true">{mediaNode}</div>}
      <div className={s.content}>
        {title !== undefined && <div className={s.title}>{title}</div>}
        {body !== undefined && body !== null && <div className={s.body}>{body}</div>}
        {children}
      </div>
      {btns && <div className={s.buttons}>{btns}</div>}
    </>
  );
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls} {...rest}>{inner}</div>;
}
