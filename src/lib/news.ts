import { cached } from './cache';

export type Article = { title: string; url: string; source: string; date: string; image?: string };

/**
 * Recent English-language headlines mentioning the destination (GDELT — free,
 * no key). GDELT allows one request every few seconds, so results are cached.
 */
export async function localNews(place: string): Promise<Article[]> {
  const city = place.split(',')[0].trim();
  return cached(`news:${city}`, 60 * 60_000, async () => {
    const q = encodeURIComponent(`"${city}" sourcelang:english`);
    const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&format=json&maxrecords=12&sort=datedesc&timespan=7d`);
    if (!res.ok) throw new Error('News unavailable');
    const text = await res.text();
    const data = JSON.parse(text || '{}') as { articles?: { title: string; url: string; domain: string; seendate: string; socialimage?: string }[] };
    const seen = new Set<string>();
    return (data.articles ?? [])
      .filter((a) => !seen.has(a.title) && seen.add(a.title))
      .slice(0, 8)
      .map((a) => ({
        title: a.title,
        url: a.url,
        source: a.domain,
        date: `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}`,
        image: a.socialimage || undefined,
      }));
  });
}

export const newsSearchUrl = (place: string) => `https://news.google.com/search?q=${encodeURIComponent(place.split(',')[0])}`;
