import { useEffect, useState } from 'react';
import { Button, Chip, FieldRow, OptionCard, SectionHeader, Select, Sheet, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useMe, useSub } from '../../data/hooks';
import type { Activity, Category, LinkItem, Place, Trip } from '../../data/types';
import { addDays, dayWord, formatDay, formatTime, tripDays } from '../../lib/dates';
import { geocodePlace } from '../../lib/geocode';
import { PICKER_SECTIONS, eventKind, kindInfo, type EventKind } from '../../lib/categories';
import { haptic, confirmAction } from '../../lib/native';
import { LinkEditor, cleanLinks } from '../shared/Links';
import { PriceField, fromPriceDraft, toPriceDraft, type PriceDraft } from '../shared/Price';
import { priceOf } from '../../lib/currency';
import { eventsOn, entryEnd, entryTime } from './events';
import s from './trip.module.css';

export type ActivityDraft = Partial<Pick<Activity, 'title' | 'category' | 'notes' | 'links' | 'date' | 'startTime' | 'endTime' | 'locationText' | 'placeId'>>;

type Form = {
  kind: EventKind | null; title: string; date: string; endDate: string; startTime: string; endTime: string;
  locationText: string; fromText: string; toText: string; ref: string; bookingRef: string; operator: string; notes: string; links: LinkItem[];
  /** Per person; asked for everything you book ahead (not restaurants, cafés, bars or free time: those are everyday spending) */ price: PriceDraft;
};

/** Kinds that go from one place to another (Flight always; the others when they have a "to"). */
const JOURNEY: EventKind[] = ['flight', 'train', 'bus', 'ferry', 'taxi', 'transport'];
/** Kinds with an operator (airline, train or bus company, ferry line, rental company). */
const OPERATED: EventKind[] = ['train', 'bus', 'ferry', 'transport', 'car'];

const toForm = (a: ActivityDraft | Activity | undefined, date: string, currency: string): Form => {
  const full = a as Partial<Activity> | undefined;
  const kind = a?.category ? eventKind(a.category) : null;
  return {
    // An older "Transport" draft (from Overview → Transport) opens the picker so the mode can be chosen
    kind: kind === 'transport' && !full?.id ? null : kind,
    title: a?.title ?? '',
    date: a?.date ?? date,
    endDate: full?.endDate ?? '',
    startTime: a?.startTime ?? '',
    endTime: a?.endTime ?? '',
    locationText: a?.locationText ?? '',
    // A transport with no route (older taxi or tram events) starts from its place.
    fromText: full?.fromText || (kind && JOURNEY.includes(kind) && kind !== 'flight' ? a?.locationText ?? '' : ''),
    toText: full?.toText ?? '',
    ref: full?.ref ?? '',
    bookingRef: full?.bookingRef ?? '',
    operator: full?.operator ?? '',
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
 * Add an event by hand, or edit one. Adding starts with Option cards for the kinds, in sections (Travel: Flight, Train,
 * Bus, Ferry, Taxi, Car rental · Stay · Food & drink: Restaurant, Café, Bar · Do: Activity, Free time) inside the Sheet;
 * each kind then asks only for what it needs. Bookable kinds have a booking reference (copyable on the event's page).
 * `draft` prefills a new one (e.g. from an idea added to a day); `onCreated` gets the new id.
 */
export function ActivityForm({ open, trip, date, activity, draft, onClose, onCreated, onDeleted }: {
  open: boolean; trip: Trip; date: string; activity?: Activity; draft?: ActivityDraft; onClose: () => void; onCreated?: (id: string) => void;
  /** After a delete: e.g. the event's own page goes back to its day in the itinerary */ onDeleted?: (a: Activity) => void;
}) {
  const me = useMe();
  const toast = useToast();
  const activities = useSub(trip.id, 'activities') ?? [];
  const budgetCurrency = trip.budget?.currency ?? trip.currency;
  const [f, setF] = useState<Form>(() => toForm(activity ?? draft, date, budgetCurrency));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF(toForm(activity ?? draft, date, budgetCurrency)); }, [open, activity, draft, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  // Food, drink and activities have an end time only when asked for: "Add end time" turns into the field
  const [withEnd, setWithEnd] = useState(false);
  useEffect(() => { if (open) setWithEnd(!!(activity ?? draft)?.endTime); }, [open, activity, draft]);
  const days = tripDays(trip.startDate, trip.endDate);
  const kind = f.kind;
  const info = kind ? kindInfo(kind) : null;
  const group = info?.group;

  // Free time: suggest the day's first free gap (when the times are still empty)
  const suggestion = kind === 'free' ? suggestFreeTime(activities, f.date, activity?.id) : null;
  const pick = (k: EventKind) => {
    haptic('light');
    const free = k === 'free' && !f.startTime ? suggestFreeTime(activities, f.date, activity?.id) : null;
    set({
      kind: k,
      endDate: k === 'stay' ? (f.endDate || addDays(f.date, 1)) : k === 'car' ? (f.endDate || f.date) : f.endDate,
      ...(free ? { startTime: free.start, endTime: free.end } : {}),
    });
  };

  // What each kind needs before it can be saved
  // Costs to add up for the budget: what you book ahead. Food, drink and free time are everyday spending.
  const priced = !!kind && group !== 'food' && kind !== 'free';
  const valid = !!kind && (
    kind === 'flight' ? !!(f.fromText.trim() && f.toText.trim())
      : group === 'transport' ? !!f.fromText.trim()
        : kind === 'car' ? !!(f.fromText.trim() && f.endDate && f.endDate >= f.date)
          : kind === 'stay' ? !!(f.locationText.trim() && f.endDate && f.endDate > f.date)
            : kind === 'free' ? true
              : !!f.locationText.trim());

  const submit = async () => {
    if (!kind || !valid) return;
    setBusy(true);
    try {
      const find = async (text: string, prev: string | undefined, prevPlace: Place | null | undefined, near: Place | null) =>
        !text.trim() ? null : text.trim() === (prev ?? '') && prevPlace ? prevPlace : await geocodePlace(text, near);
      const near = kind === 'flight' ? null : trip.destination;
      const journey = kind === 'flight' || (group === 'transport' && !!f.fromText.trim() && !!f.toText.trim());
      const routed = journey || kind === 'car';
      const dropText = kind === 'car' ? (f.toText.trim() || f.fromText.trim()) : f.toText.trim();
      // A journey's (or rental's) place is where it starts; it also remembers where it ends (its country joins the trip's chips)
      const from = routed || group === 'transport' ? await find(f.fromText, activity?.fromText, activity?.location, near) : null;
      const to = routed ? (kind === 'car' && !f.toText.trim() ? from : await find(dropText, activity?.toText, activity?.to, near)) : null;
      const placeText = routed || group === 'transport' ? f.fromText.trim() : kind === 'free' ? f.locationText.trim() : f.locationText.trim();
      const location = routed || group === 'transport' ? from
        : !placeText ? null
          : placeText === (activity?.locationText ?? '') && activity?.location ? activity.location : await geocodePlace(placeText, trip.destination);
      // Titles come from the places. An event (or idea) keeps its own title while its place is unchanged.
      const src = activity ?? draft;
      const keep = src?.title && placeText === (src.locationText ?? '').trim() ? src.title : '';
      const title = kind === 'free' ? (f.title.trim() || 'Free time')
        : journey ? `${city(f.fromText)} → ${city(f.toText)}`
          : kind === 'car' ? (f.operator.trim() ? `${f.operator.trim()} car rental` : `Car rental · ${city(f.fromText)}`)
            : group === 'transport' ? `${info!.label} from ${city(placeText)}`
              : keep || city(placeText);
      const ends = kind === 'stay' || kind === 'car' || (kind === 'flight' && f.endDate > f.date);
      const data: Partial<Activity> & { category: Category } = {
        title,
        category: kind,
        date: f.date,
        startTime: f.startTime,
        endTime: (group === 'food' || group === 'activity') && !withEnd ? '' : f.endTime,
        locationText: placeText,
        location,
        notes: f.notes.trim(),
        links: cleanLinks(f.links),
        // Kind-specific fields; cleared when they don't apply, so a changed kind leaves nothing behind.
        endDate: ends ? f.endDate : '',
        fromText: routed || group === 'transport' ? f.fromText.trim() : '',
        toText: routed ? dropText : '',
        to: routed ? to : null,
        ref: kind === 'flight' ? f.ref.trim().toUpperCase().replace(/\s+/g, '') : '',
        bookingRef: info!.booking ? f.bookingRef.trim() : '',
        operator: OPERATED.includes(kind) ? f.operator.trim() : '',
        price: priced ? fromPriceDraft(f.price) : null,
        cost: 0,
      };
      if (activity) await store.updateSub(trip.id, 'activities', activity.id, data);
      else {
        const id = await store.addSub(trip.id, 'activities', { ...(data as Omit<Activity, 'id' | 'createdBy' | 'createdAt' | 'attendeeIds'>), ...(draft?.placeId ? { placeId: draft.placeId } : {}), attendeeIds: [me.uid] });
        onCreated?.(id);
      }
      toast({ icon: 'check', label: activity ? 'Changes saved' : kind === 'stay' ? 'Stay added: check-in and check-out' : kind === 'car' ? 'Car rental added: pick-up and drop-off' : 'Event added' });
      onClose();
    } catch {
      toast({ tone: 'error', label: "Couldn't save. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!activity || !confirmAction(`Delete "${activity.title}"?`)) return;
    try {
      await store.deleteSub(trip.id, 'activities', activity.id);
      toast({ icon: 'trash', label: 'Event deleted' });
      onClose();
      onDeleted?.(activity);
    } catch {
      toast({ tone: 'error', label: "Couldn't delete. Check your connection" });
    }
  };

  const label = info?.label;
  const daySelect = (lbl: string, value: string, onChange: (v: string) => void, list = days) => (
    <Select label={lbl} value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((d) => <option key={d} value={d}>{dayWord(d, trip.startDate)} · {formatDay(d)}</option>)}
    </Select>
  );
  const time = (lbl: string, key: 'startTime' | 'endTime') => (
    <TextField label={lbl} type="time" value={f[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)} />
  );
  const bookingRef = info?.booking && (
    <TextField label={kind === 'restaurant' ? 'Reservation reference (optional)' : 'Booking reference (optional)'} placeholder="TP-7XK2LQ" autoCapitalize="characters"
      value={f.bookingRef} onChange={(e) => set({ bookingRef: e.target.value })} />
  );
  const operator = (placeholder: string, lbl = 'Operator (optional)') => (
    <TextField label={lbl} placeholder={placeholder} value={f.operator} onChange={(e) => set({ operator: e.target.value })} />
  );
  const extras = (
    <>
      {bookingRef}
      {priced && <PriceField label="Price per person (optional)" value={f.price} onChange={(price) => set({ price })} />}
      <TextArea label="Notes" placeholder={kind === 'free' ? 'Beach, a nap, wander the old town…' : 'What to bring, who has the tickets…'} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      {kind !== 'free' && <LinkEditor links={f.links} onChange={(links) => set({ links })} />}
    </>
  );
  const a = /^[aeiou]/i.test(label ?? '') ? 'an' : 'a';
  const addTitle = !kind ? 'Add to itinerary' : kind === 'free' ? 'Add free time' : `Add ${a} ${label!.toLowerCase()}`;
  const placeholders: Partial<Record<EventKind, [string, string]>> = {
    train: ['Lisbon Oriente', 'Porto Campanhã'], bus: ['Sete Rios, Lisbon', 'Lagos bus station'],
    ferry: ['Cais do Sodré', 'Cacilhas'], taxi: ['Hotel', 'Lisbon airport'], transport: ['Lisbon Oriente', 'Porto Campanhã'],
  };

  return (
    <Sheet open={open} title={activity ? `Edit ${label?.toLowerCase() ?? 'event'}` : addTitle}
      subtitle={!kind ? 'What are you adding?' : undefined}
      onClose={onClose} onSubmit={kind ? submit : undefined} submitLabel={activity ? 'Save' : 'Add'} submitDisabled={!valid || busy}
      secondary={activity && kind ? <Button variant="destructive" size="large" onClick={remove}>Delete</Button> : undefined}>
      {!kind ? (
        // The picker: Option cards in sections inside the sheet, not a new screen
        PICKER_SECTIONS.map((sec) => (
          <section key={sec.title} className={s.addSection} aria-label={sec.title}>
            <SectionHeader title={sec.title} level={3} />
            <div className={s.optionGrid} role="group" aria-label={sec.title}>
              {sec.kinds.map((x) => <OptionCard key={x.value} icon={x.icon} label={x.label} onClick={() => pick(x.value)} />)}
            </div>
          </section>
        ))
      ) : (
        <>
          {kind === 'flight' && (
            <>
              <FieldRow>
                <TextField label="From" placeholder="Melbourne (MEL)" value={f.fromText} onChange={(e) => set({ fromText: e.target.value })} />
                <TextField label="To" placeholder="Lisbon (LIS)" value={f.toText} onChange={(e) => set({ toText: e.target.value })} />
              </FieldRow>
              <FieldRow>
                {daySelect('Departs', f.date, (v) => set({ date: v }))}
                {time('Time', 'startTime')}
              </FieldRow>
              <FieldRow>
                <Select label="Arrives" value={f.endDate || f.date} onChange={(e) => set({ endDate: e.target.value })}>
                  {[0, 1, 2].map((n) => { const d = addDays(f.date, n); return <option key={d} value={d}>{n === 0 ? 'Same day' : `+${n} · ${formatDay(d)}`}</option>; })}
                </Select>
                {time('Time', 'endTime')}
              </FieldRow>
              <TextField label="Flight number" placeholder="TP1351" autoCapitalize="characters" value={f.ref} onChange={(e) => set({ ref: e.target.value })} />
            </>
          )}

          {(kind === 'train' || kind === 'bus' || kind === 'ferry' || kind === 'transport' || kind === 'taxi') && (
            <>
              <FieldRow>
                <TextField label="From" placeholder={placeholders[kind]![0]} value={f.fromText} onChange={(e) => set({ fromText: e.target.value })} />
                <TextField label="To (optional)" placeholder={placeholders[kind]![1]} value={f.toText} onChange={(e) => set({ toText: e.target.value })} />
              </FieldRow>
              {daySelect('Day', f.date, (v) => set({ date: v }))}
              <FieldRow>
                {time(kind === 'taxi' ? 'Pick-up' : 'Leaves', 'startTime')}
                {time(kind === 'taxi' ? 'Arrives (optional)' : 'Arrives (optional)', 'endTime')}
              </FieldRow>
              {kind !== 'taxi' && operator(kind === 'train' ? 'CP' : kind === 'bus' ? 'FlixBus' : kind === 'ferry' ? 'Transtejo' : 'Operator')}
            </>
          )}

          {kind === 'car' && (
            <>
              {operator('Hertz', 'Company (optional)')}
              <TextField label="Pick-up" placeholder="Lisbon airport (LIS)" value={f.fromText} onChange={(e) => set({ fromText: e.target.value })} />
              <FieldRow>
                {daySelect('Pick-up day', f.date, (v) => set({ date: v, endDate: f.endDate >= v ? f.endDate : v }))}
                {time('Time', 'startTime')}
              </FieldRow>
              <TextField label="Drop-off (optional)" placeholder="Same as pick-up" value={f.toText} onChange={(e) => set({ toText: e.target.value })} />
              <FieldRow>
                {daySelect('Drop-off day', f.endDate || f.date, (v) => set({ endDate: v }), [...days.filter((d) => d >= f.date), ...(days.includes(addDays(trip.endDate, 1)) ? [] : [addDays(trip.endDate, 1)])])}
                {time('Time', 'endTime')}
              </FieldRow>
            </>
          )}

          {kind === 'stay' && (
            <>
              <TextField label="Place" placeholder="Memmo Alfama, Lisbon" value={f.locationText} onChange={(e) => set({ locationText: e.target.value })}
                hint="The hotel or address. It shows as check-in and check-out in the itinerary." />
              <FieldRow>
                {daySelect('Check-in', f.date, (v) => set({ date: v, endDate: f.endDate > v ? f.endDate : addDays(v, 1) }))}
                {time('Time', 'startTime')}
              </FieldRow>
              <FieldRow>
                {daySelect('Check-out', f.endDate, (v) => set({ endDate: v }), [...days.filter((d) => d > f.date), ...(days.includes(addDays(trip.endDate, 1)) ? [] : [addDays(trip.endDate, 1)])])}
                {time('Time', 'endTime')}
              </FieldRow>
            </>
          )}

          {(group === 'food' || kind === 'activity') && (
            <>
              <TextField label="Place" placeholder={kind === 'cafe' ? 'Manteigaria, Lisbon' : kind === 'bar' ? 'Park Bar, Lisbon' : kind === 'restaurant' ? 'Cervejaria Ramiro, Lisbon' : 'Belém Tower, Lisbon'}
                value={f.locationText} onChange={(e) => set({ locationText: e.target.value })}
                hint="Its name, or an address. A place in a new country adds it to the trip." />
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

          {kind === 'free' && (
            <>
              <TextField label="What (optional)" placeholder="Free time" value={f.title} onChange={(e) => set({ title: e.target.value })} />
              {daySelect('Day', f.date, (v) => { const g = suggestFreeTime(activities, v, activity?.id); set({ date: v, ...(g && !activity ? { startTime: g.start, endTime: g.end } : {}) }); })}
              <FieldRow>
                {time('Starts', 'startTime')}
                {time('Ends', 'endTime')}
              </FieldRow>
              <p className="t-body-small t-secondary">
                {suggestion ? `Free that day from ${formatTime(suggestion.start)} to ${formatTime(suggestion.end)}.` : 'That day is full between 09:00 and 22:00.'}
              </p>
              <TextField label="Where (optional)" placeholder="Praia da Rainha, Cascais" value={f.locationText} onChange={(e) => set({ locationText: e.target.value })} />
            </>
          )}

          {extras}
          {!activity && !draft && <Button variant="ghost" icon="chevron-left" onClick={() => set({ kind: null })}>Choose another type</Button>}
        </>
      )}
    </Sheet>
  );
}

