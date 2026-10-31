import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, Badge, Button, Card, EmptyState, IconButton, LinkButton, List, ListRow, PageHeader, Section, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { LinkItem } from '../../data/types';
import { formatDay, formatTime } from '../../lib/dates';
import { hostOf, isPdf, money, normalizeUrl } from '../../lib/format';
import { mapsUrl, uberUrl } from '../../lib/geocode';
import { getMapsApp, mapsAppLabel } from '../../lib/prefs';
import { categoryInfo } from '../../lib/categories';
import { Comments } from '../shared/Comments';
import { MapView } from '../shared/Map';
import { ActivityForm } from './ActivityForm';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

/** One plan from the itinerary: when, where, who's going, and its tickets and bookings. */
export function ActivityPage(ctx: TripCtx) {
  const { activityId = '' } = useParams();
  const me = useMe();
  const { trip, profiles } = ctx;
  const a = ctx.activities.find((x) => x.id === activityId);
  const [editing, setEditing] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const itinerary = `/trip/${trip.id}${a ? `?day=${a.date}` : ''}`;

  if (!a)
    return (
      <>
        <PageHeader title="Plan not found" back={{ to: itinerary, label: 'Itinerary' }} />
        <Card><EmptyState illustration="calendar" title="This plan was deleted" message="It may have been removed from the itinerary." action={<LinkButton to={itinerary} variant="secondary">Back to itinerary</LinkButton>} /></Card>
      </>
    );

  const cat = categoryInfo(a.category);
  const going = a.attendeeIds.includes(me.uid);
  const time = a.startTime ? `${formatTime(a.startTime)}${a.endTime ? ` – ${formatTime(a.endTime)}` : ''}` : 'Any time';
  const app = getMapsApp();
  const removeDoc = (i: number) => {
    const doc = a.links[i];
    if (confirm(`Remove "${doc.label || hostOf(doc.url)}"?`)) store.updateSub(trip.id, 'activities', a.id, { links: a.links.filter((_, j) => j !== i) });
  };

  return (
    <>
      <PageHeader
        title={a.title}
        subtitle={`${formatDay(a.date, { weekday: 'long', month: 'long', day: 'numeric' })} · ${time}`}
        back={{ to: itinerary, label: 'Itinerary' }}
        action={{ icon: 'pencil', label: 'Edit event', onClick: () => setEditing(true) }}
      />

      <div className={s.planMeta}>
        <Badge tone="category" icon={cat.icon}>{cat.label}</Badge>
        {a.cost > 0 && <Badge>{money(a.cost, trip.currency)} per person</Badge>}
      </div>
      {a.notes && <Card><p className={s.actNotes}>{a.notes}</p></Card>}

      <div className={s.planGrid}>
        <div className={s.planCol}>
          <Section title="Location"
            footer={a.locationText && <>Opens in {mapsAppLabel(app)}. <Link to="/profile">Change your maps app</Link></>}>
            {a.locationText ? (
              <Card className={s.planLocation}>
                {a.location && <MapView pins={[{ lat: a.location.lat, lng: a.location.lng, label: a.locationText }]} zoom={15} height={200} />}
                <div className={s.planAddress}>{a.locationText}</div>
                <div className={s.planButtons}>
                  <LinkButton href={mapsUrl(a.locationText, a.location, app)} icon="map" variant="secondary">Open in {mapsAppLabel(app)}</LinkButton>
                  <LinkButton href={uberUrl(a.locationText, a.location)} icon="car" variant="secondary">Get an Uber</LinkButton>
                </div>
              </Card>
            ) : (
              <Card><EmptyState illustration="map" title="No location yet" message="Add an address to get directions and an Uber in one tap."
                action={<Button variant="secondary" icon="pencil" onClick={() => setEditing(true)}>Add location</Button>} /></Card>
            )}
          </Section>

          <Section title="Who’s going"
            action={<Button size="small" variant={going ? 'primary' : 'secondary'} icon={going ? 'check' : 'plus'}
              onClick={() => store.toggleInArray(trip.id, 'activities', a.id, 'attendeeIds', me.uid, !going)}>{going ? "I'm in" : 'Join'}</Button>}>
            {a.attendeeIds.length ? (
              <List>
                {a.attendeeIds.map((id) => (
                  <ListRow key={id} leading={<Avatar name={personName(profiles, id)} photo={profiles[id]?.photo} seed={id} size={36} />}
                    title={id === me.uid ? `${personName(profiles, id)} (you)` : personName(profiles, id)} />
                ))}
              </List>
            ) : (
              <div className={s.emptyNote}>No one has joined yet.</div>
            )}
          </Section>
        </div>

        <div className={s.planCol}>
          <Section title="Documents" action={<Button size="small" variant="secondary" icon="plus" onClick={() => setAddingDoc(true)}>Add</Button>}
            footer="Tickets, bookings and PDFs. Add the email it came from to find it again quickly.">
            {a.links.length ? (
              <List>
                {a.links.map((l, i) => {
                  const name = l.label || hostOf(l.url);
                  return (
                    <ListRow key={i} icon={isPdf(l.url) ? 'doc' : 'link'}
                      title={<a href={l.url} target="_blank" rel="noreferrer" className={s.docLink}>{name}<span className="visually-hidden"> (opens in a new tab)</span></a>}
                      subtitle={`${isPdf(l.url) ? 'PDF · ' : ''}${hostOf(l.url)}${l.emailUrl ? ' · from email' : ''}`}
                      trailing={
                        <span className={s.docActions}>
                          {l.emailUrl && <LinkButton href={l.emailUrl} size="small" variant="ghost" icon="mail" label={`Open the email for ${name}`} />}
                          <IconButton icon="trash" size="small" label={`Remove ${name}`} onClick={() => removeDoc(i)} />
                        </span>
                      } />
                  );
                })}
              </List>
            ) : (
              <div className={s.emptyNote}>No documents yet.</div>
            )}
          </Section>

          <Section title="Comments">
            <Card><Comments tripId={trip.id} targetId={a.id} comments={ctx.comments} profiles={profiles} /></Card>
          </Section>
        </div>
      </div>

      <ActivityForm open={editing} trip={trip} date={a.date} activity={a} onClose={() => setEditing(false)} />
      <DocumentForm open={addingDoc} onClose={() => setAddingDoc(false)}
        onAdd={(d) => store.updateSub(trip.id, 'activities', a.id, { links: [...a.links, d] })} />
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
