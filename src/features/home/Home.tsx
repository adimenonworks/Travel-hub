import { Button, Card, Illustration, LinkButton, ListGroup, ListItem, PageHeader, PageSection, PageSkeleton, QuickAction } from '../../design/components';
import { useMe, useMyTrips, useProfile, useProfiles, useSubFor } from '../../data/hooks';
import type { Idea } from '../../data/types';
import { categoryInfo } from '../../lib/categories';
import { featuredTrip } from '../../lib/trips';
import { savedPlaces } from '../../lib/saves';
import { Content, useNewTrip, useSave } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import { saveMeta } from '../saves/SavedPlace';
import { PlaceTile } from './Trips';
import s from './Home.module.css';
import ss from '../saves/saves.module.css';

/** "2h", "Yesterday", "Mon", "3 Oct": how long ago something was saved. */
function ago(ms: number) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return mins <= 1 ? 'Now' : `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  const d = new Date(ms);
  if (h < 48) return 'Yesterday';
  return h < 24 * 7 ? d.toLocaleDateString(undefined, { weekday: 'short' }) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Home (Figma "Home — v2"): what's happening now. The greeting, your trip as the phase-aware Hero Card, quick actions
 * (Save a link, Add a place, Plan a trip, Invite), "Saved for later" (your saved places as Tiles) and "Recently saved".
 */
export function Home() {
  const me = useMe();
  const trips = useMyTrips();
  const profile = useProfile(me.uid);
  const name = profile?.name || me.name;
  const featured = featuredTrip(trips);
  const newTrip = useNewTrip();
  const openSave = useSave();
  const places = savedPlaces(trips).sort((a, b) => a.createdAt - b.createdAt);
  // Saves live in saved places and in trips' Ideas; Recently saved shows the newest that came from a link or place search.
  const ideasBy = useSubFor((trips ?? []).map((t) => t.id), 'ideas');
  const recent = Object.entries(ideasBy).flatMap(([tripId, list]) => list.filter((i) => i.url || i.place).map((i) => ({ i, tripId })))
    .sort((a, b) => b.i.createdAt - a.i.createdAt).slice(0, 3);
  const profiles = useProfiles([...new Set(recent.flatMap(({ i }) => i.savedBy ?? [i.createdBy]))]);
  const total = places.reduce((n, t) => n + (ideasBy[t.id]?.filter((i) => i.status !== 'rejected').length ?? 0), 0);
  const where = (tripId: string) => {
    const t = trips?.find((x) => x.id === tripId);
    return t?.status === 'saved' ? `/trip/${tripId}` : `/trip/${tripId}/ideas`;
  };

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
          actions={<Button block icon="plus" onClick={() => newTrip()}>Plan a new trip</Button>} />
      )}
      <nav className={s.quickActions} aria-label="Quick actions">
        <QuickAction icon="link" label="Save a link" onClick={() => openSave({ mode: 'link' })} />
        <QuickAction icon="pin" label="Add a place" onClick={() => openSave({ mode: 'place' })} />
        <QuickAction icon="calendar" label="Plan a trip" onClick={() => newTrip()} />
        {featured && <QuickAction icon="people" label="Invite" to={`/trip/${featured.id}/people`} />}
      </nav>

      {places.length > 0 && (
        <PageSection title="Saved for later" meta={`${places.length} place${places.length === 1 ? '' : 's'} · ${total} save${total === 1 ? '' : 's'}`}
          action={<LinkButton to="/trips?show=saved" variant="ghost" size="regular" iconEnd="chevron-right">See all</LinkButton>}>
          <div className={ss.tileRow}>
            {places.map((t) => <PlaceTile key={t.id} trip={t} trips={trips ?? []} ideas={ideasBy[t.id]} />)}
          </div>
        </PageSection>
      )}

      {recent.length > 0 && (
        <PageSection title="Recently saved">
          <ListGroup label="Recently saved">
            {recent.map(({ i, tripId }: { i: Idea; tripId: string }) => (
              <ListItem key={i.id} icon={categoryInfo(i.category).icon} media={i.image ? <img src={i.image} alt="" /> : undefined}
                title={i.title} meta={saveMeta(i, profiles, me.uid)} trailing={ago(i.createdAt)} to={where(tripId)} />
            ))}
          </ListGroup>
        </PageSection>
      )}
    </Content>
  );
}
