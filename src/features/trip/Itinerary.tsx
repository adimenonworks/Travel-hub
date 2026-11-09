import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, DayCard, EmptyState, EventCard, SectionHeader, SwipeRow, Timeline, TravelConnector, useToast, type EventState } from '../../design/components';
import { useMe, usePlacesById } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { dayWord, formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { confirmAction, haptic } from '../../lib/native';
import { unreadCount, unreadTag, useReads } from '../../lib/reads';
import { store } from '../../data';
import { travelEstimate } from '../../lib/trips';
import { SlideSwap } from '../shared/SlideSwap';
import { ActivityForm } from './ActivityForm';
import { entryEnd, entryTime, eventCardProps, eventsOn, type DayEntry } from './events';
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
    // Make sure all of the tapped card is on screen (phones scroll the strip sideways).
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stripRef.current?.querySelector(`[data-day="${d}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  };

  // On arrival, slide the strip (sideways only, never the page) so the selected day starts fully in view.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    if (strip && el && strip.scrollWidth > strip.clientWidth)
      strip.scrollLeft += el.getBoundingClientRect().left - strip.getBoundingClientRect().left - parseFloat(getComputedStyle(strip).paddingLeft);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const toast = useToast();
  const remove = async (a: Activity) => {
    if (!confirmAction(`Delete "${a.title}"?`)) return;
    try { await store.deleteSub(trip.id, 'activities', a.id); toast({ icon: 'trash', label: 'Event deleted' }); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };

  // What's on each day (a Stay counts on its check-in and check-out days).
  const byDay = useMemo(() => Object.fromEntries(days.map((d) => [d, eventsOn(activities, d)])), [activities, trip.startDate, trip.endDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = useNow();
  const word = (d: string) => dayWord(d, trip.startDate, t);
  const list: DayEntry[] = byDay[day] ?? [];
  const me = useMe();
  const reads = useReads(me.uid);
  const places = usePlacesById(activities.flatMap((x) => (x.placeId ? [x.placeId] : [])));
  const nowLine = <Timeline time={formatTime(now)} />;
  const startsIn = (e: DayEntry) => {
    const at = entryTime(e);
    if (!at || at <= now) return 'Now';
    const [h1, m1] = now.split(':').map(Number), [h2, m2] = at.split(':').map(Number);
    const min = h2 * 60 + m2 - (h1 * 60 + m1);
    return min < 60 ? `in ${min} min` : `in ${Math.round(min / 60)} hr`;
  };

  return (
    <div className={s.itinLayout}>
      <div ref={stripRef} className={s.days} role="group" aria-label="Trip days">
        {days.map((d) => (
          <DayCard key={d} dataDay={d} day={parseDay(d).getDate()} weekday={formatDay(d, { weekday: 'short' })} selected={d === day}
            label={`${word(d)}, ${formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
            onClick={() => { haptic('selection'); setDay(d); }} />
        ))}
      </div>

      <section className={s.timeline} aria-label={word(day)}>
        <SectionHeader title={word(day)}
          meta={[formatDay(day), `${list.length} plan${list.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          action={<Button size="regular" icon="plus" onClick={() => setAdding(true)}>Add event</Button>} />

        {/* Changing day slides only the plan, from the side of the day you picked */}
        <SlideSwap value={day} id={day} rank={days.indexOf(day)}>{(d) => {
          const list: DayEntry[] = byDay[d] ?? [];
          // On today's plan, the "now" line (Figma Timeline) sits before the next plan. The page doesn't scroll to it.
          const showNow = d === t && list.length > 1;
          const nextIndex = d === t ? list.findIndex((e) => entryEnd(e) > now) : -1;
          const stateOf = (i: number): EventState => d < t || (d === t && entryEnd(list[i]) <= now) ? 'done' : i === nextIndex ? 'next' : 'default';
          return list.length === 0 ? (
            <EmptyState illustration="calendar" title="Nothing planned yet" message="Add something to do, or schedule an idea from the Ideas board."
              action={<Button variant="secondary" icon="plus" onClick={() => setAdding(true)}>Add event</Button>} />
          ) : (
            <div className={s.eventList}>
              {list.map((e, n) => {
                const a = e.a;
                const state = stateOf(n);
                const trip2 = n > 0 ? travelEstimate(list[n - 1].a, a) : null;
                return (
                  <div key={`${a.id}-${e.part ?? ''}`} className={s.timelineItem}>
                    {trip2 && <TravelConnector label={trip2.label} icon={trip2.icon} />}
                    {showNow && n === nextIndex && nowLine}
                    {(() => {
                      const card = (
                        <EventCard {...eventCardProps(e, ctx)} state={state} favourite={!!(a.placeId && places[a.placeId]?.starredBy?.includes(me.uid))}
                          extras={[
                            ...(state === 'next' ? [
                              { icon: 'info' as const, label: `Next · ${startsIn(e)}` },
                              ...(a.attendeeIds.length > 0 ? [{ icon: 'people' as const, label: a.attendeeIds.includes(me.uid) && a.attendeeIds.length === 1 ? 'You’re going' : `${a.attendeeIds.length} of ${trip.memberIds.length} going` }] : []),
                            ] : []),
                            ...unreadTag(unreadCount(reads, me.uid, a.id, ctx.comments)),
                          ]} />
                      );
                      // Swipe left (like Mail) for Edit and Delete; only organizers can change the itinerary
                      return ctx.canManage ? (
                        <SwipeRow actions={[
                          { label: 'Edit', icon: 'pencil', tone: 'neutral', onClick: () => setEditing(a) },
                          { label: 'Delete', icon: 'trash', tone: 'destructive', onClick: () => remove(a) },
                        ]}>{card}</SwipeRow>
                      ) : card;
                    })()}
                  </div>
                );
              })}
              {showNow && nextIndex === -1 && nowLine}
            </div>
          );
        }}</SlideSwap>
      </section>

      <ActivityForm open={adding} trip={trip} date={day} onClose={() => setAdding(false)} />
      <ActivityForm open={!!editing} trip={trip} date={editing?.date ?? day} activity={editing ?? undefined} onClose={() => setEditing(null)} />
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

