import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvatarStack, Badge, Button, Card, CardLink, EmptyState, Icon } from '../../design/components';
import { personName, useMe } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { categoryInfo } from '../../lib/categories';
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
  const spend = list.reduce((n, a) => n + a.cost * Math.max(1, a.attendeeIds.length), 0);
  const index = days.indexOf(day);

  return (
    <div className={s.itinLayout}>
      <div className={s.days} role="group" aria-label="Trip days">
        {days.map((d, i) => (
          <button key={d} type="button" className={s.day} aria-pressed={d === day} onClick={() => setDay(d)}>
            <span className={s.dayDow}>{d === t ? 'Today' : `Day ${i + 1}`}</span>
            <span className={s.dayNum}>{parseDay(d).getDate()}</span>
            <span className={[s.dayDot, !counts[d] && s.empty].filter(Boolean).join(' ')} />
          </button>
        ))}
      </div>

      <div className={s.timeline}>
        <div className={s.dayHead}>
          <div>
            <h2 className="t-title1">Day {index + 1}</h2>
            <div className={s.dayBudget}>
              {formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}
              {trip.dailyBudget > 0 && <> · {money(spend, trip.currency)} of {money(trip.dailyBudget * trip.memberIds.length, trip.currency)} group budget</>}
            </div>
          </div>
          <Button icon="plus" onClick={() => setAdding(true)}>Add plan</Button>
        </div>

        {list.length === 0 ? (
          <Card>
            <EmptyState icon="calendar" title="Nothing planned yet" message="Add something to do, or approve an idea from the Ideas board."
              action={<Button variant="tinted" icon="plus" onClick={() => setAdding(true)}>Add plan</Button>} />
          </Card>
        ) : (
          list.map((a) => <ActivityCard key={a.id} a={a} ctx={ctx} />)
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
