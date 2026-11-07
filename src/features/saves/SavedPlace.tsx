import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, DestinationHeader, EmptyState, Icon, Illustration, LinkButton, ListGroup, ListItem, MapCard, PageHeader, PageSection, Sheet, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe, useMyTrips } from '../../data/hooks';
import type { Idea, Trip } from '../../data/types';
import { categoryInfo } from '../../lib/categories';
import { countryCodeOf, flagUrl } from '../../lib/countries';
import { UNSORTED, placeTone, saveCity, saveCounts } from '../../lib/saves';
import { useNewTrip, useSave } from '../../app/Shell';
import { MapView } from '../shared/Map';
import type { TripCtx } from '../trip/TripPage';
import { useSavedBy } from './SaveSheet';
import s from './saves.module.css';

type Filter = 'all' | 'places' | 'links' | 'notes';
const kindOf = (i: Idea): Exclude<Filter, 'all'> => (i.place ? 'places' : i.url ? 'links' : 'notes');

/** A save's meta line: "Ramen · Shibuya · from TikTok" or "shared by Sam". */
export function saveMeta(i: Idea, profiles: TripCtx['profiles'], me: string) {
  const who = (i.savedBy ?? [i.createdBy]).filter((u) => u !== me);
  return [i.place?.kind || (i.place ? null : i.url ? 'Link' : 'Note'), i.place ? i.place.name.split(',')[0] === i.title ? i.place.city : i.place.city || i.place.name : null,
    i.source ? `from ${i.source}` : null, who.length && !(i.savedBy ?? [i.createdBy]).includes(me) ? `shared by ${personName(profiles, who[0]).split(' ')[0]}` : null]
    .filter(Boolean).join(' · ');
}

/**
 * Figma "Saved destination — Japan": a saved place (a Trip with status 'saved'). The Destination header (its saves,
 * who saved them, "Turn into a trip"), filter chips, the Map card, then the saves by city and "Links & notes".
 * Turning it into a trip opens the New trip flow with the destination filled in; the same record becomes the trip.
 */
export function SavedPlace(ctx: TripCtx) {
  const { trip, ideas, profiles } = ctx;
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const newTrip = useNewTrip();
  const openSave = useSave();
  const all = useMyTrips() ?? [];
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Idea | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [editing, setEditing] = useState(false);
  const saves = ideas.filter((i) => i.status !== 'rejected').sort((a, b) => b.createdAt - a.createdAt);
  const savedBy = useSavedBy(saves);
  const code = countryCodeOf(trip.destination);
  const unsorted = trip.name === UNSORTED && !trip.destination;
  const count = (f: Filter) => (f === 'all' ? saves.length : saves.filter((i) => kindOf(i) === f).length);
  const shown = saves.filter((i) => filter === 'all' || kindOf(i) === filter);
  const byCity = Object.entries(shown.filter((i) => i.place).reduce<Record<string, Idea[]>>((m, i) => { (m[saveCity(i)!] ??= []).push(i); return m; }, {}))
    .sort((a, b) => b[1].length - a[1].length);
  const loose = shown.filter((i) => !i.place);
  const pins = saves.filter((i) => i.place).map((i) => ({ lat: i.place!.lat, lng: i.place!.lng, label: i.title }));
  const cities = [...new Set(saves.map(saveCity).filter(Boolean))] as string[];
  const live = open ? ideas.find((i) => i.id === open.id) ?? null : null;

  const row = (i: Idea) => (
    <ListItem key={i.id} icon={categoryInfo(i.category).icon} media={i.image ? <img src={i.image} alt="" /> : undefined}
      title={i.title} meta={saveMeta(i, profiles, me.uid)} onClick={() => setOpen(i)} />
  );

  return (
    <>
      <PageHeader title={trip.name} back={{ to: '/trips?show=saved', label: 'Saved' }} fit
        action={ctx.canManage ? { icon: 'pencil', label: `Edit ${trip.name}`, onClick: () => setEditing(true) } : undefined} />

      {!unsorted && (
        <DestinationHeader tone={placeTone(all, trip)} flag={code && flagUrl(code) ? <img src={flagUrl(code)} alt="" /> : <Icon name="globe" size={24} />}
          title={saveCounts(saves)} meta={savedBy}
          action={<Button variant="inverse" block iconEnd="chevron-right" onClick={() => newTrip({ fromSaved: trip.id })}>Turn into a trip</Button>} />
      )}

      {saves.length === 0 ? (
        <EmptyState illustration="map" title="Nothing saved here yet" message="Save links from TikTok, Instagram or Maps, or add a place by name."
          action={<Button variant="secondary" icon="plus" onClick={() => openSave({ mode: 'place' })}>Add a place</Button>} />
      ) : (
        <>
          <ul className={s.chips} aria-label="Show">
            {(['all', 'places', 'links', 'notes'] as Filter[]).filter((f) => f === 'all' || count(f) > 0).map((f) => (
              <li key={f}><Chip active={filter === f} onClick={() => setFilter(f)} label={`${f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}, ${count(f)}${filter === f ? ', selected' : ''}`}>
                {`${f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)} ${count(f)}`}
              </Chip></li>
            ))}
          </ul>

          {pins.length > 0 && (
            <MapCard media={<Illustration name="map" size={72} />} title={`See ${pins.length} place${pins.length === 1 ? '' : 's'} on a map`} meta={cities.slice(0, 3).join(', ')} onClick={() => setShowMap(true)} />
          )}

          {byCity.map(([city, list]) => {
            const more = list.length > 3 && !expanded.includes(city);
            return (
              <PageSection key={city} title={city}
                action={list.length > 3 ? <Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setExpanded((x) => (more ? [...x, city] : x.filter((c) => c !== city)))}>{more ? `See all ${list.length}` : 'Show less'}</Button> : undefined}>
                <ListGroup label={city}>{(more ? list.slice(0, 3) : list).map(row)}</ListGroup>
              </PageSection>
            );
          })}

          {loose.length > 0 && (
            <PageSection title="Links & notes">
              <ListGroup label="Links and notes">{loose.map(row)}</ListGroup>
            </PageSection>
          )}
        </>
      )}

      {/* One save opened: open the link, see the note, or remove it. */}
      <Sheet open={!!live} title={live?.title ?? ''} subtitle={live ? saveMeta(live, profiles, me.uid) : undefined} onClose={() => setOpen(null)}>
        {live?.image && <img src={live.image} alt="" className={s.saveImage} />}
        {live?.notes && <p className="t-body">{live.notes}</p>}
        {live?.url && <LinkButton href={live.url} block icon="arrow-up-right">{`Open on ${live.source || 'the web'}`}</LinkButton>}
        {live && (
          <Button variant="destructive" icon="trash" onClick={async () => {
            try { await store.deleteSub(trip.id, 'ideas', live.id); toast({ icon: 'trash', label: 'Save removed' }); setOpen(null); }
            catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
          }}>Remove save</Button>
        )}
      </Sheet>

      <Sheet open={showMap} title={`${trip.name} on a map`} onClose={() => setShowMap(false)}>
        {showMap && <div className={s.map}><MapView pins={pins} height={360} /></div>}
      </Sheet>

      <EditPlace open={editing} trip={trip} onClose={() => setEditing(false)} onDeleted={() => navigate('/trips?show=saved')} />
    </>
  );
}

/** Rename a saved place, or delete it with its saves. */
function EditPlace({ open, trip, onClose, onDeleted }: { open: boolean; trip: Trip; onClose: () => void; onDeleted: () => void }) {
  const [name, setName] = useState(trip.name);
  const toast = useToast();
  return (
    <Sheet open={open} title={`Edit ${trip.name}`} onClose={onClose} submitLabel="Save" submitDisabled={!name.trim()}
      onSubmit={async () => {
        try { await store.updateTrip(trip.id, { name: name.trim() }); toast({ icon: 'check', label: 'Changes saved' }); onClose(); }
        catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
      }}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Button variant="destructive" icon="trash" onClick={async () => {
        if (!confirm(`Delete "${trip.name}" and everything saved in it?`)) return;
        try { await store.deleteTrip(trip.id); toast({ icon: 'trash', label: `${trip.name} deleted` }); onClose(); onDeleted(); }
        catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
      }}>Delete saved place</Button>
    </Sheet>
  );
}
