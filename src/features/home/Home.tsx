import { Button, Card, Illustration, LinkButton, PageHeader, PageSection, PageSkeleton, QuickAction } from '../../design/components';
import { useMe, useMyTrips, useProfile } from '../../data/hooks';
import { featuredTrip } from '../../lib/trips';
import { Content, useNewTrip } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import s from './Home.module.css';

/**
 * Home (Figma "Home — v2"): what's happening now. The greeting, your trip as the phase-aware Hero Card (before: the
 * countdown and the next thing planned; during: today's next event; after: add photos), then quick actions.
 * Saving places ("Saved for later", "Recently saved", Save a link, Add a place) arrives with the saves feature.
 */
export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const name = profile?.name || me.name;
  const featured = featuredTrip(trips);
  const newTrip = useNewTrip();

  return (
    <Content>
      <PageHeader title={`Hi, ${name.split(' ')[0]}`} fit />
      {trips === null ? <PageSkeleton bare /> : featured ? (
        <PageSection title="Upcoming trip" action={<LinkButton to="/trips" variant="ghost" size="regular" iconEnd="chevron-right">All trips</LinkButton>}>
          <TripHero trip={featured} />
        </PageSection>
      ) : (
        <Card media={<Illustration name="suitcase" size={120} />} title="Where to next?"
          body="Plan a trip: pick where you’re going and when, then invite the people coming with you."
          actions={<Button block icon="plus" onClick={newTrip}>Plan a new trip</Button>} />
      )}
      <nav className={s.quickActions} aria-label="Quick actions">
        <QuickAction icon="calendar" label="Plan a trip" onClick={newTrip} />
        {featured && <QuickAction icon="people" label="Invite" to={`/trip/${featured.id}/people`} />}
      </nav>
    </Content>
  );
}
