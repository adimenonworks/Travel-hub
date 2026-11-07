import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, Illustration, ListGroup, ListItem, SectionHeader, SegmentedControl, Sheet, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';
import { isNativeApp, PUBLIC_SITE, shareLink } from '../../lib/native';

/** Trip "People" tab (Figma "Trip — People"): the travellers as a List group (the owner can tap someone to change their role or remove them), then the invite card. */
export function People({ trip, profiles, canManage, isOwner }: TripCtx) {
  const me = useMe();
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // "Invite to trip" makes a link and opens the share sheet straight away (or copies it where there's no share sheet).
  const makeLink = async () => {
    setBusy(true);
    try {
      const code = await store.createInvite(trip);
      // Inside the iPhone app the page address is capacitor://localhost, which nobody else can open, so invite links
      // point at the public site; in a browser they point at wherever this copy of the site is running.
      const url = `${isNativeApp ? PUBLIC_SITE : location.origin + location.pathname}#/join/${code}`;
      setLink(url);
      return url;
    } finally {
      setBusy(false);
    }
  };
  const share = async (url = link) => {
    if (await shareLink({ title: `Join ${trip.name}`, text: `Join our trip "${trip.name}" on Rove`, url })) return;
    try { await navigator.clipboard.writeText(url); toast({ icon: 'copy', label: 'Invite link copied' }); } catch { /* the link is on screen to copy by hand */ }
  };
  const invite = async () => {
    const url = await makeLink();
    await share(url);
  };

  const members = trip.memberIds.slice().sort((a, b) => (trip.roles[a] === 'owner' ? -1 : trip.roles[b] === 'owner' ? 1 : 0));
  const roleName = (id: string) => { const r = trip.roles[id] ?? 'member'; return r === 'owner' ? 'Owner' : r === 'editor' ? 'Organiser' : 'Member'; };
  const [person, setPerson] = useState<string | null>(null);
  const [role, setRoleDraft] = useState<'editor' | 'member'>('member');
  const open = (id: string) => { setRoleDraft(trip.roles[id] === 'editor' ? 'editor' : 'member'); setPerson(id); };
  const saveRole = async () => {
    if (!person) return;
    try { await store.setRole(trip, person, role); toast({ icon: 'check', label: 'Role updated' }); setPerson(null); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };

  return (
    <>
      <SectionHeader title="Travellers" meta={`${members.length} ${members.length === 1 ? 'person' : 'people'}${isOwner && members.length > 1 ? ' · tap someone to change their role' : ''}`}
        action={canManage ? <Button size="regular" icon="plus" onClick={invite} disabled={busy}>Add people</Button> : undefined} />
      <ListGroup label="Travellers">
        {members.map((id) => {
          const name = personName(profiles, id);
          const editable = isOwner && id !== me.uid;
          return (
            <ListItem key={id} media={<Avatar name={name} photo={profiles[id]?.photo} size={40} />} round
              title={name} meta={`${roleName(id)}${id === me.uid ? ' · you' : ''}`}
              onClick={editable ? () => open(id) : undefined} label={editable ? `${name}, ${roleName(id)}: change role` : undefined} />
          );
        })}
      </ListGroup>

      {canManage && (
        <Card media={<Illustration name="friends" size={120} />}>
          <h2 className="t-heading-2">The more the merrier</h2>
          <p className="t-body-small t-secondary">Tap Add people to get a link for friends to plan this trip with you. Anyone with the link can join for the next 14 days after signing in.</p>
          {/* "Add people" (in the section header) makes the link; once there is one it shows here to share again */}
          {link && (
            <div className={s.inviteActions}>
              <div className={s.inviteRow}>
                <div className={s.inviteUrl} title={link}>{link}</div>
                <Button icon="share" onClick={() => share()}>Share</Button>
              </div>
              <Button variant="ghost" size="regular" onClick={makeLink} disabled={busy}>Make a new link</Button>
            </div>
          )}
        </Card>
      )}

      {/* Deleting the trip lives in Edit trip; here members other than the owner can leave. */}
      {!isOwner && (
        <Button variant="destructive" icon="signout" onClick={async () => {
          if (!confirm(`Leave "${trip.name}"?`)) return;
          await store.leaveTrip(trip.id, me.uid);
          navigate('/');
        }}>Leave trip</Button>
      )}

      <Sheet open={!!person} title={person ? personName(profiles, person) : ''} subtitle="What they can do on this trip" onClose={() => setPerson(null)} onSubmit={saveRole} submitLabel="Save">
        <SegmentedControl label="Role" block value={role} onChange={setRoleDraft} options={[{ value: 'member', label: 'Member' }, { value: 'editor', label: 'Organiser' }]} />
        <p className="t-body-small t-secondary">Organisers can edit the trip and the itinerary, and add ideas to days.</p>
        {person && (
          <Button variant="destructive" icon="trash" onClick={async () => {
            const name = personName(profiles, person);
            if (!confirm(`Remove ${name} from this trip?`)) return;
            try { await store.removeMember(trip, person); toast({ icon: 'trash', label: `${name} removed` }); setPerson(null); }
            catch { toast({ tone: 'error', label: "Couldn't remove. Check your connection" }); }
          }}>Remove from trip</Button>
        )}
      </Sheet>
    </>
  );
}
