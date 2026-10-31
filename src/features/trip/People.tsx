import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Illustration, List, ListRow, Section, Select } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

export function People({ trip, profiles, canManage, isOwner }: TripCtx) {
  const me = useMe();
  const navigate = useNavigate();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // "Invite to trip" makes a link and opens the share sheet straight away (or copies it where there's no share sheet).
  const makeLink = async () => {
    setBusy(true);
    try {
      const code = await store.createInvite(trip);
      const url = `${location.origin}${location.pathname}#/join/${code}`;
      setLink(url);
      setCopied(false);
      return url;
    } finally {
      setBusy(false);
    }
  };
  const share = async (url = link) => {
    if (navigator.share) {
      try { await navigator.share({ title: `Join ${trip.name}`, text: `Join our trip "${trip.name}" on Trip Hub`, url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* the link is on screen to copy by hand */ }
  };
  const invite = async () => {
    const url = await makeLink();
    await share(url);
  };

  const members = trip.memberIds.slice().sort((a, b) => (trip.roles[a] === 'owner' ? -1 : trip.roles[b] === 'owner' ? 1 : 0));

  return (
    <>
      <Section title={`Travelers (${members.length})`}>
        <List>
          {members.map((id) => {
            const role = trip.roles[id] ?? 'member';
            const name = personName(profiles, id);
            const editable = isOwner && id !== me.uid;
            return (
              <ListRow key={id}
                leading={<Avatar name={name} photo={profiles[id]?.photo} seed={id} size={36} />}
                title={<>{name}{id === me.uid && <span className="t-secondary"> (you)</span>}</>}
                trailing={
                  editable ? (
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Select compact aria-label={`Role for ${name}`} value={role} onChange={(e) => store.setRole(trip, id, e.target.value as 'editor' | 'member')}>
                        <option value="member">Member</option>
                        <option value="editor">Organizer</option>
                      </Select>
                      <Button size="regular" variant="destructive" onClick={() => confirm(`Remove ${name} from this trip?`) && store.removeMember(trip, id)}>Remove</Button>
                    </span>
                  ) : (
                    <Badge tone={role === 'owner' ? 'tint' : role === 'editor' ? 'success' : 'neutral'}>{role === 'owner' ? 'Owner' : role === 'editor' ? 'Organizer' : 'Member'}</Badge>
                  )
                }
              />
            );
          })}
        </List>
      </Section>

      {canManage && (
        <Card media={<Illustration name="people" size={120} />}>
          <h2 className="t-heading-4">The more the merrier</h2>
          <p className="t-body-small t-secondary">Invite friends to plan this trip with you. Anyone with the link can join for the next 14 days after signing in.</p>
          <div className={s.inviteActions}>
            {link ? (
              <>
                <div className={s.inviteRow}>
                  <div className={s.inviteUrl} title={link}>{link}</div>
                  <Button icon={copied ? 'check' : 'share'} onClick={() => share()}>{copied ? 'Copied' : 'Share'}</Button>
                </div>
                <Button variant="ghost" size="small" onClick={makeLink} disabled={busy}>Make a new link</Button>
              </>
            ) : (
              <Button icon="plus" onClick={invite} disabled={busy}>Invite to trip</Button>
            )}
          </div>
        </Card>
      )}

      {/* Deleting the trip lives in Edit trip; here members other than the owner can leave. */}
      {!isOwner && (
        <Section title="Trip">
          <div className={s.dangerZone}>
            <Button variant="destructive" icon="signout" onClick={async () => {
              if (!confirm(`Leave "${trip.name}"?`)) return;
              await store.leaveTrip(trip.id, me.uid);
              navigate('/');
            }}>Leave trip</Button>
          </div>
        </Section>
      )}
    </>
  );
}
