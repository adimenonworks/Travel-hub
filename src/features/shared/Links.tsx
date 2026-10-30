import { Button, Icon, IconButton, TextField } from '../../design/components';
import type { LinkItem } from '../../data/types';
import { hostOf, isPdf, normalizeUrl } from '../../lib/format';
import s from './shared.module.css';

export function LinkChips({ links }: { links: LinkItem[] }) {
  if (!links.length) return null;
  return (
    <div className={s.links}>
      {links.map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noreferrer" className={s.chip} onClick={(e) => e.stopPropagation()}>
          <Icon name={isPdf(l.url) ? 'doc' : 'link'} size={16} />
          <span>{l.label || hostOf(l.url)}</span>
        </a>
      ))}
    </div>
  );
}

/** Edit a list of labelled links (tickets, reservations, PDFs on Drive, menus…). */
export function LinkEditor({ links, onChange }: { links: LinkItem[]; onChange: (l: LinkItem[]) => void }) {
  const set = (i: number, patch: Partial<LinkItem>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className={s.linkEditor}>
      {links.map((l, i) => (
        <div key={i} className={s.linkRow}>
          <TextField label={i === 0 ? 'Link name' : undefined} placeholder="Tickets (PDF)" value={l.label} onChange={(e) => set(i, { label: e.target.value })} />
          <TextField label={i === 0 ? 'URL' : undefined} placeholder="https://…" inputMode="url" value={l.url}
            onChange={(e) => set(i, { url: e.target.value })} onBlur={(e) => set(i, { url: normalizeUrl(e.target.value) })} />
          <IconButton icon="trash" label="Remove link" variant="plain" onClick={() => onChange(links.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div>
        <Button variant="gray" size="small" icon="plus" onClick={() => onChange([...links, { label: '', url: '' }])}>Add link or PDF</Button>
      </div>
    </div>
  );
}

export const cleanLinks = (links: LinkItem[]): LinkItem[] =>
  links
    .map((l) => {
      const email = l.emailUrl ? normalizeUrl(l.emailUrl) : '';
      return { label: l.label.trim(), url: normalizeUrl(l.url), ...(email ? { emailUrl: email } : {}) };
    })
    .filter((l) => l.url);
