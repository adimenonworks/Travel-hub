import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, LinkButton, Spinner } from '../../design/components';
import { store } from '../../data';
import { useMyTrips } from '../../data/hooks';
import type { Invite } from '../../data/types';
import { Content } from '../../app/Shell';

export function Join() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const trips = useMyTrips();
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    store.getInvite(code).then(setInvite).catch(() => setInvite(null));
  }, [code]);

  const alreadyIn = invite && trips?.some((t) => t.id === invite.tripId);
  useEffect(() => {
    if (alreadyIn && invite) navigate(`/trip/${invite.tripId}`, { replace: true });
  }, [alreadyIn, invite, navigate]);

  if (invite === undefined || trips === null) return <Spinner center />;

  const expired = invite && invite.expiresAt < Date.now();
  if (!invite || expired)
    return (
      <Content>
        <Card>
          <EmptyState illustration="ticket" title={expired ? 'This invite has expired' : 'Invite not found'} message="Ask the trip organizer for a new link."
            action={<LinkButton to="/" variant="secondary">Go to my trips</LinkButton>} />
        </Card>
      </Content>
    );

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      await store.redeemInvite(invite);
      navigate(`/trip/${invite.tripId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join this trip');
      setBusy(false);
    }
  };

  return (
    <Content>
      <div />
      <Card>
        <EmptyState illustration="suitcase" title={`Join “${invite.tripName}”`} message="You've been invited to plan this trip together."
          action={<Button size="regular" onClick={join} disabled={busy}>Join trip</Button>} />
        {error && <p className="t-label-small t-danger" style={{ textAlign: 'center' }}>{error}</p>}
      </Card>
    </Content>
  );
}
