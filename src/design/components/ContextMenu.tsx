import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import s from './ContextMenu.module.css';

export type ContextMenuItem = { label: string; icon: IconName; destructive?: boolean; onClick: () => void };

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
  useLayoutEffect(() => {
    const r = menu.current?.getBoundingClientRect();
    if (r && r.bottom > window.innerHeight - 110) setAbove(true);
  }, []);
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
        <div ref={menu} role="menu" aria-label={label} className={[s.menu, align === 'start' ? s.start : s.end, above && s.above].filter(Boolean).join(' ')}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" autoFocus={it === items[0]} className={[s.item, it.destructive && s.destructive].filter(Boolean).join(' ')}
              onClick={() => { onClose(); it.onClick(); }}>
              <span>{it.label}</span><Icon name={it.icon} size={16} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
