import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, ContextMenu, Illustration, ListGroup, ListItem, OptionCard, SectionHeader, Sheet, useToast, type ContextMenuItem } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { TripCtx } from './TripPage';
import type { Role } from '../../data/types';
import { isTravelling, peopleInOrder, roleOf } from '../../data/roles';
import { haptic, isNativeApp, PUBLIC_SITE, shareLink, confirmAction } from '../../lib/native';

/**
 * Trip "People" tab (Figma Screens → "People & sharing — draft" → Trip · People): everyone on the trip as one List
 * group, travellers first, then followers. Everyone is equal: there's no owner. Each row has a role dropdown (a Ghost
 * Button, List item "Show Button") that opens a Context menu: Travelling, Following, and Remove from trip (your own
 * row: Leave trip). Followers see roles as plain text and leave with the button at the end.
 * Add people opens a sheet: Travelling or Following first, then a link carrying that role goes to the share sheet.
 */
export const ROLE_HELP: Record<Role, string> = {
  traveller: 'On the trip. Plans with everyone and has their own bookings and budget.',
  follower: 'Not on the trip, like family at home. Sees the plan and chats, but never prices or bookings, and can’t change anything.',
};
export const ROLE_NAME: Record<Role, string> = { traveller: 'Travelling', follower: 'Following' };

export function People({ trip, profiles, isTraveller }: TripCtx) {
  const me = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [as, setAs] = useState<Role>('traveller');
  const [menu, setMenu] = useState<string | null>(null);

  // The link itself is never shown: it's long, and the share sheet is where it's used. Inside the iPhone app the page
  // address is capacitor://localhost, which nobody else can open, so links point at the public site.
  const share = async () => {
    setBusy(true);
    try {
      const code = await store.createInvite(trip, as);
      const url = `${isNativeApp ? PUBLIC_SITE : location.origin + location.pathname}#/join/${code}`;
      setAdding(false);
      const text = as === 'follower' ? `Follow ${trip.name} in Rove` : `Join us on ${trip.name} in Rove`;
      if (await shareLink({ title: `Join ${trip.name}`, text, url })) return;
      try { await navigator.clipboard.writeText(url); toast({ icon: 'copy', label: 'Link to join copied' }); } catch { toast({ tone: 'danger', label: "Couldn't share the link. Try again" }); }
    } catch {
      toast({ tone: 'danger', label: "Couldn't make a link. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  const members = peopleInOrder(trip);
  const roleName = (id: string) => ROLE_NAME[roleOf(trip, id) ?? 'follower'];
  const travellers = members.filter((id) => isTravelling(trip, id));

  const setRole = async (id: string, role: Role) => {
    const was = roleOf(trip, id);
    if (!was || was === role) return;
    // There's always someone travelling: they're the ones who can change things
    if (role === 'follower' && travellers.length === 1 && travellers[0] === id) {
      toast({ label: 'Someone has to be travelling. Make someone else Travelling first' });
      return;
    }
    const name = id === me.uid ? 'You' : personName(profiles, id).split(' ')[0];
    try {
      await store.setRole(trip, id, role);
      if (id !== me.uid) store.addNotices(trip.id, [{ kind: 'role', to: [id], role }]).catch(() => {});
      haptic('selection');
      toast({ icon: 'check', label: `${name} ${id === me.uid ? 'are' : 'is'} ${ROLE_NAME[role].toLowerCase()}`, action: { label: 'Undo', onClick: () => { store.setRole(trip, id, was).catch(() => {}); } } });
    } catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };

  const remove = async (id: string) => {
    const name = personName(profiles, id);
    if (!confirmAction(`Remove ${name} from "${trip.name}"?`)) return;
    try { await store.removeMember(trip, id); toast({ icon: 'trash', label: `${name} removed` }); }
    catch { toast({ tone: 'danger', label: "Couldn't remove. Check your connection" }); }
  };

  // Anyone can leave. The last traveller leaving deletes the trip, into Recently deleted like Delete trip
  const leave = async () => {
    const last = isTraveller && !members.some((id) => id !== me.uid && isTravelling(trip, id));
    if (!confirmAction(last
      ? `You're the only one travelling, so leaving deletes "${trip.name}"${members.length > 1 ? ' for everyone' : ''}. You can bring it back from Recently deleted for 30 days.`
      : `Leave "${trip.name}"? It stays with everyone else.`)) return;
    try { await store.leaveTrip(trip.id, me.uid); navigate('/'); }
    catch { toast({ tone: 'danger', label: "Couldn't leave. Check your connection" }); }
  };

  const menuItems = (id: string): ContextMenuItem[] => {
    const current = roleOf(trip, id);
    return [
      { label: 'Travelling', icon: current === 'traveller' ? 'check' : 'plane', onClick: () => setRole(id, 'traveller') },
      { label: 'Following', icon: current === 'follower' ? 'check' : 'home', onClick: () => setRole(id, 'follower') },
      id === me.uid
        ? { label: 'Leave trip', icon: 'sign-out', tone: 'danger', onClick: leave }
        : { label: 'Remove from trip', icon: 'trash', tone: 'danger', onClick: () => remove(id) },
    ];
  };

  return (
    <>
      <SectionHeader title="People"
        action={isTraveller ? <Button size="small" icon="user-add" onClick={() => { setAs('traveller'); setAdding(true); }}>Add people</Button> : undefined} />
      <ListGroup label="People">
        {members.map((id) => {
          const name = personName(profiles, id);
          const dropdown = (
            <Button tone="ghost" size="small" iconEnd="chevron-down" aria-haspopup="menu" aria-expanded={menu === id}
              aria-label={`${id === me.uid ? 'Your' : `${name}'s`} role: ${roleName(id)}`} onClick={() => { haptic('light'); setMenu(id); }}>
              {roleName(id)}
            </Button>
          );
          return (
            <ListItem key={id} media={<Avatar name={name} photo={profiles[id]?.photo} size="large" />} round
              title={name} meta={id === me.uid ? 'You' : undefined}
              trailing={isTraveller ? undefined : roleName(id)}
              action={isTraveller ? (menu === id
                ? <ContextMenu label={`${name}'s role`} align="end" onClose={() => setMenu(null)} items={menuItems(id)}>{dropdown}</ContextMenu>
                : dropdown) : undefined} />
          );
        })}
      </ListGroup>

      {isTraveller && (
        <Card media={<Illustration name="friends" size={120} />}>
          <h2 className="t-heading-2">The more the merrier</h2>
          <p className="t-body-small t-secondary">Add people makes a link to join as Travelling or Following. Anyone with it can join for the next 14 days after signing in.</p>
        </Card>
      )}

      {/* Travellers leave from their own row's menu; followers have no menu, so they get the button */}
      {!isTraveller && <Button tone="destructive" icon="sign-out" onClick={leave}>Leave trip</Button>}

      <Sheet open={adding} title="Add people" subtitle={`How will they join ${trip.name}?`} onClose={() => setAdding(false)}
        onSubmit={share} submitLabel="Share link" submitDisabled={busy}>
        {(['traveller', 'follower'] as const).map((r) => (
          <OptionCard key={r} icon={r === 'traveller' ? 'plane' : 'home'} label={ROLE_NAME[r]} description={ROLE_HELP[r]}
            selected={as === r} onClick={() => { haptic('light'); setAs(r); }} />
        ))}
      </Sheet>
    </>
  );
}
