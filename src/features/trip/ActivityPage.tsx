import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, EmptyState, EventCard, IconButton, LinkButton, ListGroup, ListItem, PageHeader, PageSection, Sheet, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { LinkItem } from '../../data/types';
import { formatDay, formatTime } from '../../lib/dates';
import { hostOf, isPdf, money, normalizeUrl } from '../../lib/format';
import { mapsUrl } from '../../lib/geocode';
import { haptic } from '../../lib/native';
import { eventType } from '../../lib/categories';
import { getMapsApp, mapsAppLabel } from '../../lib/prefs';
import { Comments } from '../shared/Comments';
import { MapView } from '../shared/Map';
import { ActivityForm } from './ActivityForm';
import { eventCardProps } from './events';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/** An event's own page (Figma "Event detail"): the Event card, its details, files and links, and comments. */
export function ActivityPage(ctx: TripCtx) {
  const { activityId = '' } = useParams();
  const me = useMe();
  const { trip, profiles } = ctx;
  const a = ctx.activities.find((x) => x.id === activityId);
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const toast = useToast();
  const itinerary = `/trip/${trip.id}/itinerary${a ? `?day=${a.date}` : ''}`;

  if (!a)
    return (
      <>
        <PageHeader title="Event not found" back={{ to: itinerary, label: 'Itinerary' }} />
        <EmptyState illustration="calendar" title="This event was deleted" message="It may have been removed from the itinerary." action={<LinkButton to={itinerary} variant="secondary">Back to itinerary</LinkButton>} />
      </>
    );

  const going = a.attendeeIds.includes(me.uid);
  const starred = !!a.starredBy?.includes(me.uid);
  const app = getMapsApp();
  const where = a.locationText || a.location?.name;
  const type = eventType(a.category);
  const removeDoc = async (i: number) => {
    const doc = a.links[i];
    if (!confirm(`Remove "${doc.label || hostOf(doc.url)}"?`)) return;
    try { await store.updateSub(trip.id, 'activities', a.id, { links: a.links.filter((_, j) => j !== i) }); toast({ icon: 'trash', label: 'Removed' }); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };
  const toggle = async (field: 'attendeeIds' | 'starredBy', on: boolean, label: string) => {
    haptic('light');
    try { await store.toggleInArray(trip.id, 'activities', a.id, field, me.uid, on); toast({ icon: field === 'starredBy' ? 'star' : 'check', label }); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  const goingNames = a.attendeeIds.map((id) => (id === me.uid ? 'you' : personName(profiles, id).split(' ')[0]));

  return (
    <>
      <PageHeader title={a.title} size="small" back={{ to: itinerary, label: 'Itinerary' }}
        action={{ icon: 'pencil', label: 'Edit event', onClick: () => setEditing(true) }} />

      {/* Figma "Event detail": one template for every event type. Event card, then only the rows that have something. */}
      <EventCard {...eventCardProps(a, ctx, true)} to={undefined}
        extras={starred ? [{ icon: 'star', label: 'Favourite' }] : undefined} />

      <div className={s.planButtons}>
        <Button block icon={going ? 'check' : 'plus'} variant={going ? 'secondary' : 'primary'} onClick={() => toggle('attendeeIds', !going, going ? 'You’re not going' : 'You’re going')}>{going ? 'You’re going' : 'I’m going'}</Button>
        <Button block variant="secondary" icon="star" onClick={() => toggle('starredBy', !starred, starred ? 'Removed from favourites' : 'Added to favourites')}>{starred ? 'Favourite' : 'Add to favourites'}</Button>
      </div>

      <PageSection title="Details">
        <ListGroup label="Details">
          {type === 'flight' && a.ref && <ListItem icon="plane" title="Flight number" meta={<span className={s.selectable}>{a.ref}</span>} />}
          {a.fromText && a.toText && <ListItem icon="pin" title={type === 'flight' ? 'Departs' : 'From'} meta={`${a.fromText}${a.startTime ? ` · ${formatDay(a.date)}, ${formatTime(a.startTime)}` : ''}`} href={mapsUrl(a.fromText, a.location, app)} label={`From ${a.fromText}: open in ${mapsAppLabel(app)}`} />}
          {a.fromText && a.toText && <ListItem icon="pin" title={type === 'flight' ? 'Arrives' : 'To'} meta={`${a.toText}${a.endTime ? ` · ${formatDay(a.endDate || a.date)}, ${formatTime(a.endTime)}` : ''}`} href={mapsUrl(a.toText, a.to ?? null, app)} label={`To ${a.toText}: open in ${mapsAppLabel(app)}`} />}
          {type === 'stay' && a.endDate && <ListItem icon="calendar" title="Check-in and check-out" meta={`${formatDay(a.date)}${a.startTime ? `, ${formatTime(a.startTime)}` : ''} → ${formatDay(a.endDate)}${a.endTime ? `, ${formatTime(a.endTime)}` : ''}`} />}
          {where && !(a.fromText && a.toText) && <ListItem icon="pin" title="Address" meta={where} href={mapsUrl(where, a.location, app)} label={`${where}: open in ${mapsAppLabel(app)}`} trailing={mapsAppLabel(app)} />}
          <ListItem icon="people" title="Who’s going" meta={a.attendeeIds.length ? `${a.attendeeIds.length} of ${trip.memberIds.length}: ${goingNames.join(', ')}` : 'No one has said yet'} />
          {a.cost > 0 && <ListItem icon="wallet" title="Cost" meta={`${money(a.cost, trip.currency)} per person · ${money(a.cost * Math.max(1, a.attendeeIds.length), trip.currency)} in all`} />}
          {a.notes && <ListItem icon="pencil" title={type === 'note' ? 'More' : 'Notes'} meta={<span className={s.selectable}>{a.notes}</span>} />}
        </ListGroup>
        {a.location && <div className={s.planMap}><MapView pins={[{ lat: a.location.lat, lng: a.location.lng, label: a.fromText || where || a.title }, ...(a.to ? [{ lat: a.to.lat, lng: a.to.lng, label: a.toText || a.title }] : [])]} zoom={a.to ? undefined : 15} height={180} /></div>}
      </PageSection>

      <PageSection title="Files & links" meta="Tickets, bookings and PDFs" action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setAddingDoc(true)}>Add</Button>}>
        {a.links.length > 0 ? (
          <ListGroup label="Files and links">
            {a.links.map((l, i) => {
              const name = l.label || hostOf(l.url);
              return (
                <div key={i} className={s.docRow}>
                  <ListItem icon={isPdf(l.url) ? 'doc' : 'link'} title={name} meta={`${hostOf(l.url)}${l.emailUrl ? ' · from email' : ''}`}
                    trailing={isPdf(l.url) ? 'PDF' : undefined} href={l.url} label={`${name} (opens in a new tab)`} />
                  {l.emailUrl && <LinkButton href={l.emailUrl} size="regular" variant="ghost" icon="mail" label={`Open the email for ${name}`} />}
                  <IconButton icon="trash" label={`Remove ${name}`} onClick={() => removeDoc(i)} />
                </div>
              );
            })}
          </ListGroup>
        ) : <p className="t-body-small t-secondary">Nothing attached yet. Add a ticket, confirmation or booking link.</p>}
      </PageSection>

      <PageSection title="Comments">
        <Comments tripId={trip.id} targetId={a.id} comments={ctx.comments} profiles={profiles} />
      </PageSection>

      <ActivityForm open={editing} trip={trip} date={a.date} activity={a} onClose={() => setEditing(false)} />
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
