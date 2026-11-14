import { useSyncExternalStore } from 'react';

/**
 * Delete with Undo for things that have no Recently deleted (ideas, photo albums): the item disappears at once, and is
 * really deleted only when its Undo toast has gone (about 6 seconds). Undo just brings it back; nothing was deleted.
 * If the app is closed or hidden before then, the delete runs straight away, so it's never lost.
 */
const UNDO_MS = 6500;
const pending = new Map<string, { run: () => Promise<void>; timer: number }>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();
const changed = () => { snapshot = new Set(pending.keys()); listeners.forEach((l) => l()); };

const finish = (id: string) => {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
  changed();
  p.run().catch(() => {});
};

/** Hide `id` now and run `run` (the real delete) once Undo has had its time. Returns the Undo. */
export function deleteLater(id: string, run: () => Promise<void>): () => void {
  finish(id);
  pending.set(id, { run, timer: window.setTimeout(() => finish(id), UNDO_MS) });
  changed();
  return () => { const p = pending.get(id); if (p) { clearTimeout(p.timer); pending.delete(id); changed(); } };
}

if (typeof document !== 'undefined') {
  const flush = () => { for (const id of [...pending.keys()]) finish(id); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}

/** The ids waiting to be deleted (leave them out of lists). */
export function useDeleting(): ReadonlySet<string> {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot);
}
