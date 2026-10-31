import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { useLarge } from './TripCards';
import s from './Toast.module.css';

type ToastMessage = { id: number; icon?: IconName; label: string; tone?: 'neutral' | 'error' };

const ToastContext = createContext<(t: Omit<ToastMessage, 'id'>) => void>(() => {});

/**
 * Show a short message at the top of the screen, e.g. `toast({ icon: 'copy', label: 'Address copied' })`,
 * or `toast({ tone: 'error', label: "Couldn't save. Check your connection" })` when something fails.
 */
export const useToast = () => useContext(ToastContext);

const SHOW_MS = 3000;
const LEAVE_MS = 300;

/**
 * Figma "Toast" (Tone Neutral or Error): a pill (icon + Label) that slides down from the top, stays 3 seconds, then slides back up.
 * Size=Small below 744px, Large from 744px. Screen readers hear the label (role="status").
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMessage | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);
  const large = useLarge();

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const show = useCallback((t: Omit<ToastMessage, 'id'>) => {
    clear();
    setLeaving(false);
    setMsg({ ...t, id: Date.now() });
    timers.current.push(
      window.setTimeout(() => setLeaving(true), SHOW_MS),
      window.setTimeout(() => setMsg(null), SHOW_MS + LEAVE_MS),
    );
  }, []);
  useEffect(() => clear, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={s.region} role="status" aria-live="polite">
        {msg && (
          <div key={msg.id} className={[s.toast, large ? s.large : s.small, msg.tone === 'error' && s.error, leaving && s.leaving].filter(Boolean).join(' ')}>
            {(msg.icon || msg.tone === 'error') && <Icon name={msg.icon ?? 'info'} size={large ? 24 : 16} className={s.icon} />}
            <span>{msg.label}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
