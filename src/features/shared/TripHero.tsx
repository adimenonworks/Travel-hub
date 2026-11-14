import { isTravelling } from '../../data/roles';
import { toInstant } from '../../lib/timezone';
import { useEffect } from 'react';
import { HeroCard } from '../../design/components';
import { store } from '../../data';
import { useMe } from '../../data/hooks';
import { findCoverPhoto, flightTag, hasApi, photographerUrl, trackCoverDownload, unsplashUrl, useFlightStatus } from '../../lib/api';
import { personName, useProfiles, useSub } from '../../data/hooks';
import type { Trip } from '../../data/types';
import { daysBetween, today, tripPhase } from '../../lib/dates';
import { eventKind } from '../../lib/categories';
import { countryName, tripCountries } from '../../lib/countries';
import { heroCountdown, tripDatesLabel } from '../../lib/trips';
import { TripCover } from './TripCover';


const asked = new Set<string>();

/** What to search Unsplash for: the most specific place ("Lisbon Portugal"; the first city of a multi-city trip). */
export function coverQuery(trip: Pick<Trip, 'destination' | 'name'>) {
  const d = trip.destination;
  if (!d) return trip.name;
  const parts = d.name.split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

/**
 * A trip as the Figma "Hero card", phase-aware on one layout: the countdown ("In 9 days", then "Day 3 of 10") and, when
 * something is time-sensitive, one heads-up row. The next event lives on Home's "Happening now", not on the card.
 * `list` is for lists (Trips tab, the later trips on Home): the cover, name, dates and countdown only (the Hero card's
 * Show people and Show heads-up off).
 */
export function TripHero({ trip, cover = true, list }: { trip: Trip; cover?: boolean; list?: boolean }) {
  const profiles = useProfiles(trip.memberIds);
  const activities = useSub(trip.id, 'activities') ?? [];
  const phase = tripPhase(trip.startDate, trip.endDate);
  const base = `/trip/${trip.id}`;
  const t = today();
  // Heads-up: one time-sensitive thing at a time. A flight leaving within 24 hours ("Check-in open", the usual airline
  // window; Rove never says whether you've checked in), else, in the fortnight before the trip, the entry rules.
  const soon = Date.now() + 24 * 3600e3;
  const flight = activities.find((a) => eventKind(a.category) === 'flight' && a.startTime
    && toInstant(a.date, a.startTime, a.tz) > Date.now() && toInstant(a.date, a.startTime, a.tz) < soon);
  const abroad = tripCountries(trip, activities);
  const live = useFlightStatus(flight);
  const tag = flight ? flightTag(flight, live) : undefined;
  const headsUp = flight && tag
    ? { icon: 'plane' as const, tone: 'travel' as const, title: tag.label === 'Check-in open' ? 'Check-in open' : `Flight ${tag.label.toLowerCase()}`, meta: [flight.title, flight.ref].filter(Boolean).join(' · '), to: `${base}/plan/${flight.id}` }
    : phase === 'upcoming' && daysBetween(t, trip.startDate) <= 14 && abroad.length > 0
      ? { icon: 'document' as const, title: 'Check the entry requirements', meta: abroad.map(countryName).join(', '), to: base }
      : undefined;
  // Unsplash cover: a traveller's Rove fetches one the first time the trip shows without a photo of its own.
  const me = useMe();
  const canSet = isTravelling(trip, me.uid);
  useEffect(() => {
    if (!hasApi || !canSet || trip.coverPhoto || trip.cover !== undefined || asked.has(trip.id)) return;
    asked.add(trip.id);
    findCoverPhoto(coverQuery(trip)).then((photo) => {
      if (photo === undefined) { asked.delete(trip.id); return; } // failed: try again next time this card shows
      store.updateTrip(trip.id, { cover: photo }).catch(() => {});
      if (photo) trackCoverDownload(photo);
    });
  }, [trip.id, trip.coverPhoto, trip.cover, canSet]); // eslint-disable-line react-hooks/exhaustive-deps
  const photo = !trip.coverPhoto && trip.cover ? {
    url: list ? trip.cover.small : trip.cover.url,
    credit: <>Photo by <a href={photographerUrl(trip.cover)} target="_blank" rel="noreferrer">{trip.cover.name}</a> on <a href={unsplashUrl} target="_blank" rel="noreferrer">Unsplash</a></>,
  } : undefined;
  return (
    <HeroCard to={base} photo={photo}
      cover={cover ? <TripCover trip={trip} /> : undefined}
      countdown={heroCountdown(trip)}
      title={trip.name}
      meta={tripDatesLabel(trip)}
      people={list ? undefined : trip.memberIds.map((id) => ({ id, name: personName(profiles, id), photo: profiles[id]?.photo }))}
      headsUp={list ? undefined : headsUp} />
  );
}
