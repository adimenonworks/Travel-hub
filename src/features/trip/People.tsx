import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, Illustration, ListGroup, ListItem, SectionHeader, SegmentControl, Sheet, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { TripCtx } from './TripPage';
import { isNativeApp, PUBLIC_SITE, shareLink, confirmAction } from '../../lib/native';

/**
 * Trip "People" tab (Figma "Trip — People"): the travellers as a List group, then the invite card. There are two roles,
 * Planner and Viewer; any Planner taps someone to change their role or remove them. Whoever created the trip is a
 * Planner like everyone else (no rank shown); they're just the one who can delete it, and leaving hands it on.
 */
const ROLE_HELP = {
  viewer: 'Sees the whole trip and can chat, but can’t add or change anything.',
  planner: 'Plans everything: edits the trip and its events, ideas and photos, invites people and changes their roles.',
} as const;

export function People({ trip, profiles, canManage, isOwner }: TripCtx) {
  const me = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // "Add people" makes a fresh link and opens the share sheet straight away (or copies it where there's no share sheet).
  // The link itself is never shown on the page: it's long, and the share sheet is where it's used.
  const makeLink = async () => {
    setBusy(true);
    try {
      const code = await store.createInvite(trip);
      // Inside the iPhone app the page address is capacitor://localhost, which nobody else can open, so invite links
      // point at the public site; in a browser they point at wherever this copy of the site is running.
      const url = `${isNativeApp ? PUBLIC_SITE : location.origin + location.pathname}#/join/${code}`;
      return url;
    } finally {
      setBusy(false);
    }
  };
  const share = async (url: string) => {
    if (await shareLink({ title: `Join ${trip.name}`, text: `Join our trip "${trip.name}" on Rove`, url })) return;
    try { await navigator.clipboard.writeText(url); toast({ icon: 'copy', label: 'Invite link copied' }); } catch { toast({ tone: 'error', label: "Couldn't share the link. Try again" }); }
  };
  const invite = async () => {
    const url = await makeLink();
    await share(url);
  };

  const members = trip.memberIds.slice().sort((a, b) => (trip.roles[a] === 'owner' ? -1 : trip.roles[b] === 'owner' ? 1 : 0));
  const roleName = (id: string) => (trip.roles[id] === 'viewer' ? 'Viewer' : 'Planner');
  const [person, setPerson] = useState<string | null>(null);
  const [role, setRoleDraft] = useState<'planner' | 'viewer'>('planner');
  const open = (id: string) => { setRoleDraft(trip.roles[id] === 'viewer' ? 'viewer' : 'planner'); setPerson(id); };
  const saveRole = async () => {
    if (!person) return;
    const was = trip.roles[person] === 'viewer' ? 'viewer' : 'planner';
    if (was === role) { setPerson(null); return; }
    try { await store.setRole(trip, person, role === 'viewer' ? 'viewer' : 'editor'); toast({ icon: 'check', label: 'Role updated' }); setPerson(null); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };

  const removePerson = async () => {
    if (!person) return;
    const name = personName(profiles, person);
    if (!confirmAction(`Remove ${name} from this trip?`)) return;
    try { await store.removeMember(trip, person); toast({ icon: 'trash', label: `${name} removed` }); setPerson(null); }
    catch { toast({ tone: 'error', label: "Couldn't remove. Check your connection" }); }
  };

  return (
    <>
      <SectionHeader title="Travellers"
        action={canManage ? <Button size="regular" icon="user-add" onClick={invite} disabled={busy}>Add people</Button> : undefined} />
      <ListGroup label="Travellers">
        {members.map((id) => {
          const name = personName(profiles, id);
          // Any Planner changes anyone's role, except their own and the trip creator's (the trip always keeps them)
          const editable = canManage && id !== me.uid && id !== trip.ownerId;
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
        </Card>
      )}

      {/* Deleting the trip lives in Edit trip (its creator only); here anyone can leave, while someone else is on it */}
      {members.length > 1 && (
        <Button variant="destructive" icon="signout" onClick={async () => {
          if (!confirmAction(isOwner ? `Leave "${trip.name}"? It stays with everyone else.` : `Leave "${trip.name}"?`)) return;
          await store.leaveTrip(trip.id, me.uid);
          navigate('/');
        }}>Leave trip</Button>
      )}

      <Sheet open={!!person} mode="edit" title={person ? personName(profiles, person) : ''} subtitle="What they can do on this trip" onClose={() => setPerson(null)} onSubmit={saveRole} submitLabel="Save"
        secondary={person ? <Button variant="destructive" size="large" onClick={removePerson}>Remove</Button> : undefined}>
        <SegmentControl label="Role" block value={role} onChange={setRoleDraft} options={[{ value: 'viewer', label: 'Viewer' }, { value: 'planner', label: 'Planner' }]} />
        <p className="t-body-small t-secondary">{ROLE_HELP[role]}</p>
      </Sheet>
    </>
  );
}
