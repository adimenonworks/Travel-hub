import { useParams } from 'react-router-dom';
import { EmptyState, LinkButton, ListGroup, ListItem, PageHeader, PageSection, PageSkeleton, type IconName } from '../../design/components';
import { useActivitiesFor, useMe, useMyTrips } from '../../data/hooks';
import type { Activity, Category, Trip } from '../../data/types';
import { formatDay, today } from '../../lib/dates';
import { Content } from '../../app/Shell';
import { MapView } from '../shared/Map';

/** Your travel collections: the places you've been, grouped by kind. Cafés and restaurants share one. */
export const COLLECTIONS: { key: string; label: string; one: string; icon: IconName; categories: Category[] }[] = [
  { key: 'sights', label: 'Sights seen', one: 'Sight seen', icon: 'camera', categories: ['sight'] },
  { key: 'food', label: 'Cafés & restaurants', one: 'Café or restaurant', icon: 'utensils', categories: ['food', 'cafe'] },
  { key: 'bars', label: 'Bars', one: 'Bar', icon: 'cocktail', categories: ['drinks'] },
  { key: 'activities', label: 'Activities', one: 'Activity', icon: 'ticket', categories: ['activity'] },
  { key: 'stays', label: 'Stays', one: 'Stay', icon: 'bed', categories: ['stay'] },
];

/** "See all" from the You tab's Favourite places: every event you starred. */
const FAVOURITES = { key: 'favourites', label: 'Favourite places', one: 'Favourite place', icon: 'star' as IconName, categories: ['activity', 'food', 'cafe', 'drinks', 'sight', 'flight', 'transport', 'stay', 'other'] as Category[] };

/**
 * A collection's places: ones you starred (favourites) and ones you've been to (an event that has happened, that
 * you went to or nobody marked attendance for). Favourites count even before the day, since you starred them.
 */
export function collectionItems(all: Activity[], categories: Category[], uid: string) {
  const t = today();
  const inCat = all.filter((a) => categories.includes(a.category));
  const favourites = inCat.filter((a) => a.starredBy?.includes(uid));
  const rest = inCat.filter((a) => !a.starredBy?.includes(uid) && a.date <= t && (a.attendeeIds.length === 0 || a.attendeeIds.includes(uid)));
  const newest = (a: Activity, b: Activity) => b.date.localeCompare(a.date);
  return { favourites: favourites.sort(newest), rest: rest.sort(newest) };
}

export function CollectionPage() {
  const { key = '' } = useParams();
  const me = useMe();
  const trips = useMyTrips();
  const byTrip = useActivitiesFor((trips ?? []).map((t) => t.id));
  const c = key === FAVOURITES.key ? FAVOURITES : COLLECTIONS.find((x) => x.key === key);
  if (!c) return <Content><EmptyState illustration="compass" title="Collection not found" action={<LinkButton to="/profile" variant="secondary">Back to profile</LinkButton>} /></Content>;
  if (!trips) return <PageSkeleton />;

  const tripOf: Record<string, Trip> = {};
  const all = trips.flatMap((t) => (byTrip[t.id] ?? []).map((a) => { tripOf[a.id] = t; return a; }));
  const { favourites, rest } = collectionItems(all, c.categories, me.uid);
  const pins = [...favourites, ...rest].filter((a) => a.location).map((a) => ({ lat: a.location!.lat, lng: a.location!.lng, label: a.title }));

  const row = (a: Activity) => {
    const t = tripOf[a.id];
    return <ListItem key={a.id} icon={c.icon} title={a.title} meta={`${a.locationText || a.location?.name?.split(',')[0] || t.name} · ${formatDay(a.date, { month: 'short', day: 'numeric', year: 'numeric' })}`}
      to={`/trip/${t.id}/plan/${a.id}`} />;
  };

  return (
    <Content>
      <PageHeader title={c.label} back={{ to: '/profile', label: 'You' }} />
      {favourites.length + (c === FAVOURITES ? 0 : rest.length) === 0 ? (
        <EmptyState illustration="memories" title="Nothing here yet"
          message="Places you’ve been show up here once the day has passed." />
      ) : (
        <>
          {pins.length > 0 && <div style={{ borderRadius: 'var(--radius-600)', overflow: 'hidden' }}><MapView pins={pins} height={280} /></div>}
          <PageSection title="Favourites" meta={favourites.length === 0 ? 'Events you star show up here.' : `${favourites.length} starred`}>
            {favourites.length > 0 && <ListGroup>{favourites.map(row)}</ListGroup>}
          </PageSection>
          {rest.length > 0 && c !== FAVOURITES && <PageSection title="Everywhere else"><ListGroup>{rest.map(row)}</ListGroup></PageSection>}
        </>
      )}
    </Content>
  );
}
