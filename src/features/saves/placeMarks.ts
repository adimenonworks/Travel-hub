import { useMemo } from 'react';
import { useActivitiesFor, useMe, useMyTrips } from '../../data/hooks';
import type { SavedPlace } from '../../data/types';
import { visitedPlaceIds } from '../../lib/places';

/**
 * ✓ and ★ for Places: visited (an event that points at it is in the past, on any of your trips) and starred by you.
 */
export function usePlaceMarks() {
  const me = useMe();
  const trips = useMyTrips();
  const acts = useActivitiesFor((trips ?? []).map((t) => t.id));
  const visited = useMemo(() => visitedPlaceIds(Object.values(acts).flat()), [acts]);
  return { visited, starred: (p: SavedPlace) => !!p.starredBy?.includes(me.uid), me: me.uid };
}
