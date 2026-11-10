import { useEffect, useRef } from 'react';
import { store } from '../../data';
import type { Activity } from '../../data/types';
import { placeCategoryOfEvent } from '../../lib/places';
import { behaviourOf } from '../../lib/categories';

/** The city from a geocoded name ("Cais do Sodré, Lisbon, Portugal" → "Lisbon"); the first part when that's all there is. */
const cityFrom = (name?: string) => {
  const parts = (name ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 2] : parts[0] ?? '';
};

/**
 * Starring an event stars its Place. An event with no Place yet (added by hand) gets one in your Collections first,
 * filed by its country, city and type, and the event then points at it. Returns the Place id, or null for a Note.
 */
export async function placeForEvent(tripId: string, a: Activity, starredBy: string[]): Promise<string | null> {
  if (a.placeId) return a.placeId;
  if (!a.location || behaviourOf(a.category) === 'open' || behaviourOf(a.category) === 'note') return null;
  const { id } = store.addPlace({
    name: a.title, category: placeCategoryOfEvent(a.category), city: cityFrom(a.location.name),
    country: a.location.country ?? '', countryCode: (a.location.countryCode ?? '').toLowerCase(),
    lat: a.location.lat, lng: a.location.lng, starredBy,
  });
  await store.updateSub(tripId, 'activities', a.id, { placeId: id });
  return id;
}

/**
 * Older events kept their stars on the event (`starredBy`). Move yours onto a Place, once, so they show in
 * Collections and Favourite places.
 */
export function useStarMigration(tripId: string, activities: Activity[], uid: string) {
  const done = useRef(new Set<string>());
  useEffect(() => {
    for (const a of activities) {
      if (!a.starredBy?.includes(uid) || done.current.has(a.id)) continue;
      done.current.add(a.id);
      (async () => {
        try {
          const id = a.placeId ?? await placeForEvent(tripId, a, [uid]);
          if (id && a.placeId) await store.starPlace(id, uid, true);
          await store.toggleInArray(tripId, 'activities', a.id, 'starredBy', uid, false);
        } catch { /* offline: try again next time */ }
      })();
    }
  }, [tripId, activities, uid]);
}
