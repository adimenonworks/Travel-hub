import { LinkButton } from './Button';
import { ListGroup, ListItem, SectionHeader } from './Rows';
import { Sheet } from './Sheet';
import { emergencyFor, ENTRY_INFO_URL } from '../../lib/emergency';
import { countryName } from '../../lib/countries';

/**
 * Figma "Country sheet": quick info about a country, opened from its Chip (Hero Card, Trip header) or the Overview's
 * "Good to know". Emergency numbers you can tap to call, and where to check entry requirements (they depend on your
 * passport, so it links to an official checker). Only countries we're sure of have numbers (src/lib/emergency.ts).
 */
export function CountryModal({ code, onClose }: { code: string | null; onClose: () => void }) {
  const name = code ? countryName(code) : '';
  const e = code ? emergencyFor(code) : undefined;
  const rows: { title: string; meta: string; n: string }[] = !e ? [] : e.general
    ? [{ title: 'Emergency services', meta: 'Police, ambulance, fire', n: e.general }]
    : [
        e.police && { title: 'Police', meta: 'Emergency', n: e.police },
        e.ambulance && { title: 'Ambulance', meta: e.ambulance === e.fire ? 'Ambulance and fire' : 'Medical emergency', n: e.ambulance },
        e.fire && e.fire !== e.ambulance && { title: 'Fire', meta: 'Fire brigade', n: e.fire },
      ].filter((r): r is { title: string; meta: string; n: string } => !!r);
  return (
    <Sheet open={!!code} title={name} subtitle="Good to know before and during your trip" onClose={onClose}>
      <SectionHeader title="Emergency" meta={e?.note} />
      <ListGroup label="Emergency numbers">
        {rows.length > 0
          ? rows.map((r) => <ListItem key={r.title} icon="info" title={r.title} meta={r.meta} trailing={r.n} href={`tel:${r.n}`} label={`Call ${r.title.toLowerCase()}: ${r.n}`} />)
          : <ListItem icon="info" title="Check locally" meta={`We don’t have ${name}’s numbers yet. 112 works from mobiles in many countries.`} />}
      </ListGroup>
      <SectionHeader title="Before you go" />
      <ListGroup label="Before you go">
        <ListItem icon="doc" title="Entry requirements" meta="Depend on your passport — opens an official checker" href={ENTRY_INFO_URL} label="Entry requirements (opens an official checker)" />
      </ListGroup>
      <LinkButton href={ENTRY_INFO_URL} block iconEnd="arrow-up-right">Check entry requirements</LinkButton>
    </Sheet>
  );
}
