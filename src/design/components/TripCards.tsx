import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { AvatarStack, Badge } from './Misc';
import { PageHeader } from './Bars';
import { ListItem } from './Rows';
import s from './TripCards.module.css';

type Person = { id: string; name: string; photo?: string | null };


/**
 * Figma "Hero Card": the trip's cover (an illustration, or a photo with its credit) with a countdown Tag ("In 9 days"),
 * then the name (Heading 2), dates, who's going and, under a divider, one row: what's next (Show next up), plus a
 * heads-up row for one time-sensitive thing. Phase-aware: the caller passes the countdown and the rows.
 */
export function HeroCard({ size = 'regular', cover, photo, countdown, title, meta, people, to, next, headsUp }: {
  /** Figma "Size": Regular, or Compact (a shorter cover, the name, dates and countdown; no people, no next up) for lists */
  size?: 'regular' | 'compact';
  /** Figma "Show cover": a photo or Cover Scene; leave out for the panel alone */
  cover?: ReactNode;
  /** Figma "Show photo": a photo over the cover, with "Photo by <name> on Unsplash" (both names linked) */
  photo?: { url: string; credit: ReactNode };
  countdown?: { icon?: IconName; label: string };
  title: string; meta: ReactNode;
  /** Figma "Show people" */
  people?: Person[];
  to?: string;
  /** Figma "Show next up": one List item, e.g. the next event */
  next?: { icon: IconName; title: string; meta?: string; to?: string };
  /** Figma "Show heads-up": one time-sensitive row (check-in open, a flight change…) */
  headsUp?: { icon: IconName; title: string; meta?: string; to?: string };
}) {
  return (
    <section className={[s.hero, size === 'compact' && s.heroCompact].filter(Boolean).join(' ')} aria-label={title}>
      {cover && (
        <div className={s.cover}>
          {cover}
          {photo && <img className={s.photo} src={photo.url} alt="" />}
          {photo && <span className={s.scrim} aria-hidden="true" />}
          {photo && <span className={s.credit}>{photo.credit}</span>}
          {countdown && <span className={s.countdown}><Badge tone="neutral" icon={countdown.icon ?? 'calendar'}>{countdown.label}</Badge></span>}
        </div>
      )}
      <div className={s.body}>
        <div className={s.titleRow}>
          <div className={s.titleText}>
            <h2 className={s.name}>{to ? <Link to={to} className={s.nameLink}>{title}</Link> : title}</h2>
            <div className={s.meta}>{meta}</div>
          </div>
          {size === 'regular' && people && people.length > 0 && <AvatarStack people={people} />}
        </div>
        {!cover && countdown && <div><Badge tone="neutral" icon={countdown.icon ?? 'calendar'}>{countdown.label}</Badge></div>}
        {size === 'regular' && (next || headsUp) && (
          <div className={s.rows}>
            {next && <ListItem icon={next.icon} title={next.title} meta={next.meta} to={next.to} round />}
            {headsUp && <ListItem icon={headsUp.icon} title={headsUp.title} meta={headsUp.meta} to={headsUp.to} round />}
          </div>
        )}
      </div>
    </section>
  );
}

/** Figma "Trip header": the Page Header (Title small) with back and edit, then the dates only ("2 – 11 Nov · 10 days"). */
export function TripHeader({ title, meta, back, action }: {
  title: string; meta: ReactNode;
  back?: { to: string; label: string };
  action?: { icon: IconName; label: string; onClick: () => void };
}) {
  return (
    <div className={s.tripHeader}>
      <PageHeader title={title} size="small" back={back} action={action} />
      <div className={s.meta}>{meta}</div>
    </div>
  );
}

/**
 * Figma "Day Card" (Selected No / Yes): a large date number with the weekday below. The selected card is brand
 * coloured and a little larger; it grows with a spring while its neighbours ease aside (transform only, in CSS).
 */
export function DayCard({ day, weekday, label, selected, onClick, dataDay }: {
  day: number; weekday: string; label: string; selected: boolean; onClick: () => void; dataDay?: string;
}) {
  return (
    <button type="button" data-day={dataDay} className={[s.day, selected && s.daySelected].filter(Boolean).join(' ')} aria-pressed={selected} onClick={onClick} aria-label={label}>
      <span className={s.dayNum} aria-hidden="true">{day}</span>
      <span className={s.dayWord} aria-hidden="true">{weekday}</span>
    </button>
  );
}

/** Figma "Timeline": the "now" marker in today's plan: a deep emerald pill with a clock and the time, then a dashed line. */
export function Timeline({ time }: { time: string }) {
  return (
    <div className={s.timeline} role="note" aria-label={`Now, ${time}`}>
      <span className={s.timelineTab} aria-hidden="true"><Icon name="time" size={16} />{time}</span>
      <span className={s.timelineLine} />
    </div>
  );
}

type JourneyEnd = { city: string; time: string; date: string; terminal?: string };
/**
 * Figma "Journey details card" (421:3200): the top of a flight's or train's detail page. Tags for the number and the
 * status ("Check-in open" Warning, then "On time" Success, "Delayed" Warning or "Cancelled" Danger); the two cities with
 * big times and dates, the duration between; then (Show airport details) terminal, gate and boarding on the left,
 * terminal and belt on the right; a footer ("Operated by TAP Air Portugal · updated 2 min ago").
 * Trains, buses and ferries show stations or ports, the operator, coach and seat, and no live status.
 */
export function JourneyDetails({ mode = 'plane', number, status, duration, from, to, gate, boarding, belt, footer, airportDetails = true }: {
  /** The journey's icon: Plane, Train, Bus, Ferry or Taxi */ mode?: IconName; number?: string;
  status?: { label: string; tone: 'success' | 'warning' | 'danger' };
  duration?: string; from: JourneyEnd; to: JourneyEnd;
  gate?: string; boarding?: string; belt?: string; footer?: ReactNode;
  /** Figma "Show airport details" */ airportDetails?: boolean;
}) {
  return (
    <section className={s.journey} aria-label={`${from.city} to ${to.city}`}>
      {(number || status) && (
        <div className={s.journeyTags}>
          {number ? <Badge icon={mode}>{number}</Badge> : <span />}
          {status && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
      )}
      <div className={s.journeyTimes}>
        <div className={s.journeyEnd}>
          <span className={s.journeyCity}>{from.city}</span>
          <span className={s.journeyTime}>{from.time}</span>
          <span className={s.journeyDate}>{from.date}</span>
        </div>
        {duration && <Badge icon={mode}>{duration}</Badge>}
        <div className={[s.journeyEnd, s.journeyEndTo].join(' ')}>
          <span className={s.journeyCity}>{to.city}</span>
          <span className={s.journeyTime}>{to.time}</span>
          <span className={s.journeyDate}>{to.date}</span>
        </div>
      </div>
      {airportDetails && (from.terminal || to.terminal || gate || boarding || belt) && (
        <div className={s.journeyDetails}>
          <div className={s.journeySide}>
            {from.terminal && <span className={s.journeyPlace}>{from.terminal}</span>}
            {gate !== undefined && <span className={s.journeyInfo}>Gate {gate || '—'}</span>}
            {boarding && <span className={s.journeyInfo}>Boarding {boarding}</span>}
          </div>
          <div className={[s.journeySide, s.journeyEndTo].join(' ')}>
            {to.terminal && <span className={s.journeyPlace}>{to.terminal}</span>}
            {belt !== undefined && <span className={s.journeyInfo}>Belt {belt || '—'}</span>}
          </div>
        </div>
      )}
      {footer && <div className={s.journeyFooter}>{footer}</div>}
    </section>
  );
}
