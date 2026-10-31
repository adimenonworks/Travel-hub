import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { AvatarStack, Badge } from './Misc';
import { IconButton, LinkButton } from './Button';
import s from './TripCards.module.css';

type Person = { id: string; name: string; photo?: string | null };

/**
 * Figma "Hero Card": a trip's header. The photo (or illustrated cover) beside a deep emerald panel with the name,
 * dates, the countries it visits, who's going and shortcuts; a "days to go" corner on top. Stacks on phones.
 */
export function HeroCard({ image, title, subtitle, countries, people, count, actions, edit }: {
  image: ReactNode; title: ReactNode; subtitle: ReactNode;
  countries: { code: string; name: string; flag?: string }[];
  people: Person[];
  /** The big number in the corner, e.g. { value: 28, label: 'Days to go' } */
  count?: { value: number | string; label: string };
  actions?: ReactNode;
  /** An edit button for the corner of the panel */
  edit?: ReactNode;
}) {
  const corner = count && (
    <div className={s.count} aria-label={`${count.value} ${count.label.toLowerCase()}`}>
      <span className={s.countValue} aria-hidden="true">{count.value}</span>
      <span className={s.countLabel} aria-hidden="true">{count.label}</span>
    </div>
  );
  return (
    <section className={s.hero} aria-label="Trip">
      <div className={s.heroImage}>{image}<div className={s.cornerSmall}>{corner}</div></div>
      <div className={s.heroPanel}>
        <div className={s.cornerLarge}>{corner}</div>
        <div className={s.heroText}>
          <div className={s.heroTitle}>
            <h2 className={s.heroName}>{title}</h2>
            <div className={s.heroSub}>{subtitle}</div>
          </div>
          {countries.length > 0 && (
            <ul className={s.countries} aria-label="Countries">
              {countries.map((c) => (
                <li key={c.code}><Badge tone="inverse" size="large" flag={c.flag && <img src={c.flag} alt="" className={s.flag} />}>{c.name}</Badge></li>
              ))}
            </ul>
          )}
          {people.length > 0 && <AvatarStack people={people} size={32} />}
        </div>
        {actions && <div className={s.heroActions}>{actions}</div>}
        {edit && <div className={s.heroEdit}>{edit}</div>}
      </div>
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
 * Figma "Event row": one event in the day plan, with everything added in the sheet. The title opens the event;
 * the star saves it to your travel collections; Maps and Uber take you there.
 */
export function EventRow({ to, title, subtext, category, going, people, price, starred, onStar, mapsHref, uberHref, extra }: {
  to: string; title: string; subtext: ReactNode;
  category: { icon: IconName; label: string };
  going: boolean; people: Person[]; price?: string;
  starred: boolean; onStar: () => void;
  mapsHref?: string; uberHref?: string;
  extra?: ReactNode;
}) {
  return (
    <article className={s.event}>
      <div className={s.eventMain}>
        <div className={s.eventTitleRow}>
          <div className={s.eventTitle}>
            <h3><Link to={to} className={s.eventLink}>{title}</Link></h3>
            <div className={s.eventSub}>{subtext}</div>
          </div>
          <IconButton icon="star" state={starred ? 'filled' : 'default'} label={starred ? `Remove ${title} from favourites` : `Star ${title}`}
            aria-pressed={starred} onClick={onStar} className={s.eventStar} />
        </div>
        <div className={s.eventBadges}>
          <Badge tone="category" size="large" icon={category.icon}>{category.label}</Badge>
          {going && <Badge tone="success" size="large" icon="check">Going</Badge>}
        </div>
        <div className={s.eventBottom}>
          {people.length > 0 && <AvatarStack people={people} size={32} />}
          {price && <Badge tone="neutral" size="large" icon="wallet">{price}</Badge>}
          {extra}
        </div>
      </div>
      {(mapsHref || uberHref) && (
        <div className={s.eventButtons}>
          {mapsHref && <LinkButton href={mapsHref} iconEnd="pin" label={`Directions to ${title}`}>Maps</LinkButton>}
          {uberHref && <LinkButton href={uberHref} variant="secondary" iconEnd="car" label={`Uber to ${title}`}>Uber</LinkButton>}
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

/** Figma "Timeline": the dashed "now" line in today's plan, with a clock tab. */
export function Timeline({ time, innerRef }: { time: string; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className={s.timeline} role="note" aria-label={`Now, ${time}`}>
      <span className={s.timelineTab}><Icon name="time" size={16} /></span>
      <span className={s.timelineTime} aria-hidden="true">{time}</span>
      <span className={s.timelineLine} />
    </div>
  );
}
