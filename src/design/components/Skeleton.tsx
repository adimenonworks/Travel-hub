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

/**
 * A page loading: a title, a big card and a few lines, used instead of a spinner.
 * `bare` is for inside a page that already shows its own header: just the content shapes, full width.
 */
export function PageSkeleton({ label = 'Loading', bare }: { label?: string; bare?: boolean }) {
  return (
    <div className={[s.page, bare && s.bare].filter(Boolean).join(' ')} role="status" aria-label={label}>
      {!bare && <Skeleton width="55%" height="calc(48rem / 17)" />}
      <Skeleton shape="block" height={bare ? 231 : 340} />
      <Skeleton width="40%" height="calc(20rem / 17)" />
      <Skeleton shape="block" height={180} />
      <Skeleton shape="block" height={120} />
    </div>
  );
}
