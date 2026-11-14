import { undoPatch } from '../../lib/eventHistory';
import { useEffect, useState } from 'react';
import { Button, CategoryIcon, Chip, FieldRow, OptionCard, Dropdown, Sheet, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useMe, useRole, useSub } from '../../data/hooks';
import type { Activity, Category, LinkItem, Place, Trip } from '../../data/types';
import { addDays, dayWord, formatDay, formatTime, tripDays } from '../../lib/dates';
import { geocodePlace } from '../../lib/geocode';
import { EVENT_TYPES, TYPE_TONE, behaviourOf, eventKind, isEveryday, kindInfo, spanWords, type EventKind, type EventType } from '../../lib/categories';
import { haptic, confirmAction, readClipboard } from '../../lib/native';
import { cleanTitle, findUrl, readLink } from '../../lib/links';
import { LinkEditor, cleanLinks } from '../shared/Links';
import { zoneAt, zoneOfDay } from '../../lib/timezone';
import { PriceField, fromPriceDraft, toPriceDraft, type PriceDraft } from '../shared/Price';
import { priceOf } from '../../lib/currency';
import { eventsOn, entryEnd, entryTime, legsOf, sameDaySpan } from './events';
import s from './trip.module.css';

export type ActivityDraft = Partial<Pick<Activity, 'title' | 'category' | 'notes' | 'links' | 'date' | 'startTime' | 'endTime' | 'locationText' | 'placeId' | 'fromText' | 'journeyId'>>;

type Form = {
  /** Step 1 picks the type; step 2 a category inside it (null until picked) */
  type: EventType | null; kind: EventKind | null;
  title: string; date: string; endDate: string; startTime: string; endTime: string;
  locationText: string; fromText: string; toText: string; ref: string; bookingRef: string; operator: string; seats: string; notes: string; links: LinkItem[];
  /** Per person; asked for everything you book ahead (not food & drink, free time or notes: those are everyday spending) */ price: PriceDraft;
};

const toForm = (a: ActivityDraft | Activity | undefined, date: string, currency: string): Form => {
  const full = a as Partial<Activity> | undefined;
  const kind = a?.category ? eventKind(a.category) : null;
  return {
    type: kind ? kindInfo(kind).type : null,
    kind,
    title: a?.title ?? '',
    date: a?.date ?? date,
    // A span starts out a night long (a rental: same day) until its end is picked
    endDate: full?.endDate || (kind && behaviourOf(kind) === 'span' ? (kind === 'car' || kind === 'campervan' || sameDaySpan(kind) ? a?.date ?? date : addDays(a?.date ?? date, 1)) : ''),
    startTime: a?.startTime ?? '',
    endTime: a?.endTime ?? '',
    locationText: a?.locationText ?? '',
    // A journey that was saved before it had a route starts from its place.
    fromText: full?.fromText || (kind && behaviourOf(kind) === 'journey' && kind !== 'flight' ? a?.locationText ?? '' : ''),
    toText: full?.toText ?? '',
    ref: full?.ref ?? '',
    bookingRef: full?.bookingRef ?? '',
    operator: full?.operator ?? '',
    seats: full?.seats ?? '',
    notes: a?.notes ?? '',
    links: a?.links?.length ? a.links : [],
    price: toPriceDraft(full?.id ? priceOf(full as Activity, { currency }) : null, currency),
  };
};

/** "Lisbon (LIS)" or "Lisbon, Portugal" → "Lisbon", for titles like "Lisbon → Porto". */
const city = (s: string) => s.split(',')[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim();

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * Free time: the first gap of an hour or more between 09:00 and 22:00 on that day, given the events already there
 * (up to 3 hours of it). Null when the day is full.
 */
export function suggestFreeTime(activities: Activity[], day: string, except?: string): { start: string; end: string } | null {
  const busy = eventsOn(activities.filter((a) => a.id !== except), day)
    .map((e) => ({ from: entryTime(e), to: entryEnd(e) }))
    .filter((x) => x.from)
    .map((x) => ({ from: toMin(x.from), to: x.to === '99:99' ? toMin(x.from) + 60 : toMin(x.to) }))
    .sort((x, y) => x.from - y.from);
  let at = 9 * 60;
  for (const b of busy) {
    if (b.from - at >= 60) return { start: toTime(at), end: toTime(Math.min(b.from, at + 180)) };
    at = Math.max(at, b.to);
  }
  return 22 * 60 - at >= 60 ? { start: toTime(at), end: toTime(Math.min(22 * 60, at + 180)) } : null;
}

/**
 * Add an event by hand, or edit one. Step 1: the 6 types as Option cards with what each covers (Getting
 * around, Stays, Food & drink, Activities, Free time, Notes & reminders). Step 2, in the same Sheet: a Chip row of the
 * type's categories (the most common pre-selected; Flights has only one), a line saying what the chosen one covers,
 * then the fields for its behaviour (journey, span, at a place, open, note). Saved events get their category, type and
 * behaviour. `draft` prefills a new one (e.g. from an idea added to a day); `onCreated` gets the new id.
 */
export function ActivityForm({ open, trip, date, activity, draft, onClose, onCreated, onDeleted, onAddConnection }: {
  open: boolean; trip: Trip; date: string; activity?: Activity; draft?: ActivityDraft; onClose: () => void; onCreated?: (id: string) => void;
  /** Editing a journey: "+ Add a connection" closes this sheet and opens the next leg's (see ConnectionForm) */ onAddConnection?: () => void;
  /** After a delete: e.g. the event's own page goes back to its day in the itinerary */ onDeleted?: (a: Activity) => void;
}) {
  const me = useMe();
  // Delete for any traveller (the rules refuse followers)
  const { isTraveller } = useRole(trip);
  const toast = useToast();
  const activities = useSub(trip.id, 'activities') ?? [];
  const budgetCurrency = trip.budget?.currency ?? trip.currency;
  const [f, setF] = useState<Form>(() => toForm(activity ?? draft, date, budgetCurrency));
  const [busy, setBusy] = useState(false);
  const [changingType, setChangingType] = useState(false);
  useEffect(() => { if (open) setChangingType(false); }, [open]);
  useEffect(() => { if (open) { const x = toForm(activity ?? draft, date, budgetCurrency); if (x.endDate && x.kind && behaviourOf(x.kind) === 'span' && x.endDate > trip.endDate) x.endDate = trip.endDate < x.date ? x.date : trip.endDate; setF(x); } }, [open, activity, draft, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  // At a place: an end time only when asked for ("+ Add end time" turns into the field)
  const [withEnd, setWithEnd] = useState(false);
  useEffect(() => { if (open) setWithEnd(!!(activity ?? draft)?.endTime); }, [open, activity, draft]);
  // Location from a link (Google or Apple Maps, or any page about a place): the place it points at, and its name
  // (Location, From and To each take a link: the place each link found, by field)
  type PlaceKey = 'locationText' | 'fromText' | 'toText';
  const [linkPlaces, setLinkPlaces] = useState<Partial<Record<PlaceKey, Place>>>({});
  const [reading, setReading] = useState<PlaceKey | null>(null);
  useEffect(() => { if (open) { setLinkPlaces({}); setReading(null); } }, [open]);
  const linkPlace = linkPlaces.locationText ?? null;
  const fromLink = async (url: string, key: PlaceKey = 'locationText') => {
    setReading(key);
    try {
      const p = await readLink(url);
      const pl = p.place;
      if (pl && !pl.isArea && pl.name) {
        const text = [pl.name, pl.city].filter(Boolean).join(', ');
        if (Number.isFinite(pl.lat)) setLinkPlaces((m) => ({ ...m, [key]: { name: text, lat: pl.lat, lng: pl.lng, country: pl.country, countryCode: pl.countryCode } })); // no map position: geocoded from the text when saved
        // The place fills its field; for Location, the Name too, but only if you haven't typed one
        setF((x) => ({ ...x, [key]: text, ...(key === 'locationText' ? { title: x.title.trim() ? x.title : cleanTitle(pl.name) || pl.name } : {}) }));
        haptic('light');
      } else {
        set({ [key]: '' } as Partial<Form>);
        toast({ label: 'Couldn’t find a place in that link. Type the name or address' });
      }
    } catch { toast({ tone: 'danger', label: 'Couldn’t read that link' }); }
    finally { setReading(null); }
  };
  const pasteLocation = async (key: PlaceKey = 'locationText') => {
    try {
      const raw = (await readClipboard()).trim();
      const url = findUrl(raw);
      if (url) { set({ [key]: url } as Partial<Form>); fromLink(url, key); } else if (raw) set({ [key]: raw } as Partial<Form>); else toast({ label: 'Nothing to paste' });
    } catch { toast({ label: 'Paste it into the field' }); }
  };
  const days = tripDays(trip.startDate, trip.endDate);
  const kind = f.kind;
  const info = kind ? kindInfo(kind) : null;
  const behaviour = info?.behaviour;
  const typeInfo = EVENT_TYPES.find((t) => t.value === f.type);
  const vehicle = kind === 'car' || kind === 'campervan';
  const sameDay = !!kind && sameDaySpan(kind); // parking and luggage can be collected the same day
  const [startWord, endWord] = kind ? spanWords(kind) : ['Starts', 'Ends'];

  // Free time and rest: suggest the day's first free gap (when the times are still empty)
  const suggestion = behaviour === 'open' ? suggestFreeTime(activities, f.date, activity?.id) : null;
  const pickKind = (k: EventKind) => {
    const b = kindInfo(k).behaviour;
    const free = b === 'open' && !f.startTime ? suggestFreeTime(activities, f.date, activity?.id) : null;
    set({
      kind: k,
      endDate: b === 'span' ? (f.endDate && f.endDate >= f.date ? f.endDate : k === 'car' || k === 'campervan' || sameDaySpan(k) ? f.date : addDays(f.date, 1)) : f.endDate,
      ...(free ? { startTime: free.start, endTime: free.end } : {}),
    });
  };
  const pickType = (t: EventType) => { haptic('light'); set({ type: t }); pickKind(EVENT_TYPES.find((x) => x.value === t)!.kinds[0].value); };

  // What each behaviour needs before it can be saved
  const priced = !!kind && !isEveryday(kind);
  const valid = !!kind && (
    behaviour === 'journey' ? !!(f.fromText.trim() && (kind !== 'flight' || f.toText.trim()))
      : behaviour === 'span' ? (vehicle ? !!(f.fromText.trim() && f.endDate && f.endDate >= f.date) : !!(f.locationText.trim() && f.endDate && (f.endDate > f.date || (sameDay && f.endDate === f.date))))
        : behaviour === 'open' ? true
          : behaviour === 'note' ? !!f.notes.trim()
            : !!f.locationText.trim());

  const submit = async () => {
    if (!kind || !valid || !info) return;
    setBusy(true);
    try {
      // A place for what was typed: the one a pasted link found, the saved one if unchanged, else looked up (a name or an
      // address, near the trip), so the event page can still open it in Maps
      const find = async (text: string, prev: string | undefined, prevPlace: Place | null | undefined, near: Place | null, key?: PlaceKey) =>
        !text.trim() ? null : key && linkPlaces[key] && linkPlaces[key]!.name === text.trim() ? linkPlaces[key]! : text.trim() === (prev ?? '') && prevPlace ? prevPlace : await geocodePlace(text, near);
      const near = kind === 'flight' ? null : trip.destination;
      const journey = behaviour === 'journey' && !!f.toText.trim();
      const routed = behaviour === 'journey' || vehicle;
      const dropText = vehicle ? (f.toText.trim() || f.fromText.trim()) : f.toText.trim();
      // A journey's (or rental's) place is where it starts; it also remembers where it ends (its country joins the trip's chips)
      const from = routed ? await find(f.fromText, activity?.fromText, activity?.location, near, 'fromText') : null;
      const to = journey || vehicle ? (vehicle && !f.toText.trim() ? from : await find(dropText, activity?.toText, activity?.to, near, 'toText')) : null;
      const placeText = routed ? f.fromText.trim() : behaviour === 'note' ? '' : f.locationText.trim();
      const location = routed ? from
        : !placeText ? null
          : linkPlace && placeText === linkPlace.name ? linkPlace
            : placeText === (activity?.locationText ?? '') && activity?.location ? activity.location : await geocodePlace(placeText, trip.destination);
      // Titles come from the places. An event (or idea) keeps its own title while its place is unchanged.
      const src = activity ?? draft;
      const keep = src?.title && placeText === (src.locationText ?? '').trim() ? src.title : '';
      const noteText = f.notes.trim();
      const title = behaviour === 'open' ? (f.title.trim() || info.label)
        : behaviour === 'note' ? noteText.split('\n')[0].slice(0, 80)
          : journey ? `${city(f.fromText)} → ${city(f.toText)}`
            : behaviour === 'journey' ? `${info.label} from ${city(f.fromText)}`
              : vehicle ? (f.operator.trim() ? `${f.operator.trim()} ${info.label.toLowerCase()}` : `${info.label} · ${city(f.fromText)}`)
                : f.title.trim() ? f.title.trim() // its own name, when you gave it one
                : info.type === 'transport' ? `${info.label} · ${city(placeText)}`
                  : keep || city(placeText);
      const ends = behaviour === 'span' || (behaviour === 'journey' && f.endDate > f.date);
      // Time zones: where it happens (and where a journey or rental ends). Free time and notes use where you are that day.
      const [tz, toTz] = await Promise.all([
        location ? zoneAt(location) : Promise.resolve(zoneOfDay(activities.filter((x) => x.id !== activity?.id), f.date) ?? (await zoneAt(trip.destination))),
        to ? zoneAt(to) : Promise.resolve(undefined),
      ]);
      const data: Partial<Activity> & { category: Category } = {
        title,
        category: kind,
        type: info.type,
        behaviour: info.behaviour,
        date: f.date,
        startTime: f.startTime,
        endTime: behaviour === 'place' && !withEnd ? '' : f.endTime,
        locationText: placeText,
        location,
        notes: noteText,
        links: behaviour === 'open' || behaviour === 'note' ? [] : cleanLinks(f.links),
        // Behaviour-specific fields; cleared when they don't apply, so a changed category leaves nothing behind.
        endDate: ends ? f.endDate : '',
        fromText: routed ? f.fromText.trim() : '',
        toText: journey || vehicle ? dropText : '',
        to: journey || vehicle ? to : null,
        ref: kind === 'flight' ? f.ref.trim().toUpperCase().replace(/\s+/g, '') : '',
        bookingRef: info.booking ? f.bookingRef.trim() : '',
        operator: (behaviour === 'journey' && kind !== 'flight') || vehicle ? f.operator.trim() : '',
        seats: behaviour === 'journey' ? f.seats.trim() : '',
        price: priced ? fromPriceDraft(f.price) : null,
        cost: 0,
        ...(tz ? { tz } : {}),
        ...(toTz ? { toTz } : {}),
        ...(!activity && draft?.journeyId ? { journeyId: draft.journeyId } : {}),
      };
      // Edits are recorded in the event's history (Changes) and can be undone from the toast
      if (activity) await store.updateEvent(trip.id, activity, data);
      else {
        const id = await store.addSub(trip.id, 'activities', { ...(data as Omit<Activity, 'id' | 'createdBy' | 'createdAt' | 'attendeeIds'>), ...(draft?.placeId ? { placeId: draft.placeId } : {}), attendeeIds: [me.uid] });
        onCreated?.(id);
      }
      if (activity) {
        const edited = { ...activity, ...data } as Activity;
        toast({ icon: 'check', label: 'Changes saved', action: { label: 'Undo', onClick: () => { store.updateEvent(trip.id, edited, undoPatch(activity, data)).catch(() => {}); } } });
      } else toast({ icon: 'check', label: behaviour === 'span' ? `${info.label} added: ${startWord.toLowerCase()} and ${endWord.toLowerCase()}` : 'Event added' });
      onClose();
    } catch {
      toast({ tone: 'danger', label: "Couldn't save. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!activity || !confirmAction(`Delete "${activity.title}"? It stays in Recently deleted for 30 days.`)) return;
    try {
      const item = { kind: 'event' as const, tripId: trip.id, id: activity.id };
      await store.setDeleted(item, true);
      toast({ icon: 'trash', label: 'Event deleted', action: { label: 'Undo', onClick: () => { store.setDeleted(item, false).catch(() => {}); } } });
      onClose();
      onDeleted?.(activity);
    } catch {
      toast({ tone: 'danger', label: "Couldn't delete. Check your connection" });
    }
  };

  // End days (check-out, pick-up, drop-off, collect) are the trip's days only: the itinerary shows nothing outside the trip (owner)
  const afterEnd = days;
  const daySelect = (lbl: string, value: string, onChange: (v: string) => void, list = days) => (
    <Dropdown label={lbl} value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((d) => <option key={d} value={d}>{dayWord(d, trip.startDate)} · {formatDay(d)}</option>)}
    </Dropdown>
  );
  const time = (lbl: string, key: 'startTime' | 'endTime') => (
    <TextField label={lbl} type="time" value={f[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)} />
  );
  const text = (lbl: string, key: 'fromText' | 'toText' | 'locationText' | 'operator' | 'ref' | 'seats' | 'title', placeholder: string, hint?: string) => (
    <TextField label={lbl} placeholder={placeholder} hint={hint} value={f[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)} />
  );
  // Location, From or To: a place name, an address or a maps link (a link is read for its place, and Location's for the
  // Name when it's empty), with Paste beside it. A typed name or address is looked up when saved, so it opens in Maps.
  const locationField = (lbl: string, placeholder: string, hint: string, key: PlaceKey = 'locationText') => (
    <div className={s.locationField}>
      <div className={s.locationRow}>
        <TextField label={lbl} placeholder={placeholder} value={f[key]} inputMode="text"
          onChange={(e) => { const v = e.target.value; set({ [key]: v } as Partial<Form>); setLinkPlaces((m) => ({ ...m, [key]: undefined })); const url = findUrl(v); if (url && url === v.trim()) fromLink(url, key); }} />
        <Button tone="neutral" size="large" icon="copy" onClick={() => pasteLocation(key)} disabled={reading === key} aria-label={`Paste into ${lbl}`}>Paste</Button>
      </div>
      <p className="t-body-small t-secondary" aria-live="polite">{reading === key ? 'Reading the link…' : hint}</p>
    </div>
  );
  const PLACE_HINT = 'A place name, an address or a link from Maps';
  const PLACEHOLDERS: Partial<Record<EventKind, [string, string]>> = {
    flight: ['Melbourne (MEL)', 'Lisbon (LIS)'], train: ['Lisbon Oriente', 'Porto Campanhã'], bus: ['Sete Rios, Lisbon', 'Lagos bus station'],
    ferry: ['Cais do Sodré', 'Cacilhas'], transfer: ['Lisbon airport (LIS)', 'Memmo Alfama'], driver: ['Your hotel', 'Sintra'], taxi: ['Your hotel', 'Time Out Market'],
  };
  const PLACE: Partial<Record<EventKind, string>> = {
    cafe: 'Manteigaria, Lisbon', bar: 'Park Bar, Lisbon', restaurant: 'Cervejaria Ramiro, Lisbon', market: 'Time Out Market, Lisbon',
    taxi: 'Your hotel', metro: 'Baixa-Chiado station', bike: 'Gira station, Cais do Sodré', errand: 'Vodafone, Rossio', cruise: 'Lisbon cruise terminal', parking: 'Melbourne Airport long-term parking', luggage: 'Bounce, Rossio station',
  };
  const extras = (
    <>
      {info?.booking && (
        <TextField label={kind === 'restaurant' ? 'Reservation reference (optional)' : 'Booking reference (optional)'} placeholder="TP-7XK2LQ" autoCapitalize="characters"
          value={f.bookingRef} onChange={(e) => set({ bookingRef: e.target.value })} />
      )}
      {priced && <PriceField label="Price per person (optional)" value={f.price} onChange={(price) => set({ price })} />}
      {behaviour !== 'note' && <TextArea label="Notes" placeholder={behaviour === 'open' ? 'Beach, a nap, wander the old town…' : 'What to bring, who has the tickets…'} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />}
      {behaviour !== 'open' && behaviour !== 'note' && <LinkEditor links={f.links} onChange={(links) => set({ links })} />}
    </>
  );
  const sheetTitle = activity ? `Edit ${info?.label.toLowerCase() ?? 'event'}` : 'Add to itinerary'; // the type row under it names the type

  return (
    <Sheet open={open} mode={activity ? 'edit' : 'default'} title={sheetTitle}
      subtitle={!f.type ? 'What are you adding?' : undefined}
      onClose={onClose} onSubmit={kind ? submit : undefined} submitLabel={activity ? 'Save' : `Add to ${formatDay(f.date)}`} submitDisabled={!valid || busy}
      secondary={activity && kind && isTraveller ? <Button tone="destructive" size="large" onClick={remove}>Delete</Button> : undefined}>
      {!f.type ? (
        // Step 1: the 6 types, each with what it covers, in its colour
        <div className={s.typeList} role="group" aria-label="Type">
          {EVENT_TYPES.map((t) => <OptionCard key={t.value} icon={t.icon} label={t.label} description={t.hint} type={TYPE_TONE[t.value]} onClick={() => pickType(t.value)} />)}
        </div>
      ) : (
        <>
          {/* The type it is, with Change type: a mistake is one tap to fix (the six types as chips, in their colours) */}
          {typeInfo && (
            <div className={s.typeRow}>
              <CategoryIcon icon={info?.icon ?? typeInfo.icon} type={TYPE_TONE[typeInfo.value]} />
              <div className={s.typeRowText}>
                <span className="t-heading-4">{typeInfo.label}</span>
                {info && <span className="t-body-small t-secondary">{info.label}</span>}
              </div>
              <Button tone="ghost" size="small" aria-expanded={changingType} onClick={() => { haptic('selection'); setChangingType((v) => !v); }}>{changingType ? 'Done' : 'Change type'}</Button>
            </div>
          )}
          {changingType && (
            <div className={s.kindPicker}>
              <h3 className={s.pickerLabel} id="event-type">Type</h3>
              <div className={s.kindChips} role="radiogroup" aria-labelledby="event-type">
                {EVENT_TYPES.map((x) => (
                  <Chip key={x.value} icon={x.icon} type={TYPE_TONE[x.value]} selected={f.type === x.value} label={`${x.label}${f.type === x.value ? ', selected' : ''}`}
                    onClick={() => { if (f.type !== x.value) pickType(x.value); }}>{x.label}</Chip>
                ))}
              </div>
            </div>
          )}
          {/* Step 2: the type's categories, nested under it in a grey panel (changing the type swaps the panel), the chosen
              one in the type's colour, and what it covers */}
          {typeInfo && typeInfo.kinds.length > 1 && (
            <div className={[s.kindPicker, s.kindPanel].join(' ')}>
              <h3 className={s.pickerLabel} id="event-category">{`${typeInfo.label} categories`}</h3>
              <div className={s.kindChips} role="group" aria-labelledby="event-category">
                {typeInfo.kinds.map((x) => (
                  <Chip key={x.value} icon={x.icon} type={TYPE_TONE[typeInfo.value]} selected={kind === x.value} label={`${x.label}${kind === x.value ? ', selected' : ''}`}
                    onClick={() => { haptic('selection'); pickKind(x.value); }}>{x.label}</Chip>
                ))}
              </div>
              {info && <p className="t-body-small t-secondary">{info.hint}</p>}
            </div>
          )}

          {behaviour === 'journey' && kind && (
            <>
              {/* From and To on their own lines, each with Paste; they open in Maps from the event page */}
              {locationField('From', PLACEHOLDERS[kind]?.[0] ?? 'Where it leaves from', kind === 'flight' ? 'An airport or city, e.g. Melbourne (MEL)' : PLACE_HINT, 'fromText')}
              {locationField(kind === 'flight' ? 'To' : 'To (optional)', PLACEHOLDERS[kind]?.[1] ?? 'Where it arrives', kind === 'flight' ? 'An airport or city, e.g. Lisbon (LIS)' : PLACE_HINT, 'toText')}
              <FieldRow>
                {daySelect('Departs', f.date, (v) => set({ date: v }))}
                {time('Time', 'startTime')}
              </FieldRow>
              <FieldRow>
                <Dropdown label="Arrives" value={f.endDate || f.date} onChange={(e) => set({ endDate: e.target.value })}>
                  {[0, 1, 2].map((n) => { const d = addDays(f.date, n); return <option key={d} value={d}>{n === 0 ? 'Same day' : `+${n} · ${formatDay(d)}`}</option>; })}
                </Dropdown>
                {time('Time', 'endTime')}
              </FieldRow>
              <FieldRow>
                {kind === 'flight'
                  ? <TextField label="Flight number" placeholder="TP1351" autoCapitalize="characters" value={f.ref} onChange={(e) => set({ ref: e.target.value })} />
                  : text(kind === 'taxi' ? 'Company (optional)' : kind === 'driver' ? 'Driver or company (optional)' : 'Operator (optional)', 'operator', kind === 'train' ? 'CP' : kind === 'bus' ? 'FlixBus' : kind === 'ferry' ? 'Transtejo' : kind === 'taxi' ? 'Uber' : 'Company')}
                {/* A seat only means something on a flight, train, bus or ferry */}
                {!['taxi', 'driver', 'transfer'].includes(kind) && text('Seat (optional)', 'seats', kind === 'flight' ? '23A' : 'Coach 4, seat 32')}
              </FieldRow>
              {activity && onAddConnection && (
                <div><Button tone="ghost" size="small" icon="plus" onClick={() => { onClose(); onAddConnection(); }}>Add a connection</Button></div>
              )}
            </>
          )}

          {behaviour === 'span' && (
            vehicle ? (
              <>
                {text('Company (optional)', 'operator', kind === 'campervan' ? 'Indie Campers' : 'Hertz')}
                {locationField(startWord, 'Lisbon airport (LIS)', PLACE_HINT, 'fromText')}
                <FieldRow>
                  {daySelect(`${startWord} day`, f.date, (v) => set({ date: v, endDate: f.endDate >= v ? f.endDate : v }))}
                  {time('Time', 'startTime')}
                </FieldRow>
                {locationField(`${endWord} (optional)`, `Same as ${startWord.toLowerCase()}`, `${PLACE_HINT}; leave empty if it's the same place`, 'toText')}
                <FieldRow>
                  {daySelect(`${endWord} day`, f.endDate || f.date, (v) => set({ endDate: v }), afterEnd.filter((d) => d >= f.date))}
                  {time('Time', 'endTime')}
                </FieldRow>
              </>
            ) : (
              <>
                {text('Name (optional)', 'title', PLACE[kind!]?.split(',')[0] ?? 'Memmo Alfama')}
                {locationField(kind === 'cruise' ? 'Ship or port' : 'Location', PLACE[kind!] ?? 'Memmo Alfama, Lisbon', `An address, a place or a link from Maps. It shows as ${startWord.toLowerCase()} and ${endWord.toLowerCase()} in the itinerary.`)}
                <FieldRow>
                  {daySelect(`${startWord} day`, f.date, (v) => set({ date: v, endDate: f.endDate > v || (sameDay && f.endDate === v) ? f.endDate : sameDay ? v : addDays(v, 1) }))}
                  {time('Time', 'startTime')}
                </FieldRow>
                <FieldRow>
                  {daySelect(`${endWord} day`, f.endDate, (v) => set({ endDate: v }), afterEnd.filter((d) => d > f.date || (sameDay && d === f.date)))}
                  {time('Time', 'endTime')}
                </FieldRow>
              </>
            )
          )}

          {behaviour === 'place' && kind && (
            <>
              {text('Name (optional)', 'title', PLACE[kind]?.split(',')[0] ?? 'Belém Tower')}
              {locationField(kind === 'taxi' ? 'Pick-up' : 'Location', PLACE[kind] ?? 'Belém Tower, Lisbon', 'An address, a place or a link from Maps. A place in a new country adds it to the trip.')}
              {daySelect('Day', f.date, (v) => set({ date: v }))}
              {/* Figma "Add event — end time": the chip sits where the end time goes, and becomes that field when tapped */}
              <FieldRow>
                {time(withEnd ? 'Starts' : 'Time', 'startTime')}
                {withEnd
                  ? <TextField label="Ends (optional)" type="time" value={f.endTime} autoFocus={!f.endTime} onChange={(e) => set({ endTime: e.target.value })} />
                  : <span className={s.endChip}><Chip icon="plus" onClick={() => { haptic('light'); setWithEnd(true); }}>Add end time</Chip></span>}
              </FieldRow>
            </>
          )}

          {behaviour === 'open' && (
            <>
              {text('What (optional)', 'title', info!.label)}
              {daySelect('Day', f.date, (v) => { const g = suggestFreeTime(activities, v, activity?.id); set({ date: v, ...(g && !activity ? { startTime: g.start, endTime: g.end } : {}) }); })}
              <FieldRow>
                {time('Starts', 'startTime')}
                {time('Ends', 'endTime')}
              </FieldRow>
              <p className="t-body-small t-secondary">
                {suggestion ? `Free that day from ${formatTime(suggestion.start)} to ${formatTime(suggestion.end)}.` : 'That day is full between 09:00 and 22:00.'}
              </p>
              {text('Area (optional)', 'locationText', 'Praia da Rainha, Cascais')}
            </>
          )}

          {behaviour === 'note' && (
            <>
              <TextArea label="Note" placeholder="Bag drop closes 40 min before" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
              <FieldRow>
                {daySelect('Day', f.date, (v) => set({ date: v }))}
                {time('Time (optional)', 'startTime')}
              </FieldRow>
            </>
          )}

          {extras}
        </>
      )}
    </Sheet>
  );
}

/**
 * The next leg of a journey (a flight with a connection): leaves from where the journey lands, on that day, and joins
 * the journey (`journeyId`; the first leg gets one too if it had none). Opened from "+ Add a connection" in the edit sheet.
 */
export function ConnectionForm({ open, trip, activity, activities, onClose }: { open: boolean; trip: Trip; activity: Activity; activities: Activity[]; onClose: () => void }) {
  const legs = legsOf(activity, activities);
  const last = legs[legs.length - 1];
  const first = legs[0];
  const day = last.endDate || last.date;
  return (
    <ActivityForm open={open} trip={trip} date={day} onClose={onClose}
      draft={{ category: activity.category, fromText: last.toText ?? '', date: day, journeyId: first.journeyId ?? first.id }}
      onCreated={() => { if (!first.journeyId) store.updateSub(trip.id, 'activities', first.id, { journeyId: first.id }).catch(() => {}); }} />
  );
}
