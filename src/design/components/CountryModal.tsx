import { useEffect, useState } from 'react';
import { LinkButton } from './Button';
import { ListGroup, ListItem, SectionHeader } from './Rows';
import { Sheet } from './Sheet';
import { emergencyFor } from '../../lib/emergency';
import { countryName } from '../../lib/countries';
import { currencyLabel, entryRules, timeDifference, utcOffset } from '../../lib/entry';

type Spot = { name: string; lat: number; lng: number; countryCode?: string };

/**
 * Figma "Country sheet", opened from the Overview's "Countries you’re visiting". Emergency: the numbers, tap to call (only countries
 * we're sure of, src/lib/emergency.ts). Before you go: Entry requirements (the destination's official government site,
 * never a third party; else your own government's advice), Local time compared with your home city, and the Currency.
 * `place`: a city in that country on the trip (for the local time); `home`: your home city.
 */
export function CountryModal({ code, onClose, place, home }: { code: string | null; onClose: () => void; place?: Spot | null; home?: Spot | null }) {
  const name = code ? countryName(code) : '';
  const e = code ? emergencyFor(code) : undefined;
  const rows: { title: string; meta: string; n: string }[] = !e ? [] : e.general
    ? [{ title: 'Emergency services', meta: 'Police, ambulance, fire', n: e.general }]
    : [
        e.police && { title: 'Police', meta: 'Emergency', n: e.police },
        e.ambulance && { title: 'Ambulance', meta: e.ambulance === e.fire ? 'Ambulance and fire' : 'Medical emergency', n: e.ambulance },
        e.fire && e.fire !== e.ambulance && { title: 'Fire', meta: 'Fire brigade', n: e.fire },
      ].filter((r): r is { title: string; meta: string; n: string } => !!r);
  const entry = code ? entryRules(code, home?.countryCode) : null;
  const money = code ? currencyLabel(code) : undefined;
  const [diff, setDiff] = useState<string | null>(null);
  useEffect(() => {
    setDiff(null);
    if (!code || !place || !home) return;
    let live = true;
    Promise.all([utcOffset(place.lat, place.lng), utcOffset(home.lat, home.lng)]).then(([a, b]) => {
      if (!live || a == null || b == null) return;
      const d = timeDifference(a, b);
      setDiff(`${place.name.split(',')[0]} · ${d.text} ${home.name.split(',')[0]}`);
    });
    return () => { live = false; };
  }, [code, place?.lat, place?.lng, home?.lat, home?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={!!code} title={name} subtitle="Good to know before and during your trip" onClose={onClose}>
      <SectionHeader title="Emergency" meta={e?.note} />
      <ListGroup label="Emergency numbers">
        {rows.length > 0
          ? rows.map((r) => <ListItem key={r.title} icon="information" title={r.title} meta={r.meta} trailing={r.n} href={`tel:${r.n}`} label={`Call ${r.title.toLowerCase()}: ${r.n}`} />)
          : <ListItem icon="information" title="Check locally" meta={`We don’t have ${name}’s numbers yet. 112 works from mobiles in many countries.`} />}
      </ListGroup>
      <SectionHeader title="Before you go" />
      <ListGroup label="Before you go">
        {entry && <ListItem icon="document" title="Entry requirements" meta={entry.official ? `Official ${name} government site` : entry.label}
          href={entry.url} label={`Entry requirements for ${name} (opens in a new tab)`} />}
        {diff && <ListItem icon="time" title="Local time" meta={diff} />}
        {money && <ListItem icon="wallet" title="Currency" meta={money} />}
      </ListGroup>
      {entry && <LinkButton href={entry.url} block iconEnd="arrow-up-right">{entry.official ? 'Official entry rules' : 'Check entry rules'}</LinkButton>}
    </Sheet>
  );
}
