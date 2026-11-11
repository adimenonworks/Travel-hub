import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, LinkButton, PageSkeleton } from '../../design/components';
import { store } from '../../data';
import { useMe, useMyTrips, useShares } from '../../data/hooks';
import type { Invite } from '../../data/types';
import { Content } from '../../app/Shell';

export function Join() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const trips = useMyTrips();
  const me = useMe();
  const shares = useShares();
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    store.getInvite(code).then(setInvite).catch(() => setInvite(null));
  }, [code]);

  // A collection invite (someone's saved places in a country) or a trip invite
  const isCollection = invite?.kind === 'collection';
  const own = !!invite?.shareId?.startsWith(`${me.uid}_`);
  const destination = invite ? (isCollection ? (own ? `/saved/${invite.countryCode}` : `/saved/${invite.countryCode}/${invite.shareId}`) : `/trip/${invite.tripId}`) : '/';
  const alreadyIn = !!invite && (isCollection ? own || !!shares?.some((x) => x.id === invite.shareId) : !!trips?.some((t) => t.id === invite.tripId));
  useEffect(() => {
    if (alreadyIn) navigate(destination, { replace: true });
  }, [alreadyIn, destination, navigate]);

  if (invite === undefined || trips === null || shares === null) return <PageSkeleton />;

  const expired = invite && invite.expiresAt < Date.now();
  if (!invite || expired)
    return (
      <Content>
        <Card>
          <EmptyState illustration="ticket" title={expired ? 'This invite has expired' : 'Invite not found'} message={invite?.kind === 'collection' ? 'Ask whoever shared it for a new link.' : 'Ask the trip organizer for a new link.'}
            action={<LinkButton to="/" variant="neutral">Go to my trips</LinkButton>} />
        </Card>
      </Content>
    );

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      await store.redeemInvite(invite);
      navigate(destination, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : isCollection ? 'Could not join this collection' : 'Could not join this trip');
      setBusy(false);
    }
  };

  return (
    <Content>
      <div />
      <Card>
        {isCollection ? (
          <EmptyState illustration="map" title={`Join “${invite.tripName}”`}
            message={invite.role === 'member' ? "You've been invited as a Member: see every place, add your own, move them and star them." : "You've been invited as a Viewer: see every place, star them and open them in Maps."}
            action={<Button size="large" onClick={join} disabled={busy}>Join collection</Button>} />
        ) : (
          <EmptyState illustration="suitcase" title={`Join “${invite.tripName}”`} message="You've been invited to plan this trip together."
            action={<Button size="large" onClick={join} disabled={busy}>Join trip</Button>} />
        )}
        {error && <p className="t-label-small t-danger" style={{ textAlign: 'center' }}>{error}</p>}
      </Card>
    </Content>
  );
}
