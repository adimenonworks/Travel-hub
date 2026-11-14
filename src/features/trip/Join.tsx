import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, LinkButton, PageSkeleton, Illustration } from '../../design/components';
import { store } from '../../data';
import { useMe, useMyTrips, useShares } from '../../data/hooks';
import type { Invite } from '../../data/types';
import { Content } from '../../app/Shell';
import { joinOnly } from '../../lib/site';

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
  // On the join-only website, joining ends on "You're in!" with Open in Rove (the app opens this invite again and goes straight in)
  const done = (label: string) => joinOnly() ? `/get?${new URLSearchParams({ path: `/join/${code}`, joined: label })}` : destination;
  useEffect(() => {
    if (alreadyIn && invite) navigate(done(invite.tripName), { replace: true });
  }, [alreadyIn, invite, destination, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  if (invite === undefined || trips === null || shares === null) return <PageSkeleton />;

  const expired = invite && invite.expiresAt < Date.now();
  if (!invite || expired)
    return (
      <Content>
        <Card>
          <Card layout="centre" media={<Illustration name="ticket" size={120} />} title={expired ? 'This invite has expired' : 'Invite not found'} body={invite?.kind === 'collection' ? 'Ask whoever shared it for a new link.' : 'Ask the trip organizer for a new link.'}
            actions={<LinkButton to="/" tone="neutral">{joinOnly() ? 'Get Rove' : 'Go to my trips'}</LinkButton>} />
        </Card>
      </Content>
    );

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      await store.redeemInvite(invite);
      navigate(done(invite.tripName), { replace: true });
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
          <Card layout="centre" media={<Illustration name="map" size={120} />} title={`Join “${invite.tripName}”`}
            body={invite.role === 'member' ? 'You can see every place, add your own, move them and star them.' : 'You can see every place, star them and open them in Maps.'}
            actions={<Button size="large" onClick={join} disabled={busy}>Join collection</Button>} />
        ) : (
          <Card layout="centre" media={<Illustration name="suitcase" size={120} />} title={`Join “${invite.tripName}”`} body="You've been invited to plan this trip together."
            actions={<Button size="large" onClick={join} disabled={busy}>Join trip</Button>} />
        )}
        {error && <p className="t-label-small t-danger" style={{ textAlign: 'center' }}>{error}</p>}
      </Card>
    </Content>
  );
}
