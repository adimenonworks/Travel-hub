import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, Illustration, ListGroup, ListItem, SectionHeader, SegmentControl, Sheet, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { TripCtx } from './TripPage';
import type { Role } from '../../data/types';
import { isTravelling, peopleInOrder, roleOf } from '../../data/roles';
import { isNativeApp, PUBLIC_SITE, shareLink, confirmAction } from '../../lib/native';

/**
 * Trip "People" tab (Figma "Trip — People"): everyone on the trip as one List group (travellers first, then followers),
 * then the invite card. Everyone is equal: there's no owner. Two roles, Travelling and Following; any traveller taps
 * someone to change their role or remove them, and anyone can leave (the last traveller leaving deletes the trip).
 */
const ROLE_HELP: Record<Role, string> = {
  traveller: 'On the trip. Plans with everyone and has their own bookings and budget.',
  follower: 'Not on the trip, like family at home. Sees the plan and chats, but never prices or bookings, and can’t change anything.',
};
const ROLE_NAME: Record<Role, string> = { traveller: 'Travelling', follower: 'Following' };

export function People({ trip, profiles, isTraveller }: TripCtx) {
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
    if (await shareLink({ title: `Join ${trip.name}`, text: `Join us on ${trip.name} in Rove`, url })) return;
    try { await navigator.clipboard.writeText(url); toast({ icon: 'copy', label: 'Link to join copied' }); } catch { toast({ tone: 'danger', label: "Couldn't share the link. Try again" }); }
  };
  const invite = async () => {
    const url = await makeLink();
    await share(url);
  };

  const members = peopleInOrder(trip);
  const roleName = (id: string) => ROLE_NAME[roleOf(trip, id) ?? 'follower'];
  const [person, setPerson] = useState<string | null>(null);
  const [role, setRoleDraft] = useState<Role>('traveller');
  const open = (id: string) => { setRoleDraft(roleOf(trip, id) ?? 'follower'); setPerson(id); };
  const saveRole = async () => {
    if (!person) return;
    if (roleOf(trip, person) === role) { setPerson(null); return; }
    try { await store.setRole(trip, person, role); toast({ icon: 'check', label: 'Role updated' }); setPerson(null); }
    catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };

  const removePerson = async () => {
    if (!person) return;
    const name = personName(profiles, person);
    if (!confirmAction(`Remove ${name} from this trip?`)) return;
    try { await store.removeMember(trip, person); toast({ icon: 'trash', label: `${name} removed` }); setPerson(null); }
    catch { toast({ tone: 'danger', label: "Couldn't remove. Check your connection" }); }
  };

  return (
    <>
      <SectionHeader title="People"
        action={isTraveller ? <Button size="small" icon="user-add" onClick={invite} disabled={busy}>Add people</Button> : undefined} />
      <ListGroup label="People">
        {members.map((id) => {
          const name = personName(profiles, id);
          // Any traveller changes anyone else's role or removes them (your own row: Leave trip, below)
          const editable = isTraveller && id !== me.uid;
          return (
            <ListItem key={id} media={<Avatar name={name} photo={profiles[id]?.photo} size="large" />} round
              title={name} meta={`${roleName(id)}${id === me.uid ? ' · you' : ''}`}
              onClick={editable ? () => open(id) : undefined} label={editable ? `${name}, ${roleName(id)}: change role` : undefined} />
          );
        })}
      </ListGroup>

      {isTraveller && (
        <Card media={<Illustration name="friends" size={120} />}>
          <h2 className="t-heading-2">The more the merrier</h2>
          <p className="t-body-small t-secondary">Tap Add people to get a link for friends to plan this trip with you. Anyone with the link can join for the next 14 days after signing in.</p>
        </Card>
      )}

      {/* Anyone can leave. The last traveller leaving deletes the trip, into Recently deleted like Delete trip */}
      <Button tone="destructive" icon="sign-out" onClick={async () => {
        const last = isTraveller && !members.some((id) => id !== me.uid && isTravelling(trip, id));
        if (!confirmAction(last
          ? `You're the only one travelling, so leaving deletes "${trip.name}"${members.length > 1 ? ' for everyone' : ''}. You can bring it back from Recently deleted for 30 days.`
          : `Leave "${trip.name}"? It stays with everyone else.`)) return;
        try { await store.leaveTrip(trip.id, me.uid); navigate('/'); }
        catch { toast({ tone: 'danger', label: "Couldn't leave. Check your connection" }); }
      }}>Leave trip</Button>

      <Sheet open={!!person} mode="edit" title={person ? personName(profiles, person) : ''} subtitle="Their role on this trip" onClose={() => setPerson(null)} onSubmit={saveRole} submitLabel="Save"
        secondary={person ? <Button tone="destructive" size="large" onClick={removePerson}>Remove from trip</Button> : undefined}>
        <SegmentControl label="Role" block value={role} onChange={setRoleDraft} options={[{ value: 'traveller', label: 'Travelling' }, { value: 'follower', label: 'Following' }]} />
        <p className="t-body-small t-secondary">{ROLE_HELP[role]}</p>
      </Sheet>
    </>
  );
}
