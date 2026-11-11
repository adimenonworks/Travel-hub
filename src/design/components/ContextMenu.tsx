import { useEffect, type ReactNode } from 'react';
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
        <div role="menu" aria-label={label} className={`${s.menu} ${align === 'start' ? s.start : s.end}`}>
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
