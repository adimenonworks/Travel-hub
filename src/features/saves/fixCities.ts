import { useEffect } from 'react';
import { store } from '../../data';
import { useMe, usePlaces } from '../../data/hooks';
import { cityAt, looksLikePostcode } from '../../lib/links';

const tried = new Set<string>();

/**
 * Older saves sometimes got a postcode as their city ("7000" instead of Hobart). Once per session, each of your own
 * places with a postcode for a city looks up its real city (or state/province) from its map position and is fixed.
 */
export function useFixPostcodeCities() {
  const me = useMe();
  const places = usePlaces();
  useEffect(() => {
    for (const p of places ?? []) {
      if (p.ownerId !== me.uid || !p.city || !looksLikePostcode(p.city) || p.lat == null || p.lng == null || tried.has(p.id)) continue;
      tried.add(p.id);
      cityAt(p.lat, p.lng).then((city) => { if (city) store.updatePlace(p.id, { city }).catch(() => {}); });
    }
  }, [places, me.uid]);
}
