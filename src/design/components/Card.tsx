import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import s from './Card.module.css';

type CardProps = HTMLAttributes<HTMLDivElement> & { flush?: boolean };

export function Card({ flush, className, ...rest }: CardProps) {
  return <div className={[s.card, flush && s.flush, 'on-secondary', className].filter(Boolean).join(' ')} {...rest} />;
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
