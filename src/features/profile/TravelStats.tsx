import { CardLink, Icon, Section, type IconName } from '../../design/components';
import { useActivitiesFor } from '../../data/hooks';
import type { Activity, Category, Place, Trip } from '../../data/types';
import { daysBetween, today } from '../../lib/dates';
import { COLLECTIONS, collectionItems } from './Collections';
import s from './TravelStats.module.css';

/** Great-circle distance in miles. */
function miles(a: Place, b: Place) {
  const r = Math.PI / 180, R = 3958.8;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fmt = (n: number) => new Intl.NumberFormat(undefined, { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: n >= 100000 ? 1 : 0 }).format(n);

/**
 * Your travels in numbers, from past and current trips. The collections count the places
 * you starred plus itinerary plans that have happened and that you went to (or that nobody marked attendance for).
 */
export function TravelStats({ trips, home, visited, meId }: { trips: Trip[]; home: Place | null; visited: Place[]; meId: string }) {
  const byTrip = useActivitiesFor(trips.map((t) => t.id));
  const t0 = today();
  const all: Activity[] = Object.values(byTrip).flat();
  const count = (cats: Category[]) => { const x = collectionItems(all, cats, meId); return x.favourites.length + x.rest.length; };
  const places = [...trips.flatMap((t) => (t.destination ? [t.destination] : [])), ...visited];
  const countries = new Set(places.map((p) => p.country ?? p.name.split(',').pop()!.trim())).size;
  const cities = new Set(places.map((p) => p.name.split(',')[0].trim().toLowerCase())).size;
  const pastOnly = trips.filter((t) => t.endDate < t0);
  const days = pastOnly.reduce((n, t) => n + daysBetween(t.startDate, t.endDate) + 1, 0);
  const travelled = home ? Math.round(pastOnly.reduce((n, t) => n + (t.destination ? 2 * miles(home, t.destination) : 0), 0)) : null;

  const stats: { icon: IconName; value: string; label: string; to?: string }[] = [
    { icon: 'plane', value: fmt(pastOnly.length), label: pastOnly.length === 1 ? 'Trip taken' : 'Trips taken' },
    { icon: 'globe', value: fmt(countries), label: countries === 1 ? 'Country' : 'Countries' },
    { icon: 'pin', value: fmt(cities), label: cities === 1 ? 'City' : 'Cities' },
    { icon: 'calendar', value: fmt(days), label: days === 1 ? 'Day away' : 'Days away' },
    { icon: 'map', value: travelled === null ? '—' : fmt(travelled), label: 'Miles travelled' },
    // Collections open a page with your favourites, the rest, and a map of just those places.
    ...COLLECTIONS.map((c) => { const n = count(c.categories); return { icon: c.icon, value: fmt(n), label: n === 1 ? c.one : c.label, to: `/profile/collections/${c.key}` }; }),
  ];
  return (
    <Section title="Your travels" footer={travelled === null ? 'Add your home city below to count miles travelled.' : 'Miles are there and back from your home city.'}>
      <div className={s.stats}>
        {stats.map((st) => {
          const body = <>
            <span className={s.statIcon}><Icon name={st.icon} size={18} /></span>
            <span className={s.statValue}>{st.value}</span>
            <span className="t-label-small t-secondary">{st.label}</span>
          </>;
          return st.to ? <CardLink key={st.label} to={st.to} className={s.stat}>{body}</CardLink> : <div key={st.label} className={s.stat}>{body}</div>;
        })}
      </div>
    </Section>
  );
}

