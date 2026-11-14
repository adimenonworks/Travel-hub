import { useEffect, useMemo, useRef } from 'react';
import { Button, Card, Illustration, ListGroup, ListItem, PageHeader, PageSection, PageSkeleton, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe, useMyTripsAll, usePlacesAll, useProfiles, useSubFor } from '../../data/hooks';
import { KEEP_DELETED_MS, type Activity, type Trip } from '../../data/types';
import { kindInfo, categoryTone, behaviourOf } from '../../lib/categories';
import { formatDay, formatTime } from '../../lib/dates';
import { haptic } from '../../lib/native';
import { placeCategory, placeCategoryOfEvent } from '../../lib/places';
import { Content } from '../../app/Shell';

const DAY = 86400_000;
const fresh = (x: { deletedAt?: number }) => !!x.deletedAt && Date.now() - x.deletedAt < KEEP_DELETED_MS;
const daysLeft = (at: number) => Math.max(1, Math.ceil((at + KEEP_DELETED_MS - Date.now()) / DAY));
const pad = (n: number) => String(n).padStart(2, '0');
const when = (at: number) => { const d = new Date(at); return `${formatDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, { day: 'numeric', month: 'short' })}, ${formatTime(d.toTimeString().slice(0, 5))}`; };
/** "Fjord", "Lisbon, Portugal" → "Lisbon" */
const cityFrom = (name?: string) => { const p = (name ?? '').split(',').map((x) => x.trim()).filter(Boolean); return p.length >= 3 ? p[p.length - 2] : p[0] ?? ''; };

/** Everything in Recently deleted that you can see: your trips (and their events), and your own places. */
function useBin() {
  const me = useMe();
  const trips = useMyTripsAll();
  const ids = useMemo(() => (trips ?? []).map((t) => t.id), [trips]);
  const acts = useSubFor(ids, 'activities', true);
  const places = usePlacesAll();
  return { me, trips, acts, places };
}

/**
 * Clears Recently deleted after 30 days, from whichever device of someone allowed to delete it opens Rove first
 * (there's no server to do it): trips by whoever created them, events by a Planner, places by whoever saved them.
 */
export function usePurgeDeleted() {
  const { me, trips, acts, places } = useBin();
  const done = useRef(new Set<string>());
  useEffect(() => {
    const old = (x: { deletedAt?: number }) => !!x.deletedAt && Date.now() - x.deletedAt >= KEEP_DELETED_MS;
    const once = (key: string, run: () => Promise<void>) => { if (!done.current.has(key)) { done.current.add(key); run().catch(() => {}); } };
    for (const t of trips ?? []) {
      if (old(t) && t.ownerId === me.uid) once(`t:${t.id}`, () => store.deleteTrip(t.id));
      else if (t.roles[me.uid] && t.roles[me.uid] !== 'viewer') for (const a of acts[t.id] ?? []) if (old(a)) once(`a:${a.id}`, () => store.deleteSub(t.id, 'activities', a.id));
    }
    for (const p of places ?? []) if (old(p) && p.ownerId === me.uid) once(`p:${p.id}`, () => store.deletePlace(p.id));
  }, [trips, acts, places, me.uid]);
}

/**
 * You → Recently deleted: trips, events and places deleted in the last 30 days, newest first, each with when and who
 * deleted it and how long is left. Restore puts it back where it was; an event whose trip is deleted too comes back as
 * a place in your Collections instead (restore the trip to get the event back).
 */
export function RecentlyDeleted() {
  const toast = useToast();
  const { me, trips, acts, places } = useBin();
  const binnedTrips = (trips ?? []).filter(fresh).sort((a, b) => b.deletedAt! - a.deletedAt!);
  const events = (trips ?? []).flatMap((t) => (acts[t.id] ?? []).filter(fresh).map((a) => ({ a, t })))
    .sort((x, y) => y.a.deletedAt! - x.a.deletedAt!);
  const binnedPlaces = (places ?? []).filter((p) => fresh(p) && p.ownerId === me.uid).sort((a, b) => b.deletedAt! - a.deletedAt!);
  const profiles = useProfiles([...new Set([...binnedTrips, ...events.map((e) => e.a), ...binnedPlaces].map((x) => x.deletedBy ?? ''))].filter(Boolean));
  if (trips === null || places === null) return <PageSkeleton />;

  const by = (uid?: string) => (!uid ? '' : uid === me.uid ? ' by you' : ` by ${personName(profiles, uid).split(' ')[0]}`);
  const meta = (x: { deletedAt?: number; deletedBy?: string }, before?: string) =>
    [before, `Deleted ${when(x.deletedAt!)}${by(x.deletedBy)}`, `${daysLeft(x.deletedAt!)} day${daysLeft(x.deletedAt!) === 1 ? '' : 's'} left`].filter(Boolean).join(' · ');
  const planner = (t: Trip) => !!t.roles[me.uid] && t.roles[me.uid] !== 'viewer';
  const fail = () => toast({ tone: 'danger', label: "Couldn't restore it. Check your connection" });

  const restoreTrip = async (t: Trip) => {
    try { await store.setDeleted({ kind: 'trip', id: t.id }, false); haptic('success'); toast({ icon: 'check', label: `${t.name} is back in Trips` }); } catch { fail(); }
  };
  const restoreEvent = async (a: Activity, t: Trip) => {
    if (!t.deletedAt) {
      try { await store.setDeleted({ kind: 'event', tripId: t.id, id: a.id }, false); haptic('success'); toast({ icon: 'check', label: `Back on ${formatDay(a.date, { weekday: 'short', day: 'numeric', month: 'short' })} in ${t.name}` }); } catch { fail(); }
      return;
    }
    // Its trip is deleted too: the event comes back as a place in your Collections
    const own = a.placeId ? (places ?? []).find((p) => p.id === a.placeId && p.ownerId === me.uid) : undefined;
    try {
      if (own) {
        if (own.deletedAt) await store.setDeleted({ kind: 'place', id: own.id }, false);
      } else if (a.location && ['place', 'span'].includes(behaviourOf(a.category))) { // a journey or a note isn't a place
        store.addPlace({
          name: a.title, category: placeCategoryOfEvent(a.category), city: cityFrom(a.location.name),
          country: a.location.country ?? '', countryCode: (a.location.countryCode ?? '').toLowerCase(), lat: a.location.lat, lng: a.location.lng,
        }).saved.catch(fail);
      } else {
        toast({ label: `${t.name} is deleted. Restore the trip to bring this back` });
        return;
      }
      haptic('success');
      toast({ icon: 'check', label: `${t.name} is deleted, so ${a.title} is in your Collections` });
    } catch { fail(); }
  };
  const restorePlace = async (id: string, name: string) => {
    try { await store.setDeleted({ kind: 'place', id }, false); haptic('success'); toast({ icon: 'check', label: `${name} is back in Collections` }); } catch { fail(); }
  };
  const restore = (label: string, run: () => void) => <Button tone="neutral" size="small" onClick={run} aria-label={`Restore ${label}`}>Restore</Button>;

  const empty = binnedTrips.length + events.length + binnedPlaces.length === 0;
  return (
    <Content>
      <PageHeader title="Recently deleted" size="small" back={{ to: '/profile', label: 'You' }}
        subtitle="Trips, events and places stay here for 30 days, then they’re gone for good." />
      {empty ? (
        <Card media={<Illustration name="memories" size={120} />} title="Nothing deleted" body="When you delete a trip, an event or a saved place, you can bring it back from here for 30 days." />
      ) : (
        <>
          {binnedTrips.length > 0 && (
            <PageSection title="Trips">
              <ListGroup label="Deleted trips">
                {binnedTrips.map((t) => <ListItem key={t.id} icon="plane" title={t.name} meta={meta(t)} action={planner(t) ? restore(t.name, () => restoreTrip(t)) : undefined} />)}
              </ListGroup>
            </PageSection>
          )}
          {events.length > 0 && (
            <PageSection title="Events">
              <ListGroup label="Deleted events">
                {events.map(({ a, t }) => {
                  const k = kindInfo(a.category);
                  return <ListItem key={a.id} icon={k.icon} type={categoryTone(a.category)} title={a.title}
                    meta={meta(a, `${t.name}${t.deletedAt ? ' (deleted)' : ''} · ${formatDay(a.date, { day: 'numeric', month: 'short' })}`)}
                    action={planner(t) ? restore(a.title, () => restoreEvent(a, t)) : undefined} />;
                })}
              </ListGroup>
            </PageSection>
          )}
          {binnedPlaces.length > 0 && (
            <PageSection title="Places">
              <ListGroup label="Deleted places">
                {binnedPlaces.map((p) => { const c = placeCategory(p.category); return <ListItem key={p.id} icon={c.icon} type={c.tone} title={p.name} meta={meta(p, [p.city, p.country].filter(Boolean).join(', '))} action={restore(p.name, () => restorePlace(p.id, p.name))} />; })}
              </ListGroup>
            </PageSection>
          )}
        </>
      )}
    </Content>
  );
}
