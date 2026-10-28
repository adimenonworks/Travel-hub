/** Small sessionStorage cache so tab switches don't refetch public APIs. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const { at, value } = JSON.parse(raw) as { at: number; value: T };
      if (Date.now() - at < ttlMs) return value;
    }
  } catch { /* ignore */ }
  const value = await load();
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch { /* ignore */ }
  return value;
}
