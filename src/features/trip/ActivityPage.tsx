import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nextTransition } from '../../app/navigation';
import { Button, EmptyState, IconButton, JourneyDetails, LayoverBlock, LinkButton, ListGroup, ListItem, LocationCard, PageHeader, PageSection, Sheet, SpanCard, TextField, useToast } from '../../design/components';
import type { Activity } from '../../data/types';
import { daysBetween } from '../../lib/dates';
import { store } from '../../data';
import { personName, useMe, usePlacesById } from '../../data/hooks';
import { placeForEvent } from '../saves/starEvent';
import type { LinkItem } from '../../data/types';
import { formatDay, formatTime } from '../../lib/dates';
import { hostOf, isPdf, normalizeUrl } from '../../lib/format';
import { directionsUrl, mapsUrl, uberUrl } from '../../lib/geocode';
import { MapView } from '../shared/Map';
import { Comments } from '../shared/Comments';
import { haptic, confirmAction } from '../../lib/native';
import { recordView } from '../../lib/recent';
import { markRead } from '../../lib/reads';
import { flightTag, updatedAgo, useFlightStatus } from '../../lib/api';
import { durationLabel, journeyMs } from '../../lib/timezone';
import { layovers, legsOf, sameDaySpan, type Layover } from './events';
import { behaviourOf, categoryTone, eventKind, eventType, isEveryday, kindInfo, spanWords } from '../../lib/categories';
import { priceOf } from '../../lib/currency';
import { PriceWithConversion } from '../shared/Price';
import { getMapsApp, mapsAppLabel } from '../../lib/prefs';
import { ActivityForm, ConnectionForm } from './ActivityForm';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/** "1h 20m", "24h 40m", for the Journey details card (across days too). */
function journeyDuration(a: Activity) {
  if (!a.startTime || !a.endTime) return undefined;
  if (a.tz) return durationLabel(journeyMs(a)) || undefined; // from the exact moments: right across time zones
  const [h1, m1] = a.startTime.split(':').map(Number), [h2, m2] = a.endTime.split(':').map(Number);
  const min = (a.endDate && a.endDate > a.date ? daysBetween(a.date, a.endDate) * 1440 : 0) + h2 * 60 + m2 - (h1 * 60 + m1);
  if (min <= 0) return undefined;
  return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`;
}

/**
 * An event's own page, in sections (rows with nothing are hidden). The header: its category icon, title and when (just
 * the dates for something with two ends). Flights and trains (with a from and to): the Journey details cards. Stays,
 * cars, cruises, parking and luggage: the Span card (Check-in / Check-out, Pick-up / Drop-off… with times, and a car's
 * places). Then Location; Booking (company, references, seats, bags); Price & people; Notes; Files & links; Comments.
 */
export function ActivityPage(ctx: TripCtx) {
  const { activityId = '' } = useParams();
  const navigate = useNavigate();
  const me = useMe();
  const { trip, profiles } = ctx;
  const a = ctx.activities.find((x) => x.id === activityId);
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [stayAt, setStayAt] = useState<Layover | null>(null);
  const toast = useToast();
  const places = usePlacesById(ctx.activities.flatMap((x) => (x.placeId ? [x.placeId] : [])));
  const itinerary = `/trip/${trip.id}/itinerary${a ? `?day=${a.date}` : ''}`;
  // Live status for a flight (24 hours out until it lands), and a Warning haptic when it changes to Delayed or Cancelled
  const live = useFlightStatus(a && eventKind(a.category) === 'flight' ? a : undefined);
  const tag = a && eventKind(a.category) === 'flight' ? flightTag(a, live) : undefined;
  useEffect(() => { if (tag && tag.tone !== 'success' && tag.label !== 'Check-in open') haptic('warning'); }, [tag?.label]); // eslint-disable-line react-hooks/exhaustive-deps
  // The event's chat counts as read while its page is open (and again as new messages arrive)
  const chatSize = ctx.comments.filter((c) => c.targetId === activityId).length;
  useEffect(() => { if (activityId) markRead(me.uid, activityId); }, [activityId, chatSize, me.uid]);
  // Recently viewed: a booking you open (any event but a note)
  useEffect(() => {
    if (a && !['open', 'note'].includes(behaviourOf(a.category))) recordView(trip.id, { url: `/trip/${trip.id}/plan/${a.id}`, label: a.title, kind: 'Booking' });
  }, [a?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!a)
    return (
      <>
        <PageHeader title="Event not found" back={{ to: itinerary, label: 'Itinerary' }} />
        <EmptyState illustration="calendar" title="This event was deleted" message="It may have been removed from the itinerary." action={<LinkButton to={itinerary} tone="neutral">Back to itinerary</LinkButton>} />
      </>
    );

  const place = a.placeId ? places[a.placeId] : undefined;
  const starred = !!place?.starredBy?.includes(me.uid);
  const app = getMapsApp();
  const where = a.locationText || a.location?.name;
  const behaviour = behaviourOf(a.category);
  const kind = eventKind(a.category);
  const vehicle = kind === 'car' || kind === 'campervan';
  const [startWord, endWord] = spanWords(a.category);
  const removeDoc = async (i: number) => {
    const doc = a.links[i];
    if (!confirmAction(`Remove "${doc.label || hostOf(doc.url)}"?`)) return;
    try { await store.updateSub(trip.id, 'activities', a.id, { links: a.links.filter((_, j) => j !== i) }); toast({ icon: 'trash', label: 'Removed' }); }
    catch { toast({ tone: 'danger', label: "Couldn't delete. Check your connection" }); }
  };
  // Starring the event stars its Place (made in your Collections first if the event doesn't have one).
  const star = async () => {
    haptic('light');
    try {
      if (place) await store.starPlace(place.id, me.uid, !starred);
      else await placeForEvent(trip.id, a, [me.uid]);
      toast({ icon: 'star', label: starred ? 'Removed from favourites' : 'Added to favourites' });
    } catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  const goingNames = a.attendeeIds.map((id) => (id === me.uid ? 'you' : personName(profiles, id).split(' ')[0]));

  const journey = behaviour === 'journey' && (kind === 'flight' || (!!a.fromText && !!a.toText));
  // A flight with connections: every leg, with the layovers between them
  const legs = legsOf(a, ctx.activities);
  const stops = layovers(legs);
  const lastLeg = legs[legs.length - 1];
  const city = (t?: string) => (t ?? '').split(',')[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const code = (t?: string) => t?.match(/\(([^)]+)\)/)?.[1];
  const backTo = journey && kind === 'flight' ? { to: `/trip/${trip.id}/bookings/flights`, label: 'Flights' } : { to: itinerary, label: 'Itinerary' };
  const adder = a.createdBy === me.uid ? 'you' : personName(profiles, a.createdBy).split(' ')[0];
  const copy = async (text: string, what: string) => { try { await navigator.clipboard.writeText(text); toast({ icon: 'copy', label: `${what} copied` }); } catch { /* the text is selectable */ } };
  // Figma List item with "Show action": the reference as the title, what it is under it, and a small Copy button
  const price = isEveryday(a.category) ? null : priceOf(a, trip);
  const booking = [
    a.operator && !journey && <ListItem key="op" icon={kindInfo(a.category).icon} title={a.operator} meta="Company" />,
    a.ref && <ListItem key="num" icon="plane" title={<span className={s.selectable}>{a.ref}</span>} meta="Flight number"
      action={<IconButton small icon="copy" label="Copy flight number" onClick={() => copy(a.ref!, 'Flight number')} />} />,
    a.bookingRef && <ListItem key="ref" icon="ticket" title={<span className={s.selectable}>{a.bookingRef}</span>} meta={kind === 'restaurant' ? 'Reservation reference' : 'Booking reference'}
      action={<IconButton small icon="copy" label="Copy booking reference" onClick={() => copy(a.bookingRef!, kind === 'restaurant' ? 'Reservation reference' : 'Booking reference')} />} />,
    a.seats && <ListItem key="seats" icon="user-add" title="Seats" meta={a.seats} />,
    a.bags && <ListItem key="bags" icon="info" title="Bags" meta={a.bags} />,
  ].filter(Boolean);

  // Something with two ends (a stay, a car, a cruise, parking, luggage): the Span card at the top says when (and for a
  // car, where) each end is, so the header only gives the dates.
  const spans = behaviour === 'span' && !journey;
  const at = (d: string, tm?: string) => ({ date: formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' }), time: tm ? formatTime(tm) : undefined });
  const length = !a.endDate || a.endDate === a.date ? undefined
    : eventType(a.category) === 'stays' ? `${daysBetween(a.date, a.endDate)} ${daysBetween(a.date, a.endDate) === 1 ? 'night' : 'nights'}`
      : sameDaySpan(a.category) ? undefined : `${daysBetween(a.date, a.endDate) + 1} days`;
  // A route to open in Maps: a journey other than a flight, or a car rental's pick-up and drop-off
  const routeFrom = (journey && kind !== 'flight') || vehicle ? (a.fromText || '').trim() : '';
  const routeTo = routeFrom ? ((vehicle ? a.toText || '' : a.toText || '').trim() !== routeFrom ? (a.toText || '').trim() : '') : '';
  const goingRow = a.attendeeIds.length > 0 && <ListItem icon="people" title="Who’s going" meta={`${a.attendeeIds.length} of ${trip.memberIds.length}: ${goingNames.join(', ')}`} />;
  const priceRow = price && <ListItem icon="wallet" title={<PriceWithConversion price={price} />} meta="Price per person" />;

  return (
    <>
      {/* The category icon in its type's colour beside the title, the time under it; the place is in the Location card */}
      <PageHeader title={journey ? `${city(legs[0].fromText)} to ${city(lastLeg.toText)}` : a.title} size="small" back={backTo}
        icon={kindInfo(a.category).icon} tone={categoryTone(a.category)}
        subtitle={journey ? formatDay(a.date) : spans ? (a.endDate && a.endDate !== a.date ? `${formatDay(a.date)} – ${formatDay(a.endDate)}` : formatDay(a.date)) : eventCardProps(a, ctx, true).time}
        action={ctx.canContribute ? { icon: 'pencil', label: 'Edit event', onClick: () => setEditing(true) } : undefined} />

      {/* Figma "Journey detail" for flights and trains; every other type shows its Event card. No price anywhere. */}
      {journey ? (
        <div className={s.legs}>
          {legs.map((leg, i) => {
            const own = leg.id === a.id ? live : null;
            return (
              <Fragment key={leg.id}>
                {i > 0 && stops[i - 1] && (
                  <LayoverBlock title={`${durationLabel(stops[i - 1].ms) || 'Layover'} in ${stops[i - 1].at}`}
                    meta={stops[i - 1].code ? `Change at ${stops[i - 1].code}` : undefined}
                    warning={stops[i - 1].overnight ? `Overnight in ${stops[i - 1].at}` : stops[i - 1].tight ? 'Tight connection' : undefined}
                    action={stops[i - 1].overnight ? <Button tone="ghost" size="regular" icon="plus" onClick={() => setStayAt(stops[i - 1])}>Add a stay</Button> : undefined} />
                )}
                <JourneyDetails mode={kindInfo(leg.category).icon} number={leg.ref || undefined} status={leg.id === a.id ? tag : undefined}
                  from={{ city: city(leg.fromText), time: own?.departure?.revised ? own.departure.revised.slice(11, 16) : leg.startTime ? formatTime(leg.startTime) : '—', date: formatDay(leg.date),
                    terminal: [own?.departure?.airport || code(leg.fromText), own?.departure?.terminal && `Terminal ${own.departure.terminal}`].filter(Boolean).join(' · ') || undefined }}
                  to={{ city: city(leg.toText), time: own?.arrival?.revised ? own.arrival.revised.slice(11, 16) : leg.endTime ? `${formatTime(leg.endTime)}${leg.endDate && leg.endDate > leg.date ? ` +${daysBetween(leg.date, leg.endDate)}` : ''}` : '—', date: formatDay(leg.endDate || leg.date),
                    terminal: [own?.arrival?.airport || code(leg.toText), own?.arrival?.terminal && `Terminal ${own.arrival.terminal}`].filter(Boolean).join(' · ') || undefined }}
                  gate={own ? own.departure?.gate ?? '' : undefined} belt={own ? own.arrival?.belt ?? '' : undefined}
                  duration={journeyDuration(leg)}
                  footer={[leg.operator || own?.airline ? `Operated by ${leg.operator || own!.airline}` : '', own ? updatedAgo(own.updatedAt) : ''].filter(Boolean).join(' · ') || undefined} />
              </Fragment>
            );
          })}
        </div>
      ) : null}

      {spans && a.endDate && (
        <SpanCard footer={length}
          start={{ label: startWord, ...at(a.date, a.startTime), place: vehicle ? a.fromText?.split(',')[0] : undefined }}
          end={{ label: endWord, ...at(a.endDate, a.endTime), place: vehicle ? (a.toText || a.fromText)?.split(',')[0] : undefined }} />
      )}

      {/* Route: where a journey (not a flight) or a car's rental starts and ends, each opening in the maps app, and directions */}
      {/* (a car shows a Route only when it's dropped off somewhere else: its pick-up is already the Location card) */}
      {routeFrom && (!vehicle || routeTo) && (
        <PageSection title="Route" action={routeTo ? <LinkButton href={directionsUrl({ q: routeFrom, p: a.location }, { q: routeTo, p: a.to })} tone="ghost" size="regular" icon="map" label={`Directions from ${routeFrom} to ${routeTo}`}>Directions</LinkButton> : undefined}>
          <ListGroup label="Route">
            <ListItem icon="pin" title={routeFrom.split(',')[0]} meta={[vehicle ? startWord : 'From', routeFrom.split(',').slice(1).join(',').trim()].filter(Boolean).join(' · ')}
              href={mapsUrl(routeFrom, a.location, app)} label={`${routeFrom} in ${mapsAppLabel(app)}`} trailing={mapsAppLabel(app)} />
            {routeTo && <ListItem icon="pin" title={routeTo.split(',')[0]} meta={[vehicle ? endWord : 'To', routeTo.split(',').slice(1).join(',').trim()].filter(Boolean).join(' · ')}
              href={mapsUrl(routeTo, a.to, app)} label={`${routeTo} in ${mapsAppLabel(app)}`} trailing={mapsAppLabel(app)} />}
          </ListGroup>
        </PageSection>
      )}

      {/* Figma "Event detail — Location": the map, the address and the two ways to get there, together in one card */}
      {!journey && where && (
        <PageSection title="Location">
          <LocationCard title={where.split(',')[0]} subtitle={where.includes(',') ? where.split(',').slice(1).join(',').trim() : undefined}
            map={a.location ? <MapView pins={[{ lat: a.location.lat, lng: a.location.lng, label: a.title }]} center={a.location} zoom={15} height={160} /> : undefined}
            action={behaviour !== 'open' && behaviour !== 'note' ? <IconButton icon="star" state={starred ? 'filled' : 'default'} aria-pressed={starred}
              label={starred ? `Remove ${where.split(',')[0]} from favourites` : `Add ${where.split(',')[0]} to favourites`} onClick={star} /> : undefined}
            buttons={<>
              <LinkButton href={mapsUrl(where, a.location, app)} tone="neutral" icon="map" label={`Directions to ${where} in ${mapsAppLabel(app)}`}>{mapsAppLabel(app)}</LinkButton>
              <LinkButton href={uberUrl(where, a.location)} tone="neutral" icon="car" label={`Get an Uber to ${where}`}>Uber</LinkButton>
            </>} />
        </PageSection>
      )}

      {/* Booking: who it's with and the references, together */}
      {booking.length > 0 && (
        <PageSection title="Booking">
          <ListGroup label="Booking">{booking}</ListGroup>
        </PageSection>
      )}

      {/* What it costs and who's going */}
      {(priceRow || goingRow) && (
        <PageSection title={priceRow ? 'Price & people' : 'People'}>
          <ListGroup label={priceRow ? 'Price and people' : 'People'}>{priceRow}{goingRow}</ListGroup>
        </PageSection>
      )}

      {a.notes && (
        <PageSection title="Notes">
          <ListGroup label="Notes">
            <ListItem icon="notebook" title={<span className={s.selectable}>{a.notes}</span>} meta={`Added by ${adder}`} />
          </ListGroup>
        </PageSection>
      )}

      <PageSection title="Files & links" action={ctx.canContribute ? <Button tone="ghost" size="regular" iconEnd="chevron-right" onClick={() => setAddingDoc(true)}>Add</Button> : undefined}>
        {a.links.length > 0 || a.manageUrl ? (
          <ListGroup label="Files and links">
            {a.links.map((l, i) => {
              const name = l.label || hostOf(l.url);
              return (
                <div key={i} className={s.docRow}>
                  <ListItem icon={isPdf(l.url) ? 'doc' : 'link'} title={name} meta={`${isPdf(l.url) ? 'PDF' : hostOf(l.url)}${l.emailUrl ? ' · from email' : ''}`}
                    trailing={isPdf(l.url) ? 'PDF' : undefined} href={l.url} label={`${name} (opens in a new tab)`}
                    onClick={() => recordView(trip.id, { url: l.url, kind: isPdf(l.url) ? 'PDF' : 'Link', label: name, meta: a.title })} />
                  {l.emailUrl && <LinkButton href={l.emailUrl} size="regular" tone="ghost" icon="mail" label={`Open the email for ${name}`} />}
                  {ctx.canContribute && <IconButton icon="trash" label={`Remove ${name}`} onClick={() => removeDoc(i)} />}
                </div>
              );
            })}
            {a.manageUrl && <ListItem icon="arrow-up-right" title="Manage booking" meta="Link from your confirmation email" href={a.manageUrl} label="Manage booking (opens in a new tab)" />}
          </ListGroup>
        ) : <p className="t-body-small t-secondary">Nothing attached yet. Add a ticket, confirmation or booking link.</p>}
      </PageSection>

      <PageSection title="Comments">
        <Comments tripId={trip.id} targetId={a.id} comments={ctx.comments} profiles={profiles} />
      </PageSection>

      {/* A connection: the next leg leaves from where this journey lands, and joins this journey */}
      <ConnectionForm open={connecting} trip={trip} activity={a} activities={ctx.activities} onClose={() => setConnecting(false)} />
      <ActivityForm open={!!stayAt} trip={trip} date={stayAt ? stayAt.arrives.endDate || stayAt.arrives.date : a.date}
        draft={stayAt ? { category: 'hotel', locationText: stayAt.at } : undefined} onClose={() => setStayAt(null)} />
      <ActivityForm open={editing} trip={trip} date={a.date} activity={a} onClose={() => setEditing(false)}
        onAddConnection={() => { setEditing(false); setConnecting(true); }}
        onDeleted={(gone) => { nextTransition('back'); navigate(`/trip/${trip.id}/itinerary?day=${gone.date}`, { replace: true }); }} />
      <DocumentForm open={addingDoc} onClose={() => setAddingDoc(false)}
        onAdd={async (d) => {
          try { await store.updateSub(trip.id, 'activities', a.id, { links: [...a.links, d] }); toast({ icon: 'check', label: 'Added' }); }
          catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
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
