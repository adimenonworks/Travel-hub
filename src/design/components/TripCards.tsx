import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CountryModal } from './CountryModal';
import { Icon, type IconName } from './Icon';
import { AvatarStack, Badge, Chip } from './Misc';
import { PageHeader } from './Bars';
import { ListItem } from './Rows';
import s from './TripCards.module.css';

type Person = { id: string; name: string; photo?: string | null };
type Country = { code: string; name: string; flag?: string };

/** Country chips that open each country's quick-info sheet (emergency number, entry requirements). */
function CountryChips({ countries, extra }: { countries: Country[]; extra?: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  if (countries.length === 0 && !extra) return null;
  return (
    <>
      <ul className={s.chips} aria-label="Countries">
        {countries.map((c) => <li key={c.code}><Chip flag={c.flag} onClick={() => setOpen(c.code)} label={`${c.name}: emergency number and entry requirements`}>{c.name}</Chip></li>)}
        {extra && <li>{extra}</li>}
      </ul>
      <CountryModal code={open} onClose={() => setOpen(null)} />
    </>
  );
}

/**
 * Figma "Hero Card": the trip's cover with a countdown Tag ("In 9 days"), then the name (Heading 2), meta, who's going,
 * the country chips and, under a divider, one row: what's next (Show next up). Phase-aware: the caller passes the
 * countdown and the row for before, during or after the trip. The name links to the trip; chips open country info.
 */
export function HeroCard({ cover, countdown, title, meta, countries, people, to, next }: {
  /** Figma "Show cover": a photo or Cover Scene; leave out for the panel alone */
  cover?: ReactNode;
  countdown?: { icon?: IconName; label: string };
  title: string; meta: ReactNode;
  countries: Country[];
  /** Figma "Show people" */
  people?: Person[];
  to?: string;
  /** Figma "Show next up": one List item, e.g. the next event */
  next?: { icon: IconName; title: string; meta?: string; to?: string };
}) {
  return (
    <section className={s.hero} aria-label={title}>
      {cover && (
        <div className={s.cover}>
          {cover}
          {countdown && <span className={s.countdown}><Badge tone="tint" icon={countdown.icon ?? 'calendar'}>{countdown.label}</Badge></span>}
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
        {!cover && countdown && <div><Badge tone="tint" icon={countdown.icon ?? 'calendar'}>{countdown.label}</Badge></div>}
        <CountryChips countries={countries} />
        {next && (
          <div className={s.rows}>
            <ListItem icon={next.icon} title={next.title} meta={next.meta} to={next.to} round />
          </div>
        )}
      </div>
    </section>
  );
}

/** Figma "Trip header": the Page Header (Title small), the trip's meta line, then its country chips and who's going. */
export function TripHeader({ title, meta, back, action, countries, going }: {
  title: string; meta: ReactNode;
  back?: { to: string; label: string };
  action?: { icon: IconName; label: string; onClick: () => void };
  countries: Country[];
  /** The "4 going" chip; tapping it opens People */
  going?: { label: string; to: string };
}) {
  return (
    <div className={s.tripHeader}>
      <PageHeader title={title} size="small" back={back} action={action} />
      <div className={s.meta}>{meta}</div>
      <CountryChips countries={countries} extra={going && <Link to={going.to} className={s.goingLink}><Chip icon="people">{going.label}</Chip></Link>} />
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
