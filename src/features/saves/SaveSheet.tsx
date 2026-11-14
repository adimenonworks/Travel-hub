import { addedAfter, defaultPeople } from '../../data/eventPeople';
import { isTravelling } from '../../data/roles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Accordion, Chip, Icon, ListGroup, ListItem, OptionCard, SegmentControl, Sheet, Skeleton, TextArea, TextField, Button, useToast } from '../../design/components';
import type { Activity, LinkItem, Place } from '../../data/types';
import { flagUrl } from '../../lib/countries';
import { searchCities } from '../../lib/geocode';
import { useCountries, placeCounts } from './Collections';
import { store } from '../../data';
import { personName, useActivitiesFor, useMe, useMyTrips, usePlaces, useProfiles, useShares } from '../../data/hooks';
import type { LinkPreview } from '../../data/types';
import { behaviourOf, categoryTone, kindInfo, type EventKind } from '../../lib/categories';
import { countryName } from '../../lib/countries';
import { addDays, formatDay, formatTime, today, tripDays } from '../../lib/dates';
import { zoneAt } from '../../lib/timezone';
import { findUrl, readLink } from '../../lib/links';
import { haptic, readClipboard } from '../../lib/native';
import { detectCategory, eventCategoryOf, placeCategory, tripCountryCodes, tripCoversCity } from '../../lib/places';
import { PlaceKindPicker } from './PlaceKindPicker';
import s from './saves.module.css';

export type SaveRequest = { mode: 'link'; url?: string };

/**
 * Save a place: a link field with Paste (Neutral) and Continue (Primary, disabled until there's a link). While Rove reads
 * the link only a skeleton shows. The preview has the place's name (cleaned of ratings and addresses, editable), where
 * it's filed (country · city, Rove's pick from the link, with Change) and its category (chips, always shown). It's
 * filed into Collections under country → city → category; a new country simply starts a new collection. Saving never asks for dates.
 * With an upcoming trip, a Segment control switches to **Trip** (picked first when that trip covers the place's city):
 * a new event filled in from the link (pick the day), the link added to an event you already have, or "Add to ideas
 * instead". Every trip action also files the place in Collections. The same place saved twice isn't duplicated.
 * Offline, it saves on the device and syncs later. Opened by Save a place and by links shared to Rove from other apps.
 */
export function SaveSheet({ request, onClose }: { request: SaveRequest | null; onClose: () => void }) {
  const toast = useToast();
  const trips = useMyTrips();
  const places = usePlaces() ?? [];
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [category, setCategory] = useState<EventKind>('sight');
  // Collections or Trip, and on the Trip side: which trip, a new event (its day, time, check-out) or an existing one
  const [dest, setDest] = useState<'collections' | 'trip'>('collections');
  const [tripId, setTripId] = useState('');
  const [action, setAction] = useState<'new' | 'add' | 'idea'>('new');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [checkout, setCheckout] = useState('');
  const [eventId, setEventId] = useState('');
  const defaulted = useRef(false);
  const me = useMe();
  const [note, setNote] = useState('');
  // Where it goes: Rove's pick from the link, or the person's choice in "Where should it go?"
  const [chosen, setChosen] = useState<{ code: string; city: string } | null>(null);
  const [step, setStep] = useState<'preview' | 'where'>('preview');
  const [whereQuery, setWhereQuery] = useState('');
  const [whereResults, setWhereResults] = useState<Place[] | null>(null);
  const [newCity, setNewCity] = useState<string | null>(null);
  const countries = useCountries() ?? [];
  // Collections friends shared with you as a Member: you can save into theirs instead of your own ('' = yours)
  const memberOf = (useShares() ?? []).filter((x) => x.ownerId !== me.uid && x.roles[me.uid] === 'member');
  const owners = useProfiles(memberOf.map((x) => x.ownerId));
  const [into, setInto] = useState('');

  // Start fresh each time it opens; a shared link is read straight away.
  useEffect(() => {
    if (!request) return;
    setLink(request.url ?? ''); setName('');
    setPreview(null); setNote(''); resetTrip(); setChosen(null); setStep('preview'); setWhereQuery(''); setNewCity(null); setInto('');
    // The clipboard is read only when you tap Paste: reading it here made iOS show its Paste bubble as the sheet opened.
    if (request.url) read(request.url);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetTrip() { setDest('collections'); setTripId(''); setAction('new'); setDay(''); setTime(''); setCheckout(''); setEventId(''); defaulted.current = false; }
  const show = (p: LinkPreview) => {
    setPreview(p); setName(p.place && !p.place.isArea ? p.place.name : p.title); setCategory(detectCategory(p.place));
    resetTrip(); setChosen(null); setStep('preview');
  };
  const read = async (raw: string) => {
    const url = findUrl(raw) ?? raw.trim();
    if (!/^https?:\/\//.test(url)) { toast({ tone: 'danger', label: 'That doesn’t look like a link' }); return; }
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
  const upcoming = useMemo(() => (trips ?? []).filter((t) => t.endDate >= today() && isTravelling(t, me.uid)).sort((a, b) => a.startDate.localeCompare(b.startDate)), [trips, me.uid]);
  const acts = useActivitiesFor(upcoming.map((t) => t.id));
  const place = preview?.place && !preview.place.isArea ? preview.place : null;
  // Rove's pick: the place's country and city (an area the link is about counts too); the person can change it.
  const picked = { code: preview?.place?.countryCode ?? '', city: place?.city || (preview?.place?.isArea ? preview.place.city ?? '' : '') };
  const target = chosen ?? picked;
  const code = target.code;
  const city = target.city;
  // A place when Rove found one or you chose a city; otherwise a link filed under its country ("Links & notes")
  const kind: 'place' | 'link' = place || city ? 'place' : 'link';
  // The trip that covers this city, else one whose countries include the place's (see tripCountries)
  const covering = (city ? upcoming.find((t) => tripCoversCity(t, acts[t.id] ?? [], city)) : undefined)
    ?? (code ? upcoming.find((t) => tripCountryCodes(t, acts[t.id] ?? []).has(code)) : undefined);
  // The Trip side: only with an upcoming trip and a place Rove found.
  const canTrip = kind === 'place' && upcoming.length > 0;
  useEffect(() => {
    if (!preview || defaulted.current || !canTrip) return;
    // It always opens on Collections (owner); the trip that covers the city is the one picked when you tap Trip
    if (covering) { defaulted.current = true; setTripId(covering.id); }
  }, [preview, covering, canTrip]);
  const onTrip = canTrip && dest === 'trip';
  const tripChoices = covering ? [covering, ...upcoming.filter((t) => t.id !== covering.id)] : upcoming;
  const trip = tripChoices.find((t) => t.id === tripId) ?? tripChoices[0];
  const days = trip ? tripDays(trip.startDate, trip.endDate) : [];
  const theDay = day && days.includes(day) ? day : days.includes(today()) ? today() : days[0] ?? '';
  const stay = behaviourOf(category) === 'span';
  const out = checkout && checkout > theDay ? checkout : addDays(theDay, 1);
  // Its events, by day; the likely match first: same place, else same name, else same category, else the next one
  const events = useMemo(() => (trip ? acts[trip.id] ?? [] : []).filter((a) => behaviourOf(a.category) !== 'note')
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [acts, trip]);
  const title0 = (name.trim() || place?.name || preview?.title || '').toLowerCase();
  const same = (a: Activity) => !!title0 && (a.title.toLowerCase().includes(title0) || (a.locationText ?? '').toLowerCase().includes(title0));
  const likely = events.find((a) => !!a.placeId && places.some((p) => p.id === a.placeId && !!preview?.url && p.url === preview.url))
    ?? events.find(same) ?? events.find((a) => a.category === category && a.date >= today()) ?? events.find((a) => a.date >= today()) ?? events[0];
  const picked2 = events.find((a) => a.id === eventId) ?? likely;
  const dayLabel = (d: string) => formatDay(d, { weekday: 'short', day: 'numeric' });
  const longDay = (d: string) => formatDay(d, { weekday: 'short', day: 'numeric', month: 'short' });

  const paste = async () => {
    try {
      const url = findUrl(await readClipboard());
      if (url) { setLink(url); read(url); } else toast({ label: 'No link on the clipboard' });
    } catch { toast({ label: 'Paste the link into the field' }); }
  };

  const save = async (mode: 'collections' | 'event' | 'link' | 'idea' = onTrip ? (action === 'new' ? 'event' : action === 'add' ? 'link' : 'idea') : 'collections') => {
    if (!preview) return;
    if (!code) return; // "Choose where to save" first
    const intoShare = memberOf.find((x) => x.id === into && x.countryCode === code);
    const where = [intoShare ? `${personName(owners, intoShare.ownerId).split(' ')[0]}'s ${countryName(code)}` : countryName(code), city].filter(Boolean).join(' · ');
    const title = name.trim() || place?.name || preview.title;
    // The same place twice: same link, or the same name in the same spot.
    const dupe = places.find((p) => (!!preview.url && p.url === preview.url)
      || (!!place && p.name === title && p.lat != null && Math.abs(p.lat - place.lat) < 0.002 && Math.abs((p.lng ?? 0) - place.lng) < 0.002));
    if (dupe && mode === 'collections') { toast({ icon: 'check', label: `Already in your ${dupe.countryCode ? countryName(dupe.countryCode) : 'Unsorted'} collection` }); onClose(); return; }
    try {
      // Every trip action files the place in Collections too (or reuses the one already there)
      const { id, saved } = dupe ? { id: dupe.id, saved: Promise.resolve() } : store.addPlace({
        name: title, category, city: kind === 'place' ? city : '', country: countryName(code), countryCode: code, ...(kind === 'link' ? { type: 'link' as const } : {}),
        lat: place && Number.isFinite(place.lat) ? place.lat : null, lng: place && Number.isFinite(place.lng) ? place.lng : null,
        ...(preview.url ? { url: preview.url } : {}), ...(preview.image ? { image: preview.image } : {}),
        ...(preview.site ? { source: preview.site } : {}), ...(place?.kind ? { kind: place.kind } : {}),
        ...(note.trim() ? { notes: note.trim() } : {}), ...(intoShare ? { sharedIn: intoShare.id } : {}),
      });
      saved.catch(() => toast({ tone: 'danger', label: "Couldn't save. Check your connection" }));
      const dropPlace = () => { if (!dupe) store.deletePlace(id).catch(() => {}); };
      const fail = () => toast({ tone: 'danger', label: "Couldn't add it. Check your connection" });
      const link: LinkItem = { label: preview.site || 'Link', url: preview.url };
      if (mode === 'collections') {
        haptic('success');
        toast({ icon: 'check', label: `Saved to ${where}`, action: { label: 'Undo', onClick: dropPlace } });
      } else if (mode === 'idea' && trip) {
        // An Idea that points at the Place (never a copy)
        const idea = store.queueSub(trip.id, 'ideas', { title, category: eventCategoryOf(category), notes: '', links: [], votes: {}, status: 'open', placeId: id });
        idea.saved.catch(fail);
        haptic('success');
        toast({ icon: 'check', label: `Added to ${trip.name} ideas`, action: { label: 'Undo', onClick: () => { store.deleteSub(trip.id, 'ideas', idea.id).catch(() => {}); dropPlace(); } } });
      } else if (mode === 'event' && trip && place) {
        // A new event, filled in from the link: the place, its name and the link; you picked the day (and a time)
        const info = kindInfo(category);
        const location: Place | null = Number.isFinite(place.lat) ? { name: place.name, lat: place.lat, lng: place.lng, country: place.country, countryCode: place.countryCode } : null;
        const tz = location ? await Promise.race([zoneAt(location).catch(() => undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), 2500))]) : undefined;
        // Who's in: everyone for a plan, just you for a stay; anyone else put in it sees "New · added by" you
        const people = defaultPeople(trip, me.uid, category);
        const ev = store.queueSub(trip.id, 'activities', {
          title, category, type: info.type, behaviour: info.behaviour, date: theDay, startTime: time, endTime: '',
          locationText: [place.name, city || place.city].filter(Boolean).join(', '), location, notes: '', links: preview.url ? [link] : [],
          people, added: addedAfter({}, [], people, me.uid), placeId: id, ...(stay ? { endDate: out } : {}), ...(tz ? { tz } : {}),
        });
        ev.saved.catch(fail);
        haptic('success');
        toast({ icon: 'check', label: `Added to ${longDay(theDay)} · ${trip.name}`, action: { label: 'Undo', onClick: () => { store.deleteSub(trip.id, 'activities', ev.id).catch(() => {}); dropPlace(); } } });
      } else if (mode === 'link' && trip && picked2) {
        // The link goes into that event's Files & links (once)
        const before = picked2.links ?? [];
        if (preview.url && !before.some((l) => l.url === preview.url)) store.updateSub(trip.id, 'activities', picked2.id, { links: [...before, link] }).catch(fail);
        haptic('success');
        toast({ icon: 'check', label: `Added to ${picked2.title}`, action: { label: 'Undo', onClick: () => { store.updateSub(trip.id, 'activities', picked2.id, { links: before }).catch(() => {}); dropPlace(); } } });
      }
      onClose();
    } catch {
      haptic('error');
      toast({ tone: 'danger', label: "Couldn't save. Check your connection" });
    }
  };

  const open = !!request;
  const meta = [place?.kind, place?.city || preview?.place?.country, preview?.site ? `from ${preview.site}` : null].filter(Boolean).join(' · ');
  // Cities to offer for the chosen country: Rove's pick, then the cities you've saved there
  const cityChips = [...new Set([picked.code === code ? picked.city : '', ...places.filter((p) => p.countryCode === code && (p.type ?? 'place') === 'place').map((p) => p.city), chosen?.city ?? ''].filter(Boolean))];
  const whereSheet = step === 'where';
  const shared = !!request?.url;
  const icon = placeCategory(category).icon;

  const cat = placeCategory(category);
  const byDay = events.reduce<Record<string, Activity[]>>((m, a) => { (m[a.date] ??= []).push(a); return m; }, {});
  const order = Object.keys(byDay).sort();
  if (picked2) { const d = picked2.date; order.splice(order.indexOf(d), 1); order.unshift(d); }
  const suggested = action === 'add' ? likely : undefined;
  const eventRow = (a: Activity, extra?: string) => {
    const k = kindInfo(a.category);
    const meta = [longDay(a.date), a.startTime ? formatTime(a.startTime) : null, extra ?? k.label].filter(Boolean).join(' · ');
    return <ListItem key={a.id} icon={k.icon} type={categoryTone(a.category)} title={a.title} meta={meta}
      trailing={a.id === picked2?.id ? 'Selected' : undefined} onClick={() => { haptic('selection'); setEventId(a.id); }} />;
  };
  const tripSide = trip && (
    <>
      {tripChoices.length > 1 && (
        <section className={s.field} aria-labelledby="save-trip">
          <h3 className="t-heading-4" id="save-trip">Which trip?</h3>
          <div className={s.chipsWrap} role="group" aria-labelledby="save-trip">
            {tripChoices.map((t) => <Chip key={t.id} selected={t.id === trip.id} onClick={() => { haptic('selection'); setTripId(t.id); setDay(''); setEventId(''); }}>{t.name}</Chip>)}
          </div>
        </section>
      )}
      <div className={s.field} role="group" aria-label="How to add it">
        <OptionCard icon={cat.icon} type={cat.tone} label="New event" description={`${cat.label} · ${name.trim() || place?.name || preview?.title}, filled in from the link`} selected={action === 'new'} onClick={() => { haptic('selection'); setAction('new'); }} />
        {events.length > 0 && <OptionCard icon="link" type="neutral" label="Add to an event" description="Attach the link to something already planned" selected={action === 'add'} onClick={() => { haptic('selection'); setAction('add'); }} />}
        <OptionCard icon="lightbulb" type="notes" label="Add to ideas" description="So everyone on the trip can vote on it" selected={action === 'idea'} onClick={() => { haptic('selection'); setAction('idea'); }} />
      </div>
      {action === 'new' && (
        <>
          <section className={s.field} aria-labelledby="save-day">
            <h3 className="t-heading-4" id="save-day">{stay ? 'Check-in' : 'Which day?'}</h3>
            <div className={s.chipsWrap} role="group" aria-labelledby="save-day">
              {days.map((d) => <Chip key={d} selected={d === theDay} label={`${longDay(d)}${d === theDay ? ', selected' : ''}`} onClick={() => { haptic('selection'); setDay(d); }}>{dayLabel(d)}</Chip>)}
            </div>
            {!stay && <TextField label="Time (optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
          </section>
          {stay && (
            <section className={s.field} aria-labelledby="save-out">
              <h3 className="t-heading-4" id="save-out">Check-out</h3>
              <div className={s.chipsWrap} role="group" aria-labelledby="save-out">
                {[...days.filter((d) => d > theDay), addDays(days[days.length - 1] ?? theDay, 1)].map((d) => <Chip key={d} selected={d === out} label={`${longDay(d)}${d === out ? ', selected' : ''}`} onClick={() => { haptic('selection'); setCheckout(d); }}>{dayLabel(d)}</Chip>)}
              </div>
              <TextField label="Check-in time (optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </section>
          )}
        </>
      )}
      {action === 'add' && (
        <>
          {suggested && (
            <section className={s.field} aria-labelledby="save-suggested">
              <h3 className="t-heading-4" id="save-suggested">Suggested</h3>
              <ListGroup label="Suggested event">{eventRow(suggested, 'Likely match')}</ListGroup>
            </section>
          )}
          {/* Every day of the trip, folded up so a long trip stays short: open a day to pick from it */}
          <section className={s.field} aria-labelledby="save-days">
            <h3 className="t-heading-4" id="save-days">All events</h3>
            {Object.keys(byDay).sort().map((d) => (
              <Accordion key={d} title={longDay(d)} meta={`${byDay[d].length} ${byDay[d].length === 1 ? 'event' : 'events'}${byDay[d].some((a) => a.id === picked2?.id) ? ' · Selected' : ''}`}>
                {byDay[d].map((a) => eventRow(a))}
              </Accordion>
            ))}
          </section>
        </>
      )}
    </>
  );
  // Where it's filed: the country (Change picks another) and its city, right here on the sheet
  const whereSection = (
    <section className={s.field} aria-labelledby="save-where">
      <h3 className="t-heading-4" id="save-where">Saving to</h3>
      <div className={s.preview}>
        <span className={[s.previewThumb, s.previewRound].join(' ')} aria-hidden="true">{code ? <img src={flagUrl(code)} alt="" className={s.flag} /> : <Icon name="pin" size={24} />}</span>
        <span className={s.previewText}>
          <span className={s.previewTitle}>{code ? countryName(code) : 'Choose a country'}</span>
          <span className={s.previewMeta}>{code ? (chosen ? 'You chose' : 'Found in the link') : 'Rove couldn’t find a place in the link'}</span>
        </span>
        <Button tone="ghost" size="small" onClick={() => { setStep('where'); setWhereQuery(''); }}>{code ? 'Change' : 'Choose'}</Button>
      </div>
      {code && (
        <>
          <div className={s.chipsWrap} role="group" aria-label={`City in ${countryName(code)}`}>
            {cityChips.map((c) => (
              <Chip key={c} selected={city === c && newCity === null} onClick={() => { haptic('selection'); setChosen({ code, city: c }); setNewCity(null); }} label={`${c}${city === c ? ', selected' : ''}`}>{c}</Chip>
            ))}
            <Chip icon="plus" selected={newCity !== null} onClick={() => { haptic('selection'); setNewCity(''); }}>New city</Chip>
          </div>
          {/* A friend shared their collection for this country with you as a Member: save into yours or theirs */}
          {memberOf.some((x) => x.countryCode === code) && (
            <div className={s.chipsWrap} role="group" aria-label="Whose collection">
              <Chip selected={!memberOf.some((x) => x.id === into && x.countryCode === code)} onClick={() => { haptic('selection'); setInto(''); }}>Your collection</Chip>
              {memberOf.filter((x) => x.countryCode === code).map((x) => {
                const label = `${personName(owners, x.ownerId).split(' ')[0]}'s collection`;
                return <Chip key={x.id} icon="people" selected={into === x.id} onClick={() => { haptic('selection'); setInto(x.id); }} label={`${label}${into === x.id ? ', selected' : ''}`}>{label}</Chip>;
              })}
            </div>
          )}
          {newCity !== null && <TextField label="New city" placeholder="Hobart" value={newCity} autoComplete="off" autoFocus
            onChange={(e) => { setNewCity(e.target.value); setChosen({ code, city: e.target.value.trim() }); }} />}
        </>
      )}
    </section>
  );

  return (
    <Sheet open={open} title={whereSheet ? 'Choose a country' : shared ? 'Save to Rove' : 'Save a place'}
      subtitle={whereSheet ? (picked.code ? `Rove picked ${countryName(picked.code)} from the link` : 'Rove couldn’t tell from the link') : preview && shared && preview.site ? `Shared from ${preview.site}` : preview || reading ? undefined : 'Paste a link from TikTok, Instagram, Google Maps or any site'}
      onClose={whereSheet ? () => setStep('preview') : onClose} onSubmit={!preview ? undefined : whereSheet ? () => setStep('preview') : () => save()}
      submitDisabled={!!preview && !whereSheet && (!code || (onTrip && action === 'add' && !picked2))}
      submitLabel={whereSheet ? 'Done' : onTrip ? (action === 'new' ? `Add to ${longDay(theDay)}` : action === 'idea' ? `Add to ${trip?.name} ideas` : picked2 ? `Add to ${picked2.title}` : 'Add') : code ? `Save to ${countryName(code)}` : 'Save'}>
      {/* Reading the link: only the skeleton (the preview's shape) */}
      {!preview && reading && (
        <div className={s.reading} role="status" aria-label="Reading the link">
          <Skeleton layout="block" height={72} />
          <Skeleton layout="block" height={72} />
          <Skeleton width="40%" />
        </div>
      )}

      {!preview && !reading && (
        <>
          <TextField label="Link" placeholder="https://…" inputMode="url" autoComplete="off" value={link} onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (link.trim()) read(link); } }} />
          <div className={s.buttonPair}>
            <Button tone="neutral" size="large" icon="copy" onClick={paste}>Paste</Button>
            <Button size="large" disabled={!link.trim()} onClick={() => read(link)}>Continue</Button>
          </div>
        </>
      )}

      {preview && !whereSheet && (
        <div className={s.sections}>
          <div className={s.preview}>
            <span className={s.previewThumb} aria-hidden="true">{preview.image ? <img src={preview.image} alt="" /> : <Icon name={kind === 'link' ? 'link' : icon} size={24} />}</span>
            <span className={s.previewText}>
              <span className={s.previewTitle}>{name.trim() || preview.title}</span>
              {meta && <span className={s.previewMeta}>{meta}</span>}
            </span>
          </div>
          {canTrip && (
            <section className={s.field} aria-labelledby="save-dest">
              <h3 className="t-heading-4" id="save-dest">Choose where to save this</h3>
              <SegmentControl block label="Choose where to save this" value={dest} onChange={setDest}
                options={[{ value: 'collections', label: 'Collections' }, { value: 'trip', label: 'Trip' }]} />
            </section>
          )}
          {onTrip && trip ? tripSide : (
            <>
              <TextField label="Name" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
              {whereSection}
              <PlaceKindPicker id="save-category" value={category} onChange={setCategory} />
              <TextArea label="Note (optional)" placeholder="Why did you save this?" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </>
          )}
        </div>
      )}

      {preview && whereSheet && (
        <>
          <TextField icon="pin" label="Search a country or city" placeholder="Search a country or city" value={whereQuery} onChange={(e) => setWhereQuery(e.target.value)} autoComplete="off" />
          {whereResults && whereResults.length > 0 && (
            <ListGroup label="Places found">
              {whereResults.slice(0, 5).map((r) => (
                <ListItem key={`${r.lat},${r.lng}`} round media={r.countryCode ? <img src={flagUrl(r.countryCode)} alt="" className={s.flag} /> : undefined} icon="pin"
                  title={r.name.split(',')[0]} meta={r.name.split(',').slice(1).join(',').trim() || undefined}
                  onClick={() => { haptic('selection'); setChosen({ code: (r.countryCode ?? '').toLowerCase(), city: r.name.split(',')[0] }); setNewCity(null); setWhereQuery(''); setWhereResults(null); setStep('preview'); }} />
              ))}
            </ListGroup>
          )}
          {countries.filter((c) => c.code).length > 0 && (
            <section className={s.field} aria-labelledby="save-countries">
              <h3 className="t-heading-4" id="save-countries">Your saved countries</h3>
              <ListGroup label="Your saved countries">
                {countries.filter((c) => c.code).map((c) => (
                  <ListItem key={c.code} round media={<img src={c.flag} alt="" className={s.flag} />} title={c.name} meta={placeCounts(c.places)}
                    trailing={c.code === code ? 'Selected' : undefined}
                    onClick={() => { haptic('selection'); setChosen({ code: c.code, city: c.code === picked.code ? picked.city : '' }); setNewCity(null); setStep('preview'); }} />
                ))}
              </ListGroup>
            </section>
          )}
        </>
      )}
    </Sheet>
  );
}
