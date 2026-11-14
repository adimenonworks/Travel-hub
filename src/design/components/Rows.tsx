import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { Avatar } from './Misc';
import { Tag } from './Misc';
import s from './Rows.module.css';

type Press = { to?: string; href?: string; onClick?: () => void; label?: string };

/** Renders as a link, an external link, a button or a plain element, so every row and card can be tapped the same way. */
function Pressable({ to, href, onClick, label, className, children, role }: Press & { className: string; children: ReactNode; role?: string }) {
  if (to) return <Link to={to} className={`${className} ${s.pressable}`} aria-label={label} role={role}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={`${className} ${s.pressable}`} aria-label={label} role={role}>{children}</a>;
  if (onClick) return <button type="button" onClick={onClick} className={`${className} ${s.pressable}`} aria-label={label} role={role}>{children}</button>;
  return <div className={className} role={role}>{children}</div>;
}

/** The round thumb that leads a row when it shows media (a flag, an avatar); an icon is a `.Category icon` instead. */
function Thumb({ media, round }: { media: ReactNode; round?: boolean }) {
  return <span className={[s.thumb, round && s.thumbRound].filter(Boolean).join(' ')}>{media}</span>;
}

/**
 * Figma "List item" (Size Large / Small): a 48px thumb (Small: 32), the title (Heading 3; Small: Body),
 * a meta line (Body small) and optional trailing text. Used inside a List group.
 */
export function ListItem({ title, meta, trailing, action, icon, media, size = 'large', round, type, ...press }: Press & {
  title: ReactNode; meta?: ReactNode; trailing?: ReactNode; icon?: IconName; media?: ReactNode; size?: 'large' | 'small'; round?: boolean;
  /** The nested `.Category icon`'s Type: the icon tile in an event type's colour (a place or an event). */
  type?: CategoryTone;
  /** Figma "Show action": a small Ghost Icon button at the end, e.g. Copy for a booking reference. Not inside a pressable row. */
  action?: ReactNode;
}) {
  return (
    <Pressable {...press} role="listitem" className={[s.item, size === 'small' && s.compact].filter(Boolean).join(' ')}>
      {media ? <Thumb media={media} round={round} /> : icon && <CategoryIcon icon={icon} type={type} size={size === 'small' ? 'small' : 'large'} tone="primary" />}
      <span className={s.itemText}>
        <span className={s.itemTitle}>{title}</span>
        {meta && <span className={s.itemMeta}>{meta}</span>}
      </span>
      {trailing !== undefined && trailing !== null && trailing !== false && <span className={s.itemTrailing}>{trailing}</span>}
      {action}
    </Pressable>
  );
}

/** Figma "List group": the rounded container (24px corners) that stacks List items. */
export function ListGroup({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return <div role="list" aria-label={label} className={[s.group, className].filter(Boolean).join(' ')}>{children}</div>;
}

/** Figma "Section header": Heading 2 title, optional Body small meta under it, optional Ghost action (e.g. "See all ›"). */
export function SectionHeader({ title, meta, action, level = 2 }: {
  title: ReactNode; meta?: ReactNode; action?: ReactNode; level?: 2 | 3;
}) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className={s.sectionHeader}>
      <div className={s.sectionText}>
        <H className={s.sectionTitle}>{title}</H>
        {meta && <div className={s.sectionMeta}>{meta}</div>}
      </div>
      {action}
    </div>
  );
}

/** A Section header with what sits under it, as one section of a page. */
export function PageSection({ title, meta, action, children, label }: { title: ReactNode; meta?: ReactNode; action?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <section className={s.pageSection} aria-label={label}>
      <SectionHeader title={title} meta={meta} action={action} />
      {children}
    </section>
  );
}

export type EventState = 'default' | 'next' | 'done';

/**
 * Figma "Event card" (Layout Standard / Journey / Note × State Default / Next / Done). The icon in a 40px circle,
 * the title (Heading 3), time · place (Body), an optional amount; Journey adds the from → to times; Extras show tags.
 * Next has the brand border; Done fades the content. The whole card opens the event.
 */
/** Figma "Type" on the Event card and Option card: the colour of the icon tile (an event's type; see categoryTone()). */
export type CategoryTone = 'neutral' | 'travel' | 'stays' | 'food' | 'activities' | 'notes';

/**
 * Figma `.Category icon`: the one place an event type's colour lives. A round tile with the category's icon, solid in
 * its type's colour with a white icon (Neutral: a plain tile). Nested in Event card, List item, Idea row, Option card
 * (Layout Category) and the Page header's leading icon, so none of them multiply by type.
 * - Size: Small 32 (16px icon), Medium 40, Large 48.
 * - Tone, the surface it sits on, which only changes the Neutral tile: Secondary (grey tile, on white), Primary (white
 *   tile, on a grey card), On dark (on the deep-green Next card, where the type colours take their 300 step).
 */
export function CategoryIcon({ icon, type = 'neutral', size = 'medium', tone = 'secondary', className }: {
  icon: IconName; type?: CategoryTone; size?: 'small' | 'medium' | 'large'; tone?: 'secondary' | 'primary' | 'on-feature'; className?: string;
}) {
  const cls = [s.catIcon, size !== 'medium' && s[`catIcon-${size}`], tone !== 'secondary' && s[`catIcon-${tone}`], type !== 'neutral' && s[`tone-${type}`], className];
  return <span className={cls.filter(Boolean).join(' ')} aria-hidden="true"><Icon name={icon} size={size === 'small' ? 16 : 24} /></span>;
}

export function EventCard({ title, time, timeIcon = 'clock', place, placeIcon = 'pin', amount, icon, layout = 'standard', state = 'default', type = 'neutral', journey, extras, status, favourite, to, onClick }: {
  title: string; time?: string; place?: string; amount?: string; icon: IconName;
  /** Figma Event card: the time and the place sit on their own lines, each after a small icon. The place's icon is a pin
   *  unless it isn't a place (a note's text, a stay's nights): pass null for no icon. */
  placeIcon?: IconName | null;
  /** The time line's icon; null when that line isn't a time (a flight's number). */ timeIcon?: IconName | null;
  /** Figma "Favourite": a filled star after the title (the event's Place is starred). */
  favourite?: boolean;
  layout?: 'standard' | 'journey' | 'note'; state?: EventState;
  /** The nested `.Category icon`'s Type: the icon tile's colour (on the deep-green Next card, Tone On dark). */
  type?: CategoryTone;
  journey?: { fromTime: string; fromPlace?: string; duration?: string; toTime: string; toPlace?: string; mode?: IconName };
  /** Figma "Show extras": Tag 1, Tag 2 */
  extras?: { icon?: IconName; label: string }[];
  /** Figma "Show status", e.g. "Check-in open" */
  status?: string;
  to?: string; onClick?: () => void;
}) {
  const cls = [s.event, s[`event-${layout}`], s[`event-${state}`], state === 'next' && 'feature'].filter(Boolean).join(' ');
  const stateText = state === 'next' ? ', up next' : state === 'done' ? ', done' : '';
  return (
    <Pressable to={to} onClick={onClick} className={cls} label={`${title}${favourite ? ', favourite' : ''}${time ? `, ${time}` : ''}${place ? `, ${place}` : ''}${amount ? `, ${amount} per person` : ''}${stateText}`}>
      <CategoryIcon icon={icon} type={type} tone={state === 'next' ? 'on-feature' : 'primary'} className={s.eventIcon} />
      <span className={s.eventBody} aria-hidden="true">
        <span className={s.eventHeader}>
          <span className={s.eventText}>
            <span className={s.eventTitleRow}><span className={s.eventTitle}>{title}</span>{favourite && <Icon name="star" size={16} state="filled" />}</span>
            {time && <span className={s.eventLine}>{timeIcon && <Icon name={timeIcon} size={16} />}<span className={s.eventTime}>{time}</span></span>}
            {place && <span className={s.eventLine}>{placeIcon && <Icon name={placeIcon} size={16} />}<span className={s.eventPlace}>{place}</span></span>}
          </span>
          {(amount || status) && (
            <span className={s.eventTrailing}>
              {amount && <span className={s.eventAmount}>{amount}</span>}
              {status && <span className={s.eventStatus}>{status}</span>}
            </span>
          )}
        </span>
        {layout === 'journey' && journey && (
          <span className={s.route}>
            <span className={s.routeTimes}>
              <span className={s.routeEnd}><span className={s.routeTime}>{journey.fromTime}</span>{journey.fromPlace && <span className={s.routePlace}>{journey.fromPlace}</span>}</span>
              <span className={s.routeMid}>
                {journey.duration && <span className={s.routePlace}>{journey.duration}</span>}
                <span className={s.routeLine}><span /><Icon name={journey.mode ?? 'plane'} size={16} /><span /></span>
              </span>
              <span className={`${s.routeEnd} ${s.routeEndTo}`}><span className={s.routeTime}>{journey.toTime}</span>{journey.toPlace && <span className={s.routePlace}>{journey.toPlace}</span>}</span>
            </span>
          </span>
        )}
        {extras && extras.length > 0 && (
          <span className={s.eventExtras}>{extras.map((e) => <Tag key={e.label} tone="neutral" icon={e.icon}>{e.label}</Tag>)}</span>
        )}
      </span>
    </Pressable>
  );
}

/** Figma "Travel connector": the line between two Event cards with how long getting there takes. */
export function TravelConnector({ label, icon = 'pin' }: { label: string; icon?: IconName }) {
  return <div className={s.connector}><Icon name={icon} size={16} />{label}</div>;
}

/** Figma "Vote button" (Voted No / Yes): thumbs up with the count. */
export function VoteButton({ count, selected, onClick, label }: { count: number; selected: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={[s.vote, selected && s.voted].filter(Boolean).join(' ')} aria-pressed={selected} aria-label={label} onClick={onClick}>
      <Icon name="thumbs-up" size={16} state={selected ? 'filled' : 'default'} style={selected ? { color: 'currentColor' } : undefined} />
      <span className="t-num">{count}</span>
    </button>
  );
}

/** Figma "Idea row": thumb, title (Heading 3), meta, an optional tag under it, and the Vote button. */
export function IdeaRow({ title, meta, icon, type, tag, vote, onClick }: {
  title: string; meta?: ReactNode; icon: IconName; tag?: { icon?: IconName; label: string };
  /** The nested `.Category icon`'s Type: the icon tile's colour (the idea's category type). */
  type?: CategoryTone;
  vote: { count: number; selected: boolean; onClick: () => void };
  onClick?: () => void;
}) {
  return (
    <div role="listitem" className={s.ideaRow}>
      <Pressable onClick={onClick} className={s.ideaMain} label={onClick ? `${title}: open` : undefined}>
        <CategoryIcon icon={icon} type={type} size="large" tone="primary" />
        <span className={s.itemText}>
          <span className={s.itemTitle}>{title}</span>
          {meta && <span className={s.itemMeta}>{meta}</span>}
          {tag && <span className={s.ideaTag}><Tag tone="neutral" icon={tag.icon}>{tag.label}</Tag></span>}
        </span>
      </Pressable>
      <VoteButton count={vote.count} selected={vote.selected} onClick={vote.onClick}
        label={`${vote.selected ? 'Remove your vote for' : 'Vote for'} ${title}, ${vote.count} ${vote.count === 1 ? 'vote' : 'votes'}`} />
    </div>
  );
}

/**
 * Figma "Tile": a 24px-corner square with a round icon or flag at the top and a title + meta at the bottom.
 * `add` (Figma "Add"): the dashed "New place to go" tile that ends a grid.
 */
export function Tile({ title, meta, icon, media, add, ...press }: Press & {
  title: string; meta?: ReactNode; icon?: IconName; media?: ReactNode; add?: boolean;
}) {
  return (
    <Pressable {...press} className={[s.tile, add ? s['tile-add'] : s['tile-default']].join(' ')}>
      <span className={s.tileIcon} aria-hidden="true">{media ?? (icon && <Icon name={icon} size={24} />)}</span>
      <span className={s.tileText}>
        <span className={s.tileTitle}>{title}</span>
        {meta && <span className={s.tileMeta}>{meta}</span>}
      </span>
    </Pressable>
  );
}



/** Figma "Stat strip" of ".Stat"s: big numbers (Heading 1) with a label, on the light emerald surface. */
export function StatStrip({ stats }: { stats: { value: ReactNode; label: string }[] }) {
  return (
    <dl className={s.stats}>
      {stats.map((st) => (
        <div key={st.label} className={s.stat}>
          <dt className={s.statLabel}>{st.label}</dt>
          <dd className={s.statValue}>{st.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Figma "Profile card": 40px avatar, name (Heading 2), email (Body small), chevron. */
export function ProfileCard({ name, email, photo, avatar, ...press }: Press & { name: string; email?: ReactNode; photo?: string | null; avatar?: ReactNode }) {
  return (
    <Pressable {...press} className={s.profile}>
      {avatar ?? <Avatar name={name} photo={photo} size="large" />}
      <span className={s.itemText}>
        <span className={s.profileName}>{name}</span>
        {email && <span className={s.itemMeta}>{email}</span>}
      </span>
      {(press.to || press.onClick || press.href) && <Icon name="chevron-right" size={24} className={s.chevron} />}
    </Pressable>
  );
}

/** Figma "Option card" (Selected No / Yes): a big tappable choice with an icon, a Heading 3 label and, with "Show
 *  description", a Body small line under it. Leave `selected` out when it's a one-tap choice (e.g. the add-event picker). */
/** Figma "Option card" (Layout Plain / Category). `type` gives Layout Category: the icon in a `.Category icon` (Medium,
 *  Secondary) 16px above the text, in the type's colour: the "Add to itinerary" type picker. */
export function OptionCard({ icon, label, description, selected, type, onClick }: { icon: IconName; label: string; description?: string; selected?: boolean; type?: CategoryTone; onClick: () => void }) {
  return (
    <button type="button" className={[s.option, type && s.optionTiled, selected && s.optionSelected].filter(Boolean).join(' ')} aria-pressed={selected} onClick={onClick}>
      {type ? <CategoryIcon icon={icon} type={type} /> : <Icon name={icon} size={24} />}
      <span className={s.optionLabel}>{label}</span>
      {description && <span className={s.optionDescription}>{description}</span>}
    </button>
  );
}

/**
 * Figma "Budget card" (Overview → Budget): what's left of the per-person budget after the events with prices, a bar
 * of how much is planned, and the planned total per category. Over budget, the label says so and the amount turns red.
 */
export function BudgetCard({ label, amount, caption, ratio, rows, over }: {
  label: string; amount: string; caption: string; ratio: number; over?: boolean;
  rows: { icon: IconName; label: string; amount: string; tone?: CategoryTone }[];
}) {
  return (
    <div className={s.budget}>
      <div className={s.budgetTotal}>
        <span className={s.budgetLabel}>{label}</span>
        <span className={[s.budgetAmount, over && s.budgetOver].filter(Boolean).join(' ')}>{amount}</span>
        <span className={s.budgetLabel}>{caption}</span>
      </div>
      <div className={s.budgetTrack} role="progressbar" aria-label="Planned of budget" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, ratio) * 100)}>
        <span className={over ? s.budgetFillOver : s.budgetFill} style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%` }} />
      </div>
      {rows.length > 0 && (
        <ul className={s.budgetRows} aria-label="Planned by category">
          {rows.map((r) => (
            <li key={r.label} className={s.budgetRow}><span className={r.tone ? s[`ink-${r.tone}`] : undefined}><Icon name={r.icon} size={16} /></span><span className={s.budgetRowLabel}>{r.label}</span><span className={s.budgetRowAmount}>{r.amount}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Figma "Step progress": "1 of 4" and four segments, filled up to the current step. On the bright emerald flow screen. */
export function StepProgress({ step, of = 4 }: { step: number; of?: number }) {
  return (
    <div className={s.steps} role="progressbar" aria-valuemin={1} aria-valuemax={of} aria-valuenow={step} aria-label={`Step ${step} of ${of}`}>
      <span className={s.stepSegments} aria-hidden="true">
        {Array.from({ length: of }, (_, i) => <span key={i} className={i < step ? s.stepOn : undefined} />)}
      </span>
    </div>
  );
}


