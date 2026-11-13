import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { haptic } from '../../lib/native';
import s from './Toast.module.css';

/** `action`: one short text button, e.g. Undo after a save (the toast then stays 5 seconds).
 *  `size: 'large'` (Figma Size=Large): Body text, more padding, a 24px icon; stays 6 seconds. For messages from people. */
type ToastMessage = { id: number; icon?: IconName; label: string; tone?: 'neutral' | 'danger'; size?: 'regular' | 'large'; action?: { label: string; onClick: () => void } };

const ToastContext = createContext<(t: Omit<ToastMessage, 'id'>) => void>(() => {});

/**
 * Show a short message at the top of the screen, e.g. `toast({ icon: 'copy', label: 'Address copied' })`,
 * or `toast({ tone: 'danger', label: "Couldn't save. Check your connection" })` when something fails.
 */
export const useToast = () => useContext(ToastContext);

const SHOW_MS = 3000;
const LARGE_MS = 6000;
const LEAVE_MS = 300;

/**
 * Figma "Toast" (Tone Neutral or Error; Size Regular or Large): a pill (icon + Label) that slides down from the top, stays
 * 3 seconds (Large: 6), then slides back up.
 * Screen readers hear the label (role="status").
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMessage | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const show = useCallback((t: Omit<ToastMessage, 'id'>) => {
    clear();
    setLeaving(false);
    setMsg({ ...t, id: Date.now() });
    if (t.tone === 'danger') haptic('error'); // Figma Haptics map: Error when a save fails
    const ms = t.size === 'large' ? LARGE_MS : t.action ? SHOW_MS + 2000 : SHOW_MS;
    timers.current.push(
      window.setTimeout(() => setLeaving(true), ms),
      window.setTimeout(() => setMsg(null), ms + LEAVE_MS),
    );
  }, []);
  useEffect(() => clear, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={s.region} role="status" aria-live="polite">
        {msg && (
          <div key={msg.id} className={[s.toast, msg.size === 'large' ? s.large : s.small, msg.tone === 'danger' && s.error, leaving && s.leaving].filter(Boolean).join(' ')}>
            {(msg.icon || msg.tone === 'danger') && <Icon name={msg.icon ?? 'info'} size={msg.size === 'large' ? 24 : 16} className={s.icon} />}
            <span>{msg.label}</span>
            {msg.action && (
              <button type="button" className={s.action} onClick={() => { msg.action!.onClick(); clear(); setLeaving(true); timers.current.push(window.setTimeout(() => setMsg(null), LEAVE_MS)); }}>
                {msg.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
