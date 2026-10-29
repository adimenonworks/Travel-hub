import { useState, type CSSProperties } from 'react';
import {
  Avatar, AvatarStack, Badge, Banner, Button, Card, ColorPicker, EmptyState, FieldRow, Icon, IconButton, LinkButton, List, ListRow, PageHeader,
  SegmentedControl, Section, Select, Sheet, Spinner, Tabs, TextArea, TextField, type IconName, Illustration,
} from '../../design/components';
import { COVER_COLORS } from '../../lib/colors';
import s from './DesignSystem.module.css';

// Same groups and names as the Figma "Color" collection.
const colorGroups: { title: string; tokens: string[] }[] = [
  { title: 'Text', tokens: ['--text-primary', '--text-body', '--text-subtle', '--text-inverse', '--text-brand', '--text-link', '--text-link-hover', '--text-link-pressed', '--text-on-brand', '--text-on-secondary', '--text-on-selected', '--text-on-destructive', '--text-field-label', '--text-field-placeholder'] },
  { title: 'Icon', tokens: ['--icon-primary', '--icon-subtle', '--icon-inverse', '--icon-brand', '--icon-brand-hover', '--icon-on-brand', '--icon-on-secondary', '--icon-on-selected', '--icon-on-destructive'] },
  { title: 'Status', tokens: ['--status-success', '--status-warning', '--status-error', '--status-success-subtle', '--status-warning-subtle', '--status-error-subtle'] },
  { title: 'Surface', tokens: ['--surface-background-primary', '--surface-background-secondary', '--surface-background-tertiary', '--surface-brand', '--surface-brand-subtle', '--surface-sunken'] },
  { title: 'Interactive (hover lighter, pressed darker)', tokens: ['--interactive-primary', '--interactive-primary-hover', '--interactive-primary-pressed', '--interactive-secondary', '--interactive-secondary-hover', '--interactive-secondary-pressed', '--interactive-neutral', '--interactive-neutral-hover', '--interactive-neutral-pressed', '--interactive-selected', '--interactive-selected-hover', '--interactive-selected-pressed', '--interactive-destructive', '--interactive-destructive-hover', '--interactive-destructive-pressed', '--interactive-ghost-hover', '--interactive-ghost-pressed'] },
  { title: 'Border', tokens: ['--border-subtle', '--border-bold', '--border-bold-hover', '--border-focus', '--border-selected'] },
  { title: 'Disabled & overlay', tokens: ['--disabled-background', '--disabled-foreground', '--overlay-bar', '--overlay-scrim'] },
];

const typeStyles = [
  ['t-display', 'Display', '40–72 / 0.95 Bricolage Grotesque ExtraBold, 80% width'],
  ['t-title1', 'Title 1', '32 / 38 Manrope Semibold'],
  ['t-title2', 'Title 2', '24 / 31 Semibold'],
  ['t-title3', 'Title 3', '20 / 26 Semibold'],
  ['t-headline', 'Headline', '17 / 24 Semibold'],
  ['t-body', 'Body', '16 / 24 Regular'],
  ['t-callout', 'Callout', '15 / 22 Regular'],
  ['t-subhead', 'Subheadline', '14 / 20 Regular'],
  ['t-footnote', 'Footnote', '13 / 18 Regular (14 from 744px)'],
  ['t-caption1', 'Caption 1', '12 / 16 Medium (14 from 744px)'],
  ['t-caption2', 'Caption 2', '11 / 14 Medium (14 from 744px)'],
];

const spaces = ['--space-xxs', '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl', '--space-2xl', '--space-3xl'];
const radii = ['--radius-inner', '--radius-field', '--radius-card', '--radius-pill'];
const icons: IconName[] = ['plus', 'calendar', 'lightbulb', 'wallet', 'cloud', 'people', 'person', 'home', 'pin', 'link', 'doc', 'pencil', 'trash', 'check', 'thumbs-up', 'chat', 'clock', 'globe', 'sun', 'rain', 'map', 'share', 'plane', 'news', 'photo'];

/** Living reference for tokens and components, at /#/design. */
export function DesignSystem() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [color, setColor] = useState('emerald');
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <div className={s.page}>
        <PageHeader title="Design system" subtitle="Primitives → semantic tokens → components. One brand colour (emerald), light and dark mode. Every text pairing meets WCAG 2.2 AA." />
        <Section title="Colour" footer="Semantic tokens from src/design/tokens/semantic.css. Switch light/dark mode in Profile → Appearance.">
          {colorGroups.map((g) => (
            <Card key={g.title}>
              <div className="t-headline" style={{ marginBottom: 'var(--space-sm)' }}>{g.title}</div>
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

        <Section title="Typography" footer="Inter (bundled with the app). Weight 900 for page titles and big numbers only; everything else is semibold, as in DESIGN.md. Classes in tokens/typography.css.">
          <Card className={s.stack}>
            {typeStyles.map(([cls, name, spec]) => (
              <div key={cls} className={s.typeRow}>
                <span className={cls}>{name}</span>
                <code className={s.code}>.{cls} · {spec}</code>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Spacing & shape" footer="4px base unit, 8px rhythm. Controls are pills; cards have soft 24px corners and sit white on the sage canvas. Minimum tap target 44×44.">
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
          </Card>
        </Section>

        <Section title="Icons">
          <Card className={s.icons}>
            {icons.map((n) => <span key={n} className={s.icon} title={n}><Icon name={n} /><code className={s.code}>{n}</code></span>)}
          </Card>
        </Section>

        <Section title="Buttons">
          <Card className={s.row}>
            <Button>Filled</Button>
            <Button variant="tinted">Tinted</Button>
            <Button variant="gray">Gray</Button>
            <Button variant="plain">Plain</Button>
            <Button variant="ghost" icon="pencil">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button icon="plus" size="small">Small</Button>
            <Button size="large">Large</Button>
            <Button disabled>Disabled</Button>
            <LinkButton to="/" variant="tinted">Link button</LinkButton>
            <IconButton icon="pencil" label="Edit" />
            <IconButton icon="plus" label="Add" variant="tinted" />
          </Card>
        </Section>

        <Section title="Navigation" footer="Tabs switch between sections of a page (each trip uses them). The current tab is darker and underlined in emerald (--border-selected).">
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
            <Card><div className="t-title3">Default card</div><p className="t-subhead t-secondary">White on the pale canvas, no shadow.</p></Card>
            <Card tone="accent"><div className="t-title3">Brand card</div><p className="t-subhead t-secondary">For the one thing that matters most on a page.</p><div><Button variant="inverse" icon="plus">Inverse button</Button></div></Card>
            <Card tone="accent" media={<Icon name="globe" size={56} strokeWidth={1.4} />} action={<Button variant="inverse">Action</Button>}>
              <div className="t-title3">Card with media and action</div><p className="t-subhead">The media sits on the left, the action on the right (below on phones).</p>
            </Card>
            <Card media={<Illustration name="memories" />}><div className="t-headline">Card with an illustration</div><p className="t-subhead t-secondary">Illustrations are for empty states.</p></Card>
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
              <Badge>Neutral</Badge><Badge tone="tint">Tint</Badge><Badge tone="success" icon="check">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="error">Error</Badge><Badge tone="category" icon="sun">Category</Badge>
            </div>
            <div className={s.row}>
              <Avatar name="Alex Kim" size={44} /><Avatar name="Jo" size={32} />
              <AvatarStack people={['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay'].map((n) => ({ id: n, name: n }))} />
              <Spinner />
            </div>
            <Banner>Banners call out important context.</Banner>
          </Card>
          <Card><EmptyState icon="lightbulb" title="Empty state" message="Explains what goes here and how to start." action={<Button variant="tinted" onClick={() => setSheet(true)}>Open a sheet</Button>} /></Card>
        </Section>
      </div>
      <Sheet open={sheet} title="Sheet" onClose={() => setSheet(false)} onSubmit={() => setSheet(false)}>
        <TextField label="Bottom sheet on phones" placeholder="Centered modal on iPad and desktop" />
      </Sheet>
    </>
  );
}
