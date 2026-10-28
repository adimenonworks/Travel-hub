import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvatarStack, Badge, Button, Card, EmptyState, Icon, IconButton } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Activity } from '../../data/types';
import { formatDay, formatTime, parseDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { mapsUrl } from '../../lib/geocode';
import { categoryInfo } from '../../lib/categories';
import { Comments } from '../shared/Comments';
import { LinkChips } from '../shared/Links';
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

  const [editing, setEditing] = useState<Activity | null>(null);
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
          list.map((a) => <ActivityCard key={a.id} a={a} ctx={ctx} onEdit={() => setEditing(a)} />)
        )}
      </div>

      <ActivityForm open={adding} trip={trip} date={day} onClose={() => setAdding(false)} />
      <ActivityForm open={!!editing} trip={trip} date={day} activity={editing ?? undefined} onClose={() => setEditing(null)} />
    </div>
  );
}

function ActivityCard({ a, ctx, onEdit }: { a: Activity; ctx: TripCtx; onEdit: () => void }) {
  const me = useMe();
  const [showComments, setShowComments] = useState(false);
  const cat = categoryInfo(a.category);
  const going = a.attendeeIds.includes(me.uid);
  const nComments = ctx.comments.filter((c) => c.targetId === a.id).length;

  return (
    <div className={s.activity}>
      <div className={s.time}>
        {a.startTime ? <>{formatTime(a.startTime)}{a.endTime && <><br /><span className="t-tertiary">{formatTime(a.endTime)}</span></>}</> : <span className="t-tertiary">Any time</span>}
      </div>
      <Card className={s.actCard}>
        <div className={s.actTop}>
          <div>
            <h3 className="t-title3">{a.title}</h3>
            <div className={s.actMeta}>
              <Badge color={cat.color}>{cat.label}</Badge>
              {a.cost > 0 && <Badge>{money(a.cost, ctx.trip.currency)} pp</Badge>}
            </div>
          </div>
          <IconButton icon="pencil" size="small" label={`Edit ${a.title}`} onClick={onEdit} />
        </div>
        {a.locationText && (
          <a className={s.locLink} href={mapsUrl(a.locationText, a.location)} target="_blank" rel="noreferrer">
            <Icon name="pin" size={18} />{a.locationText}
          </a>
        )}
        {a.notes && <div className={s.actNotes}>{a.notes}</div>}
        <LinkChips links={a.links} />
        <div className={s.actFoot}>
          <span className={s.attending}>
            <AvatarStack people={a.attendeeIds.map((id) => ({ id, name: personName(ctx.profiles, id), photo: ctx.profiles[id]?.photo }))} size={26} />
            <span className="t-footnote t-secondary">{a.attendeeIds.length ? `${a.attendeeIds.length} going` : 'No one yet'}</span>
          </span>
          <span className={s.attending}>
            <Button size="small" variant="plain" icon="chat" onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} aria-label={`Comments (${nComments})`}>
              {nComments || ''}
            </Button>
            <Button size="small" variant={going ? 'filled' : 'gray'} icon={going ? 'check' : 'plus'}
              onClick={() => store.toggleInArray(ctx.trip.id, 'activities', a.id, 'attendeeIds', me.uid, !going)}>
              {going ? "I'm in" : 'Join'}
            </Button>
          </span>
        </div>
        {showComments && <Comments tripId={ctx.trip.id} targetId={a.id} comments={ctx.comments} profiles={ctx.profiles} />}
      </Card>
    </div>
  );
}
