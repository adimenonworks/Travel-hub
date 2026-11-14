import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import s from './ContextMenu.module.css';

export type ContextMenuItem = { label: string; icon: IconName; /** Figma Tone=Danger: the red item (Delete) */ tone?: 'default' | 'danger'; onClick: () => void };

/**
 * Figma "Context menu": what a long press opens, like iOS. The pressed thing lifts above a soft dim (wrap it in
 * `children`), and a small rounded menu of rows (an icon and a label; Delete in red) sits under it, lined up with its
 * `align` edge. Tapping outside, or Escape, closes it.
 */
export function ContextMenu({ items, onClose, align = 'end', children, label }: {
  items: ContextMenuItem[]; onClose: () => void; align?: 'start' | 'end'; children: ReactNode; label: string;
}) {
  // Under the pressed thing, unless that runs into the tab bar or off the screen: then above it
  const menu = useRef<HTMLDivElement>(null);
  const [above, setAbove] = useState(false);
  // With large text the menu can be wider than the space beside the pressed thing: slide it back inside the page margins
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const r = menu.current?.getBoundingClientRect();
    if (r && r.bottom > window.innerHeight - 110) setAbove(true);
    // The page side margin in px (the token is a chain of var()s, so measure it rather than parse it)
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--space-page-gutter)';
    document.body.appendChild(probe);
    const gutter = probe.getBoundingClientRect().width;
    probe.remove();
    // Its pop-in animation scales it about its own corner, so work from its real width, not the scaled box
    const el = menu.current;
    if (!r || !el) return;
    const left = align === 'end' ? r.right - el.offsetWidth : r.left;
    const right = left + el.offsetWidth;
    if (left < gutter) setShift(gutter - left);
    else if (right > window.innerWidth - gutter) setShift(window.innerWidth - gutter - right);
  }, [align]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <>
      <div className={s.dim} onPointerDown={(e) => { e.preventDefault(); onClose(); }} aria-hidden="true" />
      <div className={s.lifted}>
        {children}
        <div ref={menu} role="menu" aria-label={label} style={shift ? { translate: `${shift}px 0` } : undefined} className={[s.menu, align === 'start' ? s.start : s.end, above && s.above].filter(Boolean).join(' ')}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" autoFocus={it === items[0]} className={[s.item, it.tone === 'danger' && s.destructive].filter(Boolean).join(' ')}
              onClick={() => { onClose(); it.onClick(); }}>
              <span>{it.label}</span><Icon name={it.icon} size={16} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
