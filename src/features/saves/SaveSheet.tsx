import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, ListGroup, ListItem, SearchField, Sheet, Skeleton, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe, useMyTrips, useProfiles, useSubFor } from '../../data/hooks';
import type { Idea, LinkPreview, Trip } from '../../data/types';
import { categoryInfo, eventType } from '../../lib/categories';
import { countryCodeOf, countryName, flagUrl } from '../../lib/countries';
import { daysBetween, today } from '../../lib/dates';
import { findUrl, readLink, searchPlaces } from '../../lib/links';
import { haptic } from '../../lib/native';
import { UNSORTED, isSavedPlace, saveCounts, saveTargets, targetLabel, type SaveTarget } from '../../lib/saves';
import s from './saves.module.css';

export type SaveRequest = { mode: 'link'; url?: string } | { mode: 'place' } | { mode: 'country' };
type Found = NonNullable<LinkPreview['place']>;

const defaultCurrency = () => (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD');
const same = (a: Idea, p: LinkPreview) => (!!p.url && a.url === p.url) || (!!p.place && !!a.place && a.place.name === p.place.name && Math.abs(a.place.lat - p.place.lat) < 0.002);

/**
 * Figma "Flow — Save to Rove (share sheet)": capture in 2 taps, sort later. Rove reads the link (title, photo, place)
 * and pre-selects where it goes: an upcoming trip in that country (its Ideas), else that country's saved place,
 * else "New place to go: <country>"; with no place, Unsorted. Saving never asks for dates. Same thing saved twice
 * merges ("Sam saved this too"). Offline, the save waits on the device and still confirms.
 * Opened by "Save a link", "Add a place", and links shared to Rove from other apps.
 */
export function SaveSheet({ request, onClose }: { request: SaveRequest | null; onClose: () => void }) {
  const me = useMe();
  const toast = useToast();
  const trips = useMyTrips();
  const all = trips ?? [];
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Found[] | null>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [target, setTarget] = useState<number>(0);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);

  // Start fresh each time it opens; a shared link is read straight away.
  useEffect(() => {
    if (!request) return;
    setLink(request.mode === 'link' ? request.url ?? '' : ''); setQuery(''); setResults(null); setPreview(null);
    setTarget(0); setNewCode(null); setNote(''); setBusy(false); setMore(false);
    if (request.mode === 'link' && request.url) read(request.url);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const read = async (raw: string) => {
    const url = findUrl(raw) ?? raw.trim();
    if (!/^https?:\/\//.test(url)) { toast({ tone: 'error', label: 'That doesn’t look like a link' }); return; }
    setReading(true);
    try { setPreview(await readLink(url)); setTarget(0); }
    finally { setReading(false); }
  };

  // "Add a place": search as you type (Photon).
  useEffect(() => {
    if (request?.mode !== 'place' || preview) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      if (query.trim().length < 2) { setResults(null); return; }
      searchPlaces(query, ctrl.signal).then(setResults).catch((e) => { if (e.name !== 'AbortError') setResults([]); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, request, preview]);

  const code = preview?.place?.countryCode ?? null;
  // Where it can go, best first; "New place to go" is always there (Figma), with its country picked by hand if none was found.
  const targets = useMemo(() => {
    const t = saveTargets(all, code);
    return t.some((x) => x.kind === 'new') ? t : [...t, { kind: 'new', code: '' } as SaveTarget];
  }, [all, code]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen: SaveTarget | undefined = targets[target];
  // Every trip's and saved place's ideas: for the counts, and to merge something already saved there.
  const savesByTrip = useSubFor(all.map((t) => t.id), 'ideas');

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const url = findUrl(text);
      if (url) { setLink(url); read(url); } else toast({ label: 'No link on the clipboard' });
    } catch { toast({ label: 'Paste the link into the field' }); }
  };

  const save = async () => {
    if (!preview || !chosen) return;
    const dest = chosen.kind === 'new' && !chosen.code ? newCode : chosen.kind === 'new' ? chosen.code : null;
    if (chosen.kind === 'new' && !dest) return;
    setBusy(true);
    const place = preview.place;
    const type = place && !place.isArea ? eventType(place.type) : place ? 'activity' : 'note';
    let tripId: string; let createdTrip = false; let label = targetLabel(chosen);
    try {
      if (chosen.kind === 'trip' || (chosen.kind === 'unsorted' && chosen.trip)) {
        tripId = chosen.kind === 'trip' ? chosen.trip.id : chosen.trip!.id;
      } else {
        // A new saved place (or the Unsorted one): a Trip record with status 'saved' and no dates yet.
        const c = dest ?? null;
        const near = c && place?.countryCode === c ? place : null;
        label = c ? countryName(c) : UNSORTED;
        tripId = store.queueTrip({
          name: label, status: 'saved',
          destination: c ? { name: countryName(c), lat: near?.lat ?? 0, lng: near?.lng ?? 0, country: countryName(c), countryCode: c } : null,
          startDate: '', endDate: '', currency: defaultCurrency(), totalBudget: 0, dailyBudget: 0, coverPhoto: null, coverPosition: null,
        }).id;
        createdTrip = true;
      }
      // Same thing saved twice: merge it.
      const existing = (savesByTrip[tripId] ?? []).find((i) => same(i, preview));
      if (existing) {
        const others = (existing.savedBy ?? [existing.createdBy]).filter((u) => u !== me.uid);
        if (!(existing.savedBy ?? [existing.createdBy]).includes(me.uid)) store.toggleInArray(tripId, 'ideas', existing.id, 'savedBy', me.uid, true).catch(() => {});
        haptic('success');
        toast({ icon: 'check', label: others.length ? `Already in ${label} · someone else saved this too` : `Already saved to ${label}` });
        onClose();
        return;
      }
      const { id, saved } = store.queueSub(tripId, 'ideas', {
        title: preview.place && preview.title === preview.site ? preview.place.name : preview.title,
        category: type, notes: note.trim(), cost: 0,
        links: [{ label: preview.site || 'Link', url: preview.url }].filter((l) => l.url),
        votes: {}, status: 'open',
        url: preview.url, image: preview.image, source: preview.site,
        place: place && !place.isArea ? { name: place.name, lat: place.lat, lng: place.lng, country: place.country, countryCode: place.countryCode, city: place.city, kind: place.kind } : null,
        savedBy: [me.uid],
      });
      saved.catch(() => toast({ tone: 'error', label: "Couldn't save. Check your connection" }));
      haptic('success');
      toast({
        icon: 'check', label: `Saved to ${label}`,
        action: { label: 'Undo', onClick: () => { store.deleteSub(tripId, 'ideas', id).catch(() => {}); if (createdTrip) store.deleteTrip(tripId).catch(() => {}); } },
      });
      onClose();
    } catch {
      haptic('error');
      toast({ tone: 'error', label: "Couldn't save. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  // "New place to go" tile: just a country, saved with nothing in it yet.
  const addCountry = async () => {
    if (!newCode) return;
    const name = countryName(newCode);
    if (all.some((t) => isSavedPlace(t) && countryCodeOf(t.destination) === newCode)) { toast({ label: `${name} is already in Saved` }); onClose(); return; }
    const { saved } = store.queueTrip({
      name, status: 'saved', destination: { name, lat: 0, lng: 0, country: name, countryCode: newCode },
      startDate: '', endDate: '', currency: defaultCurrency(), totalBudget: 0, dailyBudget: 0, coverPhoto: null, coverPosition: null,
    });
    saved.catch(() => toast({ tone: 'error', label: "Couldn't save. Check your connection" }));
    haptic('success');
    toast({ icon: 'check', label: `${name} added to Saved` });
    onClose();
  };

  const open = !!request;
  if (request?.mode === 'country')
    return (
      <Sheet open={open} title="New place to go" subtitle="Somewhere you’d like to go one day. No dates needed." onClose={onClose}
        onSubmit={addCountry} submitLabel={newCode ? `Add ${countryName(newCode)}` : 'Add'} submitDisabled={!newCode}>
        <CountryPick value={newCode} onPick={setNewCode} />
      </Sheet>
    );
  const step = preview ? 'choose' : 'find';
  const place = preview?.place;
  const info = categoryInfo(place && !place.isArea ? eventType(place.type) : 'note');
  const meta = [place?.kind || (place ? null : 'Link'), place?.city || place?.name, preview?.site ? `from ${preview.site}` : null].filter(Boolean).join(' · ');
  const needCountry = chosen?.kind === 'new' && !chosen.code;
  const submitLabel = chosen ? `Save to ${chosen.kind === 'new' ? (chosen.code ? countryName(chosen.code) : newCode ? countryName(newCode) : 'a new place') : targetLabel(chosen)}` : 'Save';

  return (
    <Sheet open={open} title="Save to Rove" subtitle={step === 'find' ? (request?.mode === 'place' ? 'Search for a restaurant, sight or hotel' : 'Paste a link from TikTok, Instagram, Maps or any site') : undefined}
      onClose={onClose} onSubmit={step === 'choose' ? save : undefined} submitLabel={submitLabel} submitDisabled={busy || !chosen || (needCountry && !newCode)}>
      {step === 'find' && request?.mode === 'link' && (
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

      {step === 'find' && request?.mode === 'place' && (
        <>
          <SearchField label="Search a place" placeholder="Search a place" value={query} onChange={(e) => setQuery(e.target.value)} />
          {results && results.length === 0 && <p className="t-body-small t-secondary">Nothing found. Try the name and the city.</p>}
          {results && results.length > 0 && (
            <ListGroup label="Places">
              {results.map((p) => (
                <ListItem key={`${p.lat},${p.lng}`} icon={categoryInfo(p.isArea ? 'activity' : p.type).icon} title={p.name}
                  meta={[p.kind, p.city, p.country].filter(Boolean).join(' · ')}
                  onClick={() => { haptic('selection'); setPreview({ url: '', site: '', title: p.name, image: '', place: p }); setTarget(0); }} />
              ))}
            </ListGroup>
          )}
        </>
      )}

      {step === 'choose' && preview && (
        <>
          <div className={s.preview}>
            <span className={s.previewThumb} aria-hidden="true">{preview.image ? <img src={preview.image} alt="" /> : <Icon name={info.icon} size={24} />}</span>
            <span className={s.previewText}>
              <span className={s.previewTitle}>{preview.title}</span>
              {meta && <span className={s.previewMeta}>{meta}</span>}
            </span>
          </div>
          <h3 className={s.label}>Save to</h3>
          <div className={s.targets} role="radiogroup" aria-label="Save to">
            {/* The suggestion and two more, then "New place to go"; the rest behind "More places". */}
            {targets.map((t, i) => (more || i < 3 || t.kind === 'new' || i === target) && (
              <TargetRow key={i} target={t} selected={i === target} onPick={() => { haptic('selection'); setTarget(i); }} ideas={t.kind === 'trip' ? savesByTrip[t.trip.id] : undefined} />
            ))}
          </div>
          {!more && targets.length > 4 && <Button variant="ghost" size="regular" icon="chevron-down" onClick={() => setMore(true)}>More places</Button>}
          {needCountry && <CountryPick value={newCode} onPick={setNewCode} />}
          <TextArea label="Note (optional)" placeholder="Why did you save this?" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </>
      )}
    </Sheet>
  );
}

/** One "Save to" choice: a big tappable row with a flag, its name and why it's suggested; ✓ when picked. */
function TargetRow({ target, selected, onPick, ideas }: { target: SaveTarget; selected: boolean; onPick: () => void; ideas?: Idea[] }) {
  const t = target;
  const code = t.kind === 'trip' ? countryCodeOf(t.trip.destination) : t.kind === 'new' ? t.code : undefined;
  const title = t.kind === 'new' ? (t.code ? `New place to go: ${countryName(t.code)}` : 'New place to go') : targetLabel(t);
  const sub = t.kind === 'trip'
    ? [t.suggested ? 'Suggested' : null, isSavedPlace(t.trip) ? saveCounts(ideas ?? []) : upcomingText(t.trip)].filter(Boolean).join(' · ')
    : t.kind === 'new' ? (t.suggested ? 'Suggested' : 'Somewhere you’d like to go') : 'Links and places with no country yet';
  return (
    <button type="button" role="radio" aria-checked={selected} className={[s.target, selected && s.targetOn].filter(Boolean).join(' ')} onClick={onPick}>
      <span className={s.targetFlag} aria-hidden="true">
        {code && flagUrl(code) ? <img src={flagUrl(code)} alt="" /> : <Icon name={t.kind === 'new' ? 'plus' : 'lightbulb'} size={24} />}
      </span>
      <span className={s.previewText}>
        <span className={s.previewTitle}>{title}</span>
        <span className={s.previewMeta}>{sub}</span>
      </span>
      {selected && <Icon name="check" size={24} className={s.check} />}
    </button>
  );
}

const upcomingText = (t: Trip) => {
  const n = daysBetween(today(), t.startDate);
  return n > 0 ? `Upcoming trip · in ${n} day${n === 1 ? '' : 's'}` : 'Happening now';
};

/** "New place to go" without a country found: pick the country by name. */
function CountryPick({ value, onPick }: { value: string | null; onPick: (c: string) => void }) {
  const [q, setQ] = useState('');
  const all = useMemo(() => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return 'ad ae af ag al am ao ar at au az ba bb bd be bg bh bo br bs bt bw by bz ca ch cl cn co cr cu cv cy cz de dk dm do dz ec ee eg es et fi fj fr gb ge gh gr gt hk hn hr ht hu id ie il in iq ir is it jm jo jp ke kg kh kr kw kz la lb lk lt lu lv ly ma mc md me mg mk mm mn mo mt mu mv mx my mz na ng ni nl no np nz om pa pe pg ph pk pl pr pt py qa ro rs ru rw sa sc se sg si sk sn sv sy th tn to tr tt tw tz ua ug us uy uz va ve vn ws za zm zw'
      .split(' ').map((c) => ({ c, n: names.of(c.toUpperCase()) ?? c })).sort((a, b) => a.n.localeCompare(b.n));
  }, []);
  const shown = q.trim() ? all.filter((x) => x.n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : value ? all.filter((x) => x.c === value) : [];
  return (
    <>
      <SearchField icon="globe" label="Which country?" placeholder="Which country?" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length > 0 && (
        <ListGroup label="Countries">
          {shown.map((x) => <ListItem key={x.c} round media={flagUrl(x.c) ? <img src={flagUrl(x.c)} alt="" className={s.flag} /> : undefined} title={x.n}
            trailing={value === x.c ? 'Selected' : undefined} onClick={() => { haptic('selection'); onPick(x.c); setQ(''); }} />)}
        </ListGroup>
      )}
    </>
  );
}

/** "Saved by you and Sam" for a saved place. */
export function useSavedBy(ideas: Idea[]) {
  const me = useMe();
  const ids = [...new Set(ideas.flatMap((i) => i.savedBy ?? [i.createdBy]))];
  const profiles = useProfiles(ids);
  const names = ids.map((id) => (id === me.uid ? 'you' : personName(profiles, id).split(' ')[0]));
  names.sort((a) => (a === 'you' ? -1 : 0));
  return names.length ? `Saved by ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}` : '';
}
