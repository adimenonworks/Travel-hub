import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import s from './Card.module.css';

type CardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** Figma Card "Tone": Default (white, subtle border) or Accent (bright emerald). */
  tone?: 'default' | 'accent';
  /** Figma Card "Type": Large is a row (media · text · buttons); Small stacks them. */
  type?: 'large' | 'small';
  /** No padding (content such as a photo runs to the edges). */
  flush?: boolean;
  /** The Media slot: an icon on the light emerald tile, or any node (an illustration, an avatar). */
  icon?: IconName;
  media?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  /** Up to two buttons ("Show button", "Show button 2"). */
  actions?: ReactNode;
  /** @deprecated use actions */
  action?: ReactNode;
};

/**
 * Figma "Card": the surface for most things — banners, stat tiles, notes, empty states, albums.
 * With no title/body it is just the surface around its children.
 */
export function Card({ tone = 'default', type = 'large', flush, icon, media, title, body, actions, action, className, children, ...rest }: CardProps) {
  const btns = actions ?? action;
  const structured = title !== undefined || body !== undefined || icon || media || btns;
  const cls = [s.card, tone === 'accent' && s.accent, flush && s.flush, structured && s[type], className].filter(Boolean).join(' ');
  if (!structured) return <div className={cls} {...rest}>{children}</div>;
  const mediaNode = media ?? (icon && <span className={s.mediaTile}><Icon name={icon} size={type === 'small' ? 16 : 24} /></span>);
  return (
    <div className={cls} {...rest}>
      {mediaNode && <div className={s.media} aria-hidden="true">{mediaNode}</div>}
      <div className={s.content}>
        {title !== undefined && <div className={s.title}>{title}</div>}
        {body !== undefined && body !== null && <div className={s.body}>{body}</div>}
        {children}
      </div>
      {btns && <div className={s.buttons}>{btns}</div>}
    </div>
  );
}

/** A whole Card that is a link (hover and pressed tint the surface). */
export function CardLink({ to, flush, className, children }: { to: string; flush?: boolean; className?: string; children: ReactNode }) {
  return <Link to={to} className={[s.card, s.interactive, flush && s.flush, className].filter(Boolean).join(' ')}>{children}</Link>;
}

/** A titled group of content (Heading 2 title, optional action on the right, footnote under). */
export function Section({ title, action, footer, children, className }: { title?: ReactNode; action?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={[s.section, className].filter(Boolean).join(' ')}>
      {(title || action) && (
        <div className={s.sectionHeader}>
          {title && <h2 className={s.sectionTitle}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
      {footer && <div className={s.sectionFooter}>{footer}</div>}
    </section>
  );
}
