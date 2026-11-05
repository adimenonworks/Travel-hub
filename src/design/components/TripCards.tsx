import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { AvatarStack, Badge, Chip } from './Misc';
import { LinkButton } from './Button';
import { useToast } from './Toast';
import s from './TripCards.module.css';

type Person = { id: string; name: string; photo?: string | null };

/**
 * Figma "Hero Card": the trip's photo (or illustrated cover) with the "days to go / days left" corner, then a separate
 * panel with the name, dates, country chips, who's going and a chevron. The whole panel opens the trip.
 * Tone Brand: deep panel; Tone White: light grey panel with a subtle border. `cover` off shows only the panel.
 */
export function HeroCard({ image, title, subtitle, countries, people, count, to, tone = 'white', cover = true }: {
  image?: ReactNode; title: ReactNode; subtitle: ReactNode;
  /** The panel opens this page */
  to?: string;
  countries: { code: string; name: string; flag?: string }[];
  people: Person[];
  /** The corner, e.g. { value: 28, label: 'Days to go' } */
  count?: { value: number | string; label: string };
  tone?: 'brand' | 'white';
  /** Figma "Show cover" */
  cover?: boolean;
}) {
  const corner = count && (
    <div className={s.count} role="img" aria-label={`${count.value} ${count.label.toLowerCase()}`}>
      <span className={s.countValue}>{count.value}</span>
      <span className={s.countLabel}>{count.label}</span>
    </div>
  );
  const panel = (
    <>
      <div className={s.heroText}>
        <h2 className={s.heroName}>{title}</h2>
        <div className={s.heroSub}>{subtitle}</div>
        {countries.length > 0 && (
          <ul className={s.countries} aria-label="Countries">
            {countries.map((c) => <li key={c.code}><Chip flag={c.flag}>{c.name}</Chip></li>)}
          </ul>
        )}
        {people.length > 0 && <AvatarStack people={people} />}
      </div>
      {to && <Icon name="chevron-right" size={24} className={s.heroChevron} />}
    </>
  );
  return (
    <section className={[s.hero, s[`hero-${tone}`]].join(' ')} aria-label="Trip">
      {cover && image && <div className={s.heroImage}>{image}{corner}</div>}
      {to ? <Link to={to} className={s.heroPanel}>{panel}</Link> : <div className={s.heroPanel}>{panel}</div>}
    </section>
  );
}

/** Figma "Content Card": a trip on Home. Cover (photo or scene) with a "when" badge and who's going, then name, place and dates. */
export function ContentCard({ to, cover, when, people, name, place, dates, tone = 'default' }: {
  to: string; cover: ReactNode; when: ReactNode; people: Person[]; name: string; place: string; dates: string; tone?: 'default' | 'accent';
}) {
  return (
    <Link to={to} className={[s.content, tone === 'accent' && s.contentAccent].filter(Boolean).join(' ')}>
      <div className={s.contentCover}>
        {cover}
        <span className={s.contentWhen}><Badge tone="neutral" icon="calendar">{when}</Badge></span>
        {people.length > 0 && <span className={s.contentPeople}><AvatarStack people={people} size={24} /></span>}
      </div>
      <div className={s.contentBody}>
        <div className={s.contentText}>
          <span className={s.contentName}>{name}</span>
          <span className={s.contentPlace}>{place}</span>
        </div>
        <span className={s.contentDates}>{dates}</span>
      </div>
    </Link>
  );
}

/**
 * Figma "Event row": one event in the day plan, with what was entered in the sheet. The whole row opens the event;
 * the location copies itself to the clipboard; Maps and Uber take you there.
 */
export function EventRow({ to, title, location, time, category, going, people, price, mapsHref, uberHref }: {
  to: string; title: string; location?: string; time?: string;
  category: { icon: IconName; label: string };
  going: boolean; people: Person[]; price?: string;
  mapsHref?: string; uberHref?: string;
}) {
  const toast = useToast();
  const copy = async () => {
    if (!location) return;
    try { await navigator.clipboard.writeText(location); toast({ icon: 'copy', label: 'Address copied' }); } catch { /* clipboard blocked */ }
  };
  return (
    <article className={s.event}>
      <div className={s.eventLead}>
      <Icon name={category.icon} size={40} className={s.eventIcon} />
      <div className={s.eventMain}>
        <div className={s.eventTitle}>
          <h3><Link to={to} className={s.eventLink}>{title}</Link></h3>
          {(location || time) && (
            <div className={s.eventMeta}>
              {location && <button type="button" className={s.eventPlace} onClick={copy} aria-label={`Copy address: ${location}`}>{location}</button>}
              {time && <span className={s.eventTime}>{time}</span>}
            </div>
          )}
        </div>
        <div className={s.eventBadges}>
          <Badge tone="category" icon={category.icon}>{category.label}</Badge>
          {going && <Badge tone="success" icon="check">Going</Badge>}
        </div>
        {(people.length > 0 || price) && (
          <div className={s.eventBottom}>
            {people.length > 0 && <AvatarStack people={people} size={24} />}
            {price && <Badge tone="neutral" icon="wallet">{price}</Badge>}
          </div>
        )}
      </div>
      </div>
      {(mapsHref || uberHref) && (
        <div className={s.eventButtons}>
          {mapsHref && <LinkButton href={mapsHref} size="regular" iconEnd="pin" label={`Directions to ${title}`}>Maps</LinkButton>}
          {uberHref && <LinkButton href={uberHref} size="regular" variant="secondary" iconEnd="car" label={`Uber to ${title}`}>Uber</LinkButton>}
        </div>
      )}
    </article>
  );
}

/** Figma "Budget card": today's budget (orange when it runs low, red when it's gone) and the trip total. */
export function BudgetCard({ amount, label, total, level, action }: { amount: string; label: string; total: string; level: 'ok' | 'low' | 'over'; action?: ReactNode }) {
  return (
    <section className={s.budget} aria-label="Budget">
      <div className={s.budgetText}>
        <div className={s.budgetDaily}>
          <span className={[s.budgetAmount, s[`budget-${level}`]].join(' ')}>{amount}</span>
          <span className={s.budgetLabel}>• {label}{level !== 'ok' && <span className="visually-hidden">{level === 'low' ? ' (running low)' : ' (used up)'}</span>}</span>
        </div>
        <div className={s.budgetTotal}>{total} • Total budget</div>
      </div>
      {action}
    </section>
  );
}

/** Figma "Timeline": the "now" marker in today's plan: a pill with a clock and the time, then a dashed line. */
export function Timeline({ time }: { time: string }) {
  return (
    <div className={s.timeline} role="note" aria-label={`Now, ${time}`}>
      <span className={s.timelineTab} aria-hidden="true"><Icon name="time" size={16} />{time}</span>
      <span className={s.timelineLine} />
    </div>
  );
}
