import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { AvatarStack, Tag } from './Misc';
import { ListItem, type CategoryTone } from './Rows';
import s from './TripCards.module.css';

type Person = { id: string; name: string; photo?: string | null };


/**
 * Figma "Hero card": the trip's cover (an illustration, or a photo with its credit) with a countdown Tag ("In 9 days"),
 * then the name (Heading 2), dates, who's going and, under a divider, a heads-up row for one time-sensitive thing
 * (no next-up row: Home shows the next event on its own, 11 Nov 2026). Phase-aware: the caller passes the countdown and the rows.
 * One component since 13 Nov 2026 (no Size): one 5:2 cover everywhere; lists leave out the people and the heads-up row.
 */
export function HeroCard({ cover, photo, countdown, title, meta, people, to, headsUp }: {
  /** Figma "Show cover": a photo or an Illustration (Size Cover); leave out for the panel alone */
  cover?: ReactNode;
  /** Figma "Show photo": a photo over the cover, with "Photo by <name> on Unsplash" (both names linked) */
  photo?: { url: string; credit: ReactNode };
  countdown?: { icon?: IconName; label: string };
  title: string; meta: ReactNode;
  /** Figma "Show people" (lists leave it out) */
  people?: Person[];
  to?: string;
  /** Figma "Show heads-up": one time-sensitive row (check-in open, a flight change…) */
  headsUp?: { icon: IconName; title: string; meta?: string; to?: string; tone?: CategoryTone };
}) {
  return (
    <section className={s.hero} aria-label={title}>
      {cover && (
        <div className={s.cover}>
          {cover}
          {photo && <img className={s.photo} src={photo.url} alt="" />}
          {photo && <span className={s.scrim} aria-hidden="true" />}
          {photo && <span className={s.credit}>{photo.credit}</span>}
          {countdown && <span className={s.countdown}><Tag tone="neutral" icon={countdown.icon ?? 'calendar'}>{countdown.label}</Tag></span>}
        </div>
      )}
      <div className={s.body}>
        <div className={s.titleRow}>
          <div className={s.titleText}>
            <h2 className={s.name}>{to ? <Link to={to} className={s.nameLink}>{title}</Link> : title}</h2>
            <div className={s.meta}>{meta}</div>
          </div>
          {people && people.length > 0 && <AvatarStack people={people} />}
        </div>
        {!cover && countdown && <div><Tag tone="neutral" icon={countdown.icon ?? 'calendar'}>{countdown.label}</Tag></div>}
        {headsUp && (
          <div className={s.rows}>
            {headsUp && <ListItem icon={headsUp.icon} tone={headsUp.tone} title={headsUp.title} meta={headsUp.meta} to={headsUp.to} round />}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Figma "Day card" (Selected No / Yes): a large date number with the weekday below. The selected card is brand
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

/** Figma "Now line" (called Timeline until 13 Nov 2026): the "now" marker in today's plan: a deep emerald pill with a clock and the time, then a dashed line. */
export function NowLine({ time }: { time: string }) {
  return (
    <div className={s.timeline} role="note" aria-label={`Now, ${time}`}>
      <span className={s.timelineTab} aria-hidden="true"><Icon name="time" size={16} />{time}</span>
      <span className={s.timelineLine} />
    </div>
  );
}

type JourneyEnd = { city: string; time: string; date: string; terminal?: string };
/**
 * Figma "Journey card" (613:681): one card for anything with two ends, at the top of its event page.
 * - Layout Journey: a stack of `.Leg` (`JourneyLeg`) cards with a `.Stop` (`JourneyStop`) between legs, 8px apart.
 *   A direct journey is one leg; layovers are worked out from the legs, never stored.
 * - Layout Span: the two ends side by side (Check-in / Check-out, Pick-up / Drop-off, Embark / Disembark, Drop-off /
 *   Collect): a Body small label, the date (Heading 3), the time and, for a car, the place; an optional footer says how
 *   long (2 nights). Grey card, 24 corners, a divider between the two ends.
 * Merged from Journey details card, Layover block and Span card on 13 Nov 2026 (structure only: nothing looks different).
 */
export function JourneyCard(props:
  | { layout?: 'journey'; children: ReactNode; label?: string }
  | { layout: 'span'; start: SpanEnd; end: SpanEnd; footer?: string }) {
  if (props.layout === 'span') {
    const { start, end, footer } = props;
    const col = (e: SpanEnd) => (
      <div className={s.spanEnd}>
        <span className={s.spanLabel}>{e.label}</span>
        <span className={s.spanDate}>{e.date}</span>
        {e.time && <span className={s.spanTime}>{e.time}</span>}
        {e.place && <span className={s.spanLabel}>{e.place}</span>}
      </div>
    );
    return (
      <div className={s.span}>
        <div className={s.spanEnds}>{col(start)}<span className={s.spanDivider} aria-hidden="true" />{col(end)}</div>
        {footer && <p className={s.spanLabel}>{footer}</p>}
      </div>
    );
  }
  return <div className={s.journeyCard} aria-label={props.label}>{props.children}</div>;
}
type SpanEnd = { label: string; date: string; time?: string; place?: string };

/**
 * Figma "Layover block" → `.Stop` in Journey card: between the legs of one journey. Where and how long (worked out from
 * the gap between legs, never stored), an optional Warning tag ("Tight connection", "Overnight in Dubai") and action.
 */
export function JourneyStop({ title, meta, warning, action }: { title: string; meta?: string; warning?: string; action?: ReactNode }) {
  return (
    <div className={s.layover}>
      <div className={s.layoverRow}>
        <Icon name="clock" size={24} />
        <div className={s.layoverText}>
          <span className="t-heading-4">{title}</span>
          {meta && <span className="t-body-small t-secondary">{meta}</span>}
        </div>
      </div>
      {(warning || action) && <div className={s.layoverActions}>{warning && <Tag tone="warning" icon="info">{warning}</Tag>}{action}</div>}
    </div>
  );
}

/**
 * Figma `.Leg` in Journey card (was "Journey details card"): one leg of a flight or train. Tags for the number and the
 * status ("Check-in open" Warning, then "On time" Success, "Delayed" Warning or "Cancelled" Danger); the two cities with
 * big times and dates, the duration between; then (Show airport details) terminal, gate and boarding on the left,
 * terminal and belt on the right; a footer ("Operated by TAP Air Portugal · updated 2 min ago").
 * Trains, buses and ferries show stations or ports, the operator, coach and seat, and no live status.
 */
export function JourneyLeg({ mode = 'plane', number, status, duration, from, to, gate, boarding, belt, footer, airportDetails = true }: {
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
          {number ? <Tag icon={mode}>{number}</Tag> : <span />}
          {status && <Tag tone={status.tone}>{status.label}</Tag>}
        </div>
      )}
      <div className={s.journeyTimes}>
        <div className={s.journeyEnd}>
          <span className={s.journeyCity}>{from.city}</span>
          <span className={s.journeyTime}>{from.time}</span>
          <span className={s.journeyDate}>{from.date}</span>
        </div>
        {duration && <Tag icon={mode}>{duration}</Tag>}
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
