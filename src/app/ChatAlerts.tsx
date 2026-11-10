import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../design/components';
import { personName, useMe, useMyTrips, useProfiles, useSubFor } from '../data/hooks';
import { haptic } from '../lib/native';

/**
 * Event chat alerts while the app is open: when someone else posts on an event in one of your trips, a Toast slides
 * down ("Sam on Time Out Market: Book the corner table?") with Open. Not shown for the event you're looking at.
 * (Alerts when Rove is closed need push notifications: the Apple Developer Program and a server.)
 */
export function ChatAlerts() {
  const me = useMe();
  const trips = useMyTrips() ?? [];
  const ids = trips.map((t) => t.id);
  const comments = useSubFor(ids, 'comments');
  const activities = useSubFor(ids, 'activities');
  const profiles = useProfiles([...new Set(trips.flatMap((t) => t.memberIds))]);
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const seen = useRef<Set<string> | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    const all = Object.entries(comments).flatMap(([tripId, list]) => list.map((c) => ({ tripId, c })));
    // The first time each trip's comments arrive, they count as already seen
    if (!seen.current) seen.current = new Set();
    for (const { tripId, c } of all) {
      if (seen.current.has(c.id)) continue;
      seen.current.add(c.id);
      if (c.authorId === me.uid || c.createdAt < started.current) continue;
      const event = activities[tripId]?.find((a) => a.id === c.targetId);
      if (!event) continue;
      const to = `/trip/${tripId}/plan/${event.id}`;
      if (pathname === to) continue; // you're reading it
      haptic('light');
      toast({ size: 'large', icon: 'chat', label: `${personName(profiles, c.authorId).split(' ')[0]} on ${event.title}: ${c.text}`, action: { label: 'Open', onClick: () => navigate(to) } });
    }
  }, [comments]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
