import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Icon, ListGroup, ListItem, Sheet, Skeleton, Switch, TextArea, TextField, useToast } from '../../design/components';
import type { Place } from '../../data/types';
import { flagUrl } from '../../lib/countries';
import { searchCities } from '../../lib/geocode';
import { useCountries, placeCounts } from './Collections';
import { store } from '../../data';
import { useActivitiesFor, useMyTrips, usePlaces } from '../../data/hooks';
import type { LinkPreview, PlaceCategory } from '../../data/types';
import { countryName } from '../../lib/countries';
import { today } from '../../lib/dates';
import { findUrl, readLink } from '../../lib/links';
import { haptic, readClipboard } from '../../lib/native';
import { PLACE_CATEGORIES, detectCategory, eventCategoryOf, placeCategory, tripCoversCity } from '../../lib/places';
import s from './saves.module.css';

export type SaveRequest = { mode: 'link'; url?: string };

/**
 * Save a place: a link field with Paste (Neutral) and Continue (Primary, disabled until there's a link). While Rove reads
 * the link only a skeleton shows. The preview has the place's name (cleaned of ratings and addresses, editable), where
 * it's filed (country · city, Rove's pick from the link, with Change) and its category (chips, always shown). It's
 * filed into Collections under country → city → category; a new country simply starts a new collection. Saving never asks for dates. If an upcoming trip covers that city, a switch offers "Also add to
 * <trip> ideas" (off by default). The same place saved twice isn't duplicated. Offline, it saves on the device and
 * syncs later. Opened by Save a place and by links shared to Rove from other apps.
 */
export function SaveSheet({ request, onClose }: { request: SaveRequest | null; onClose: () => void }) {
  const toast = useToast();
  const trips = useMyTrips();
  const places = usePlaces() ?? [];
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [category, setCategory] = useState<PlaceCategory>('sight');
  const [alsoTrip, setAlsoTrip] = useState(false);
  const [note, setNote] = useState('');
  // Where it goes: Rove's pick from the link, or the person's choice in "Where should it go?"
  const [chosen, setChosen] = useState<{ code: string; city: string } | null>(null);
  const [step, setStep] = useState<'preview' | 'where'>('preview');
  const [whereQuery, setWhereQuery] = useState('');
  const [whereResults, setWhereResults] = useState<Place[] | null>(null);
  const [newCity, setNewCity] = useState<string | null>(null);
  const countries = useCountries() ?? [];

  // Start fresh each time it opens; a shared link is read straight away.
  useEffect(() => {
    if (!request) return;
    setLink(request.url ?? ''); setName('');
    setPreview(null); setAlsoTrip(false); setNote(''); setChosen(null); setStep('preview'); setWhereQuery(''); setNewCity(null);
    // The clipboard is read only when you tap Paste: reading it here made iOS show its Paste bubble as the sheet opened.
    if (request.url) read(request.url);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (p: LinkPreview) => {
    setPreview(p); setName(p.place && !p.place.isArea ? p.place.name : p.title); setCategory(detectCategory(p.place));
    setAlsoTrip(false); setChosen(null); setStep('preview');
  };
  const read = async (raw: string) => {
    const url = findUrl(raw) ?? raw.trim();
    if (!/^https?:\/\//.test(url)) { toast({ tone: 'error', label: 'That doesn’t look like a link' }); return; }
    setReading(true);
    try { show(await readLink(url)); } finally { setReading(false); }
  };

  // "Where should it go?": search any country or city.
  useEffect(() => {
    if (step !== 'where') return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      if (whereQuery.trim().length < 2) { setWhereResults(null); return; }
      searchCities(whereQuery, ctrl.signal).then(setWhereResults).catch((e) => { if (e.name !== 'AbortError') setWhereResults([]); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [whereQuery, step]);

  // An upcoming trip that covers this city gets the "Also add to … ideas" switch.
  const upcoming = useMemo(() => (trips ?? []).filter((t) => t.endDate >= today()).sort((a, b) => a.startDate.localeCompare(b.startDate)), [trips]);
  const acts = useActivitiesFor(upcoming.map((t) => t.id));
  const place = preview?.place && !preview.place.isArea ? preview.place : null;
  // Rove's pick: the place's country and city (an area the link is about counts too); the person can change it.
  const picked = { code: preview?.place?.countryCode ?? '', city: place?.city || (preview?.place?.isArea ? preview.place.city ?? '' : '') };
  const target = chosen ?? picked;
  const code = target.code;
  const city = target.city;
  // A place when Rove found one or you chose a city; otherwise a link filed under its country ("Links & notes")
  const kind: 'place' | 'link' = place || city ? 'place' : 'link';
  const trip = city ? upcoming.find((t) => tripCoversCity(t, acts[t.id] ?? [], city)) : undefined;

  const paste = async () => {
    try {
      const url = findUrl(await readClipboard());
      if (url) { setLink(url); read(url); } else toast({ label: 'No link on the clipboard' });
    } catch { toast({ label: 'Paste the link into the field' }); }
  };

  const save = async () => {
    if (!preview) return;
    if (!code) return; // "Choose where to save" first
    const where = [countryName(code), city].filter(Boolean).join(' · ');
    const title = name.trim() || place?.name || preview.title;
    // The same place twice: same link, or the same name in the same spot.
    const dupe = places.find((p) => (!!preview.url && p.url === preview.url)
      || (!!place && p.name === title && p.lat != null && Math.abs(p.lat - place.lat) < 0.002 && Math.abs((p.lng ?? 0) - place.lng) < 0.002));
    if (dupe) { toast({ icon: 'check', label: `Already in your ${dupe.countryCode ? countryName(dupe.countryCode) : 'Unsorted'} collection` }); onClose(); return; }
    try {
      const { id, saved } = store.addPlace({
        name: title, category, city: kind === 'place' ? city : '', country: countryName(code), countryCode: code, ...(kind === 'link' ? { type: 'link' as const } : {}),
        lat: place?.lat ?? null, lng: place?.lng ?? null,
        ...(preview.url ? { url: preview.url } : {}), ...(preview.image ? { image: preview.image } : {}),
        ...(preview.site ? { source: preview.site } : {}), ...(place?.kind ? { kind: place.kind } : {}),
        ...(note.trim() ? { notes: note.trim() } : {}),
      });
      saved.catch(() => toast({ tone: 'error', label: "Couldn't save. Check your connection" }));
      // "Also add to <trip> ideas": an Idea that points at the Place (never a copy).
      const idea = alsoTrip && trip ? store.queueSub(trip.id, 'ideas', {
        title, category: eventCategoryOf(category), notes: '', links: [], votes: {}, status: 'open', placeId: id,
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
  const meta = [place?.kind, place?.city || preview?.place?.country, preview?.site ? `from ${preview.site}` : null].filter(Boolean).join(' · ');
  // Cities to offer for the chosen country: Rove's pick, then the cities you've saved there
  const cityChips = [...new Set([picked.code === code ? picked.city : '', ...places.filter((p) => p.countryCode === code && (p.type ?? 'place') === 'place').map((p) => p.city), chosen?.city ?? ''].filter(Boolean))];
  const whereSheet = step === 'where';
  const icon = placeCategory(category).icon;

  return (
    <Sheet open={open} title={whereSheet ? 'Where should it go?' : 'Save a place'}
      subtitle={whereSheet ? (picked.code ? `Rove picked ${countryName(picked.code)} from the link` : 'Rove couldn’t tell from the link') : preview || reading ? undefined : 'Paste a link from TikTok, Instagram, Google Maps or any site'}
      onClose={onClose} onSubmit={preview ? save : undefined} submitDisabled={!!preview && !code}
      submitLabel={code ? `Save to ${whereSheet && city ? city : countryName(code)}` : 'Save'}>
      {/* Reading the link: only the skeleton (the preview's shape) */}
      {!preview && reading && (
        <div className={s.reading} role="status" aria-label="Reading the link">
          <Skeleton shape="block" height={72} />
          <Skeleton shape="block" height={72} />
          <Skeleton width="40%" />
        </div>
      )}

      {!preview && !reading && (
        <>
          <TextField label="Link" placeholder="https://…" inputMode="url" autoComplete="off" value={link} onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (link.trim()) read(link); } }} />
          <div className={s.buttonPair}>
            <Button variant="neutral" size="large" icon="copy" onClick={paste}>Paste</Button>
            <Button size="large" disabled={!link.trim()} onClick={() => read(link)}>Continue</Button>
          </div>
        </>
      )}

      {preview && !whereSheet && (
        <>
          <div className={s.preview}>
            <span className={s.previewThumb} aria-hidden="true">{preview.image ? <img src={preview.image} alt="" /> : <Icon name={kind === 'link' ? 'link' : icon} size={24} />}</span>
            <span className={s.previewText}>
              <span className={s.previewTitle}>{name.trim() || preview.title}</span>
              {meta && <span className={s.previewMeta}>{meta}</span>}
            </span>
          </div>
          <TextField label="Name" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
          {/* Saving to: Rove's pick, with Change. With nothing found, Save waits until a country is chosen. */}
          <div className={s.preview}>
            <span className={[s.previewThumb, s.previewRound].join(' ')} aria-hidden="true">{code ? <img src={flagUrl(code)} alt="" className={s.flag} /> : <Icon name="pin" size={24} />}</span>
            <span className={s.previewText}>
              <span className={s.previewTitle}>{code ? [countryName(code), kind === 'place' ? city : ''].filter(Boolean).join(' · ') : 'Choose where to save'}</span>
              <span className={s.previewMeta}>{code ? `Saving to · ${chosen ? 'you chose' : 'found in the link'}` : 'Rove couldn’t find a place in the link'}</span>
            </span>
            <Button variant="ghost" size="regular" onClick={() => { setStep('where'); setNewCity(null); }}>{code ? 'Change' : 'Choose'}</Button>
          </div>
          {(
            <div className={s.field}>
              <h3 className={s.label} id="save-category">Category</h3>
              <div className={s.chipsWrap} role="group" aria-labelledby="save-category">
                {PLACE_CATEGORIES.map((c) => (
                  <Chip key={c.value} active={category === c.value} icon={c.icon} onClick={() => { haptic('selection'); setCategory(c.value); }}
                    label={`${c.label}${category === c.value ? ', selected' : ''}`}>{c.label}</Chip>
                ))}
              </div>
            </div>
          )}
          {kind === 'place' && trip && <Switch checked={alsoTrip} onChange={setAlsoTrip} label={`Also add to ${trip.name} ideas`} hint="So everyone on the trip can vote on it" />}
          <TextArea label="Note (optional)" placeholder="Why did you save this?" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </>
      )}

      {preview && whereSheet && (
        <>
          <TextField icon="pin" label="Search a country or city" placeholder="Search a country or city" value={whereQuery} onChange={(e) => setWhereQuery(e.target.value)} autoComplete="off" />
          {whereResults && whereResults.length > 0 && (
            <ListGroup label="Places found">
              {whereResults.slice(0, 5).map((r) => (
                <ListItem key={`${r.lat},${r.lng}`} round media={r.countryCode ? <img src={flagUrl(r.countryCode)} alt="" className={s.flag} /> : undefined} icon="pin"
                  title={r.name.split(',')[0]} meta={r.name.split(',').slice(1).join(',').trim() || undefined}
                  onClick={() => { haptic('selection'); setChosen({ code: (r.countryCode ?? '').toLowerCase(), city: r.name.split(',')[0] }); setWhereQuery(''); setWhereResults(null); }} />
              ))}
            </ListGroup>
          )}
          {countries.filter((c) => c.code).length > 0 && (
            <section className={s.field} aria-labelledby="save-countries">
              <h3 className="t-heading-2" id="save-countries">Your saved countries</h3>
              <ListGroup label="Your saved countries">
                {countries.filter((c) => c.code).map((c) => (
                  <ListItem key={c.code} round media={<img src={c.flag} alt="" className={s.flag} />} title={c.name} meta={placeCounts(c.places)}
                    trailing={c.code === code ? 'Selected' : undefined}
                    onClick={() => { haptic('selection'); setChosen({ code: c.code, city: c.code === picked.code ? picked.city : '' }); }} />
                ))}
              </ListGroup>
            </section>
          )}
          {code && kind === 'place' && (
            <section className={s.field} aria-labelledby="save-city">
              <h3 className="t-heading-2" id="save-city">{`City in ${countryName(code)}`}</h3>
              {picked.city && picked.code === code && <p className="t-body-small t-secondary">{`Rove found ${picked.city}`}</p>}
              <div className={s.chipsWrap} role="group" aria-labelledby="save-city">
                {cityChips.map((c) => (
                  <Chip key={c} active={city === c} onClick={() => { haptic('selection'); setChosen({ code, city: c }); setNewCity(null); }} label={`${c}${city === c ? ', selected' : ''}`}>{c}</Chip>
                ))}
                <Chip icon="plus" active={newCity !== null} onClick={() => setNewCity('')}>New city</Chip>
              </div>
              {newCity !== null && <TextField label="New city" placeholder="Kyoto" value={newCity} autoComplete="off"
                onChange={(e) => { setNewCity(e.target.value); setChosen({ code, city: e.target.value.trim() }); }} />}
            </section>
          )}
        </>
      )}
    </Sheet>
  );
}
