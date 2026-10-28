export type AlbumProvider = 'google' | 'apple' | 'other';

/** Which service a shared-album link belongs to, from its address. */
export function albumProvider(url: string): AlbumProvider {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return 'other'; }
  if (host === 'photos.app.goo.gl' || host === 'photos.google.com' || host === 'goo.gl') return 'google';
  if (host === 'icloud.com' || host.endsWith('.icloud.com')) return 'apple';
  return 'other';
}

export const providerName: Record<AlbumProvider, string> = { google: 'Google Photos', apple: 'iCloud Shared Album', other: 'Shared album' };
