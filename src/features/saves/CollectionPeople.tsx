import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, ListGroup, ListItem, SegmentControl, Sheet, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { CollectionRole, CollectionShare, Profile } from '../../data/types';
import { countryName } from '../../lib/countries';
import { confirmAction, haptic, isNativeApp, PUBLIC_SITE, shareLink } from '../../lib/native';
import s from './saves.module.css';

/** What each collection role can do, in a line */
export const COLLECTION_ROLE_HELP: Record<CollectionRole, string> = {
  member: 'Can see every place, add places, move them to another city, change their category and star them. Only whoever saved a place can delete it.',
  viewer: 'Can see every place, star them and open them in Maps, but can’t add or change anything.',
};
/** Collections have two roles, shown as what they let you do (stored as 'member' and 'viewer') */
export const collectionRoleName = (r: CollectionRole | 'owner') => (r === 'owner' ? 'Owner' : r === 'member' ? 'Can edit' : 'Can view');
const roleName = collectionRoleName;

/** "you", "you and Sam", "Alex and you", "you, Sam and Ana", "you and 3 others": who a collection is with, its owner first. */
export function savedBy(ids: string[], me: string, profiles: Record<string, Profile>) {
  const names = ids.map((id) => (id === me ? 'you' : personName(profiles, id).split(' ')[0]));
  if (names.length <= 1) return names[0] ?? 'you';
  if (names.length > 3) return `${names[0]} and ${names.length - 1} others`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * A collection's people (the country page's people button): everyone in it with their role. The owner invites people
 * by link as a Member or a Viewer, and taps someone to change their role or remove them; anyone else can leave.
 */
export function CollectionPeople({ open, onClose, code, share, profiles }: {
  open: boolean; onClose: () => void; code: string; share: CollectionShare | undefined; profiles: Record<string, Profile>;
}) {
  const me = useMe();
  const toast = useToast();
  const navigate = useNavigate();
  const owner = share ? share.ownerId === me.uid : true;
  const [as, setAs] = useState<CollectionRole>('member');
  const [busy, setBusy] = useState(false);
  const [person, setPerson] = useState<string | null>(null);
  const [role, setRole] = useState<CollectionRole>('member');
  const country = countryName(code);
  const ownerName = share && !owner ? personName(profiles, share.ownerId).split(' ')[0] : '';

  const invite = async () => {
    setBusy(true);
    try {
      const sh = share ?? await store.shareCollection(code);
      const first = (me.name || 'My').split(' ')[0];
      const codeId = await store.createCollectionInvite(sh, as, `${first}'s ${country} collection`);
      // Inside the iPhone app the page address is capacitor://localhost, which nobody else can open
      const url = `${isNativeApp ? PUBLIC_SITE : location.origin + location.pathname}#/join/${codeId}?to=collection`;
      const text = `See my ${country} places on Rove`;
      if (!(await shareLink({ title: `${first}'s ${country} collection`, text, url }))) {
        await navigator.clipboard.writeText(url);
        toast({ icon: 'copy', label: 'Invite link copied' });
      }
    } catch { toast({ tone: 'error', label: "Couldn't make the link. Check your connection" }); }
    finally { setBusy(false); }
  };

  const saveRole = async () => {
    if (!share || !person) return;
    try { await store.setShareRole(share, person, role); toast({ icon: 'check', label: 'Role updated' }); setPerson(null); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  const remove = async () => {
    if (!share || !person) return;
    const name = personName(profiles, person);
    if (!confirmAction(`Remove ${name} from your ${country} collection?`)) return;
    try { await store.setShareRole(share, person, null); toast({ icon: 'trash', label: `${name} removed` }); setPerson(null); }
    catch { toast({ tone: 'error', label: "Couldn't remove. Check your connection" }); }
  };
  const leave = async () => {
    if (!share || !confirmAction(`Leave ${ownerName}'s ${country} collection? Places you added stay yours.`)) return;
    try { await store.setShareRole(share, me.uid, null); toast({ icon: 'signout', label: 'You left the collection' }); onClose(); navigate('/trips'); }
    catch { toast({ tone: 'error', label: "Couldn't leave. Check your connection" }); }
  };

  const people: { id: string; role: CollectionRole | 'owner' }[] = [
    { id: share?.ownerId ?? me.uid, role: 'owner' },
    ...(share?.memberIds ?? []).map((id) => ({ id, role: share!.roles[id] ?? 'viewer' })),
  ];

  return (
    <>
      <Sheet open={open && !person} title="People" subtitle={owner ? `Who sees your ${country} collection` : `${ownerName}'s ${country} collection`} onClose={onClose}
        onSubmit={owner ? invite : undefined} submitLabel="Share invite link" submitDisabled={busy}
        secondary={!owner ? <Button variant="destructive" size="large" icon="signout" onClick={leave}>Leave</Button> : undefined}>
        <div className={s.sections}>
          <ListGroup label="People in this collection">
            {people.map(({ id, role: r }) => {
              const name = id === me.uid ? (me.name || 'You') : personName(profiles, id);
              const editable = owner && r !== 'owner';
              return (
                <ListItem key={id} media={<Avatar name={name} photo={id === me.uid ? me.photo : profiles[id]?.photo} size={40} />} round
                  title={name} meta={`${roleName(r)}${id === me.uid ? ' · you' : ''}`}
                  onClick={editable ? () => { haptic('selection'); setRole(r as CollectionRole); setPerson(id); } : undefined}
                  label={editable ? `${name}, ${roleName(r)}: change role` : undefined} />
              );
            })}
          </ListGroup>
          {owner && (
            <section className={s.field} aria-labelledby="invite-as">
              <h3 className="t-heading-4" id="invite-as">People you invite</h3>
              <SegmentControl label="People you invite" block value={as} onChange={setAs} options={[{ value: 'viewer', label: 'Can view' }, { value: 'member', label: 'Can edit' }]} />
              <p className="t-body-small t-secondary">{`${COLLECTION_ROLE_HELP[as]} Anyone with the link can join for the next 14 days.`}</p>
            </section>
          )}
        </div>
      </Sheet>
      <Sheet open={open && !!person} mode="edit" title={person ? personName(profiles, person) : ''} subtitle={`What they can do in your ${country} collection`}
        onClose={() => setPerson(null)} onSubmit={saveRole} submitLabel="Save"
        secondary={<Button variant="destructive" size="large" onClick={remove}>Remove</Button>}>
        <SegmentControl label="Role" block value={role} onChange={setRole} options={[{ value: 'viewer', label: 'Can view' }, { value: 'member', label: 'Can edit' }]} />
        <p className="t-body-small t-secondary">{COLLECTION_ROLE_HELP[role]}</p>
      </Sheet>
    </>
  );
}
