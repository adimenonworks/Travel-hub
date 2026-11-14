import type { HTMLAttributes, ReactNode } from 'react';
import s from './Message.module.css';

/**
 * Figma "Message": one chat bubble, Messages-style. Layout Theirs (white bubble on the grey comments section, the
 * Avatar slot on the left) or Mine (deep green, feature/*, on the right). Show meta puts a line above: theirs "Sam · 2h",
 * mine the time. Show Avatar fills the slot (theirs only; without it the slot keeps its width, so a stack lines up).
 * Show edited adds "Edited" beside the bubble. A run of messages from one person is a stack of these, the meta on
 * the first and the avatar beside the last (see `features/shared/Comments.tsx`).
 */
export function Message({ layout, meta, avatar, edited, bubbleProps, wrapBubble, children }: {
  layout: 'theirs' | 'mine';
  /** Figma "Show meta" with Meta (theirs) or Time (mine). */
  meta?: ReactNode;
  /** Figma "Show Avatar" (theirs only). */
  avatar?: ReactNode;
  /** Figma "Show edited". */
  edited?: boolean;
  /** Extra props for the bubble (press and hold, keyboard, accessible name). */
  bubbleProps?: HTMLAttributes<HTMLParagraphElement>;
  /** Wraps the bubble, e.g. in the Context menu while it's open. */
  wrapBubble?: (bubble: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  const mine = layout === 'mine';
  const bubble = <p className={s.bubble} {...bubbleProps}>{children}</p>;
  const label = edited && <span className={s.edited}>Edited</span>;
  return (
    <div className={`${s.message} ${mine ? s.mine : s.theirs}`}>
      {meta !== undefined && <span className={s.meta}>{meta}</span>}
      <div className={s.row}>
        {!mine && (avatar ?? <span className={s.avatarSpace} aria-hidden="true" />)}
        {mine && label}
        {wrapBubble ? wrapBubble(bubble) : bubble}
        {!mine && label}
      </div>
    </div>
  );
}
