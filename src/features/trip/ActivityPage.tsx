import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nextTransition } from '../../app/navigation';
import { Button, EmptyState, EventCard, IconButton, JourneyDetails, LinkButton, ListGroup, ListItem, PageHeader, PageSection, Sheet, TextField, useToast } from '../../design/components';
import type { Activity } from '../../data/types';
import { daysBetween } from '../../lib/dates';
import { store } from '../../data';
import { personName, useMe, usePlacesById } from '../../data/hooks';
import { placeForEvent } from '../saves/starEvent';
import type { LinkItem } from '../../data/types';
import { formatDay, formatTime } from '../../lib/dates';
import { hostOf, isPdf, normalizeUrl } from '../../lib/format';
import { mapsUrl, uberUrl } from '../../lib/geocode';
import { MapView } from '../shared/Map';
import { Comments } from '../shared/Comments';
import { haptic, confirmAction } from '../../lib/native';
import { recordView } from '../../lib/recent';
import { flightTag, updatedAgo, useFlightStatus } from '../../lib/api';
import { eventType } from '../../lib/categories';
import { getMapsApp, mapsAppLabel } from '../../lib/prefs';
import { ActivityForm } from './ActivityForm';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/** "1h 20m", "24h 40m", for the Journey details card (across days too). */
function journeyDuration(a: Activity) {
  if (!a.startTime || !a.endTime) return undefined;
  const [h1, m1] = a.startTime.split(':').map(Number), [h2, m2] = a.endTime.split(':').map(Number);
  const min = (a.endDate && a.endDate > a.date ? daysBetween(a.date, a.endDate) * 1440 : 0) + h2 * 60 + m2 - (h1 * 60 + m1);
  if (min <= 0) return undefined;
  return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`;
}

/**
 * An event's own page. Flights and trains (with a from and to): Figma "Journey detail" — the Journey details card,
 * Booking (reference, seats, bags), Files & links (with Manage booking), Notes. Other types: the Event card, then one
 * List group (address, booking reference, who's going, notes; rows with nothing are hidden), files and links. No price.
 */
export function ActivityPage(ctx: TripCtx) {
  const { activityId = '' } = useParams();
  const navigate = useNavigate();
  const me = useMe();
  const { trip, profiles } = ctx;
  const a = ctx.activities.find((x) => x.id === activityId);
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const toast = useToast();
  const places = usePlacesById(ctx.activities.flatMap((x) => (x.placeId ? [x.placeId] : [])));
  const itinerary = `/trip/${trip.id}/itinerary${a ? `?day=${a.date}` : ''}`;
  // Live status for a flight (24 hours out until it lands), and a Warning haptic when it changes to Delayed or Cancelled
  const live = useFlightStatus(a && eventType(a.category) === 'flight' ? a : undefined);
  const tag = a && eventType(a.category) === 'flight' ? flightTag(a, live) : undefined;
  useEffect(() => { if (tag && tag.tone !== 'success' && tag.label !== 'Check-in open') haptic('warning'); }, [tag?.label]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recently viewed: a booking you open (any event but a note)
  useEffect(() => {
    if (a && eventType(a.category) !== 'note') recordView(trip.id, { url: `/trip/${trip.id}/plan/${a.id}`, label: a.title, kind: 'Booking' });
  }, [a?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!a)
    return (
      <>
        <PageHeader title="Event not found" back={{ to: itinerary, label: 'Itinerary' }} />
        <EmptyState illustration="calendar" title="This event was deleted" message="It may have been removed from the itinerary." action={<LinkButton to={itinerary} variant="secondary">Back to itinerary</LinkButton>} />
      </>
    );

  const place = a.placeId ? places[a.placeId] : undefined;
  const starred = !!place?.starredBy?.includes(me.uid);
  const app = getMapsApp();
  const where = a.locationText || a.location?.name;
  const type = eventType(a.category);
  const removeDoc = async (i: number) => {
    const doc = a.links[i];
    if (!confirmAction(`Remove "${doc.label || hostOf(doc.url)}"?`)) return;
    try { await store.updateSub(trip.id, 'activities', a.id, { links: a.links.filter((_, j) => j !== i) }); toast({ icon: 'trash', label: 'Removed' }); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };
  // Starring the event stars its Place (made in your Collections first if the event doesn't have one).
  const star = async () => {
    haptic('light');
    try {
      if (place) await store.starPlace(place.id, me.uid, !starred);
      else await placeForEvent(trip.id, a, [me.uid]);
      toast({ icon: 'star', label: starred ? 'Removed from favourites' : 'Added to favourites' });
    } catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  const goingNames = a.attendeeIds.map((id) => (id === me.uid ? 'you' : personName(profiles, id).split(' ')[0]));

  const journey = type === 'flight' || (type === 'transport' && !!a.fromText && !!a.toText);
  const city = (t?: string) => (t ?? '').split(',')[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const code = (t?: string) => t?.match(/\(([^)]+)\)/)?.[1];
  const backTo = journey && type === 'flight' ? { to: `/trip/${trip.id}/bookings/flights`, label: 'Flights' } : { to: itinerary, label: 'Itinerary' };
  const adder = a.createdBy === me.uid ? 'you' : personName(profiles, a.createdBy).split(' ')[0];
  const copyRef = async (ref: string) => { try { await navigator.clipboard.writeText(ref); toast({ icon: 'copy', label: 'Booking reference copied' }); } catch { /* the reference is selectable */ } };
  const booking = [
    a.bookingRef && <ListItem key="ref" icon="copy" title="Booking reference" meta={`${a.bookingRef} · tap to copy`} onClick={() => copyRef(a.bookingRef!)} />,
    a.seats && <ListItem key="seats" icon="user-add" title="Seats" meta={a.seats} />,
    a.bags && <ListItem key="bags" icon="info" title="Bags" meta={a.bags} />,
  ].filter(Boolean);

  return (
    <>
      <PageHeader title={journey ? `${city(a.fromText)} to ${city(a.toText)}` : a.title} size="small" back={backTo}
        action={{ icon: 'pencil', label: 'Edit event', onClick: () => setEditing(true) }} />

      {/* Figma "Journey detail" for flights and trains; every other type shows its Event card. No price anywhere. */}
      {journey ? (
        <JourneyDetails mode={type === 'flight' ? 'plane' : 'train'} number={a.ref || undefined} status={tag}
          from={{ city: city(a.fromText), time: live?.departure?.revised ? live.departure.revised.slice(11, 16) : a.startTime ? formatTime(a.startTime) : '—', date: formatDay(a.date),
            terminal: [live?.departure?.airport || code(a.fromText), live?.departure?.terminal && `Terminal ${live.departure.terminal}`].filter(Boolean).join(' · ') || undefined }}
          to={{ city: city(a.toText), time: live?.arrival?.revised ? live.arrival.revised.slice(11, 16) : a.endTime ? formatTime(a.endTime) : '—', date: formatDay(a.endDate || a.date),
            terminal: [live?.arrival?.airport || code(a.toText), live?.arrival?.terminal && `Terminal ${live.arrival.terminal}`].filter(Boolean).join(' · ') || undefined }}
          gate={live ? live.departure?.gate ?? '' : undefined} belt={live ? live.arrival?.belt ?? '' : undefined}
          duration={journeyDuration(a)}
          footer={[a.operator || live?.airline ? `Operated by ${a.operator || live!.airline}` : '', live ? updatedAgo(live.updatedAt) : ''].filter(Boolean).join(' · ') || undefined} />
      ) : (
        <EventCard {...eventCardProps(a, ctx, true)} {...(type !== 'note' && where ? { place: undefined } : {})} to={undefined} favourite={starred} />
      )}

      {!journey && a.category !== 'note' && (
        <Button block size="regular" variant="secondary" icon="star" onClick={star}>{starred ? 'Favourite' : 'Add to favourites'}</Button>
      )}

      {/* Figma "Event detail — Location": the map, the address and the two ways to get there, together in one card */}
      {!journey && where && (
        <PageSection title="Location">
          <div className={s.whereCard}>
            {a.location && (
              <div className={s.whereMap}>
                <MapView pins={[{ lat: a.location.lat, lng: a.location.lng, label: a.title }]} center={a.location} zoom={15} height={160} />
              </div>
            )}
            <div className={s.whereText}>
              <span className="t-heading-3">{where.split(',')[0]}</span>
              {where.includes(',') && <span className="t-body t-secondary">{where.split(',').slice(1).join(',').trim()}</span>}
            </div>
            <div className={s.whereButtons}>
              <LinkButton href={mapsUrl(where, a.location, app)} variant="secondary" icon="map" label={`Directions to ${where} in ${mapsAppLabel(app)}`}>{mapsAppLabel(app)}</LinkButton>
              <LinkButton href={uberUrl(where, a.location)} variant="secondary" icon="car" label={`Get an Uber to ${where}`}>Uber</LinkButton>
            </div>
          </div>
        </PageSection>
      )}

      {!journey && ((type === 'stay' && a.endDate) || booking.length > 0 || a.attendeeIds.length > 0 || a.notes) && (
        <ListGroup label="Details">
          {type === 'stay' && a.endDate && <ListItem icon="calendar" title="Check-in and check-out" meta={`${formatDay(a.date)}${a.startTime ? `, ${formatTime(a.startTime)}` : ''} → ${formatDay(a.endDate)}${a.endTime ? `, ${formatTime(a.endTime)}` : ''}`} />}
          {booking}
          {a.attendeeIds.length > 0 && <ListItem icon="people" title="Who’s going" meta={`${a.attendeeIds.length} of ${trip.memberIds.length}: ${goingNames.join(', ')}`} />}
          {a.notes && <ListItem icon="notebook" title={type === 'note' ? 'More' : 'Notes'} meta={<span className={s.selectable}>{`${a.notes} · added by ${adder}`}</span>} />}
        </ListGroup>
      )}

      {journey && booking.length > 0 && (
        <PageSection title="Booking" meta="From your confirmation email">
          <ListGroup label="Booking">{booking}</ListGroup>
        </PageSection>
      )}

      <PageSection title="Files & links" action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setAddingDoc(true)}>Add</Button>}>
        {a.links.length > 0 || a.manageUrl ? (
          <ListGroup label="Files and links">
            {a.links.map((l, i) => {
              const name = l.label || hostOf(l.url);
              return (
                <div key={i} className={s.docRow}>
                  <ListItem icon={isPdf(l.url) ? 'doc' : 'link'} title={name} meta={`${isPdf(l.url) ? 'PDF' : hostOf(l.url)}${l.emailUrl ? ' · from email' : ''}`}
                    trailing={isPdf(l.url) ? 'PDF' : undefined} href={l.url} label={`${name} (opens in a new tab)`}
                    onClick={() => recordView(trip.id, { url: l.url, kind: isPdf(l.url) ? 'PDF' : 'Link', label: name, meta: a.title })} />
                  {l.emailUrl && <LinkButton href={l.emailUrl} size="regular" variant="ghost" icon="mail" label={`Open the email for ${name}`} />}
                  <IconButton icon="trash" label={`Remove ${name}`} onClick={() => removeDoc(i)} />
                </div>
              );
            })}
            {a.manageUrl && <ListItem icon="arrow-up-right" title="Manage booking" meta="Link from your confirmation email" href={a.manageUrl} label="Manage booking (opens in a new tab)" />}
          </ListGroup>
        ) : <p className="t-body-small t-secondary">Nothing attached yet. Add a ticket, confirmation or booking link.</p>}
      </PageSection>

      {journey && a.notes && (
        <PageSection title="Notes" action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setEditing(true)}>Edit</Button>}>
          <ListGroup label="Notes">
            <ListItem icon="pencil" title={a.notes.split('\n')[0]} meta={[a.notes.split('\n').slice(1).join(' '), `added by ${adder}`].filter(Boolean).join(' · ')} />
          </ListGroup>
        </PageSection>
      )}

      <PageSection title="Comments">
        <Comments tripId={trip.id} targetId={a.id} comments={ctx.comments} profiles={profiles} />
      </PageSection>

      <ActivityForm open={editing} trip={trip} date={a.date} activity={a} onClose={() => setEditing(false)}
        onDeleted={(gone) => { nextTransition('back'); navigate(`/trip/${trip.id}/itinerary?day=${gone.date}`, { replace: true }); }} />
      <DocumentForm open={addingDoc} onClose={() => setAddingDoc(false)}
        onAdd={async (d) => {
          try { await store.updateSub(trip.id, 'activities', a.id, { links: [...a.links, d] }); toast({ icon: 'check', label: 'Added' }); }
          catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
        }} />
    </>
  );
}

function DocumentForm({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (d: LinkItem) => Promise<void> }) {
  const [d, setD] = useState<LinkItem>({ label: '', url: '', emailUrl: '' });
  const set = (p: Partial<LinkItem>) => setD((x) => ({ ...x, ...p }));
  const close = () => { setD({ label: '', url: '', emailUrl: '' }); onClose(); };
  const submit = async () => {
    const email = normalizeUrl(d.emailUrl ?? '');
    await onAdd({ label: d.label.trim(), url: normalizeUrl(d.url), ...(email ? { emailUrl: email } : {}) });
    close();
  };
  return (
    <Sheet open={open} title="Add document" onClose={close} onSubmit={submit} submitLabel="Add" submitDisabled={!d.url.trim()}>
      <TextField label="Name" placeholder="Museum tickets" value={d.label} onChange={(e) => set({ label: e.target.value })} />
      <TextField label="Link or PDF" hint="Paste a share link, e.g. a PDF on Google Drive or a booking page." placeholder="https://…" inputMode="url"
        value={d.url} onChange={(e) => set({ url: e.target.value })} />
      <TextField label="Email it came from (optional)" hint="In Gmail, open the email and copy the address bar." placeholder="https://mail.google.com/…" inputMode="url"
        value={d.emailUrl} onChange={(e) => set({ emailUrl: e.target.value })} />
    </Sheet>
  );
}
