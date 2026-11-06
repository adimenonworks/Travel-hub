import { useSearchParams } from 'react-router-dom';
import { Button, Card, Illustration, PageHeader, PageSection, PageSkeleton, SegmentedControl } from '../../design/components';
import { useMyTrips } from '../../data/hooks';
import { tripPhase } from '../../lib/dates';
import { featuredTrip } from '../../lib/trips';
import { Content, useNewTrip } from '../../app/Shell';
import { TripHero } from '../shared/TripHero';
import s from './Home.module.css';

type Segment = 'upcoming' | 'past';

/**
 * Trips tab (Figma "Trips tab — Upcoming"): the library. A Segmented Control (Upcoming · Past; Saved arrives with the
 * saves feature), "Plan a new trip", then the trip that matters now as the Hero Card with its cover and the other
 * trips being planned under it. Past lists finished trips, newest first.
 */
export function Trips() {
  const trips = useMyTrips();
  const newTrip = useNewTrip();
  const [params, setParams] = useSearchParams();
  const segment: Segment = params.get('show') === 'past' ? 'past' : 'upcoming';
  const all = (trips ?? []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const featured = featuredTrip(trips);
  const planned = all.filter((t) => t !== featured && tripPhase(t.startDate, t.endDate) !== 'past');
  const past = all.filter((t) => tripPhase(t.startDate, t.endDate) === 'past').reverse();
  const upcoming = (featured ? 1 : 0) + planned.length;

  return (
    <Content>
      <PageHeader title="Trips" fit />
      {trips === null ? <PageSkeleton bare /> : (
        <div className={s.segments}>
          <SegmentedControl label="Show trips" block value={segment} onChange={(v) => setParams(v === 'past' ? { show: 'past' } : {}, { replace: true })}
            options={[{ value: 'upcoming', label: `Upcoming · ${upcoming}` }, { value: 'past', label: `Past · ${past.length}` }]} />
          <Button block icon="plus" onClick={newTrip}>Plan a new trip</Button>
          {segment === 'upcoming' ? (
            upcoming === 0 ? (
              <Card media={<Illustration name="suitcase" size={120} />} title="No trips coming up"
                body="Plan one: pick where you’re going and when, then invite the people coming with you." />
            ) : (
              <>
                {featured && <TripHero trip={featured} />}
                {planned.length > 0 && (
                  <PageSection title="Being planned" meta={`${planned.length} more ${planned.length === 1 ? 'trip' : 'trips'} coming up`}>
                    <div className={s.list}>{planned.map((t) => <TripHero key={t.id} trip={t} cover={false} />)}</div>
                  </PageSection>
                )}
              </>
            )
          ) : past.length === 0 ? (
            <Card media={<Illustration name="memories" size={120} />} title="No past trips yet" body="Trips you’ve been on show up here, with their photos." />
          ) : (
            <div className={s.list}>{past.map((t) => <TripHero key={t.id} trip={t} />)}</div>
          )}
        </div>
      )}
    </Content>
  );
}
