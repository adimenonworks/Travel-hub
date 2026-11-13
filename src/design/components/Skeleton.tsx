import type { CSSProperties } from 'react';
import s from './Skeleton.module.css';

/**
 * Figma "Skeleton": a grey rounded layout that shimmers while content loads (still with Reduce Motion).
 * Shape=Text (a line), Block (a card) or Circle (an avatar).
 */
export function Skeleton({ layout = 'text', width, height }: { layout?: 'text' | 'block' | 'circle'; width?: string | number; height?: string | number }) {
  const style: CSSProperties = { width, height };
  return <span className={[s.sk, s[layout]].join(' ')} style={style} aria-hidden="true" />;
}

/**
 * A page loading: a title, a big card and a few lines, used instead of a spinner.
 * `bare` is for inside a page that already shows its own header: just the content shapes, full width.
 * `fullscreen` is for the one drawn before the app frame exists (while Rove checks who's signed in): it keeps clear of
 * the status bar and Dynamic Island itself.
 */
export function PageSkeleton({ label = 'Loading', bare, fullscreen }: { label?: string; bare?: boolean; fullscreen?: boolean }) {
  return (
    <div className={[s.page, bare && s.bare, fullscreen && s.fullscreen].filter(Boolean).join(' ')} role="status" aria-label={label}>
      {!bare && <Skeleton width="55%" height="calc(48rem / 17)" />}
      <Skeleton layout="block" height={bare ? 231 : 340} />
      <Skeleton width="40%" height="calc(20rem / 17)" />
      <Skeleton layout="block" height={180} />
      <Skeleton layout="block" height={120} />
    </div>
  );
}
