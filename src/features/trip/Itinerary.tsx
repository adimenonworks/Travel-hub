import { hasStep, stepTab, useSwipeTabs } from '../../app/useSwipeTabs';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, ContextMenu, DayCard, EventCard, PersonSwitcher, SectionHeader, NowLine, TravelConnector, type ContextMenuItem, type EventState, Card, Illustration } from '../../design/components';
import { useMe, usePlacesById } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { dayWord, formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { haptic } from '../../lib/native';
import { unreadCount, unreadTag, useReads } from '../../lib/reads';
import { travelEstimate } from '../../lib/trips';
import { SlideSwap } from '../shared/SlideSwap';
import { ActivityForm, ConnectionForm } from './ActivityForm';
import { entryEnd, entryTime, eventCardProps, eventsOn, isFirstLeg, legsOf, type DayEntry } from './events';
import { behaviourOf, categoryInfo, isEveryday } from '../../lib/categories';
import { priceOf, priceText } from '../../lib/currency';
import { crossesDateLine, localNow, zoneOfDay } from '../../lib/timezone';
import type { TripCtx } from './TripPage';
import { peopleOf, startingPerson, travellersOf } from '../../data/eventPeople';
import { getItineraryPerson, setItineraryPerson } from '../../lib/prefs';
import { goingText, useWhosIn } from './whosIn';
import { personName } from '../../data/hooks';
import s from './trip.module.css';

export const byTime = (a: Activity, b: Activity) => (a.startTime || '99').localeCompare(b.startTime || '99') || a.createdAt - b.createdAt;

export function Itinerary(ctx: TripCtx) {
  const { trip } = ctx;
  const me = useMe();
  // Whose itinerary (item 5): yours by default, or one other traveller's; never everyone's at once. Remembered per trip.
  const travellers = travellersOf(trip);
  const [chosen, setChosen] = useState(() => getItineraryPerson(trip.id));
  const person = chosen && travellers.includes(chosen) ? chosen : startingPerson(trip, me.uid);
  const choose = (id: string) => { haptic('selection'); setChosen(id); setItineraryPerson(trip.id, id); };
  // Only the events that person is in (the day's plan, its count, arrivals and the time zone all follow them)
  const activities = useMemo(() => ctx.activities.filter((a) => peopleOf(a, trip).includes(person)), [ctx.activities, trip, person]);
  const choices = [
    ...(travellers.includes(me.uid) ? [{ id: me.uid, name: 'Me', fullName: personName(ctx.profiles, me.uid), photo: ctx.profiles[me.uid]?.photo }] : []),
    ...travellers.filter((id) => id !== me.uid).map((id) => ({ id, name: personName(ctx.profiles, id).split(' ')[0], fullName: personName(ctx.profiles, id), photo: ctx.profiles[id]?.photo })),
  ];
  const days = tripDays(trip.startDate, trip.endDate);
  // Month markers in the Day strip: when the trip runs over two months, or isn't in this month
  const showMonths = trip.startDate.slice(0, 7) !== trip.endDate.slice(0, 7) || trip.startDate.slice(0, 7) !== today().slice(0, 7);
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

  // Swipe the day's plan sideways to go to the next or previous day (the plan slides, the strip follows)
  const planBox = useRef<HTMLDivElement>(null);
  useSwipeTabs(planBox, (dir) => { const n = stepTab(days, day, dir); if (n) setDay(n); }, (dir) => hasStep(days, day, dir));

  // On arrival, slide the strip (sideways only, never the page) so the selected day starts fully in view.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    if (strip && el && strip.scrollWidth > strip.clientWidth)
      strip.scrollLeft += el.getBoundingClientRect().left - strip.getBoundingClientRect().left - parseFloat(getComputedStyle(strip).paddingLeft);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [connectFrom, setConnectFrom] = useState<Activity | null>(null);
  // I'm in, I'm out and Delete (Just me or Remove for everyone), each with Undo
  const whosIn = useWhosIn(trip, ctx.profiles);
  const travellerCount = travellersOf(trip).length;

  // What's on each day (a Stay counts on its check-in and check-out days).
  const byDay = useMemo(() => Object.fromEntries(days.map((d) => [d, eventsOn(activities, d)])), [activities, trip.startDate, trip.endDate]); // eslint-disable-line react-hooks/exhaustive-deps
  // Changing person slides the plan in the switcher's order; changing day, in the days' order
  const personRank = Math.max(0, choices.findIndex((c) => c.id === person));
  // What the sliding panel shows (kept as one value so the outgoing view keeps its own person's events)
  const view = useMemo(() => ({ d: day, byDay }), [day, byDay]);
  // "Now" is the local time where you are that day (the day's stay or last arrival), so the now-line, Next and Done
  // are right in any time zone; without stored zones it's the phone's time, as before.
  const tick = useTick();
  const zone = useMemo(() => zoneOfDay(activities, day), [activities, day]);
  const { day: localToday, time: now } = localNow(zone, tick);
  const word = (d: string) => dayWord(d, trip.startDate, t);
  const list: DayEntry[] = byDay[day] ?? [];
  const reads = useReads(me.uid);
  const places = usePlacesById(activities.flatMap((x) => (x.placeId ? [x.placeId] : [])));
  const nowLine = <NowLine time={formatTime(now)} />;
  const startsIn = (e: DayEntry) => {
    const at = entryTime(e);
    if (!at || at <= now) return 'Now';
    const [h1, m1] = now.split(':').map(Number), [h2, m2] = at.split(':').map(Number);
    const min = h2 * 60 + m2 - (h1 * 60 + m1);
    return min < 60 ? `in ${min} min` : `in ${Math.round(min / 60)} hr`;
  };

  return (
    <div className={s.itinLayout}>
      <div className={s.whoAndDay}>
      {choices.length > 1 && <PersonSwitcher value={person} onChange={choose} people={choices} />}
      <div ref={stripRef} className={s.days} role="group" aria-label="Trip days">
        {days.map((d, i) => (
          <Fragment key={d}>
          {/* A month marker where the month changes (and before the first day, when the trip isn't all in this month) */}
          {showMonths && (i === 0 || d.slice(0, 7) !== days[i - 1].slice(0, 7)) && (
            <span className={s.monthMark} aria-hidden="true">{formatDay(d, { month: 'short' })}</span>
          )}
          <DayCard dataDay={d} day={parseDay(d).getDate()} weekday={formatDay(d, { weekday: 'short' })} selected={d === day}
            label={`${word(d)}, ${formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}`}
            onClick={() => { haptic('selection'); setDay(d); }} />
          </Fragment>
        ))}
      </div>
      </div>

      <section className={s.timeline} aria-label={word(day)}>
        <SectionHeader title={word(day)}
          meta={[formatDay(day), `${list.length} plan${list.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          action={ctx.isTraveller ? <Button size="small" icon="plus" onClick={() => setAdding(true)}>Add event</Button> : undefined} />

        {/* Changing day slides only the plan, from the side of the day you picked */}
        <div ref={planBox}>
        <SlideSwap value={view} id={`${person}:${day}`} rank={personRank * 1000 + days.indexOf(day)}>{({ d, byDay }) => {
          const list: DayEntry[] = byDay[d] ?? [];
          // On today's plan, the "now" line (Figma Now line) sits before the next plan. The page doesn't scroll to it.
          const showNow = d === localToday && list.length > 1;
          const nextIndex = d === localToday ? list.findIndex((e) => entryEnd(e) > now) : -1;
          // The price per person, subtle at the top right, on bookings (not everyday spending); a stay shows it at check-in only.
  const amountOf = (e: DayEntry) => { if (e.part === 'out' || isEveryday(e.a.category)) return undefined; const p = priceOf(e.a, trip); return p && p.amount > 0 ? priceText(p) : undefined; };
  const stateOf = (i: number): EventState => d < localToday || (d === localToday && entryEnd(list[i]) <= now) ? 'done' : i === nextIndex ? 'next' : 'default';
          // A journey that lands on a later day: a marker at the top of that day. A journey that crosses the date line: a note.
          const arrivals = activities.filter((a) => behaviourOf(a.category) === 'journey' && isFirstLeg(a, activities)).flatMap((a) => {
            const legs = legsOf(a, activities), last = legs[legs.length - 1];
            return (last.endDate || last.date) === d && (last.endDate || last.date) > a.date && last.endTime ? [{ a, last }] : [];
          });
          const dateLine = list.some((e) => legsOf(e.a, activities).some(crossesDateLine));
          return list.length === 0 ? (
            <Card layout="centre" media={<Illustration name="calendar" size={120} />} title={person === me.uid ? 'Nothing planned yet' : `Nothing on ${personName(ctx.profiles, person).split(' ')[0]}’s day`}
              body={person === me.uid ? 'Add something to do, or schedule an idea from the Ideas board.' : undefined}
              actions={ctx.isTraveller && person === me.uid ? <Button tone="neutral" icon="plus" onClick={() => setAdding(true)}>Add event</Button> : undefined} />
          ) : (
            <div className={s.eventList}>
              {arrivals.map(({ a, last }) => <TravelConnector key={`arr-${a.id}`} icon={categoryInfo(a.category).icon} label={`Arrives ${formatTime(last.endTime)} from ${(a.fromText ?? '').split(',')[0].replace(/\s*\([^)]*\)/, '')}`} />)}
              {dateLine && <TravelConnector icon="globe" label="You cross the date line on this journey" />}
              {list.map((e, n) => {
                const a = e.a;
                const state = stateOf(n);
                const trip2 = n > 0 ? travelEstimate(list[n - 1].a, a) : null;
                return (
                  <div key={`${a.id}-${e.part ?? ''}`} className={s.timelineItem}>
                    {trip2 && <TravelConnector label={trip2.label} icon={trip2.icon} />}
                    {showNow && n === nextIndex && nowLine}
                    {(() => {
                      // Who's in: shown when it isn't everyone (silence means everyone), with I'm in when you're not,
                      // and I'm out while it's new to you (someone else put you in it)
                      const people = peopleOf(a, trip);
                      const mine = people.includes(me.uid);
                      // Someone else's itinerary: "You're in" on the ones you're in too
                      const addedBy = mine ? a.added?.[me.uid] : undefined;
                      const action = !ctx.isTraveller ? undefined
                        : !mine ? { label: 'I’m in', onClick: () => whosIn.imIn(a) }
                          : addedBy && people.length > 1 ? { label: 'I’m out', onClick: () => whosIn.imOut(a) } : undefined;
                      const showPeople = travellerCount > 1 && (people.length < travellerCount || !!action);
                      const card = (
                        <EventCard {...eventCardProps(e, ctx)} amount={mine ? amountOf(e) : undefined} state={state} favourite={!!(a.placeId && places[a.placeId]?.starredBy?.includes(me.uid))}
                          people={showPeople ? people.map((id) => ({ id, name: personName(ctx.profiles, id), photo: ctx.profiles[id]?.photo })) : undefined}
                          going={showPeople ? (people.length ? goingText(people, travellerCount, me.uid) : 'Nobody yet') : undefined}
                          action={action}
                          extras={[
                            ...(addedBy ? [{ icon: 'user-add' as const, label: `New · added by ${personName(ctx.profiles, addedBy).split(' ')[0]}` }] : []),
                            ...(mine && person !== me.uid ? [{ icon: 'check' as const, label: 'You’re in' }] : []),
                            ...(state === 'next' ? [{ icon: 'information' as const, label: `Next · ${startsIn(e)}` }] : []),
                            // An event's comments are for the people in it
                            ...(mine ? unreadTag(unreadCount(reads, me.uid, a.id, ctx.comments)) : []),
                          ]} />
                      );
                      // Press and hold for Edit, I'm out and Delete (the travellers in it), or I'm in; sideways swipes change day
                      const items: ContextMenuItem[] = !ctx.isTraveller ? [] : !mine ? [{ label: 'I’m in', icon: 'check', onClick: () => whosIn.imIn(a) }] : [
                        { label: 'Edit', icon: 'pencil', onClick: () => setEditing(a) },
                        ...(people.length > 1 ? [{ label: 'I’m out', icon: 'sign-out' as const, onClick: () => whosIn.imOut(a) }] : []),
                        { label: 'Delete', icon: 'trash', tone: 'danger', onClick: () => whosIn.remove(a) },
                      ];
                      return items.length ? <HoldMenu label={`${a.title} actions`} items={items}>{card}</HoldMenu> : card;
                    })()}
                  </div>
                );
              })}
              {showNow && nextIndex === -1 && nowLine}
            </div>
          );
        }}</SlideSwap>
        </div>
      </section>

      {whosIn.sheet}
      <ActivityForm open={adding} trip={trip} date={day} onClose={() => setAdding(false)} />
      <ActivityForm open={!!editing} trip={trip} date={editing?.date ?? day} activity={editing ?? undefined} onClose={() => setEditing(null)}
        onAddConnection={() => setConnectFrom(editing)} />
      {connectFrom && <ConnectionForm open trip={trip} activity={connectFrom} activities={activities} onClose={() => setConnectFrom(null)} />}
    </div>
  );
}

/** The current moment, updated every minute. */
function useTick() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}


/**
 * Press and hold an event card (about half a second, like iOS) for its menu: the card lifts, the rest dims, and Edit
 * and Delete appear under it. Moving the finger first (a scroll or a day swipe) cancels it, and the tap that ends a
 * hold never opens the event.
 */
function HoldMenu({ items, label, children }: { items: ContextMenuItem[]; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const cancel = () => { window.clearTimeout(timer.current); start.current = null; };
  return (
    <div onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        held.current = false; start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => { held.current = true; haptic('medium'); setOpen(true); }, 450);
      }}
      onPointerMove={(e) => { const s0 = start.current; if (s0 && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 10) cancel(); }}
      onPointerUp={cancel} onPointerCancel={cancel}
      onClickCapture={(e) => { if (held.current || open) { held.current = false; e.preventDefault(); if (!(e.target as HTMLElement).closest('[role=menu]')) e.stopPropagation(); } }}>
      {open ? <ContextMenu label={label} items={items} onClose={() => setOpen(false)}>{children}</ContextMenu> : children}
    </div>
  );
}
