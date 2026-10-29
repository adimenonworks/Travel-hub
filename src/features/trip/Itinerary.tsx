import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvatarStack, Badge, Button, Card, CardLink, EmptyState, Icon } from '../../design/components';
import { personName, useMe } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { categoryInfo } from '../../lib/categories';
import { defaultUnit, describeWeather, tripWeather, type DayWeather } from '../../lib/weather';
import { ActivityForm } from './ActivityForm';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

export const byTime = (a: Activity, b: Activity) => (a.startTime || '99').localeCompare(b.startTime || '99') || a.createdAt - b.createdAt;

export function Itinerary(ctx: TripCtx) {
  const { trip, activities } = ctx;
  const days = tripDays(trip.startDate, trip.endDate);
  const [params, setParams] = useSearchParams();
  const t = today();
  const fallback = days.includes(t) ? t : days[0];
  const day = days.includes(params.get('day') ?? '') ? params.get('day')! : fallback;
  const setDay = (d: string) => setParams({ day: d }, { replace: true });

  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    activities.forEach((a) => (m[a.date] = (m[a.date] ?? 0) + 1));
    return m;
  }, [activities]);
  const list = activities.filter((a) => a.date === day).sort(byTime);
  const spendOn = (d: string) => activities.filter((a) => a.date === d).reduce((n, a) => n + a.cost * Math.max(1, a.attendeeIds.length), 0);
  const spend = spendOn(day);
  const groupBudget = trip.dailyBudget * trip.memberIds.length;
  const index = days.indexOf(day);
  const weather = useDayWeather(ctx, day);

  // On today's plan, a dotted "now" line sits before the next plan and is scrolled to the middle of the screen.
  const now = useNow();
  const showNow = day === t && list.length > 1;
  const nextIndex = list.findIndex((a) => (a.startTime || '99:99') > now);
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showNow || !nowRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nowRef.current.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [showNow, day]);
  const nowLine = (
    <div ref={nowRef} className={s.now} role="note" aria-label={`Now, ${formatTime(now)}`}>
      <span className={s.nowTime}>{formatTime(now)}</span>
      <span className={s.nowLine} />
    </div>
  );

  return (
    <div className={s.itinLayout}>
      <div className={s.days} role="group" aria-label="Trip days">
        {days.map((d, i) => {
          const selected = d === day;
          const left = groupBudget - spendOn(d);
          return (
            <button key={d} type="button" className={s.day} aria-pressed={selected} onClick={() => setDay(d)}>
              <span className={s.dayDow}>{d === t ? 'Today' : `Day ${i + 1}`}</span>
              <span className={s.dayDate}>
                <span className={s.dayNum}>{parseDay(d).getDate()}</span>
                {selected && <span className={s.dayMonth}>{formatDay(d, { month: 'short' })} · {formatDay(d, { weekday: 'short' })}</span>}
              </span>
              {selected ? (
                <span className={s.dayLabels}>
                  <span className={s.dayLabel}>{counts[d] ?? 0} {counts[d] === 1 ? 'plan' : 'plans'}</span>
                  {groupBudget > 0 && <span className={[s.dayLabel, left < 0 && s.dayOver].filter(Boolean).join(' ')}>
                    {left < 0 ? `${money(-left, trip.currency)} over` : `${money(left, trip.currency)} left`}
                  </span>}
                </span>
              ) : (
                <span className={[s.dayDot, !counts[d] && s.empty].filter(Boolean).join(' ')} />
              )}
            </button>
          );
        })}
      </div>

      <div className={s.timeline}>
        <div className={s.dayHead}>
          <div>
            <div className={s.dayTitle}>
              <h2 className="t-title1">{day === t ? 'Today’s plan' : `Day ${index + 1}`}</h2>
              {weather && <WeatherChip w={weather.day} typical={weather.typical} />}
            </div>
            <div className={s.dayBudget}>
              {formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}
              {trip.dailyBudget > 0 && <> · {money(spend, trip.currency)} of {money(trip.dailyBudget * trip.memberIds.length, trip.currency)} group budget</>}
            </div>
          </div>
          <Button icon="plus" onClick={() => setAdding(true)}>Add event</Button>
        </div>

        {list.length === 0 ? (
          <Card>
            <EmptyState icon="calendar" title="Nothing planned yet" message="Add something to do, or approve an idea from the Ideas board."
              action={<Button variant="tinted" icon="plus" onClick={() => setAdding(true)}>Add event</Button>} />
          </Card>
        ) : (
          <>
            {list.map((a, n) => (
              <div key={a.id} className={s.timelineItem}>
                {showNow && n === nextIndex && nowLine}
                <ActivityCard a={a} ctx={ctx} />
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

/** A plan in the timeline. The whole card opens the plan's own page (details, location, documents, comments). */
function ActivityCard({ a, ctx }: { a: Activity; ctx: TripCtx }) {
  const me = useMe();
  const cat = categoryInfo(a.category);
  const going = a.attendeeIds.includes(me.uid);
  const nComments = ctx.comments.filter((c) => c.targetId === a.id).length;
  const nDocs = a.links.length;

  return (
    <div className={s.activity}>
      <div className={s.time}>
        {a.startTime ? <>{formatTime(a.startTime)}{a.endTime && <><br /><span className="t-tertiary">{formatTime(a.endTime)}</span></>}</> : <span className="t-tertiary">Any time</span>}
      </div>
      <CardLink to={`/trip/${ctx.trip.id}/plan/${a.id}`} className={s.actCard}>
        <div className={s.actTop}>
          <div>
            <h3 className="t-title3">{a.title}</h3>
            <div className={s.actMeta}>
              <Badge tone="category" icon={cat.icon}>{cat.label}</Badge>
              {a.cost > 0 && <Badge>{money(a.cost, ctx.trip.currency)} pp</Badge>}
              {going && <Badge tone="success" icon="check">You're going</Badge>}
            </div>
          </div>
          <Icon name="chevron-right" size={20} className={s.actChevron} />
        </div>
        {a.locationText && <div className={s.actPlace}><Icon name="pin" size={18} />{a.locationText}</div>}
        {a.notes && <div className={[s.actNotes, s.clamp].join(' ')}>{a.notes}</div>}
        <div className={s.actFoot}>
          <span className={s.attending}>
            <AvatarStack people={a.attendeeIds.map((id) => ({ id, name: personName(ctx.profiles, id), photo: ctx.profiles[id]?.photo }))} size={26} />
            <span className="t-footnote t-secondary">{a.attendeeIds.length ? `${a.attendeeIds.length} going` : 'No one yet'}</span>
          </span>
          <span className={[s.attending, 't-footnote t-secondary'].join(' ')}>
            {nDocs > 0 && <span className={s.attending}><Icon name="doc" size={16} />{nDocs}<span className="visually-hidden"> {nDocs === 1 ? 'document' : 'documents'}</span></span>}
            {nComments > 0 && <span className={s.attending}><Icon name="chat" size={16} />{nComments}<span className="visually-hidden"> {nComments === 1 ? 'comment' : 'comments'}</span></span>}
          </span>
        </div>
      </CardLink>
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
