import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Chip, EmptyState, Icon, Illustration, LinkButton, ListGroup, ListItem, MapCard, PageHeader, PageSkeleton, Select, Sheet, useToast } from '../../design/components';
import { store } from '../../data';
import { useActivitiesFor, useMyTrips, usePlaces } from '../../data/hooks';
import type { PlaceCategory, SavedPlace } from '../../data/types';
import { countryName, flagUrl } from '../../lib/countries';
import { today } from '../../lib/dates';
import { haptic } from '../../lib/native';
import { PLACE_CATEGORIES, cityOf, eventCategoryOf, groupBy, placeCategory, sortPlaces, tripCountryCodes } from '../../lib/places';
import { Content, useSave } from '../../app/Shell';
import { MapView } from '../shared/Map';
import { usePlaceMarks } from './placeMarks';
import s from './saves.module.css';

/** ✓ visited and ★ starred, as icons with words for screen readers (never colour alone). */
export function PlaceMarks({ visited, starred }: { visited: boolean; starred: boolean }) {
  if (!visited && !starred) return null;
  return (
    <span className={s.marks}>
      {visited && <><Icon name="check" size={16} /><span>Visited</span></>}
      {starred && <Icon name="star" size={16} state="filled" title="Favourite" />}
    </span>
  );
}

/** A Place as a List item: category icon, name, what kind and where it came from, then ✓ and ★. */
export function PlaceRow({ place, visited, starred, onClick, meta }: { place: SavedPlace; visited: boolean; starred: boolean; onClick: () => void; meta?: ReactNode }) {
  const c = placeCategory(place.category);
  return (
    <ListItem icon={c.icon} media={place.image ? <img src={place.image} alt="" /> : undefined} title={place.name}
      meta={meta ?? [place.kind || c.one, place.source ? `from ${place.source}` : null].filter(Boolean).join(' · ')}
      trailing={<PlaceMarks visited={visited} starred={starred} />} onClick={onClick}
      label={`${place.name}${visited ? ', visited' : ''}${starred ? ', favourite' : ''}`} />
  );
}

/**
 * One Place opened: open its link, star it, change its category (your own Places), add it to an upcoming trip's
 * ideas (it points at this Place, never a copy), or delete it. Deleting a trip never deletes Places.
 */
export function PlaceSheet({ place, onClose }: { place: SavedPlace | null; onClose: () => void }) {
  const toast = useToast();
  const { visited, starred, me } = usePlaceMarks();
  const trips = useMyTrips();
  const upcoming = (trips ?? []).filter((t) => t.endDate >= today());
  const acts = useActivitiesFor(upcoming.map((t) => t.id));
  const [tripId, setTripId] = useState('');
  if (!place) return <Sheet open={false} title="" onClose={onClose}>{null}</Sheet>;
  const mine = place.ownerId === me;
  const isStar = starred(place);
  // Trips that cover this Place's country (a trip can span several countries).
  const fits = upcoming.filter((t) => place.countryCode && tripCountryCodes(t, acts[t.id] ?? []).has(place.countryCode));
  const target = fits.find((t) => t.id === tripId) ?? fits[0];
  const star = async () => {
    haptic('light');
    try { await store.starPlace(place.id, me, !isStar); toast({ icon: 'star', label: isStar ? 'Removed from favourites' : 'Added to favourites' }); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  const addToTrip = async () => {
    if (!target) return;
    try {
      await store.addSub(target.id, 'ideas', { title: place.name, category: eventCategoryOf(place.category), notes: '', links: [], votes: {}, status: 'open', placeId: place.id });
      haptic('success');
      toast({ icon: 'check', label: `Added to ${target.name} ideas` });
      onClose();
    } catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  return (
    <Sheet open title={place.name}
      subtitle={[placeCategory(place.category).one, place.city, place.countryCode ? countryName(place.countryCode) : null].filter(Boolean).join(' · ')} onClose={onClose}>
      {place.image && <img src={place.image} alt="" className={s.saveImage} />}
      <PlaceMarks visited={visited.has(place.id)} starred={isStar} />
      {place.notes && <p className="t-body">{place.notes}</p>}
      <div className={s.row}>
        {place.url && <LinkButton href={place.url} variant="secondary" icon="arrow-up-right">{`Open on ${place.source || 'the web'}`}</LinkButton>}
        <Button variant="secondary" icon="star" onClick={star}>{isStar ? 'Favourite' : 'Add to favourites'}</Button>
      </div>
      {mine && (
        <Select label="Category" value={place.category} onChange={async (e) => {
          try { await store.updatePlace(place.id, { category: e.target.value as PlaceCategory }); toast({ icon: 'check', label: 'Category changed' }); }
          catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
        }}>
          {PLACE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      )}
      {fits.length > 0 && (
        <div className={s.field}>
          {fits.length > 1 && (
            <Select label="Add to a trip" value={target?.id} onChange={(e) => setTripId(e.target.value)}>
              {fits.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
          <Button icon="lightbulb" onClick={addToTrip}>{`Add to ${target!.name} ideas`}</Button>
        </div>
      )}
      {mine && (
        <Button variant="destructive" icon="trash" onClick={async () => {
          if (!confirm(`Delete "${place.name}" from your collection?`)) return;
          try { await store.deletePlace(place.id); toast({ icon: 'trash', label: 'Place deleted' }); onClose(); }
          catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
        }}>Delete place</Button>
      )}
    </Sheet>
  );
}

type Filter = 'all' | 'visited' | PlaceCategory;

/**
 * A country's collection (Trips → Saved → a country): its Places by city, then category, unvisited first, with
 * ✓ visited and ★ favourite. Chips filter by category and Visited. "Unsorted" holds saves with no country.
 */
export function CountryCollection() {
  const { country = '' } = useParams();
  const all = usePlaces();
  const { visited, starred } = usePlaceMarks();
  const navigate = useNavigate();
  const openSave = useSave();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [map, setMap] = useState(false);
  const code = country === 'unsorted' ? '' : country;
  const mine = useMemo(() => (all ?? []).filter((p) => p.countryCode === code), [all, code]);
  if (all === null) return <PageSkeleton />;
  const title = code ? countryName(code) : 'Unsorted';
  const shown = sortPlaces(mine.filter((p) => filter === 'all' || (filter === 'visited' ? visited.has(p.id) : p.category === filter)), visited);
  const cats = PLACE_CATEGORIES.filter((c) => mine.some((p) => p.category === c.value));
  const pins = mine.filter((p) => p.lat != null && p.lng != null).map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.name }));
  const cities = groupBy(shown, cityOf);
  const live = open ? mine.find((p) => p.id === open) ?? null : null;

  return (
    <Content>
      <PageHeader title={title} back={{ to: '/trips', label: 'Saved' }} fit />
      {mine.length === 0 ? (
        <EmptyState illustration="map" title={`Nothing saved in ${title}`} message="Save cafés, bars, stays and sights you find online."
          action={<Button icon="plus" onClick={() => { openSave({ mode: 'link' }); navigate('/trips'); }}>Save a place</Button>} />
      ) : (
        <>
          <ul className={s.chips} aria-label="Filter">
            {([{ value: 'all', label: 'All' }, ...cats, ...(mine.some((p) => visited.has(p.id)) ? [{ value: 'visited', label: 'Visited' }] : [])] as { value: Filter; label: string }[]).map((f) => (
              <li key={f.value}><Chip active={filter === f.value} onClick={() => { haptic('selection'); setFilter(f.value); }} label={`${f.label}${filter === f.value ? ', selected' : ''}`}>{f.label}</Chip></li>
            ))}
          </ul>
          {pins.length > 0 && <MapCard media={<Illustration name="map" size={72} />} title={`See ${pins.length} place${pins.length === 1 ? '' : 's'} on a map`}
            meta={[...new Set(mine.map(cityOf))].slice(0, 3).join(', ')} onClick={() => setMap(true)} />}
          {cities.length === 0 && <p className="t-body t-secondary">Nothing matches this filter.</p>}
          {cities.map(([city, list]) => (
            <section key={city} className={s.citySection} aria-label={city}>
              <h2 className="t-heading-2">{city}</h2>
              {groupBy(list, (p) => p.category).map(([cat, items]) => (
                <div key={cat} className={s.category}>
                  <h3 className={s.categoryTitle}><Icon name={placeCategory(cat as PlaceCategory).icon} size={16} />{placeCategory(cat as PlaceCategory).label}</h3>
                  <ListGroup label={`${city}, ${placeCategory(cat as PlaceCategory).label}`}>
                    {items.map((p) => <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred={starred(p)} onClick={() => setOpen(p.id)} />)}
                  </ListGroup>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
      <PlaceSheet place={live} onClose={() => setOpen(null)} />
      <Sheet open={map} title={`${title} on a map`} onClose={() => setMap(false)}>
        {map && <div className={s.map}><MapView pins={pins} height={360} /></div>}
      </Sheet>
    </Content>
  );
}

/** The countries you've saved in, for country Cards: code ('' = Unsorted), name, flag and how many places. */
export function useCountries() {
  const all = usePlaces();
  return useMemo(() => {
    if (all === null) return null;
    return groupBy((all ?? []).slice().sort((a, b) => a.createdAt - b.createdAt), (p) => p.countryCode)
      .map(([code, list]) => ({ code, name: code ? countryName(code) : 'Unsorted', flag: code ? flagUrl(code) : undefined, places: list }));
  }, [all]);
}

/** "12 places · 3 cities" */
export function placeCounts(list: SavedPlace[]) {
  const cities = new Set(list.map((p) => p.city).filter(Boolean)).size;
  return `${list.length} place${list.length === 1 ? '' : 's'}${cities > 1 ? ` · ${cities} cities` : ''}`;
}

/**
 * Favourites (You → Favourite places → See all): every Place you've starred. Chips filter by category, with a second
 * row of Chips for the city.
 */
export function Favourites() {
  const all = usePlaces();
  const { visited, starred } = usePlaceMarks();
  const [cat, setCat] = useState<PlaceCategory | 'all'>('all');
  const [city, setCity] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  if (all === null) return <PageSkeleton />;
  const favs = sortPlaces(all.filter(starred), visited);
  const cats = PLACE_CATEGORIES.filter((c) => favs.some((p) => p.category === c.value));
  const inCat = favs.filter((p) => cat === 'all' || p.category === cat);
  const cities = [...new Set(inCat.map(cityOf))];
  const shown = inCat.filter((p) => city === 'all' || cityOf(p) === city);
  const live = open ? all.find((p) => p.id === open) ?? null : null;
  const chip = (active: boolean, label: string, onClick: () => void) => (
    <li key={label}><Chip active={active} onClick={() => { haptic('selection'); onClick(); }} label={`${label}${active ? ', selected' : ''}`}>{label}</Chip></li>
  );
  return (
    <Content>
      <PageHeader title="Favourites" size="small" back={{ to: '/profile', label: 'You' }} />
      {favs.length === 0 ? (
        <Card media={<Illustration name="memories" size={120} />} title="No favourites yet" body="Star a place in your collections, or an idea or event on a trip, and it shows here." />
      ) : (
        <>
          <ul className={s.chips} aria-label="Category">
            {chip(cat === 'all', 'All', () => { setCat('all'); setCity('all'); })}
            {cats.map((c) => chip(cat === c.value, c.label, () => { setCat(c.value); setCity('all'); }))}
          </ul>
          {cities.length > 1 && (
            <ul className={s.chips} aria-label="City">
              {chip(city === 'all', 'Every city', () => setCity('all'))}
              {cities.map((c) => chip(city === c, c, () => setCity(c)))}
            </ul>
          )}
          <ListGroup label="Favourite places">
            {shown.map((p) => <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred
              meta={[placeCategory(p.category).one, p.city, p.countryCode ? countryName(p.countryCode) : null].filter(Boolean).join(' · ')} onClick={() => setOpen(p.id)} />)}
          </ListGroup>
        </>
      )}
      <PlaceSheet place={live} onClose={() => setOpen(null)} />
    </Content>
  );
}
