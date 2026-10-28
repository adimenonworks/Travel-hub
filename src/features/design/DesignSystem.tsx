import { useState, type CSSProperties } from 'react';
import {
  Avatar, AvatarStack, Badge, Banner, Button, Card, ColorPicker, EmptyState, FieldRow, Icon, IconButton, LinkButton, List, ListRow, PageHeader,
  SegmentedControl, Section, Select, Sheet, Spinner, Tabs, TextArea, TextField, type IconName,
} from '../../design/components';
import { COVER_COLORS } from '../../lib/colors';
import s from './DesignSystem.module.css';

const colorGroups: { title: string; tokens: string[] }[] = [
  { title: 'Accent (changes with Profile → Appearance)', tokens: ['--color-accent', '--color-on-accent', '--color-tint', '--color-on-tint', '--color-tint-subtle'] },
  { title: 'Status', tokens: ['--color-success', '--color-warning', '--color-danger', '--color-success-subtle', '--color-warning-subtle', '--color-danger-subtle'] },
  { title: 'Categories (brights, text is --color-on-bright)', tokens: ['--color-cat-activity', '--color-cat-food', '--color-cat-cafe', '--color-cat-drinks', '--color-cat-sight', '--color-cat-transport', '--color-cat-stay', '--color-cat-other'] },
  { title: 'Labels', tokens: ['--color-label', '--color-label-secondary', '--color-label-tertiary', '--color-on-bright'] },
  { title: 'Surfaces', tokens: ['--color-bg', '--color-surface', '--color-bg-elevated'] },
  { title: 'Fills & lines', tokens: ['--color-fill', '--color-fill-tertiary', '--color-fill-quaternary', '--color-separator', '--color-border-control'] },
];

const typeStyles = [
  ['t-display', 'Display', '36–64 / 1.02 Heavy'],
  ['t-title1', 'Title 1', '32 / 36 Heavy'],
  ['t-title2', 'Title 2', '26 / 30 Heavy'],
  ['t-title3', 'Title 3', '21 / 26 Bold'],
  ['t-headline', 'Headline', '17 / 24 Semibold'],
  ['t-body', 'Body', '16 / 24 Regular'],
  ['t-callout', 'Callout', '15 / 22 Regular'],
  ['t-subhead', 'Subheadline', '14 / 20 Regular'],
  ['t-footnote', 'Footnote', '13 / 18 Regular'],
  ['t-caption1', 'Caption 1', '12 / 16 Medium'],
  ['t-caption2', 'Caption 2', '11 / 14 Medium'],
];

const spaces = ['--space-xxs', '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl', '--space-2xl', '--space-3xl'];
const radii = ['--radius-inner', '--radius-field', '--radius-card', '--radius-pill'];
const icons: IconName[] = ['plus', 'calendar', 'lightbulb', 'wallet', 'cloud', 'people', 'person', 'home', 'pin', 'link', 'doc', 'pencil', 'trash', 'check', 'thumbs-up', 'chat', 'clock', 'globe', 'sun', 'rain', 'map', 'share', 'plane', 'news'];

/** Living reference for tokens and components, at /#/design. */
export function DesignSystem() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [color, setColor] = useState('lime');
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <div className={s.page}>
        <PageHeader title="Design system" subtitle="Primitives → semantic tokens → components. Bold, bright and rounded, inspired by Wise. Every text pairing meets WCAG 2.2 AA." />
        <Section title="Colour" footer="Semantic tokens from src/design/tokens/semantic.css. Use Profile → Appearance to change the accent or switch to dark mode.">
          {colorGroups.map((g) => (
            <Card key={g.title}>
              <div className="t-headline" style={{ marginBottom: 'var(--space-sm)' }}>{g.title}</div>
              <div className={s.swatches}>
                {g.tokens.map((t) => (
                  <div key={t} className={s.swatch}>
                    <div className={s.chip} style={{ background: `var(${t})` }} />
                    <code className={s.code}>{t.replace('--color-', '')}</code>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </Section>

        <Section title="Typography" footer="Inter (bundled with the app). Headings are heavy and tightly spaced. Classes in tokens/typography.css.">
          <Card className={s.stack}>
            {typeStyles.map(([cls, name, spec]) => (
              <div key={cls} className={s.typeRow}>
                <span className={cls}>{name}</span>
                <code className={s.code}>.{cls} · {spec}</code>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Spacing & shape" footer="4px base unit, 8px rhythm. Controls are pills; surfaces have soft 32px corners. Minimum tap target 44×44.">
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
            <Button variant="destructive">Delete</Button>
            <Button icon="plus" size="small">Small</Button>
            <Button size="large">Large</Button>
            <Button disabled>Disabled</Button>
            <LinkButton to="/" variant="tinted">Link button</LinkButton>
            <IconButton icon="pencil" label="Edit" />
            <IconButton icon="plus" label="Add" variant="tinted" />
          </Card>
        </Section>

        <Section title="Navigation" footer="Tabs are pill links. The top bar and each trip's sections use them.">
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
            <Card><div className="t-title3">Default card</div><p className="t-subhead t-secondary">Flat surface, no shadow.</p></Card>
            <Card tone="accent"><div className="t-title3">Accent card</div><p className="t-subhead t-secondary">For the one thing that matters most on a page.</p></Card>
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
            <ListRow icon="wallet" iconColor="var(--color-success)" title="Trailing value" trailing="$120" />
            <ListRow leading={<Avatar name="Sam Rivera" size={32} />} title="With avatar" trailing={<Badge tone="tint">Owner</Badge>} />
          </List>
        </Section>

        <Section title="Feedback & identity">
          <Card className={s.stack}>
            <div className={s.row}>
              <Badge>Neutral</Badge><Badge tone="tint">Tint</Badge><Badge tone="success" icon="check">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Danger</Badge>
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
