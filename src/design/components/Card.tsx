import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import s from './Card.module.css';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  flush?: boolean;
  tone?: 'default' | 'accent';
  /** A large icon or illustration on the left (e.g. <Icon name="globe" size={56} /> or <Illustration />). */
  media?: ReactNode;
  /** A call to action on the right; it drops below the text on narrow screens. */
  action?: ReactNode;
};

export function Card({ flush, tone = 'default', media, action, className, children, ...rest }: CardProps) {
  const cls = [s.card, flush && s.flush, tone === 'accent' && s.accent, (media || action) && s.split, className].filter(Boolean).join(' ');
  if (!media && !action) return <div className={cls} {...rest}>{children}</div>;
  return (
    <div className={cls} {...rest}>
      {media && <div className={s.media} aria-hidden="true">{media}</div>}
      <div className={s.body}>{children}</div>
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}

export function CardLink({ to, flush, className, children }: { to: string; flush?: boolean; className?: string; children: ReactNode }) {
  return <Link to={to} className={[s.card, s.interactive, flush && s.flush, className].filter(Boolean).join(' ')}>{children}</Link>;
}

/** A titled group of content, like a table-view section. */
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
