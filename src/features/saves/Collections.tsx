import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CategoryIcon, Chip, AvatarStack, TextField, Icon, IconButton, Illustration, LinkButton, ListGroup, ListItem, MapCard, PageHeader, PageSection, PageSkeleton, Select, Sheet, useToast, Tile } from '../../design/components';
import { hostOf } from '../../lib/format';
import { store } from '../../data';
import { personName, useActivitiesFor, useMe, useMyTrips, usePlaces, useProfiles, useShares, useSharedPlaces } from '../../data/hooks';
import { CollectionPeople, collectionRoleName, savedBy } from './CollectionPeople';
import type { CollectionRole, SavedPlace } from '../../data/types';
import { countryName, flagUrl } from '../../lib/countries';
import { today } from '../../lib/dates';
import { haptic, confirmAction } from '../../lib/native';
import { PLACE_TYPES, cityOf, eventCategoryOf, groupBy, placeCategory, placeKind, placeTypeOf, sortPlaces, tripCountryCodes, type PlaceType } from '../../lib/places';
import { PlaceKindPicker } from './PlaceKindPicker';
import { Content, useSave } from '../../app/Shell';
import { MapView } from '../shared/Map';
import { usePlaceMarks } from './placeMarks';
import s from './saves.module.css';
import { mapsUrl } from '../../lib/geocode';
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
    <ListItem icon={c.icon} type={c.tone} media={place.image ? <img src={place.image} alt="" /> : undefined} title={place.name}
      meta={meta ?? [place.kind || c.one, place.source ? `from ${place.source}` : null].filter(Boolean).join(' · ')}
      trailing={trailing ?? <PlaceMarks visited={visited} starred={starred} />} onClick={onClick}
      label={`${place.name}${visited ? ', visited' : ''}${starred ? ', favourite' : ''}`} />
  );
}

/**
 * One Place opened: open its link, star it, change its category (your own Places), add it to an upcoming trip's
 * ideas (it points at this Place, never a copy), or delete it. Deleting a trip never deletes Places.
 */
export function PlaceSheet({ place, onClose, role = 'owner', cities = [] }: {
  place: SavedPlace | null; onClose: () => void;
  /** Your role in the collection it's opened from: a Member moves and recategorises; a Viewer only stars and opens Maps */
  role?: CollectionRole | 'owner';
  /** The collection's cities, to move it to another one */
  cities?: string[];
}) {
  const toast = useToast();
  const { visited, starred, me } = usePlaceMarks();
  const trips = useMyTrips();
  const upcoming = (trips ?? []).filter((t) => t.endDate >= today());
  const acts = useActivitiesFor(upcoming.map((t) => t.id));
  const [tripId, setTripId] = useState('');
  const [editing, setEditing] = useState(false);
  const [newCity, setNewCity] = useState<string | null>(null);
  useEffect(() => { setEditing(false); setNewCity(null); }, [place?.id]); // each place opens with its category folded away
  if (!place) return <Sheet open={false} title="" onClose={onClose}>{null}</Sheet>;
  const mine = place.ownerId === me;
  // Change its category or city: whoever saved it, or the collection's owner or a Member (the rules say the same)
  const canEdit = mine || (role !== 'viewer' && (role === 'member' || !!place.sharedIn));
  const viewer = role === 'viewer';
  const moveTo = async (city: string) => {
    if (!city.trim() || city.trim() === place.city) return;
    try { await store.updatePlace(place.id, { city: city.trim() }); haptic('success'); toast({ icon: 'check', label: `Moved to ${city.trim()}` }); setNewCity(null); }
    catch { toast({ tone: 'danger', label: "Couldn't move it. Check your connection" }); }
  };
  const cityChips = [...new Set([place.city, ...cities].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const isStar = starred(place);
  // Trips that cover this Place's country (a trip can span several countries).
  const fits = upcoming.filter((t) => place.countryCode && tripCountryCodes(t, acts[t.id] ?? []).has(place.countryCode));
  const target = fits.find((t) => t.id === tripId) ?? fits[0];
  const star = async () => {
    haptic('light');
    try { await store.starPlace(place.id, me, !isStar); toast({ icon: 'star', label: isStar ? 'Removed from favourites' : 'Added to favourites' }); }
    catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  const addToTrip = async () => {
    if (!target) return;
    try {
      await store.addSub(target.id, 'ideas', { title: place.name, category: eventCategoryOf(place.category), notes: '', links: [], votes: {}, status: 'open', placeId: place.id });
      haptic('success');
      toast({ icon: 'check', label: `Added to ${target.name} ideas` });
      onClose();
    } catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  const remove = async () => {
    if (!confirmAction(`Delete "${place.name}" from your collection? It stays in Recently deleted for 30 days.`)) return;
    try {
      await store.setDeleted({ kind: 'place', id: place.id }, true);
      toast({ icon: 'trash', label: 'Place deleted', action: { label: 'Undo', onClick: () => { store.setDeleted({ kind: 'place', id: place.id }, false).catch(() => {}); } } });
      onClose();
    }
    catch { toast({ tone: 'danger', label: "Couldn't delete. Check your connection" }); }
  };
  const cat = placeCategory(place.category);
  const savedOn = new Date(place.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(new Date(place.createdAt).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  const where = [place.city, place.countryCode ? countryName(place.countryCode) : place.country].filter(Boolean).join(', ');
  const maps = place.url && isMapsLink(place.url);
  const pos = place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng, name: place.name } : null;
  return (
    <Sheet open title={place.name}
      onSubmit={target && !viewer ? addToTrip : undefined} submitLabel={target ? `Add to ${target.name} ideas` : 'Add to ideas'}
      secondary={mine ? <Button tone="destructive" size="large" onClick={remove}>Delete</Button> : undefined}
      subtitle={where || undefined} onClose={onClose}>
      <div className={s.sections}>
        {/* Key info: the category (Edit to change it), Favourite, and when and where it was saved */}
        <section className={s.field} aria-label="About this place">
          <div className={s.placeKey}>
            <CategoryIcon icon={cat.icon} type={cat.tone} />
            <div className={s.placeKeyText}>
              <span className="t-heading-4">{cat.one}</span>
              <span className="t-body-small t-secondary">{[`Saved ${savedOn}`, place.source ? `from ${place.source}` : null, visited.has(place.id) ? 'Visited ✓' : null].filter(Boolean).join(' · ')}</span>
            </div>
            {canEdit && <Button tone="ghost" size="small" aria-expanded={editing} onClick={() => { haptic('selection'); setEditing((x) => !x); }}>{editing ? 'Done' : 'Edit'}</Button>}
            <IconButton icon="star" tone="ghost" state={isStar ? 'filled' : 'default'} aria-pressed={isStar} label={isStar ? 'Remove from favourites' : 'Add to favourites'} onClick={star} />
          </div>
          {editing && canEdit && (
            <PlaceKindPicker id={`kind-${place.id}`} value={placeKind(place.category)} onChange={async (k) => {
              try { await store.updatePlace(place.id, { category: k }); toast({ icon: 'check', label: 'Category changed' }); }
              catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
            }} />
          )}
          {/* Move it to another city in this collection, or a new one */}
          {editing && canEdit && kindOf(place) === 'place' && (
            <div className={s.field}>
              <h4 className="t-heading-4">City</h4>
              <ul className={s.chips} aria-label="City">
                {cityChips.map((c) => <li key={c}><Chip selected={c === place.city && newCity === null} onClick={() => { haptic('selection'); moveTo(c); }}>{c}</Chip></li>)}
                <li><Chip icon="plus" selected={newCity !== null} onClick={() => setNewCity((x) => (x === null ? '' : null))}>New city</Chip></li>
              </ul>
              {newCity !== null && (
                <div className={s.field}>
                  <TextField label="New city" value={newCity} autoFocus enterKeyHint="done" onChange={(e) => setNewCity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); moveTo(newCity); } }} />
                  <Button type="button" tone="neutral" disabled={!newCity.trim()} onClick={() => moveTo(newCity)}>{newCity.trim() ? `Move to ${newCity.trim()}` : 'Move'}</Button>
                </div>
              )}
            </div>
          )}
          {place.image && <img src={place.image} alt="" className={s.saveImage} />}
          {place.notes && <p className="t-body selectable">{place.notes}</p>}
        </section>
        {/* Location: the map and Open in Maps (or the link it came from) */}
        {(kindOf(place) === 'place' || maps) && (
          <section className={s.field} aria-labelledby={`where-${place.id}`}>
            <h3 className="t-heading-4" id={`where-${place.id}`}>Location</h3>
            <MapCard title={place.name} meta={where || undefined}
              map={pos ? <MapView pins={[{ lat: pos.lat, lng: pos.lng, label: place.name }]} center={pos} zoom={15} height={160} /> : undefined}
              footer={<LinkButton href={maps ? place.url! : mapsUrl([place.name, where].filter(Boolean).join(', '), pos ? { name: place.name, lat: pos.lat, lng: pos.lng } : null)} tone="neutral" icon="map" label={`Open ${place.name} in Maps`}>Open in Maps</LinkButton>} />
          </section>
        )}
        {place.url && !maps && (
          <ListGroup label="Saved from">
            <ListItem icon="arrow-up-right" title={place.source ? `Open on ${place.source}` : 'Open link'} meta={hostOf(place.url)} href={place.url} label={`Open the link for ${place.name}`} />
          </ListGroup>
        )}
        {fits.length > 1 && !viewer && (
          <Select label="Add to a trip" value={target?.id} onChange={(e) => setTripId(e.target.value)}>
            {fits.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}
      </div>
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
  const { country = '', shareId } = useParams();
  const all = usePlaces();
  const me = useMe();
  const shares = useShares();
  const [people, setPeople] = useState(false);
  const { visited, starred } = usePlaceMarks();
  const navigate = useNavigate();
  const openSave = useSave();
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [map, setMap] = useState(false);
  const code = country === 'unsorted' ? '' : country;
  // Your own collection for this country, or (with a share id) one someone shared with you
  const ownId = `${me.uid}_${code}`;
  const share = (shares ?? []).find((x) => x.id === (shareId ?? ownId));
  const role: CollectionRole | 'owner' = shareId && shareId !== ownId ? (share?.roles[me.uid] ?? 'viewer') : 'owner';
  const shared = useSharedPlaces(share?.id);
  const mine = useMemo(() => {
    if (role !== 'owner') return shared ?? [];
    // Yours (not ones you added to a friend's collection) and what Members added to yours
    const own = (all ?? []).filter((p) => p.countryCode === code && (!p.sharedIn || p.sharedIn === ownId));
    return [...own, ...(shared ?? []).filter((p) => !own.some((o) => o.id === p.id))];
  }, [all, shared, code, ownId, role]);
  const everyone = share ? [share.ownerId, ...share.memberIds] : [me.uid];
  const profiles = useProfiles(everyone);
  if (all === null || (shareId && (shares === null || shared === null))) return <PageSkeleton />;
  if (shareId && !share) return (
    <Content>
      <PageHeader title={code ? countryName(code) : 'Collection'} back={{ to: '/trips', label: 'Collections' }} fit />
      <Card layout="centre" media={<Illustration name="map" size={120} />} title="This collection isn't shared with you" body="Ask whoever shared it for a new invite link." />
    </Content>
  );
  const title = code ? countryName(code) : 'Unsorted';
  const owner = role === 'owner';
  const ownerFirst = share && !owner ? personName(profiles, share.ownerId).split(' ')[0] : '';
  const shareable = !!code && (owner ? mine.length > 0 : true);
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
    ? <Button tone="ghost" size="small" iconEnd="chevron-right" onClick={() => setExpanded((x) => [...x, key])}>{`See all ${n}`}</Button> : undefined;
  const row = (p: SavedPlace) => <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred={starred(p)} onClick={() => setOpen(p.id)}
    meta={[p.kind || placeCategory(p.category).one, p.source ? `from ${p.source}` : null].filter(Boolean).join(' · ')} />;

  return (
    <Content>
      <PageHeader title={title} subtitle={ownerFirst ? `${ownerFirst}'s collection · ${collectionRoleName(role)}` : undefined} back={{ to: '/trips', label: 'Collections' }} fit
        action={shareable ? { icon: 'user-add', label: owner ? 'Share this collection' : 'People in this collection', onClick: () => { haptic('selection'); setPeople(true); } } : undefined} />
      {mine.length === 0 ? (
        <Card layout="centre" media={<Illustration name="map" size={120} />} title={`Nothing saved in ${title}`} body="Save cafés, bars, stays and sights you find online."
          actions={role === 'viewer' ? undefined : <Button icon="plus" onClick={() => { openSave({ mode: 'link' }); navigate('/trips'); }}>Save a place</Button>} />
      ) : (
        <>
          {/* Figma "Map card": the map with every place, the counts, how much you've visited and who it's with */}
          <MapCard
            map={pins.length > 0 ? <MapView pins={pins} height={180} /> : undefined} onMap={pins.length > 0 ? () => setMap(true) : undefined}
            title={[`${places.length || mine.length} ${(places.length || mine.length) === 1 ? (places.length ? 'place' : 'save') : (places.length ? 'places' : 'saves')}`, cityCount > 1 ? `${cityCount} cities` : ''].filter(Boolean).join(' · ')}
            meta={[places.length ? `${places.filter((p) => visited.has(p.id)).length} of ${places.length} visited` : '', `Saved by ${savedBy(everyone, me.uid, profiles)}`].filter(Boolean).join(' · ')}
            trailing={everyone.length > 1 ? <AvatarStack people={everyone.map((id) => ({ id, name: id === me.uid ? me.name || 'You' : personName(profiles, id), photo: id === me.uid ? me.photo : profiles[id]?.photo }))} /> : undefined} />
          <ul className={s.chips} aria-label="Filter">
            {filters.map((f) => (
              <li key={f.value}><Chip selected={filter === f.value} onClick={() => { haptic('selection'); setFilter(f.value); }} label={`${f.label}, ${f.n}${filter === f.value ? ', selected' : ''}`}>{`${f.label} ${f.n}`}</Chip></li>
            ))}
          </ul>
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
                  <ListItem key={p.id} icon={kindOf(p) === 'note' ? 'notebook' : 'link'} type={kindOf(p) === 'note' ? 'notes' : undefined} title={p.name} onClick={() => setOpen(p.id)}
                    meta={[kindOf(p) === 'note' ? 'Note' : p.kind || 'Link', p.notes && kindOf(p) === 'note' ? p.notes.split('\n')[0] : p.url ? hostOf(p.url) : null].filter(Boolean).join(' · ')} />
                ))}
              </ListGroup>
            </PageSection>
          )}
        </>
      )}
      <PlaceSheet place={live} onClose={() => setOpen(null)} role={role} cities={[...new Set(places.map((p) => p.city).filter(Boolean))]} />
      {code && <CollectionPeople open={people} onClose={() => setPeople(false)} code={code} share={share} profiles={profiles} />}
      <Sheet open={map} title={`${title} on a map`} onClose={() => setMap(false)}>
        {map && <div className={s.map}><MapView pins={pins} height={360} /></div>}
      </Sheet>
    </Content>
  );
}

/** The countries you've saved in, for country Cards: code ('' = Unsorted), name, flag and how many places. */
export function useCountries() {
  const all = usePlaces();
  const me = useMe();
  return useMemo(() => {
    if (all === null) return null;
    // Places you added to a friend's shared collection live there, not in yours
    return groupBy((all ?? []).filter((p) => !p.sharedIn || p.sharedIn.startsWith(`${me.uid}_`)).sort((a, b) => a.createdAt - b.createdAt), (p) => p.countryCode)
      .map(([code, list]) => ({ code, name: code ? countryName(code) : 'Unsorted', flag: code ? flagUrl(code) : undefined, places: list }));
  }, [all, me.uid]);
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
