import { useState, type CSSProperties } from 'react';
import {
  Avatar, AvatarStack, Badge, Chip, Notification, Button, Card, EmptyState, FieldRow, HeroCard, Icon, IconButton,
  LinkButton, PageHeader, PageSection, SegmentControl, Select, Sheet, Tabs, TextArea, TextField, Timeline, Illustration,
  type IllustrationName, COVER_ILLUSTRATIONS, ICON_NAMES, useToast, BottomNav, Skeleton,
  ListItem, ListGroup, SectionHeader, EventCard, TravelConnector, IdeaRow, Tile, MapCard, StatStrip, ProfileCard,
  OptionCard, BudgetCard, Switch, SearchField, StepProgress, DestinationHeader, TripHeader, DayCard, CountryModal,
  CategoryIcon, ContextMenu, Accordion, SpanCard,
} from '../../design/components';
import { flagUrl } from '../../lib/countries';
import { EVENT_TYPES, TYPE_TONE } from '../../lib/categories';
import type { ReactNode } from 'react';
import s from './DesignSystem.module.css';

/** A titled block of this page: the Figma Section header (title, the note as its meta) and what it shows. */
function Section({ title, footer, children }: { title: string; footer?: ReactNode; children: ReactNode }) {
  return <PageSection title={title} meta={footer}>{children}</PageSection>;
}

// Colour by surface: same groups and names as the Figma "Color" collection. Every set has the same token names
// (accents leave out status), so each one is shown on its own surface.
const SET_TOKENS = ["surface-primary", "surface-secondary", "surface-brand", "surface-sunken", "text-primary", "text-secondary", "text-brand-yellow", "text-brand-orange", "text-brand-green", "text-brand-pink", "link-default", "link-hover", "link-pressed", "icon-primary", "icon-secondary", "icon-brand", "border-subtle", "border-bold", "border-focus", "border-brand", "divider-default", "illustration-primary", "illustration-secondary", "illustration-accent", "illustration-accent-bold", "illustration-accent-subtle", "illustration-warm", "illustration-warm-bold", "illustration-border", "status-success", "status-success-subtle", "status-warning", "status-warning-subtle", "status-error", "status-error-subtle"];
const surfaceSets: { name: string; title: string; note: string }[] = [
  { name: 'on-light', title: 'On light', note: 'White and light grey: the canvas, cards and sheets.' },
  { name: 'on-mid', title: 'On mid', note: 'Bright emerald: the Hero Card frame and accent cards.' },
  { name: 'on-dark', title: 'On dark', note: 'Deep emerald: the Hero Card panel.' },
];
// On accent: one set shared by every accent surface (they share one tone), so only the surface changes.
const ACCENTS = ['yellow', 'orange', 'green', 'pink'];
const PALETTES = ['emerald', 'green', 'orange', 'red', 'yellow', 'pink', 'sky', 'violet', 'neutral'];
const STEPS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const ACCENT_TOKENS = ["surface-sunken", "text-primary", "text-secondary", "text-brand-yellow", "text-brand-orange", "text-brand-green", "text-brand-pink", "link-default", "link-hover", "link-pressed", "icon-primary", "icon-secondary", "icon-brand-yellow", "icon-brand-orange", "icon-brand-green", "icon-brand-pink", "border-subtle", "border-bold", "border-focus", "border-brand", "divider-default", "illustration-primary", "illustration-secondary", "illustration-accent", "illustration-accent-bold", "illustration-accent-subtle", "illustration-warm", "illustration-warm-bold", "illustration-border"];
const colorGroups: { title: string; tokens: string[] }[] = [
  { title: 'Interactive / button (hover lighter, pressed darker)', tokens: ['--interactive-button-primary-background', '--interactive-button-primary-background-hover', '--interactive-button-primary-background-pressed', '--interactive-button-ghost-background-hover', '--interactive-button-ghost-background-pressed', '--interactive-button-inverse-neutral-background', '--interactive-button-inverse-brand-background', '--interactive-button-tertiary-background', '--interactive-button-destructive-background', '--interactive-button-destructive-background-hover', '--interactive-button-destructive-background-pressed'] },
  { title: 'Interactive / selected & unselected', tokens: ['--interactive-selected-primary-background', '--interactive-selected-secondary-background', '--interactive-selected-ghost-border', '--interactive-unselected-ghost-background', '--interactive-unselected-ghost-border', '--interactive-unselected-ghost-text'] },
  { title: 'Input and overlay', tokens: ['--input-field-background', '--input-field-border', '--input-field-border-selected', '--overlay-scrim', '--overlay-image'] },
];

// One row per Figma text style, at the default iPhone text size.
const typeStyles = [
  ['t-display', 'Display', '48 · Poppins Black · 100%'],
  ['t-display-tiny', 'Display tiny', '32 · Poppins Black · 100%'],
  ['t-heading-1', 'Heading 1', '28 · Manrope Bold · 100%'],
  ['t-heading-2', 'Heading 2', '20 · Semibold · 100%'],
  ['t-heading-3', 'Heading 3', '18 · Semibold · 100%'],
  ['t-heading-4', 'Heading 4', '18 · Bold · 100%'],
  ['t-body', 'Body', '14 · Regular · 150%'],
  ['t-body-small', 'Body small', '12 · Regular · 150%'],
  ['t-label', 'Label', '14 · Medium · 150%'],
  ['t-label-small', 'Label small', '12 · Medium · 150%'],
  ['t-link', 'Link', '14 · Medium'],
];

const spaces = ['--space-default-200', '--space-default-300', '--space-default-400', '--space-default-500', '--space-default-600', '--space-default-700', '--space-default-800', '--space-default-950', '--space-default-1000'];
const radii = ['--radius-500', '--radius-600', '--radius-800', '--radius-1000'];
const controlSizes = ['--size-control-sm', '--size-tap', '--size-control'];
const motions: [string, string][] = [
  ['--motion-fast', 'Colour and background changes (hover, press colours)'],
  ['--motion-fluid', 'Things that move: the tab underline, the segmented pill, day cards pushing and expanding'],
  ['--motion-press', 'A button or option pressing in (scales to 96%)'],
  ['--motion-release', 'Springing back out, with a small overshoot'],
  ['--motion-sheet', 'Sheets gliding up (or popping in on wider screens)'],
  ['--motion-sheet-out', 'Sheets sliding away on Cancel, Save or close: quicker, speeding up as they leave'],
];
const spotNames: IllustrationName[] = ['memories', 'ideas', 'calendar', 'map', 'ticket', 'suitcase', 'compass', 'globe', 'friends'];
const icons = ICON_NAMES;

/** Living reference for tokens and components, at /#/design. */
export function DesignSystem() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [on, setOn] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [opt, setOpt] = useState('others');
  const toast = useToast();

  return (
    <>
      <div className={s.page}>
        <PageHeader title="Design system" action={{ icon: 'pencil', label: 'Example header button', onClick: () => {} }} subtitle="Primitives → semantic tokens → components. One brand colour (emerald), light and dark mode. Every text pairing meets WCAG 2.2 AA." />
        <Section title="Palettes" footer="Primitives from src/design/tokens/primitives.css. Every step sits at the same contrast against white in every palette (600 is the first that passes for text on white). Components use semantic tokens, never these.">
          {PALETTES.map((p) => (
            <div key={p} className={s.paletteRow}>
              <div className="t-body-small">{p[0].toUpperCase() + p.slice(1)}</div>
              <div className={s.paletteSteps}>
                {STEPS.map((n) => (p === 'neutral' || (n > 0 && n < 1000))
                  ? <div key={n} className={s.paletteChip} title={`--color-${p}-${n}`} style={{ background: `var(--color-${p}-${n})` }} />
                  : <div key={n} aria-hidden="true" />)}
              </div>
            </div>
          ))}
        </Section>
        <Section title="Colour" footer="Semantic tokens from src/design/tokens/semantic.css, organised by the surface they sit on. Switch light/dark mode in Profile → Appearance.">
          {surfaceSets.map((set) => (
            <div key={set.name} className={s.surfaceSet} style={{ background: `var(--${set.name}-surface-primary)`, color: `var(--${set.name}-text-primary)` }}>
              <div className="t-heading-4">{set.title}</div>
              <p className="t-body-small" style={{ color: `var(--${set.name}-text-secondary)` }}>
                {set.note} <span style={{ color: `var(--${set.name}-link-default)`, textDecoration: 'underline' }}>A link</span>
              </p>
              <div className={s.swatches}>
                {SET_TOKENS.map((t) => (
                  <div key={t} className={s.swatch}>
                    <div className={s.chip} style={{ background: `var(--${set.name}-${t})`, boxShadow: `inset 0 0 0 1px var(--${set.name}-border-subtle)` }} />
                    <code className={s.code} style={{ color: `var(--${set.name}-text-secondary)` }}>{set.name}-{t}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Card>
            <div className="t-heading-4">On accent</div>
            <p className="t-body-small">Sparingly, for stand-out cards. Every accent shares the tokens on top except brand text and icons, which take the accent's own deep colour (for colour-drenched headings).</p>
            <div className={s.accents}>
              {ACCENTS.map((a) => (
                <div key={a} className={s.surfaceSet} style={{ background: `var(--on-accent-surface-${a})`, color: 'var(--on-accent-text-primary)' }}>
                  <div className="t-heading-4" style={{ color: `var(--on-accent-text-brand-${a})` }}>{a[0].toUpperCase() + a.slice(1)}</div>
                  <p className="t-body-small" style={{ color: 'var(--on-accent-text-secondary)' }}>
                    on-accent-surface-{a} <span style={{ color: 'var(--on-accent-link-default)', textDecoration: 'underline' }}>A link</span>
                  </p>
                </div>
              ))}
            </div>
            <div className={s.surfaceSet} style={{ background: 'var(--on-accent-surface-yellow)', color: 'var(--on-accent-text-primary)' }}>
              <div className={s.swatches}>
                {ACCENT_TOKENS.map((t) => (
                  <div key={t} className={s.swatch}>
                    <div className={s.chip} style={{ background: `var(--on-accent-${t})`, boxShadow: 'inset 0 0 0 1px var(--on-accent-border-subtle)' }} />
                    <code className={s.code} style={{ color: 'var(--on-accent-text-secondary)' }}>on-accent-{t}</code>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          {colorGroups.map((g) => (
            <Card key={g.title}>
              <div className="t-heading-4" style={{ marginBottom: 'var(--space-default-400)' }}>{g.title}</div>
              <div className={s.swatches}>
                {g.tokens.map((t) => (
                  <div key={t} className={s.swatch}>
                    <div className={s.chip} style={{ background: `var(${t})` }} />
                    <code className={s.code}>{t.replace('--', '')}</code>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </Section>

        <Section title="Typography" footer="Same names as the Figma text styles. Poppins Black for display titles and big numbers; Manrope for everything else. Headings are one line (100% line height). Sizes follow the iPhone text setting (shown here at the default).">
          <Card className={s.stack}>
            {typeStyles.map(([cls, name, spec]) => (
              <div key={cls} className={s.typeRow}>
                <span className={cls}>{name}</span>
                <code className={s.code}>.{cls} · {spec}</code>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Spacing & shape" footer="Named like Figma: space/inline-* inside components, space/page-* between sections. Controls are pills; cards have 24px corners. Minimum tap target 44×44.">
          <Card className={s.stack}>
            {spaces.map((t) => (
              <div key={t} className={s.spaceRow}>
                <code className={s.code}>{t}</code>
                <div className={s.spaceBar} style={{ width: `var(${t})` }} />
              </div>
            ))}
            <div className={s.radii}>
              {radii.map((r) => <div key={r} className={s.radius} style={{ borderRadius: `var(${r})` } as CSSProperties}><code className={s.code}>{r.replace('--radius-', '')}</code></div>)}
            </div>
            {controlSizes.map((t) => (
              <div key={t} className={s.spaceRow}>
                <code className={s.code}>{t}</code>
                <div className={s.spaceBar} style={{ width: `var(${t})`, height: `var(${t})` }} />
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Motion" footer="Tokens in semantic.css. Tap the tabs or the segmented control on this page to see --motion-fluid. With “reduce motion” on, changes are instant.">
          <Card className={s.stack}>
            {motions.map(([t, use]) => (
              <div key={t} className={s.typeRow}><code className={s.code}>{t}</code><span className="t-body-small t-secondary">{use}</span></div>
            ))}
          </Card>
        </Section>

        <Section title="Illustrations" footer="One style everywhere: white frames with a bold outline and a slight tilt, emerald land, a warm sun, sparkles. Spots go in empty states; covers fill a trip card when it has no photo.">
          <Card className={s.icons}>
            {spotNames.map((n) => <span key={n} className={s.icon}><Illustration name={n} size={96} /><code className={s.code}>{n}</code></span>)}
          </Card>
          <div className={s.covers}>
            {COVER_ILLUSTRATIONS.map((n) => <div key={n} className={s.coverBox}><Illustration name={n} /><code className={s.code}>{n}</code></div>)}
          </div>
        </Section>

        <Section title="Icons" footer="Uicons Rounded. Each icon has State=Default (line) and State=Filled (solid, in the brand colour), like the Figma set.">
          <Card className={s.icons}>
            {icons.map((n) => <span key={n} className={s.icon} title={n}><span><Icon name={n} /> <Icon name={n} state="filled" /></span><code className={s.code}>{n}</code></span>)}
          </Card>
        </Section>

        <Section title="Bottom Nav and Skeleton" footer="Figma Bottom Nav (Nav Item ×3: Home, Trip, You), floating on the frosted bar; hidden while typing. Figma Skeleton (Text, Block, Circle) replaces spinners while a page loads.">
          <Card>
            <BottomNav inline tabs={[
              { to: '/design', label: 'Home', icon: 'home', active: () => true },
              { to: '/design', label: 'Trip', icon: 'plane', active: () => false },
              { to: '/design', label: 'You', icon: 'person', active: () => false },
            ]} />
          </Card>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-default-400)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-default-400)' }}><Skeleton shape="circle" /><Skeleton width="60%" /></div>
              <Skeleton width="85%" />
              <Skeleton shape="block" />
            </div>
          </Card>
        </Section>

        <Section title="Buttons" footer="Figma Button: Variant × Size (Regular 48px, Small 40px with a 44px tap area). Icons can lead or trail.">
          <Card className={s.row}>
            <Button>Primary</Button>
            <Button variant="neutral">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button icon="plus">Leading icon</Button>
            <Button variant="neutral" iconEnd="arrow-up-right">Trailing icon</Button>
            <Button size="regular" icon="plus">Small</Button>
            <Button disabled>Disabled</Button>
            <LinkButton to="/" variant="neutral">Link button</LinkButton>
            <IconButton icon="x" label="Close (Ghost)" />
            <IconButton icon="pencil" label="Edit (Secondary)" tone="secondary" />
            <IconButton icon="send" label="Send (Primary)" tone="primary" />
            <IconButton icon="send" label="Send (Primary, disabled)" tone="primary" disabled />
            <Select compact aria-label="Compact select (matches a small button)"><option>Organizer</option><option>Member</option></Select>
          </Card>
          <Card tone="accent" className={s.row}><Button variant="inverse">Inverse</Button><IconButton icon="x" label="Close (On brand)" tone="on-brand" /></Card>
        </Section>

        <Section title="Navigation" footer="Tabs switch between sections of a page (each trip uses them). The current tab is darker and underlined in emerald (--interactive-selected-ghost-border).">
          <Card>
            <Tabs label="Demo tabs" items={[
              { to: '/design', label: 'Current', active: true },
              { to: '/', label: 'Trips', active: false },
              { to: '/profile', label: 'With count', count: 3, active: false },
            ]} />
          </Card>
        </Section>

        <Section title="Cards">
          <div className={s.cards}>
            <Card><div className="t-heading-3">Default card</div><p className="t-body-small t-secondary">White on the pale canvas, no shadow.</p></Card>
            <Card tone="accent"><div className="t-heading-3">Brand card</div><p className="t-body-small t-secondary">For the one thing that matters most on a page.</p><div><Button variant="inverse" icon="plus">Inverse button</Button></div></Card>
            <Card tone="accent" media={<Icon name="globe" size={56}  />} action={<Button variant="inverse">Action</Button>}>
              <div className="t-heading-3">Card with media and action</div><p className="t-body-small">The media sits on the left, the action on the right (below on phones).</p>
            </Card>
            <Card media={<Illustration name="memories" />}><div className="t-heading-4">Card with an illustration</div><p className="t-body-small t-secondary">Illustrations are for empty states and invitations.</p></Card>
          </div>
        </Section>

        <Section title="Chips and tags" footer="Chip (country pills: tap opens the Country sheet; Active / Inactive) and Tags (Neutral, Tint, Category, Success, Warning, Danger).">
          <div className={s.row}>
            <Chip flag={flagUrl('pt')} onClick={() => setCountry('pt')} label="About Portugal">Portugal</Chip>
            <Chip active flag={flagUrl('es')}>Spain</Chip>
            <Chip icon="people">4 going</Chip>
          </div>
          <div className={s.row}>
            <Badge icon="calendar">In 9 days</Badge><Badge tone="tint" icon="check">Tint (unused)</Badge><Badge tone="category" icon="camera">Category</Badge><Badge tone="success" icon="check">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Danger</Badge>
          </div>
        </Section>

        <Section title="Trip components" footer="Hero Card (phase-aware countdown, an optional heads-up row; no next-up row since 11 Nov 2026: Home shows the Next card on its own; Size Compact for lists), Trip header, Day Card, Timeline.">
          <HeroCard cover={<Illustration name={COVER_ILLUSTRATIONS[1]} />} countdown={{ label: 'In 9 days' }} title="Portugal & Spain" meta="Nov 2 – 11 · 10 days"
            people={[{ id: 'a', name: 'Alex Menon' }, { id: 'j', name: 'Jo Ma' }, { id: 's', name: 'Sam Lee' }, { id: 'p', name: 'Priya Shah' }]} to="/design" />
          <HeroCard countdown={{ label: 'Day 3 of 15' }} title="Japan" meta="Mar 20 – Apr 3 · 15 days" people={[{ id: 'a', name: 'Alex Menon' }, { id: 'j', name: 'Jo Ma' }, { id: 's', name: 'Sam Lee' }, { id: 'p', name: 'Priya Shah' }]} />
          <HeroCard size="compact" cover={<Illustration name={COVER_ILLUSTRATIONS[2]} />} countdown={{ label: 'In 40 days' }} title="Japan" meta="Dec 17 – 31 · 15 days" to="/design" />
          <TripHeader title="Portugal & Spain" back={{ to: '/design', label: 'Trips' }} action={{ icon: 'pencil', label: 'Edit trip', onClick: () => {} }}
            meta="2 – 11 Nov · 10 days" />
          <div className={s.row}>
            <DayCard day={3} weekday="Tue" label="Today, Tuesday 3 November" selected onClick={() => {}} />
            <DayCard day={4} weekday="Wed" label="Tomorrow, Wednesday 4 November" selected={false} onClick={() => {}} />
            <DayCard day={5} weekday="Thu" label="Day 4, Thursday 5 November" selected={false} onClick={() => {}} />
          </div>
          <Timeline time="12:30" />
        </Section>

        <Section title="Event cards" footer="Event card: Layout Standard / Journey / Note × State Default / Next / Done, joined by Travel connectors.">
          <EventCard icon="coffee" title="Breakfast at Manteigaria" time="09:00 – 10:00" place="Chiado" amount="€12" state="done" to="/design" />
          <TravelConnector label="About 8 min walk" />
          <EventCard icon="utensils" title="Time Out Market" time="13:30 – 15:00" place="Cais do Sodré" amount="€25" state="next" to="/design"
            extras={[{ icon: 'info', label: 'Next · in 1 hr' }, { icon: 'people', label: '2 of 4 going' }]} />
          <TravelConnector label="About 20 min by car" icon="car" />
          <EventCard icon="plane" layout="journey" title="Lisbon → Porto" time="TP1946" place="TAP Air Portugal" amount="€89" status="Check-in open" to="/design"
            journey={{ fromTime: '08:30', fromPlace: 'LIS · T1', duration: '55m · direct', toTime: '09:25', toPlace: 'OPO' }} />
          <EventCard icon="notebook" layout="note" title="Bag drop closes 40 min before" place="Sam has the passports" />
        </Section>

        <Section title="Event categories" footer="Every category, by type, with its icon and the type's colour (src/lib/categories.ts). The icon tells categories apart; the colour tells types apart.">
          {EVENT_TYPES.map((t) => (
            <ListGroup key={t.value} label={t.label}>
              <h3 className="t-heading-3">{t.label}</h3>
              {t.kinds.map((k) => <ListItem key={k.value} size="compact" icon={k.icon} tone={TYPE_TONE[t.value]} title={k.label} meta={k.behaviour === 'span' ? 'Shown twice: start and end' : undefined} />)}
            </ListGroup>
          ))}
        </Section>

        <Section title="Event types" footer="Type sets the icon tile's colour (--category-<type>-surface / -icon): Getting around (flights included) sky, Stays violet, Food & drink yellow, Activities pink, Notes emerald; Free time stays Neutral. On the deep-green Next card the tile takes the bright step. List items, Idea rows and active Chips use the same colours; the price sits subtle at the top right. Option cards in the Add to itinerary picker use the same tiles, 16px above the text.">
          <EventCard icon="plane" tone="travel" title="Transfer to the hotel" time="09:30 – 10:10" place="Porto Airport" to="/design" />
          <EventCard icon="hotel" tone="stays" title="Check-in · Torel Palace" time="15:00" place="Ribeira" to="/design" />
          <EventCard icon="coffee" tone="food" title="Coffee at Combi" time="11:00 – 11:45" place="Baixa" to="/design" />
          <EventCard icon="bank" tone="activities" title="Serralves Museum" time="12:30 – 14:30" place="Lordelo do Ouro" to="/design" />
          <EventCard icon="hourglass" title="Free time" time="16:00 – 18:00" place="Wander the riverside" placeIcon={null} to="/design" />
          <EventCard icon="notebook" tone="notes" layout="note" title="Bag drop closes 40 min before" place="Sam has the passports" placeIcon={null} />
          <EventCard icon="hotel" tone="stays" title="Check-in at the Torel Palace Porto, a long hotel name" time="15:00" place="Ribeira" amount="€320" to="/design" />
          <EventCard icon="utensils" tone="food" state="next" title="Time Out Market" time="13:30 – 15:00" place="Cais do Sodré" amount="€25" to="/design" />
          <ListGroup label="Places and ideas by type">
            <ListItem icon="house-chimney" tone="stays" title="Casa do Príncipe" meta="Airbnb or holiday home · Lisbon" />
            <ListItem icon="glass-cheers" tone="food" title="Quinta da Pacheca" meta="Tasting · Douro" />
            <IdeaRow icon="bank" tone="activities" title="Gulbenkian Museum" meta="Museum or gallery · Lisbon · Sam" vote={{ count: 2, voted: false, onClick: () => {} }} />
          </ListGroup>
          <div className={s.chipRow}>
            <Chip icon="plane" tone="travel" active>Flight</Chip><Chip icon="hotel" tone="stays" active>Hotel</Chip><Chip icon="coffee" tone="food" active>Café</Chip>
            <Chip icon="camera" tone="activities" active>Sight</Chip><Chip icon="notebook" tone="notes" active>Note</Chip><Chip icon="train" tone="travel">Train</Chip>
          </div>
          <div className={s.optionGrid}>
            <OptionCard icon="plane" tone="travel" label="Getting around" description="Flights, trains, buses, ferries, taxis, transfers and car hire" onClick={() => {}} />
            <OptionCard icon="bed" tone="stays" label="Stays" description="Hotels, apartments, hostels, camping and cruises" onClick={() => {}} />
            <OptionCard icon="utensils" tone="food" label="Food & drink" description="Restaurants, cafés, bars and markets" onClick={() => {}} />
            <OptionCard icon="ticket" tone="activities" label="Activities" description="Sights, tours, walks, hikes, shows and experiences" onClick={() => {}} />
            <OptionCard icon="hourglass" tone="neutral" label="Free time" description="Time to rest, wander or keep open" onClick={() => {}} />
            <OptionCard icon="notebook" tone="notes" label="Notes & reminders" description="A note, or a small task like luggage storage or picking up a SIM" onClick={() => {}} />
          </div>
        </Section>

        <Section title="Event page header and Context menu" footer="Page Header Title small with Show icon (the Category icon: a 40px round tile in the type's colour) and Show subtitle (the time). Context menu: what a long press on your own comment opens (Edit, Delete in red); tap the bubble to see it.">
          <div className={s.chipRow}>
            {(['neutral', 'travel', 'stays', 'food', 'activities', 'notes'] as const).map((t) => <CategoryIcon key={t} icon={t === 'food' ? 'grape' : 'plane'} tone={t} />)}
          </div>
          <PageHeader size="small" icon="grape" tone="food" title="Quinta da Pacheca" subtitle="Thu 12 Nov, 15:00 – 17:00" back={{ to: '/design', label: 'Itinerary' }} action={{ icon: 'pencil', label: 'Example edit button', onClick: () => {} }} />
          <div>
            {menu ? (
              <ContextMenu label="Message actions" onClose={() => setMenu(false)} items={[{ label: 'Edit', icon: 'pencil', onClick: () => {} }, { label: 'Delete', icon: 'trash', destructive: true, onClick: () => {} }]}>
                <Button variant="neutral">Perfect, see you there</Button>
              </ContextMenu>
            ) : <Button variant="neutral" onClick={() => setMenu(true)}>Perfect, see you there</Button>}
          </div>
        </Section>

        <Section title="Span card" footer="Figma Span card: the two ends of a stay, car, cruise, parking or luggage, at the top of its event page. A car shows its places; the footer says how long.">
          <SpanCard start={{ label: 'Check-in', date: 'Thu 12 Nov', time: '15:00' }} end={{ label: 'Check-out', date: 'Sat 14 Nov', time: '11:00' }} footer="2 nights" />
          <SpanCard start={{ label: 'Pick-up', date: 'Fri 13 Nov', time: '10:00', place: 'Porto Campanhã' }} end={{ label: 'Drop-off', date: 'Mon 16 Nov', time: '18:00', place: 'Barcelona Sants' }} footer="4 days" />
        </Section>

        <Section title="Accordion" footer="Figma Accordion: a grey card that folds a group away (a day of events in Save to Rove → Add to an event). Starts collapsed; the chevron turns over when open.">
          <Accordion title="Fri 13 Nov" meta="2 events">
            <ListItem icon="utensils" tone="food" title="Dinner at Ramiro" meta="19:30 · Restaurant" onClick={() => {}} />
            <ListItem icon="bank" tone="activities" title="Tile museum" meta="14:00 · Museum or gallery" onClick={() => {}} />
          </Accordion>
          <Accordion title="Sat 14 Nov" meta="1 event" defaultOpen>
            <ListItem icon="train" tone="travel" title="Train to Porto" meta="09:10 · Train" onClick={() => {}} />
          </Accordion>
        </Section>

        <Section title="Rows, groups and tiles" footer="Section header, List group of List items (Default / Compact), Idea rows with Vote buttons, Tiles, Map card, Stat strip, Profile Card.">
          <SectionHeader title="Collections" meta="4 places · 61 saves" action={<LinkButton to="/design" variant="ghost" size="regular" iconEnd="chevron-right">See all</LinkButton>} />
          <ListGroup>
            <ListItem icon="utensils" title="Ichiran Shibuya" meta="Ramen · Tokyo · from TikTok" trailing="2h" onClick={() => {}} />
            <ListItem icon="link" title="10 things to do in Cusco" meta="Article · Peru · cntraveler.com" trailing="Yesterday" />
            <ListItem size="compact" icon="doc" title="TAP e-ticket" trailing="PDF · 2h ago" />
            <BudgetCard label="Left to spend" amount="A$1,800" caption="of A$5,000 per person · A$3,200 planned" ratio={0.64}
              rows={[{ icon: 'plane', label: 'Flights', amount: 'A$1,900' }, { icon: 'bed', label: 'Stays', amount: 'A$900' }, { icon: 'key', label: 'Car rental', amount: 'A$180' }]} />
            <OptionCard icon="wallet" label="Yes" description="Add costs to your bookings to see what the trip adds up to" onClick={() => {}} />
            <ListItem icon="ticket" title="TP-7XK2LQ" meta="Booking reference" action={<IconButton small icon="copy" label="Copy booking reference" onClick={() => {}} />} />
          </ListGroup>
          <ListGroup>
            <IdeaRow icon="star" title="Fado night in Alfama" meta="Show · Clube de Fado · €30 · Sam" tag={{ icon: 'star', label: 'Most votes' }} vote={{ count: 4, voted: true, onClick: () => {} }} />
            <IdeaRow icon="utensils" title="Pastéis de Belém" meta="Bakery · Belém · Priya" vote={{ count: 2, voted: false, onClick: () => {} }} />
          </ListGroup>
          <div className={s.tiles}>
            <Tile tone="orange" media={<img src={flagUrl('jp')} alt="" />} title="Japan" meta="24 saves · 3 cities" />
            <Tile tone="green" media={<img src={flagUrl('pe')} alt="" />} title="Peru" meta="18 saves" />
            <Tile tone="yellow" media={<img src={flagUrl('ca')} alt="" />} title="Canada" meta="12 saves" />
            <Tile tone="pink" media={<img src={flagUrl('mx')} alt="" />} title="Mexico" meta="7 saves" />
            <Tile icon="plane" title="Flights" meta="3 flights" to="/design" />
            <Tile tone="add" icon="plus" title="New place to go" />
          </div>
          <div className={s.quickRow}>
          </div>
          <MapCard media={<Illustration name="map" size={72} />} title="See 15 places on a map" meta="Tokyo, Kyoto, Osaka" onClick={() => {}} />
          <StatStrip stats={[{ value: 12, label: 'countries' }, { value: 31, label: 'cities' }, { value: 96, label: 'days away' }]} />
          <ProfileCard name="Alex Menon" email="alex.menon@gmail.com · Google" onClick={() => {}} />
          <DestinationHeader tone="orange" flag={<img src={flagUrl('jp')} alt="" />} title="24 saves · 3 cities" meta="Saved by you and Sam" />
        </Section>

        <Section title="Flow" footer="Search field, Option cards and Step progress (shown on the bright emerald Flow screen).">
          <SearchField label="Search a country or city" placeholder="Search a country or city" />
          <div className={s.tiles}>
            <OptionCard icon="person" label="Just me" selected={opt === 'me'} onClick={() => setOpt('me')} />
            <OptionCard icon="people" label="With others" selected={opt === 'others'} onClick={() => setOpt('others')} />
          </div>
          <div className={s.flowSample}><StepProgress step={2} /></div>
        </Section>

        <Section title="Inputs">
          <Card className={s.stack}>
            <FieldRow>
              <TextField label="Text field" placeholder="Placeholder" />
              <Select label="Select"><option>One</option><option>Two</option></Select>
            </FieldRow>
            <FieldRow>
              <TextField label="Date" type="date" />
              <TextField label="Time" type="time" />
            </FieldRow>
            <TextArea label="Text area" placeholder="Notes" />
            <SegmentControl label="Demo" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }, { value: 'c', label: 'Third' }]} />
          </Card>
        </Section>

        <Section title="Feedback & identity">
          <Card className={s.stack}>
            <div className={s.row}>
              <Avatar name="Alex Kim" size={24} />
            </div>
            <div className={s.row}>
              <Avatar name="Alex Kim" size={40} /><Avatar name="Jo" size={32} />
              <AvatarStack people={['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay'].map((n) => ({ id: n, name: n }))} />
            </div>
            {(['brand', 'neutral', 'success', 'warning', 'error'] as const).map((st) => <Notification key={st} state={st}>Notification, state {st}.</Notification>)}
            <div className={s.row}>
              <Button variant="neutral" icon="copy" onClick={() => toast({ icon: 'copy', label: 'Address copied' })}>Show a toast</Button>
              <Button variant="neutral" onClick={() => toast({ tone: 'error', label: "Couldn't save. Check your connection" })}>Error toast</Button>
              <Button variant="neutral" onClick={() => toast({ icon: 'check', label: 'Saved to Portugal', action: { label: 'Undo', onClick: () => {} } })}>Toast with Undo</Button>
              <Button variant="neutral" onClick={() => toast({ size: 'large', icon: 'chat', label: 'Sam on Tram 28 to Alfama: Meet at the stop?', action: { label: 'Open', onClick: () => {} } })}>Large toast (message)</Button>
            </div>
            <Switch checked={on} onChange={setOn} label="Also add to Portugal & Spain ideas" hint="Your trip covers Lisbon" />
          </Card>
          <Card><EmptyState illustration="ideas" title="Empty state" message="Explains what goes here and how to start." action={<Button variant="neutral" onClick={() => setSheet(true)}>Open a sheet</Button>} /></Card>
        </Section>
      </div>
      <Sheet open={sheet} title="Save to Rove" subtitle="A short task over the current screen" onClose={() => setSheet(false)} onSubmit={() => setSheet(false)} submitLabel="Save">
        <TextField label="Note (optional)" placeholder="Why did you save this?" />
      </Sheet>
      <CountryModal code={country} onClose={() => setCountry(null)} />
    </>
  );
}
