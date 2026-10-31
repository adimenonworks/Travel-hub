import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, EmptyState, EventRow, Icon, Timeline } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { dayWord, formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { categoryInfo } from '../../lib/categories';
import { mapsUrl, uberUrl } from '../../lib/geocode';
import { defaultUnit, describeWeather, tripWeather, type DayWeather } from '../../lib/weather';
import { ActivityForm } from './ActivityForm';
import { tripBudget } from './tripBudget';
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
    setTimeout(() => stripRef.current?.querySelector(`[data-day="${d}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), reduce ? 0 : 420);
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
  const budget = tripBudget(ctx);
  const weather = useDayWeather(ctx, day);

  // On today's plan, a dotted "now" line sits before the next plan and is scrolled into view.
  const showNow = day === t && list.length > 1;
  const nextIndex = list.findIndex((a) => (a.startTime || '99:99') > now);
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showNow || !nowRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Only scrolls when the line is off screen, and only as far as needed, so opening the tab doesn't jolt the page.
    nowRef.current.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [showNow, day]);
  const nowLine = <Timeline innerRef={nowRef} time={formatTime(now)} />;

  return (
    <div className={s.itinLayout}>
      {/* Push-expand: every card holds a compact face and an open face. Tapping a card grows it (width in the strip,
          height in the side list) while the one it replaces shrinks, and the faces cross-fade as they go. */}
      <div ref={stripRef} className={s.days} role="group" aria-label="Trip days">
        {days.map((d) => {
          const selected = d === day;
          const toGo = eventsLeft(d);
          const b = budget.total > 0 ? budget.forDay(d) : null;
          return (
            <button key={d} type="button" data-day={d} className={s.day} aria-pressed={selected} onClick={() => setDay(d)}>
              <span className={s.dayCompact} aria-hidden={selected}>
                <span className={s.dayNum}>{parseDay(d).getDate()}</span>
                <span className={s.dayWord}>{word(d)}</span>
                <span className={[s.dayDot, !counts[d] && s.empty].filter(Boolean).join(' ')} />
              </span>
              <span className={s.dayOpen} aria-hidden={!selected}>
                <span className={s.dayTop}>
                  <span className={s.dayBig}>{parseDay(d).getDate()}</span>
                  <span className={s.dayMonth}>{formatDay(d, { month: 'short' })} · {word(d)}</span>
                </span>
                <span className={s.dayBadges}>
                  {!!counts[d] && <Badge tone="inverse">{toGo ? `${toGo} more event${toGo === 1 ? '' : 's'}` : 'All done'}</Badge>}
                  {b && <Badge tone={b.left < 0 ? 'danger' : 'neutral'}>{b.left < 0 ? `${money(-b.left, trip.currency)} over` : `${money(b.left, trip.currency)} left`}</Badge>}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={s.timeline}>
        <div className={s.dayHead}>
          <div>
            <div className={s.dayTitle}>
              <h2 className="t-heading-1">{word(day)}</h2>
              {weather && <WeatherChip w={weather.day} typical={weather.typical} />}
            </div>
            <div className={s.dayBudget}>{formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
          <Button icon="plus" onClick={() => setAdding(true)}>Add event</Button>
        </div>

        {list.length === 0 ? (
          <EmptyState illustration="calendar" title="Nothing planned yet" message="Add something to do, or approve an idea from the Ideas board."
            action={<Button variant="secondary" icon="plus" onClick={() => setAdding(true)}>Add event</Button>} />
        ) : (
          <>
            {list.map((a, n) => (
              <div key={a.id} className={s.timelineItem}>
                {showNow && n === nextIndex && nowLine}
                <ActivityRow a={a} ctx={ctx} />
              </div>
            ))}
            {showNow && nextIndex === -1 && nowLine}
          </>
        )}
      </div>

      <ActivityForm open={adding} trip={trip} date={day} onClose={() => setAdding(false)} />
    </div>
  );
}

/** A plan in the timeline (Figma "Event row"): everything entered in the sheet. The title opens the plan's own page;
    the star saves it to your travel collections; Maps and Uber take you there. */
function ActivityRow({ a, ctx }: { a: Activity; ctx: TripCtx }) {
  const me = useMe();
  const cat = categoryInfo(a.category);
  const starred = !!a.starredBy?.includes(me.uid);
  const nComments = ctx.comments.filter((c) => c.targetId === a.id).length;
  const when = a.startTime ? `${formatTime(a.startTime)}${a.endTime ? `–${formatTime(a.endTime)}` : ''}` : 'Any time';
  const where = a.locationText || a.location?.name;
  return (
    <EventRow
      to={`/trip/${ctx.trip.id}/plan/${a.id}`}
      title={a.title}
      subtext={where ? `${when} · ${where}` : when}
      category={{ icon: cat.icon, label: cat.label }}
      going={a.attendeeIds.includes(me.uid)}
      people={a.attendeeIds.map((id) => ({ id, name: personName(ctx.profiles, id), photo: ctx.profiles[id]?.photo }))}
      price={a.cost > 0 ? `${money(a.cost, ctx.trip.currency)} pp` : undefined}
      starred={starred}
      onStar={() => store.toggleInArray(ctx.trip.id, 'activities', a.id, 'starredBy', me.uid, !starred)}
      mapsHref={where ? mapsUrl(where, a.location) : undefined}
      uberHref={where ? uberUrl(where, a.location) : undefined}
      extra={nComments > 0 && <Badge tone="neutral" size="large" icon="comment">{nComments}<span className="visually-hidden"> {nComments === 1 ? 'comment' : 'comments'}</span></Badge>}
    />
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

/** The forecast for one day of the trip (or last year's weather as a guide when it's too far ahead). */
function useDayWeather({ trip }: TripCtx, day: string) {
  const [res, setRes] = useState<{ days: DayWeather[]; typical: boolean } | null>(null);
  const place = trip.destination;
  useEffect(() => {
    if (!place) return;
    let live = true;
    tripWeather(place, trip.startDate, trip.endDate, defaultUnit())
      .then((r) => live && setRes({ days: r.days, typical: r.kind === 'typical' }))
      .catch(() => live && setRes(null));
    return () => { live = false; };
  }, [place?.lat, place?.lng, trip.startDate, trip.endDate]);
  const d = res?.days.find((x) => x.date === day);
  return d ? { day: d, typical: res!.typical } : null;
}

function WeatherChip({ w, typical }: { w: DayWeather; typical: boolean }) {
  const { label, icon } = describeWeather(w.code);
  const temps = `${Math.round(w.max)}° / ${Math.round(w.min)}°`;
  return (
    <span className={s.weatherChip} title={typical ? 'Typical for this date (last year’s weather)' : label}>
      <Icon name={icon} size={18} />
      <span aria-hidden="true">{typical ? '~' : ''}{temps}</span>
      <span className="visually-hidden">{typical ? `Typically ${label.toLowerCase()}` : label}, high {Math.round(w.max)}°, low {Math.round(w.min)}°</span>
    </span>
  );
}
