import { useState, type CSSProperties } from 'react';
import {
  Avatar, AvatarStack, Badge, Banner, Button, Card, EmptyState, FieldRow, Icon, IconButton, List, ListRow, PageHeader,
  ProgressBar, SegmentedControl, Section, Select, Sheet, Spinner, Switch, TextArea, TextField, type IconName,
} from '../../design/components';
import s from './DesignSystem.module.css';

const colorGroups: { title: string; tokens: string[] }[] = [
  { title: 'Accent & status', tokens: ['--color-tint', '--color-tint-subtle', '--color-success', '--color-warning', '--color-danger'] },
  { title: 'Categories', tokens: ['--color-cat-activity', '--color-cat-food', '--color-cat-cafe', '--color-cat-drinks', '--color-cat-sight', '--color-cat-transport', '--color-cat-stay', '--color-cat-other'] },
  { title: 'Labels', tokens: ['--color-label', '--color-label-secondary', '--color-label-tertiary', '--color-label-quaternary'] },
  { title: 'Backgrounds', tokens: ['--color-bg', '--color-bg-secondary', '--color-bg-grouped', '--color-bg-grouped-secondary', '--color-bg-elevated'] },
  { title: 'Fills & separators', tokens: ['--color-fill', '--color-fill-secondary', '--color-fill-tertiary', '--color-fill-quaternary', '--color-separator'] },
];

const typeStyles = [
  ['t-large-title', 'Large Title', '34 / 41 Bold'],
  ['t-title1', 'Title 1', '28 / 34 Bold'],
  ['t-title2', 'Title 2', '22 / 28 Bold'],
  ['t-title3', 'Title 3', '20 / 25 Semibold'],
  ['t-headline', 'Headline', '17 / 22 Semibold'],
  ['t-body', 'Body', '17 / 22 Regular'],
  ['t-callout', 'Callout', '16 / 21 Regular'],
  ['t-subhead', 'Subheadline', '15 / 20 Regular'],
  ['t-footnote', 'Footnote', '13 / 18 Regular'],
  ['t-caption1', 'Caption 1', '12 / 16 Regular'],
  ['t-caption2', 'Caption 2', '11 / 13 Regular'],
];

const spaces = ['--space-xxs', '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl', '--space-2xl', '--space-3xl'];
const radii = ['--radius-icon', '--radius-control', '--radius-card', '--radius-sheet', '--radius-button'];
const icons: IconName[] = ['plus', 'calendar', 'lightbulb', 'wallet', 'cloud', 'people', 'person', 'home', 'pin', 'link', 'doc', 'pencil', 'trash', 'check', 'thumbs-up', 'chat', 'clock', 'globe', 'sun', 'rain', 'map', 'share', 'plane', 'news'];

/** Living reference for tokens and components, at /#/design. */
export function DesignSystem() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [on, setOn] = useState(true);
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <PageHeader title="Design system" subtitle="Primitives → semantic tokens → components. Based on Apple's Human Interface Guidelines." back={{ to: '/', label: 'Trips' }} />
      <div className={s.page}>
        <Section title="Color" footer="Semantic tokens from src/design/tokens/semantic.css. Switch your OS to dark mode (or use Profile → Appearance) to see the dark values.">
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

        <Section title="Typography" footer="System font stack (SF Pro on Apple devices). Classes in tokens/typography.css.">
          <Card className={s.stack}>
            {typeStyles.map(([cls, name, spec]) => (
              <div key={cls} className={s.typeRow}>
                <span className={cls}>{name}</span>
                <code className={s.code}>.{cls} · {spec}</code>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Spacing & shape" footer="4pt base unit, 8pt rhythm. Minimum tap target 44×44.">
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
            <IconButton icon="pencil" label="Edit" />
            <IconButton icon="plus" label="Add" variant="tinted" />
          </Card>
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
            <label className={s.switchRow}><span>Switch</span><Switch checked={on} onChange={setOn} label="Demo switch" /></label>
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
            <ProgressBar value={64} max={100} label="Demo progress" />
            <ProgressBar value={92} max={100} color="var(--color-danger)" label="Demo progress over" />
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
