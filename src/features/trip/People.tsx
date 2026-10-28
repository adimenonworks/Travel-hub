import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, List, ListRow, Section, Select } from '../../design/components';
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

  const makeLink = async () => {
    setBusy(true);
    try {
      const code = await store.createInvite(trip);
      const url = `${location.origin}${location.pathname}#/join/${code}`;
      setLink(url);
      setCopied(false);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `Join ${trip.name}`, text: `Join our trip "${trip.name}" on Trip Hub`, url: link }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
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
                      <Select aria-label={`Role for ${name}`} value={role} onChange={(e) => store.setRole(trip, id, e.target.value as 'editor' | 'member')}>
                        <option value="member">Member</option>
                        <option value="editor">Organizer</option>
                      </Select>
                      <Button size="small" variant="destructive" onClick={() => confirm(`Remove ${name} from this trip?`) && store.removeMember(trip, id)}>Remove</Button>
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
        <Section title="Invite people" footer="Anyone with the link can join for the next 14 days after signing in. Generate a new link at any time.">
          <Card className={s.invite}>
            {link ? (
              <>
                <div className={s.inviteRow}>
                  <div className={s.inviteUrl} title={link}>{link}</div>
                  <Button icon={copied ? 'check' : 'share'} onClick={share}>{copied ? 'Copied' : 'Share'}</Button>
                </div>
                <Button variant="plain" size="small" onClick={makeLink} disabled={busy}>Generate a new link</Button>
              </>
            ) : (
              <Button icon="link" onClick={makeLink} disabled={busy}>Create invite link</Button>
            )}
          </Card>
        </Section>
      )}

      <Section title="Trip">
        <div className={s.dangerZone}>
          {isOwner ? (
            <Button variant="destructive" icon="trash" onClick={async () => {
              if (!confirm(`Delete "${trip.name}" for everyone? This can't be undone.`)) return;
              await store.deleteTrip(trip.id);
              navigate('/');
            }}>Delete trip</Button>
          ) : (
            <Button variant="destructive" icon="signout" onClick={async () => {
              if (!confirm(`Leave "${trip.name}"?`)) return;
              await store.leaveTrip(trip.id, me.uid);
              navigate('/');
            }}>Leave trip</Button>
          )}
        </div>
      </Section>
    </>
  );
}
