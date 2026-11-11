import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Chip, DestinationHeader, EmptyState, Icon, Illustration, LinkButton, ListGroup, ListItem, MapCard, PageHeader, PageSection, PageSkeleton, Select, Sheet, useToast, Tile } from '../../design/components';
import { hostOf } from '../../lib/format';
import { store } from '../../data';
import { useActivitiesFor, useMyTrips, usePlaces } from '../../data/hooks';
import type { SavedPlace } from '../../data/types';
import { countryName, flagUrl } from '../../lib/countries';
import { today } from '../../lib/dates';
import { haptic, confirmAction } from '../../lib/native';
import { PLACE_TYPES, cityOf, eventCategoryOf, groupBy, placeCategory, placeKind, placeTypeOf, sortPlaces, tripCountryCodes, type PlaceType } from '../../lib/places';
import { PlaceKindPicker } from './PlaceKindPicker';
import { Content, useSave } from '../../app/Shell';
import { MapView } from '../shared/Map';
import { usePlaceMarks } from './placeMarks';
import s from './saves.module.css';
import { isMapsLink } from '../../lib/links';

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
/** A saved Place as a List item: category icon, name, meta, and its ✓ / ★ marks (or other trailing text, e.g. "2h"). */
export function PlaceRow({ place, visited, starred, onClick, meta, trailing }: { place: SavedPlace; visited: boolean; starred: boolean; onClick: () => void; meta?: ReactNode; trailing?: ReactNode }) {
  const c = placeCategory(place.category);
  return (
    <ListItem icon={c.icon} tone={c.tone} media={place.image ? <img src={place.image} alt="" /> : undefined} title={place.name}
      meta={meta ?? [place.kind || c.one, place.source ? `from ${place.source}` : null].filter(Boolean).join(' · ')}
      trailing={trailing ?? <PlaceMarks visited={visited} starred={starred} />} onClick={onClick}
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
  const remove = async () => {
    if (!confirmAction(`Delete "${place.name}" from your collection?`)) return;
    try { await store.deletePlace(place.id); toast({ icon: 'trash', label: 'Place deleted' }); onClose(); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };
  return (
    <Sheet open title={place.name}
      onSubmit={target ? addToTrip : undefined} submitLabel="Add to ideas"
      secondary={mine ? <Button variant="destructive" size="large" onClick={remove}>Delete</Button> : undefined}
      subtitle={[placeCategory(place.category).one, place.city, place.countryCode ? countryName(place.countryCode) : null].filter(Boolean).join(' · ')} onClose={onClose}>
      {place.image && <img src={place.image} alt="" className={s.saveImage} />}
      <PlaceMarks visited={visited.has(place.id)} starred={isStar} />
      {place.notes && <p className="t-body">{place.notes}</p>}
      <div className={s.row}>
        {place.url && <LinkButton href={place.url} variant="neutral" icon={isMapsLink(place.url) ? 'map' : 'arrow-up-right'} label={`Open ${place.name}`}>{isMapsLink(place.url) ? 'Open in Maps' : 'Open link'}</LinkButton>}
        <Button variant="neutral" icon="star" onClick={star}>{isStar ? 'Favourite' : 'Add to favourites'}</Button>
      </div>
      {mine && (
        <PlaceKindPicker id={`kind-${place.id}`} value={placeKind(place.category)} onChange={async (k) => {
          try { await store.updatePlace(place.id, { category: k }); toast({ icon: 'check', label: 'Category changed' }); }
          catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
        }} />
      )}
      {fits.length > 0 && (
        <div className={s.field}>
          {fits.length > 1 ? (
            <Select label="Add to a trip" value={target?.id} onChange={(e) => setTripId(e.target.value)}>
              {fits.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          ) : <p className="t-body-small t-secondary">{`Add to ideas puts it on ${target!.name}, so everyone can vote on it.`}</p>}
        </div>
      )}
    </Sheet>
  );
}

type Filter = 'all' | PlaceType | 'links' | 'notes' | 'visited';
const kindOf = (p: SavedPlace) => p.type ?? 'place';
const SHOW = 3;

/** A city's places split into their types (Food & drink, Stays, Activities), each a small titled List group. */
function CategoryGroups({ list, where, render }: { list: SavedPlace[]; where: string; render: (p: SavedPlace) => ReactNode }) {
  return <>{PLACE_TYPES.map((c) => ({ c, places: list.filter((p) => placeTypeOf(p.category) === c.value) })).filter((x) => x.places.length > 0).map(({ c, places }) => (
    <section key={c.value} className={s.favCategory} aria-label={`${c.label} in ${where}`}>
      <h3 className={s.favCategoryTitle}><Icon name={c.icon} size={16} />{c.label}</h3>
      <ListGroup label={`${c.label} in ${where}`}>{places.map(render)}</ListGroup>
    </section>
  ))}</>;
}

/**
 * A country's collection (Figma "Saved destination"): the neutral flag-led header ("24 saves · 3 cities · Saved by
 * you"), filter Chips (All, then each category that has places, Links and Notes when there are some, and Visited once
 * something is), the map card, a section per city (or state/province when there's no city), split into its categories
 * (three places, "See all n" for the rest; unvisited first, with ★ and ✓) and Links & notes last. A Place opens its
 * sheet, where it's moved, recategorised or deleted.
 */
export function CountryCollection() {
  const { country = '' } = useParams();
  const all = usePlaces();
  const { visited, starred } = usePlaceMarks();
  const navigate = useNavigate();
  const openSave = useSave();
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [map, setMap] = useState(false);
  const code = country === 'unsorted' ? '' : country;
  const mine = useMemo(() => (all ?? []).filter((p) => p.countryCode === code), [all, code]);
  if (all === null) return <PageSkeleton />;
  const title = code ? countryName(code) : 'Unsorted';
  const places = mine.filter((p) => kindOf(p) === 'place');
  const links = mine.filter((p) => kindOf(p) === 'link'), notes = mine.filter((p) => kindOf(p) === 'note');
  const isCategory = PLACE_TYPES.some((c) => c.value === filter);
  const showPlaces = filter === 'all' || filter === 'visited' || isCategory;
  const cityList = sortPlaces(places.filter((p) => (filter !== 'visited' || visited.has(p.id)) && (!isCategory || placeTypeOf(p.category) === filter)), visited);
  // In each city: types in their usual order, unvisited first inside each.
  const order = (p: SavedPlace) => PLACE_TYPES.findIndex((c) => c.value === placeTypeOf(p.category));
  const cities = showPlaces ? groupBy(cityList, cityOf).map(([c, list]) => [c, list.slice().sort((x, y) => order(x) - order(y))] as [string, SavedPlace[]]) : [];
  const extras = filter === 'all' ? [...links, ...notes] : filter === 'links' ? links : filter === 'notes' ? notes : [];
  const pins = places.filter((p) => p.lat != null && p.lng != null).map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.name }));
  const live = open ? mine.find((p) => p.id === open) ?? null : null;
  const cityCount = new Set(places.map(cityOf)).size;
  const filters: { value: Filter; label: string; n: number }[] = [
    { value: 'all', label: 'All', n: mine.length },
    ...PLACE_TYPES.map((c) => ({ value: c.value as Filter, label: c.label, n: places.filter((p) => placeTypeOf(p.category) === c.value).length })).filter((f) => f.n > 0),
    ...(links.length ? [{ value: 'links' as Filter, label: 'Links', n: links.length }] : []),
    ...(notes.length ? [{ value: 'notes' as Filter, label: 'Notes', n: notes.length }] : []),
    ...(places.some((p) => visited.has(p.id)) ? [{ value: 'visited' as Filter, label: 'Visited', n: places.filter((p) => visited.has(p.id)).length }] : []),
  ];
  const seeAll = (key: string, n: number) => n > SHOW && !expanded.includes(key)
    ? <Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setExpanded((x) => [...x, key])}>{`See all ${n}`}</Button> : undefined;
  const row = (p: SavedPlace) => <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred={starred(p)} onClick={() => setOpen(p.id)}
    meta={[p.kind || placeCategory(p.category).one, p.source ? `from ${p.source}` : null].filter(Boolean).join(' · ')} />;

  return (
    <Content>
      <PageHeader title={title} back={{ to: '/trips', label: 'Collections' }} fit />
      {mine.length === 0 ? (
        <EmptyState illustration="map" title={`Nothing saved in ${title}`} message="Save cafés, bars, stays and sights you find online."
          action={<Button icon="plus" onClick={() => { openSave({ mode: 'link' }); navigate('/trips'); }}>Save a place</Button>} />
      ) : (
        <>
          <DestinationHeader flag={code ? <img src={flagUrl(code)} alt="" /> : <Icon name="lightbulb" size={24} />}
            title={`${mine.length} save${mine.length === 1 ? '' : 's'}${cityCount > 1 ? ` · ${cityCount} cities` : ''}`} meta="Saved by you" />
          <ul className={s.chips} aria-label="Filter">
            {filters.map((f) => (
              <li key={f.value}><Chip active={filter === f.value} onClick={() => { haptic('selection'); setFilter(f.value); }} label={`${f.label}, ${f.n}${filter === f.value ? ', selected' : ''}`}>{`${f.label} ${f.n}`}</Chip></li>
            ))}
          </ul>
          {showPlaces && pins.length > 0 && <MapCard media={<Illustration name="map" size={72} />} title={`See ${pins.length} place${pins.length === 1 ? '' : 's'} on a map`}
            meta={[...new Set(places.map(cityOf))].slice(0, 3).join(', ')} onClick={() => setMap(true)} />}
          {cities.length === 0 && extras.length === 0 && <p className="t-body t-secondary">Nothing matches this filter.</p>}
          {cities.map(([city, list]) => {
            const shown = expanded.includes(city) ? list : list.slice(0, SHOW);
            return (
              <PageSection key={city} title={city} action={seeAll(city, list.length)}>
                {isCategory ? <ListGroup label={city}>{shown.map(row)}</ListGroup> : <CategoryGroups list={shown} where={city} render={row} />}
              </PageSection>
            );
          })}
          {extras.length > 0 && (
            <PageSection title="Links & notes" action={seeAll('links', extras.length)}>
              <ListGroup label="Links and notes">
                {(expanded.includes('links') ? extras : extras.slice(0, SHOW)).map((p) => (
                  <ListItem key={p.id} icon={kindOf(p) === 'note' ? 'notebook' : 'link'} tone={kindOf(p) === 'note' ? 'notes' : undefined} title={p.name} onClick={() => setOpen(p.id)}
                    meta={[kindOf(p) === 'note' ? 'Note' : p.kind || 'Link', p.notes && kindOf(p) === 'note' ? p.notes.split('\n')[0] : p.url ? hostOf(p.url) : null].filter(Boolean).join(' · ')} />
                ))}
              </ListGroup>
            </PageSection>
          )}
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
  return `${list.length} save${list.length === 1 ? '' : 's'}${cities > 1 ? ` · ${cities} cities` : ''}`;
}

/**
 * Favourites (You → Favourite places → See more): the places you've starred, filed like Collections. A Tile per country
 * (its flag and how many), A to Z; a country opens its favourites by city (or state/province when there's no city),
 * each city split into its types (Food & drink, Stays, Activities), each place in its type's colour.
 */
export function Favourites() {
  const all = usePlaces();
  const { starred } = usePlaceMarks();
  if (all === null) return <PageSkeleton />;
  const favs = all.filter(starred);
  const countries = [...new Set(favs.map((p) => p.countryCode ?? ''))]
    .map((code) => ({ code, name: code ? countryName(code) : 'Unsorted', n: favs.filter((p) => (p.countryCode ?? '') === code).length }))
    .sort((a, b) => (a.code ? a.name : '~').localeCompare(b.code ? b.name : '~'));
  return (
    <Content>
      <PageHeader title="Favourites" size="small" back={{ to: '/profile', label: 'You' }} />
      {favs.length === 0 ? (
        <Card media={<Illustration name="memories" size={120} />} title="No favourites yet" body="Star a place in your collections, or the place on an event or idea, and it shows here." />
      ) : (
        <div className={s.tileGrid}>
          {countries.map((c) => (
            <Tile key={c.code || 'none'} title={c.name} meta={`${c.n} place${c.n === 1 ? '' : 's'}`} to={`/profile/favourites/${c.code || 'unsorted'}`}
              media={c.code ? <img src={flagUrl(c.code)} alt="" /> : undefined} icon={c.code ? undefined : 'star'} />
          ))}
        </div>
      )}
    </Content>
  );
}

/**
 * One country's favourites: a section per city (A to Z), and inside it a List group per category with its title,
 * so you see at a glance whether it's a café, bar, stay or restaurant.
 */
export function FavouriteCountry() {
  const { country = '' } = useParams();
  const code = country === 'unsorted' ? '' : country;
  const all = usePlaces();
  const { visited, starred } = usePlaceMarks();
  const [open, setOpen] = useState<string | null>(null);
  if (all === null) return <PageSkeleton />;
  const favs = all.filter((p) => starred(p) && (p.countryCode ?? '') === code).sort((a, b) => b.createdAt - a.createdAt);
  const cities = groupBy(favs, cityOf).sort((a, b) => a[0].localeCompare(b[0]));
  const live = open ? all.find((p) => p.id === open) ?? null : null;
  return (
    <Content>
      <PageHeader title={code ? countryName(code) : 'Unsorted'} size="small" back={{ to: '/profile/favourites', label: 'Favourites' }} />
      {favs.length === 0 ? (
        <Card media={<Illustration name="memories" size={120} />} title="Nothing starred here yet" body="Star a place and it shows here." />
      ) : cities.map(([city, list]) => (
        <PageSection key={city} title={city} meta={`${list.length} place${list.length === 1 ? '' : 's'}`}>
          <CategoryGroups list={list} where={city} render={(p) => (
            <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred onClick={() => setOpen(p.id)}
              meta={[p.kind || placeCategory(p.category).one, p.source ? `from ${p.source}` : null].filter(Boolean).join(' · ')} />
          )} />
        </PageSection>
      ))}
      <PlaceSheet place={live} onClose={() => setOpen(null)} />
    </Content>
  );
}
