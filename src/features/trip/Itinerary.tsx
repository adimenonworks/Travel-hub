import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, DayCard, EmptyState, EventCard, SectionHeader, Timeline, TravelConnector, type EventState } from '../../design/components';
import { useMe } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { dayWord, formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { haptic } from '../../lib/native';
import { travelEstimate } from '../../lib/trips';
import { ActivityForm } from './ActivityForm';
import { eventCardProps } from './Overview';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

export const byTime = (a: Activity, b: Activity) => (a.startTime || '99').localeCompare(b.startTime || '99') || a.createdAt - b.createdAt;

export function Itinerary(ctx: TripCtx) {
  const { trip, activities } = ctx;
  const days = tripDays(trip.startDate, trip.endDate);
  const [params, setParams] = useSearchParams();
  const t = today();
  const fallback = days.includes(t) ? t : days[0];
  const fromUrl = params.get('day');
  const day = days.includes(fromUrl ?? '') ? fromUrl! : fallback;
  const stripRef = useRef<HTMLDivElement>(null);
  const setDay = (d: string) => {
    if (d === day) return;
    setParams({ day: d }, { replace: true });
    // Once the tapped card has finished growing, make sure all of it is on screen (phones scroll the strip sideways).
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => stripRef.current?.querySelector(`[data-day="${d}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), reduce ? 0 : 520);
  };

  // On arrival, slide the strip (sideways only, never the page) so the selected day starts fully in view.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    if (strip && el && strip.scrollWidth > strip.clientWidth)
      strip.scrollLeft += el.getBoundingClientRect().left - strip.getBoundingClientRect().left - parseFloat(getComputedStyle(strip).paddingLeft);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    activities.forEach((a) => (m[a.date] = (m[a.date] ?? 0) + 1));
    return m;
  }, [activities]);
  const now = useNow();
  const word = (d: string) => dayWord(d, trip.startDate, t);
  // Events still to come: all of a future day's, none of a past day's, and today's that haven't finished.
  // An event with no time, or one that runs past midnight (ends "earlier" than it starts), counts until the day is over.
  const finishesAt = (a: Activity) => (a.endTime && a.endTime >= a.startTime ? a.endTime : a.endTime ? '99:99' : a.startTime || '99:99');
  const eventsLeft = (d: string) =>
    d > t ? counts[d] ?? 0 : d < t ? 0 : activities.filter((a) => a.date === d && finishesAt(a) > now).length;
  const list = activities.filter((a) => a.date === day).sort(byTime);
  const me = useMe();
  const planned = list.reduce((n, a) => n + a.cost * Math.max(1, a.attendeeIds.length), 0);

  // On today's plan, the "now" line (Figma Timeline) sits before the next plan. The page doesn't scroll to it.
  const showNow = day === t && list.length > 1;
  const nextIndex = day === t ? list.findIndex((a) => finishesAt(a) > now) : -1;
  const nowLine = <Timeline time={formatTime(now)} />;
  const stateOf = (i: number): EventState => day < t || (day === t && finishesAt(list[i]) <= now) ? 'done' : i === nextIndex ? 'next' : 'default';
  const startsIn = (a: Activity) => {
    if (!a.startTime || a.startTime <= now) return 'Now';
    const [h1, m1] = now.split(':').map(Number), [h2, m2] = a.startTime.split(':').map(Number);
    const min = h2 * 60 + m2 - (h1 * 60 + m1);
    return min < 60 ? `in ${min} min` : `in ${Math.round(min / 60)} hr`;
  };

  return (
    <div className={s.itinLayout}>
      <div ref={stripRef} className={s.days} role="group" aria-label="Trip days">
        {days.map((d) => {
          // Today counts the events still to come; any other day shows its total.
          const n = d === t ? eventsLeft(d) : counts[d] ?? 0;
          return (
            <DayCard key={d} dataDay={d} day={parseDay(d).getDate()} month={formatDay(d, { month: 'short' })} word={word(d)} selected={d === day}
              onClick={() => { haptic('selection'); setDay(d); }}
              tag={n > 0 ? (d === t ? `${n} more event${n === 1 ? '' : 's'}` : `${n} event${n === 1 ? '' : 's'}`) : undefined} />
          );
        })}
      </div>

      <section className={s.timeline} aria-label={word(day)}>
        <SectionHeader title={word(day)}
          meta={[formatDay(day), `${list.length} plan${list.length === 1 ? '' : 's'}`, planned > 0 ? `${money(planned, trip.currency)} planned` : ''].filter(Boolean).join(' · ')}
          action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setAdding(true)}>Add event</Button>} />

        {list.length === 0 ? (
          <EmptyState illustration="calendar" title="Nothing planned yet" message="Add something to do, or schedule an idea from the Ideas board."
            action={<Button variant="secondary" icon="plus" onClick={() => setAdding(true)}>Add event</Button>} />
        ) : (
          <div className={s.eventList}>
            {list.map((a, n) => {
              const state = stateOf(n);
              const trip2 = n > 0 ? travelEstimate(list[n - 1], a) : null;
              return (
                <div key={a.id} className={s.timelineItem}>
                  {trip2 && <TravelConnector label={trip2.label} icon={trip2.icon} />}
                  {showNow && n === nextIndex && nowLine}
                  <EventCard {...eventCardProps(a, ctx)} state={state}
                    extras={state === 'next' ? [
                      { icon: 'info', label: `Next · ${startsIn(a)}` },
                      ...(a.attendeeIds.length > 0 ? [{ icon: 'people' as const, label: a.attendeeIds.includes(me.uid) && a.attendeeIds.length === 1 ? 'You’re going' : `${a.attendeeIds.length} of ${trip.memberIds.length} going` }] : []),
                    ] : undefined} />
                </div>
              );
            })}
            {showNow && nextIndex === -1 && nowLine}
          </div>
        )}
      </section>

      <ActivityForm open={adding} trip={trip} date={day} onClose={() => setAdding(false)} />
    </div>
  );
}

/** The current time as HH:mm, updated every minute. */
function useNow() {
  const fmt = () => new Date().toTimeString().slice(0, 5);
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setNow(fmt()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

