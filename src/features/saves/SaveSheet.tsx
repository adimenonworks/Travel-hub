import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Icon, ListGroup, ListItem, SearchField, Sheet, Skeleton, Switch, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useActivitiesFor, useMyTrips, usePlaces } from '../../data/hooks';
import type { LinkPreview, PlaceCategory } from '../../data/types';
import { countryName } from '../../lib/countries';
import { today } from '../../lib/dates';
import { findUrl, readLink, searchPlaces } from '../../lib/links';
import { haptic } from '../../lib/native';
import { PLACE_CATEGORIES, detectCategory, eventCategoryOf, placeCategory, tripCoversCity } from '../../lib/places';
import s from './saves.module.css';

export type SaveRequest = { mode: 'link'; url?: string } | { mode: 'place' };
type Found = NonNullable<LinkPreview['place']>;

/**
 * Save a place (handover "Save a place", this round's item 1): paste a link or search, Rove reads it, and the save is
 * filed into Collections under country → city → category. The category comes from the place type Rove detects; the
 * person can change it. Saving never asks for dates. If an upcoming trip covers that city, a switch offers "Also add to
 * <trip> ideas" (off by default). The same place saved twice isn't duplicated. Offline, it saves on the device and
 * syncs later. Opened by Save a place and by links shared to Rove from other apps.
 */
export function SaveSheet({ request, onClose }: { request: SaveRequest | null; onClose: () => void }) {
  const toast = useToast();
  const trips = useMyTrips();
  const places = usePlaces() ?? [];
  const [mode, setMode] = useState<'link' | 'place'>('link');
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Found[] | null>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [category, setCategory] = useState<PlaceCategory>('sight');
  const [alsoTrip, setAlsoTrip] = useState(false);
  const [note, setNote] = useState('');

  // Start fresh each time it opens; a shared link is read straight away.
  useEffect(() => {
    if (!request) return;
    setMode(request.mode); setLink(request.mode === 'link' ? request.url ?? '' : ''); setQuery(''); setResults(null);
    setPreview(null); setAlsoTrip(false); setNote('');
    if (request.mode === 'link' && request.url) read(request.url);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (p: LinkPreview) => { setPreview(p); setCategory(detectCategory(p.place)); setAlsoTrip(false); };
  const read = async (raw: string) => {
    const url = findUrl(raw) ?? raw.trim();
    if (!/^https?:\/\//.test(url)) { toast({ tone: 'error', label: 'That doesn’t look like a link' }); return; }
    setReading(true);
    try { show(await readLink(url)); } finally { setReading(false); }
  };

  // Search as you type (Photon).
  useEffect(() => {
    if (mode !== 'place' || preview) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      if (query.trim().length < 2) { setResults(null); return; }
      searchPlaces(query, ctrl.signal).then(setResults).catch((e) => { if (e.name !== 'AbortError') setResults([]); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, mode, preview]);

  // An upcoming trip that covers this city gets the "Also add to … ideas" switch.
  const upcoming = useMemo(() => (trips ?? []).filter((t) => t.endDate >= today()).sort((a, b) => a.startDate.localeCompare(b.startDate)), [trips]);
  const acts = useActivitiesFor(upcoming.map((t) => t.id));
  const place = preview?.place && !preview.place.isArea ? preview.place : null;
  const city = place?.city || '';
  const trip = city ? upcoming.find((t) => tripCoversCity(t, acts[t.id] ?? [], city)) : undefined;

  const paste = async () => {
    try {
      const url = findUrl(await navigator.clipboard.readText());
      if (url) { setLink(url); read(url); } else toast({ label: 'No link on the clipboard' });
    } catch { toast({ label: 'Paste the link into the field' }); }
  };

  const save = async () => {
    if (!preview) return;
    const code = preview.place?.countryCode ?? '';
    const where = code ? countryName(code) : 'Unsorted';
    const name = place?.name ?? (preview.title === preview.site ? preview.place?.name ?? preview.title : preview.title);
    // The same place twice: same link, or the same name in the same spot.
    const dupe = places.find((p) => (!!preview.url && p.url === preview.url)
      || (!!place && p.name === place.name && p.lat != null && Math.abs(p.lat - place.lat) < 0.002 && Math.abs((p.lng ?? 0) - place.lng) < 0.002));
    if (dupe) { toast({ icon: 'check', label: `Already in your ${dupe.countryCode ? countryName(dupe.countryCode) : 'Unsorted'} collection` }); onClose(); return; }
    try {
      const { id, saved } = store.addPlace({
        name, category, city, country: preview.place?.country ?? '', countryCode: code,
        lat: place?.lat ?? null, lng: place?.lng ?? null,
        ...(preview.url ? { url: preview.url } : {}), ...(preview.image ? { image: preview.image } : {}),
        ...(preview.site ? { source: preview.site } : {}), ...(place?.kind ? { kind: place.kind } : {}),
        ...(note.trim() ? { notes: note.trim() } : {}),
      });
      saved.catch(() => toast({ tone: 'error', label: "Couldn't save. Check your connection" }));
      // "Also add to <trip> ideas": an Idea that points at the Place (never a copy).
      const idea = alsoTrip && trip ? store.queueSub(trip.id, 'ideas', {
        title: name, category: eventCategoryOf(category), notes: '', cost: 0, links: [], votes: {}, status: 'open', placeId: id,
      }) : null;
      haptic('success');
      toast({
        icon: 'check', label: `Saved to ${where}${idea ? ` and ${trip!.name}` : ''}`,
        action: { label: 'Undo', onClick: () => { store.deletePlace(id).catch(() => {}); if (idea && trip) store.deleteSub(trip.id, 'ideas', idea.id).catch(() => {}); } },
      });
      onClose();
    } catch {
      haptic('error');
      toast({ tone: 'error', label: "Couldn't save. Check your connection" });
    }
  };

  const open = !!request;
  const meta = [place?.kind, city || preview?.place?.country, preview?.site ? `from ${preview.site}` : null].filter(Boolean).join(' · ');
  const icon = placeCategory(category).icon;

  return (
    <Sheet open={open} title="Save a place" subtitle={preview ? undefined : 'Paste a link from TikTok, Instagram, Maps or any site, or search'}
      onClose={onClose} onSubmit={preview ? save : undefined} submitLabel={preview?.place?.countryCode ? `Save to ${countryName(preview.place.countryCode)}` : 'Save'}>
      {!preview && (
        <div className={s.modes} role="group" aria-label="How to save">
          <Chip active={mode === 'link'} icon="link" onClick={() => setMode('link')} label={`Paste a link${mode === 'link' ? ', selected' : ''}`}>Paste a link</Chip>
          <Chip active={mode === 'place'} icon="pin" onClick={() => setMode('place')} label={`Search${mode === 'place' ? ', selected' : ''}`}>Search</Chip>
        </div>
      )}

      {!preview && mode === 'link' && (
        reading ? <div className={s.reading}><Skeleton shape="block" height={72} /><span className="t-body-small t-secondary" role="status">Reading the link…</span></div> : (
          <>
            <TextField label="Link" placeholder="https://…" inputMode="url" autoComplete="off" value={link} onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); read(link); } }} />
            <div className={s.row}>
              <Button variant="secondary" icon="copy" onClick={paste}>Paste</Button>
              <Button disabled={!link.trim()} iconEnd="chevron-right" onClick={() => read(link)}>Continue</Button>
            </div>
          </>
        )
      )}

      {!preview && mode === 'place' && (
        <>
          <SearchField label="Search a place" placeholder="Search a restaurant, bar, shop or sight" value={query} onChange={(e) => setQuery(e.target.value)} />
          {results && results.length === 0 && <p className="t-body-small t-secondary">Nothing found. Try the name and the city.</p>}
          {results && results.length > 0 && (
            <ListGroup label="Places">
              {results.map((p) => (
                <ListItem key={`${p.lat},${p.lng}`} icon={placeCategory(detectCategory(p)).icon} title={p.name}
                  meta={[p.kind, p.city, p.country].filter(Boolean).join(' · ')}
                  onClick={() => { haptic('selection'); show({ url: '', site: '', title: p.name, image: '', place: p }); }} />
              ))}
            </ListGroup>
          )}
        </>
      )}

      {preview && (
        <>
          <div className={s.preview}>
            <span className={s.previewThumb} aria-hidden="true">{preview.image ? <img src={preview.image} alt="" /> : <Icon name={icon} size={24} />}</span>
            <span className={s.previewText}>
              <span className={s.previewTitle}>{place?.name ?? preview.title}</span>
              {meta && <span className={s.previewMeta}>{meta}</span>}
            </span>
          </div>
          <p className="t-body-small t-secondary">
            {preview.place?.countryCode ? `Goes into ${countryName(preview.place.countryCode)}${city ? ` → ${city}` : ''}.` : 'No country found: it goes into Unsorted.'}
          </p>
          <div className={s.field}>
            <h3 className={s.label} id="save-category">Category</h3>
            <div className={s.chips} role="group" aria-labelledby="save-category">
              {PLACE_CATEGORIES.map((c) => (
                <Chip key={c.value} active={category === c.value} icon={c.icon} onClick={() => { haptic('selection'); setCategory(c.value); }}
                  label={`${c.label}${category === c.value ? ', selected' : ''}`}>{c.label}</Chip>
              ))}
            </div>
          </div>
          {trip && <Switch checked={alsoTrip} onChange={setAlsoTrip} label={`Also add to ${trip.name} ideas`} hint="So everyone on the trip can vote on it" />}
          <TextArea label="Note (optional)" placeholder="Why did you save this?" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </>
      )}
    </Sheet>
  );
}
