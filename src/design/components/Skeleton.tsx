import type { CSSProperties } from 'react';
import s from './Skeleton.module.css';

/**
 * Figma "Skeleton": a grey rounded shape that shimmers while content loads (still with Reduce Motion).
 * Shape=Text (a line), Block (a card) or Circle (an avatar).
 */
export function Skeleton({ shape = 'text', width, height }: { shape?: 'text' | 'block' | 'circle'; width?: string | number; height?: string | number }) {
  const style: CSSProperties = { width, height };
  return <span className={[s.sk, s[shape]].join(' ')} style={style} aria-hidden="true" />;
}

/** A whole page loading: header, a big card and a few lines. Used instead of a spinner. */
export function PageSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div className={s.page} role="status" aria-label={label}>
      <div className={s.header}>
        <Skeleton width="55%" height="calc(40rem / 17)" />
        <Skeleton shape="circle" />
      </div>
      <Skeleton shape="block" height={340} />
      <Skeleton width="40%" height="calc(20rem / 17)" />
      <Skeleton shape="block" height={180} />
      <Skeleton shape="block" height={120} />
    </div>
  );
}
