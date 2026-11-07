import { HeroCard } from '../../design/components';
import { personName, useProfiles, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { daysBetween, formatDay, formatRange, formatTime, today, tripPhase } from '../../lib/dates';
import { categoryInfo } from '../../lib/categories';
import { heroCountdown, nextEvent } from '../../lib/trips';
import { TripCover } from './TripCover';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/**
 * A trip as the Figma "Hero Card", phase-aware on one layout: before the trip, the countdown and the next thing planned;
 * during it, "Day 3 of 10" and the next event; after it, a nudge to add the photos. `cover` off shows the panel alone.
 * `size="compact"` is for lists (Trips tab): a shorter cover, the name, dates and countdown only.
 */
export function TripHero({ trip, cover = true, size = 'regular' }: { trip: Trip; cover?: boolean; size?: 'regular' | 'compact' }) {
  const profiles = useProfiles(trip.memberIds);
  const activities = useSub(trip.id, 'activities') ?? [];
  const n = daysBetween(trip.startDate, trip.endDate) + 1;
  const phase = tripPhase(trip.startDate, trip.endDate);
  const base = `/trip/${trip.id}`;
  const upNext = phase !== 'past' ? nextEvent(activities) : undefined;
  const t = today();
  const when = (d: string, time: string) => `${d === t ? 'Today' : formatDay(d)}${time ? `, ${formatTime(time)}` : ''}`;
  const next = upNext
    ? { icon: categoryInfo(upNext.category).icon, title: upNext.title, meta: [when(upNext.date, upNext.startTime), upNext.locationText || upNext.location?.name?.split(',')[0]].filter(Boolean).join(' · '), to: `${base}/plan/${upNext.id}` }
    : phase === 'past'
      ? { icon: 'photo' as const, title: 'Add your photos', meta: 'Share an album with everyone who went', to: `${base}/photos` }
      : { icon: 'plus' as const, title: 'Plan the first day', meta: 'Add events to the itinerary', to: `${base}/itinerary` };
  return (
    <HeroCard to={base} size={size}
      cover={cover ? <TripCover trip={trip} /> : undefined}
      countdown={heroCountdown(trip)}
      title={trip.name}
      meta={`${formatRange(trip.startDate, trip.endDate)} · ${plural(n, 'day')}`}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      next={next} />
  );
}
