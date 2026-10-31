import { useState, type CSSProperties } from 'react';
import {
  Avatar, AvatarStack, Badge, BudgetCard, Notification, Button, Card, ColorPicker, ContentCard, EmptyState, EventRow, FieldRow, HeroCard, Icon, IconButton,
  LinkButton, List, ListRow, PageHeader, SegmentedControl, Section, Select, Sheet, Spinner, Tabs, TextArea, TextField, Timeline, Illustration,
  type IllustrationName, COVER_ILLUSTRATIONS, ICON_NAMES, useToast,
} from '../../design/components';
import { flagUrl } from '../../lib/countries';
import { COVER_COLORS } from '../../lib/colors';
import s from './DesignSystem.module.css';

// Same groups and names as the Figma "Color" collection.
const colorGroups: { title: string; tokens: string[] }[] = [
  { title: 'Text', tokens: ['--text-primary', '--text-body', '--text-subtle', '--text-inverse', '--text-brand', '--text-on-brand-bold', '--text-on-image', '--text-link', '--text-link-hover', '--text-link-pressed'] },
  { title: 'Icon', tokens: ['--icon-primary', '--icon-subtle', '--icon-inverse', '--icon-brand', '--icon-brand-hover', '--icon-on-brand', '--icon-on-secondary', '--icon-on-selected', '--icon-on-destructive'] },
  { title: 'Status', tokens: ['--status-success', '--status-warning', '--status-error', '--status-success-subtle', '--status-warning-subtle', '--status-error-subtle'] },
  { title: 'Surface', tokens: ['--surface-background-primary', '--surface-background-secondary', '--surface-background-tertiary', '--surface-brand', '--surface-brand-subtle', '--surface-brand-bold', '--surface-sunken'] },
  { title: 'Interactive / button (hover lighter, pressed darker)', tokens: ['--interactive-button-primary-background', '--interactive-button-primary-background-hover', '--interactive-button-primary-background-pressed', '--interactive-button-secondary-background', '--interactive-button-secondary-background-hover', '--interactive-button-secondary-background-pressed', '--interactive-button-ghost-background-hover', '--interactive-button-ghost-background-pressed', '--interactive-button-inverse-background', '--interactive-button-destructive-background', '--interactive-button-destructive-background-hover', '--interactive-button-destructive-background-pressed'] },
  { title: 'Interactive / selected & unselected', tokens: ['--interactive-selected-primary-background', '--interactive-selected-secondary-background', '--interactive-selected-ghost-border', '--interactive-unselected-ghost-background', '--interactive-unselected-ghost-border', '--interactive-unselected-ghost-text'] },
  { title: 'Illustration', tokens: ['--illustration-primary', '--illustration-secondary', '--illustration-accent', '--illustration-accent-subtle', '--illustration-accent-bold', '--illustration-border', '--illustration-warm', '--illustration-warm-bold'] },
  { title: 'Border', tokens: ['--border-subtle', '--border-bold', '--border-accent', '--border-focus', '--input-field-border'] },
];

// One row per Figma text style. Sizes are phone → 744px and up.
const typeStyles = [
  ['t-display', 'Display', '48 → 64 · Poppins Black · 100%'],
  ['t-display-small', 'Display small', '56 · Poppins Black · 100%'],
  ['t-display-secondary', 'Display secondary', '40 → 48 · Poppins Black · 100%'],
  ['t-heading-1', 'Heading 1', '28 → 32 · Manrope Bold · 100%'],
  ['t-heading-2', 'Heading 2', '20 → 24 · Semibold · 100%'],
  ['t-heading-3', 'Heading 3', '18 → 20 · Semibold · 100%'],
  ['t-heading-4', 'Heading 4', '18 · Bold · 100%'],
  ['t-body', 'Body', '14 → 16 · Regular · 150%'],
  ['t-body-small', 'Body small', '12 → 14 · Regular · 150%'],
  ['t-label', 'Label', '14 · Medium · 150%'],
  ['t-label-small', 'Label small', '12 → 14 · Medium · 150%'],
  ['t-link', 'Link', '14 → 16 · Medium'],
];

const spaces = ['--space-inline-xxs', '--space-inline-xs', '--space-inline-s', '--space-inline-m', '--space-inline-l', '--space-inline-xl', '--space-inline-xxl', '--space-inline-max'];
const radii = ['--radius-l', '--radius-xl', '--radius-xxxl', '--radius-round'];
const controlSizes = ['--size-control-sm', '--size-tap', '--size-control'];
const motions: [string, string][] = [
  ['--motion-fast', 'Colour and background changes (hover, press colours)'],
  ['--motion-fluid', 'Things that move: the tab underline, the segmented pill, day cards pushing and expanding'],
  ['--motion-press', 'A button or option pressing in (scales to 96%)'],
  ['--motion-release', 'Springing back out, with a small overshoot'],
  ['--motion-sheet', 'Sheets gliding up (or popping in on wider screens)'],
  ['--motion-sheet-out', 'Sheets sliding away on Cancel, Save or close: quicker, speeding up as they leave'],
];
const spotNames: IllustrationName[] = ['memories', 'ideas', 'calendar', 'map', 'ticket', 'suitcase', 'compass', 'globe', 'people'];
const icons = ICON_NAMES;

/** Living reference for tokens and components, at /#/design. */
export function DesignSystem() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [color, setColor] = useState('emerald');
  const [sheet, setSheet] = useState(false);
  const toast = useToast();

  return (
    <>
      <div className={s.page}>
        <PageHeader title="Design system" action={{ icon: 'pencil', label: 'Example header button', onClick: () => {} }} subtitle="Primitives → semantic tokens → components. One brand colour (emerald), light and dark mode. Every text pairing meets WCAG 2.2 AA." />
        <Section title="Colour" footer="Semantic tokens from src/design/tokens/semantic.css. Switch light/dark mode in Profile → Appearance.">
          {colorGroups.map((g) => (
            <Card key={g.title}>
              <div className="t-heading-4" style={{ marginBottom: 'var(--space-inline-s)' }}>{g.title}</div>
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

        <Section title="Typography" footer="Same names as the Figma text styles. Poppins Black for display titles and big numbers; Manrope for everything else. Headings are one line (100% line height). Nothing is under 14px from 744px up.">
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

        <Section title="Buttons" footer="Figma Button: Variant × Size (Regular 48px, Small 40px with a 44px tap area). Icons can lead or trail.">
          <Card className={s.row}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button icon="plus">Leading icon</Button>
            <Button variant="secondary" iconEnd="arrow-up-right">Trailing icon</Button>
            <Button size="small" icon="plus">Small</Button>
            <Button disabled>Disabled</Button>
            <LinkButton to="/" variant="secondary">Link button</LinkButton>
            <IconButton icon="comment" label="Comments" />
            <IconButton icon="star" state="filled" label="Starred" />
            <IconButton icon="plus" label="Add" variant="secondary" />
            <Select compact aria-label="Compact select (matches a small button)"><option>Organizer</option><option>Member</option></Select>
          </Card>
          <Card tone="accent" className={s.row}><Button variant="inverse">Inverse</Button><IconButton icon="pencil" label="Edit" variant="inverse" /></Card>
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

        <Section title="Trip components" footer="Hero Card, Content Card, Event row, Budget card and Timeline: built from the components above, as in Figma.">
          <HeroCard image={<Illustration name={COVER_ILLUSTRATIONS[0]} />} title="Summer in Lisbon" subtitle="Jul 3 – 9 · 7 days"
            countries={[{ code: 'pt', name: 'Portugal', flag: flagUrl('pt') }, { code: 'es', name: 'Spain', flag: flagUrl('es') }]}
            people={['Ana', 'Ben', 'Cy'].map((n) => ({ id: n, name: n }))} count={{ value: 28, label: 'Days to go' }}
            actions={(size) => <><Button size={size} icon="calendar">Itinerary</Button><Button size={size} variant="secondary" icon="wallet">Budget</Button><Button size={size} variant="secondary" icon="lightbulb">Ideas</Button></>} />
          <BudgetCard amount="€120" label="Left today" total="€2,000" level="ok" action={<Button variant="secondary" icon="pencil">Edit today’s budget</Button>} />
          <BudgetCard amount="€0" label="Planned so far" total="No total set" level="ok" action={<Button variant="secondary" icon="pencil">Add budget</Button>} />
          <BudgetCard amount="€35" label="Left today" total="€2,000" level="low" />
          <BudgetCard amount="€20" label="Over today" total="€2,000" level="over" />
          <Timeline time="2:30 PM" />
          <EventRow to="/design" title="Sunset at Miradouro" location="Miradouro da Graça" time="7:30 PM" category={{ icon: 'camera', label: 'Sightseeing' }}
            going people={['Ana', 'Ben'].map((n) => ({ id: n, name: n }))} price="€12 pp" mapsHref="https://maps.google.com" uberHref="https://m.uber.com" />
          <div className={s.cards}>
            <ContentCard to="/design" cover={<Illustration name={COVER_ILLUSTRATIONS[1]} />} when="in 12 days" people={['Ana', 'Ben'].map((n) => ({ id: n, name: n }))}
              name="Tokyo trip" place="Tokyo, Japan" dates="Nov 12 – 20" />
          </div>
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
            <SegmentedControl label="Demo" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }, { value: 'c', label: 'Third' }]} />
            <ColorPicker label="Colour picker" options={COVER_COLORS} value={color} onChange={setColor} />
          </Card>
        </Section>

        <Section title="Lists">
          <List>
            <ListRow icon="calendar" title="With icon" subtitle="And a subtitle" chevron onClick={() => {}} />
            <ListRow icon="wallet" title="Trailing value" trailing="$120" />
            <ListRow leading={<Avatar name="Sam Rivera" size={32} />} title="With avatar" trailing={<Badge tone="tint">Owner</Badge>} />
          </List>
        </Section>

        <Section title="Feedback & identity">
          <Card className={s.stack}>
            <div className={s.row}>
              <Badge>Neutral</Badge><Badge tone="tint">Tint</Badge><Badge tone="success" icon="check">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Danger</Badge><Badge tone="category" icon="camera">Category</Badge><Badge tone="inverse">Inverse</Badge><Badge size="large" icon="star" iconState="filled">Large</Badge>
            </div>
            <div className={s.row}>
              <Avatar name="Alex Kim" size={44} /><Avatar name="Jo" size={32} />
              <AvatarStack people={['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay'].map((n) => ({ id: n, name: n }))} />
              <Spinner />
            </div>
            {(['brand', 'neutral', 'success', 'warning', 'error'] as const).map((st) => <Notification key={st} state={st}>Notification, state {st}.</Notification>)}
            <div><Button variant="secondary" icon="copy" onClick={() => toast({ icon: 'copy', label: 'Address copied' })}>Show a toast</Button></div>
          </Card>
          <Card><EmptyState illustration="ideas" title="Empty state" message="Explains what goes here and how to start." action={<Button variant="secondary" onClick={() => setSheet(true)}>Open a sheet</Button>} /></Card>
        </Section>
      </div>
      <Sheet open={sheet} title="Sheet" onClose={() => setSheet(false)} onSubmit={() => setSheet(false)}>
        <TextField label="Bottom sheet on phones" placeholder="Centered modal on iPad and desktop" />
      </Sheet>
    </>
  );
}
