import { HeroCard } from '../../design/components';
import { personName, useProfiles, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { daysBetween, formatDay, formatTime, today, tripPhase } from '../../lib/dates';
import { eventType } from '../../lib/categories';
import { countryName, tripCountries } from '../../lib/countries';
import { categoryInfo } from '../../lib/categories';
import { heroCountdown, nextEvent, tripDatesLabel } from '../../lib/trips';
import { TripCover } from './TripCover';


/**
 * A trip as the Figma "Hero Card", phase-aware on one layout: before the trip, the countdown and the next thing planned;
 * during it, "Day 3 of 10" and the next event; after it, a nudge to add the photos. `cover` off shows the panel alone.
 * `size="compact"` is for lists (Trips tab): a shorter cover, the name, dates and countdown only.
 */
export function TripHero({ trip, cover = true, size = 'regular' }: { trip: Trip; cover?: boolean; size?: 'regular' | 'compact' }) {
  const profiles = useProfiles(trip.memberIds);
  const activities = useSub(trip.id, 'activities') ?? [];
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
  // Heads-up: one time-sensitive thing at a time. A flight leaving within 24 hours ("Check-in open", the usual airline
  // window; Rove never says whether you've checked in), else, in the fortnight before the trip, the entry rules.
  const soon = Date.now() + 24 * 3600e3;
  const flight = activities.find((a) => eventType(a.category) === 'flight' && a.startTime
    && new Date(`${a.date}T${a.startTime}`).getTime() > Date.now() && new Date(`${a.date}T${a.startTime}`).getTime() < soon);
  const abroad = tripCountries(trip, activities);
  const headsUp = flight
    ? { icon: 'plane' as const, title: 'Check-in open', meta: [flight.title, flight.ref].filter(Boolean).join(' · '), to: `${base}/plan/${flight.id}` }
    : phase === 'upcoming' && daysBetween(t, trip.startDate) <= 14 && abroad.length > 0
      ? { icon: 'doc' as const, title: 'Check the entry requirements', meta: abroad.map(countryName).join(', '), to: base }
      : undefined;
  return (
    <HeroCard to={base} size={size}
      cover={cover ? <TripCover trip={trip} /> : undefined}
      countdown={heroCountdown(trip)}
      title={trip.name}
      meta={tripDatesLabel(trip)}
      people={trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      next={next} headsUp={headsUp} />
  );
}
