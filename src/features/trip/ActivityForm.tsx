import { useEffect, useState } from 'react';
import { Button, FieldRow, OptionCard, Select, Sheet, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useMe } from '../../data/hooks';
import type { Activity, Category, LinkItem, Place, Trip } from '../../data/types';
import { addDays, dayWord, formatDay, tripDays } from '../../lib/dates';
import { geocodePlace } from '../../lib/geocode';
import { EVENT_TYPES, eventType, type EventType } from '../../lib/categories';
import { haptic } from '../../lib/native';
import { LinkEditor, cleanLinks } from '../shared/Links';
import { PriceField, fromPriceDraft, toPriceDraft, type PriceDraft } from '../shared/Price';
import { priceOf } from '../../lib/currency';
import s from './trip.module.css';

export type ActivityDraft = Partial<Pick<Activity, 'title' | 'category' | 'notes' | 'price' | 'cost' | 'links' | 'date' | 'startTime' | 'endTime' | 'locationText' | 'placeId'>>;

type Form = {
  type: EventType | null; title: string; date: string; endDate: string; startTime: string; endTime: string;
  locationText: string; fromText: string; toText: string; ref: string; notes: string; price: PriceDraft; links: LinkItem[];
};

const toForm = (a: ActivityDraft | Activity | undefined, date: string, typed: boolean, currency: string): Form => {
  const full = a as Partial<Activity> | undefined;
  return {
    type: typed && a?.category ? eventType(a.category) : null,
    title: a?.title ?? '',
    date: a?.date ?? date,
    endDate: full?.endDate ?? '',
    startTime: a?.startTime ?? '',
    endTime: a?.endTime ?? '',
    locationText: a?.locationText ?? '',
    // A transport with no route (older taxi or tram events) starts from its place.
    fromText: full?.fromText || (a?.category && eventType(a.category) === 'transport' ? a.locationText ?? '' : ''),
    toText: full?.toText ?? '',
    ref: full?.ref ?? '',
    notes: a?.notes ?? '',
    price: toPriceDraft(a ? priceOf(a, { currency }) : null, currency),
    links: a?.links?.length ? a.links : [],
  };
};

/** The types that can have a price (tickets, tours, flights, stays, transport). Food & drink and notes never ask. */
const PRICED: EventType[] = ['flight', 'stay', 'transport', 'activity'];

/** Cafés keep the Coffee icon: a Food & drink place whose name says café or coffee. */
const CAFE = /caf[eé]|coffee|espresso|pastelaria|bakery|patisserie/i;

/** "Lisbon (LIS)" or "Lisbon, Portugal" → "Lisbon", for titles like "Lisbon → Porto". */
const city = (s: string) => s.split(',')[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim();

/**
 * Add an event by hand, or edit one. Adding starts with Option cards for the six types (Flight, Stay, Transport,
 * Food & drink, Activity, Note) inside the Sheet; each type then asks only for what it needs:
 * Flight: from, to, departs, arrives, flight number, price · Stay: place, check-in and check-out dates, price (one
 * booking shows as check-in and check-out in the itinerary) · Transport: from, to, times, price · Food & drink: place,
 * time · Activity: place, time, price · Note: text and an optional time (the only type without a place).
 * `draft` prefills a new one (e.g. from an idea added to a day); `onCreated` gets the new id.
 */
export function ActivityForm({ open, trip, date, activity, draft, onClose, onCreated }: {
  open: boolean; trip: Trip; date: string; activity?: Activity; draft?: ActivityDraft; onClose: () => void; onCreated?: (id: string) => void;
}) {
  const me = useMe();
  const toast = useToast();
  const [f, setF] = useState<Form>(() => toForm(activity ?? draft, date, !!(activity ?? draft), trip.currency));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF(toForm(activity ?? draft, date, !!(activity ?? draft), trip.currency)); }, [open, activity, draft, date]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const days = tripDays(trip.startDate, trip.endDate);
  const type = f.type;

  // What each type needs before it can be saved. Only Note has no place.
  const valid = !!type && (
    type === 'flight' ? !!(f.fromText.trim() && f.toText.trim())
      : type === 'stay' ? !!(f.locationText.trim() && f.endDate && f.endDate > f.date)
        : type === 'transport' ? !!f.fromText.trim()
          : type === 'note' ? !!f.title.trim()
            : !!f.locationText.trim());

  const submit = async () => {
    if (!type || !valid) return;
    setBusy(true);
    try {
      const find = async (text: string, prev: string | undefined, prevPlace: Place | null | undefined, near: Place | null) =>
        !text.trim() ? null : text.trim() === (prev ?? '') && prevPlace ? prevPlace : await geocodePlace(text, near);
      const journey = type === 'flight' || (type === 'transport' && f.fromText.trim() && f.toText.trim());
      // A journey's place is where it leaves from; it also remembers where it arrives (its country joins the trip's chips).
      const from = journey ? await find(f.fromText, activity?.fromText, activity?.location, type === 'flight' ? null : trip.destination) : null;
      const to = journey ? await find(f.toText, activity?.toText, activity?.to, type === 'flight' ? null : trip.destination) : null;
      const placeText = type === 'transport' || journey ? f.fromText.trim() : type === 'note' ? '' : f.locationText.trim();
      const location = journey ? from
        : !placeText ? null
          : placeText === (activity?.locationText ?? '') && activity?.location ? activity.location : await geocodePlace(placeText, trip.destination);
      // Titles come from the places. An event (or idea) keeps its own title while its place is unchanged.
      const src = activity ?? draft;
      const keep = src?.title && placeText === (src.locationText ?? '').trim() ? src.title : '';
      const title = type === 'note' ? f.title.trim()
        : journey ? `${city(f.fromText)} → ${city(f.toText)}`
          : keep || (type === 'transport' ? `Transport from ${city(placeText)}` : city(placeText));
      // Food & drink keeps a café or bar icon it already had; a new one called "… Café" gets the Coffee icon.
      const category: Category = type !== 'food' ? type
        : src?.category && eventType(src.category) === 'food' && src.category !== 'food' ? src.category
          : CAFE.test(placeText) ? 'cafe' : 'food';
      const data: Partial<Activity> & { category: Category } = {
        title,
        category,
        date: f.date,
        startTime: f.startTime,
        endTime: f.endTime,
        locationText: placeText,
        location,
        notes: f.notes.trim(),
        // Prices are optional and only asked for things you book; food & drink keeps one it already had, notes never have one.
        price: type === 'note' ? null : fromPriceDraft(f.price),
        cost: 0,
        links: cleanLinks(f.links),
        // Type-specific fields; cleared when they don't apply, so a changed type leaves nothing behind.
        endDate: type === 'stay' || (type === 'flight' && f.endDate > f.date) ? f.endDate : '',
        fromText: journey ? f.fromText.trim() : '',
        toText: journey ? f.toText.trim() : '',
        to: journey ? to : null,
        ref: type === 'flight' ? f.ref.trim().toUpperCase() : '',
      };
      if (activity) await store.updateSub(trip.id, 'activities', activity.id, data);
      else {
        const id = await store.addSub(trip.id, 'activities', { ...(data as Omit<Activity, 'id' | 'createdBy' | 'createdAt' | 'attendeeIds'>), ...(draft?.placeId ? { placeId: draft.placeId } : {}), attendeeIds: [me.uid] });
        onCreated?.(id);
      }
      toast({ icon: 'check', label: activity ? 'Changes saved' : type === 'stay' ? 'Stay added: check-in and check-out' : 'Event added' });
      onClose();
    } catch {
      toast({ tone: 'error', label: "Couldn't save. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!activity || !confirm(`Delete "${activity.title}"?`)) return;
    try {
      await store.deleteSub(trip.id, 'activities', activity.id);
      toast({ icon: 'trash', label: 'Event deleted' });
      onClose();
    } catch {
      toast({ tone: 'error', label: "Couldn't delete. Check your connection" });
    }
  };

  const label = EVENT_TYPES.find((x) => x.value === type)?.label;
  const daySelect = (lbl: string, value: string, onChange: (v: string) => void, list = days) => (
    <Select label={lbl} value={value} onChange={(e) => onChange(e.target.value)}>
      {list.map((d) => <option key={d} value={d}>{dayWord(d, trip.startDate)} · {formatDay(d)}</option>)}
    </Select>
  );
  const times = (a: string, b: string, optionalA = false, optionalB = optionalA) => (
    <FieldRow>
      <TextField label={optionalA ? `${a} (optional)` : a} type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
      <TextField label={optionalB ? `${b} (optional)` : b} type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} />
    </FieldRow>
  );
  const extras = (
    <>
      {type && PRICED.includes(type) && <PriceField value={f.price} onChange={(price) => set({ price })} />}
      {type !== 'note' && <TextArea label="Notes" placeholder="Booking reference, what to bring…" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />}
      {type !== 'note' && <LinkEditor links={f.links} onChange={(links) => set({ links })} />}
    </>
  );

  return (
    <Sheet open={open} title={activity ? `Edit ${label?.toLowerCase() ?? 'event'}` : type ? `Add ${label === 'Food & drink' ? 'food & drink' : `a ${label?.toLowerCase()}`}` : 'Add to itinerary'}
      subtitle={!type ? 'What are you adding?' : undefined}
      onClose={onClose} onSubmit={type ? submit : undefined} submitLabel={activity ? 'Save' : 'Add'} submitDisabled={!valid || busy}>
      {!type ? (
        // The picker: Option cards inside the sheet, not a new screen
        <div className={s.optionGrid} role="group" aria-label="Event types">
          {EVENT_TYPES.map((x) => (
            <OptionCard key={x.value} icon={x.icon} label={x.label}
              onClick={() => { haptic('light'); set({ type: x.value, endDate: x.value === 'stay' ? (f.endDate || addDays(f.date, 1)) : f.endDate }); }} />
          ))}
        </div>
      ) : (
        <>
          {type === 'flight' && (
            <>
              <FieldRow>
                <TextField label="From" placeholder="Melbourne (MEL)" value={f.fromText} onChange={(e) => set({ fromText: e.target.value })} />
                <TextField label="To" placeholder="Lisbon (LIS)" value={f.toText} onChange={(e) => set({ toText: e.target.value })} />
              </FieldRow>
              <FieldRow>
                {daySelect('Departs', f.date, (v) => set({ date: v }))}
                <TextField label="Time" type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
              </FieldRow>
              <FieldRow>
                <Select label="Arrives" value={f.endDate || f.date} onChange={(e) => set({ endDate: e.target.value })}>
                  {[0, 1, 2].map((n) => { const d = addDays(f.date, n); return <option key={d} value={d}>{n === 0 ? 'Same day' : `+${n} · ${formatDay(d)}`}</option>; })}
                </Select>
                <TextField label="Time" type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} />
              </FieldRow>
              <TextField label="Flight number" placeholder="TP1351" autoCapitalize="characters" value={f.ref} onChange={(e) => set({ ref: e.target.value })} />
            </>
          )}

          {type === 'stay' && (
            <>
              <TextField label="Place" placeholder="Memmo Alfama, Lisbon" value={f.locationText} onChange={(e) => set({ locationText: e.target.value })}
                hint="The hotel or address. It shows as check-in and check-out in the itinerary." />
              <FieldRow>
                {daySelect('Check-in', f.date, (v) => set({ date: v, endDate: f.endDate > v ? f.endDate : addDays(v, 1) }))}
                {daySelect('Check-out', f.endDate, (v) => set({ endDate: v }), [...days.filter((d) => d > f.date), ...(days.includes(addDays(trip.endDate, 1)) ? [] : [addDays(trip.endDate, 1)])])}
              </FieldRow>
            </>
          )}

          {type === 'transport' && (
            <>
              <FieldRow>
                <TextField label="From" placeholder="Lisbon Oriente" value={f.fromText} onChange={(e) => set({ fromText: e.target.value })} />
                <TextField label="To (optional)" placeholder="Porto Campanhã" value={f.toText} onChange={(e) => set({ toText: e.target.value })} />
              </FieldRow>
              {daySelect('Day', f.date, (v) => set({ date: v }))}
              {times('Leaves', 'Arrives', false, true)}
            </>
          )}

          {(type === 'food' || type === 'activity') && (
            <>
              <TextField label="Place" placeholder={type === 'food' ? 'Cervejaria Ramiro, Lisbon' : 'Belém Tower, Lisbon'} value={f.locationText} onChange={(e) => set({ locationText: e.target.value })}
                hint="Its name, or an address. A place in a new country adds it to the trip." />
              <FieldRow>
                {daySelect('Day', f.date, (v) => set({ date: v }))}
                <TextField label="Time" type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
              </FieldRow>
            </>
          )}

          {type === 'note' && (
            <>
              <TextField label="Note" placeholder="Bag drop closes 40 min before" value={f.title} onChange={(e) => set({ title: e.target.value })} />
              <TextArea label="More (optional)" placeholder="Sam has the passports" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
              {daySelect('Day', f.date, (v) => set({ date: v }))}
              <TextField label="Time (optional)" type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            </>
          )}

          {extras}
          {!activity && !draft && <Button variant="ghost" icon="chevron-left" onClick={() => set({ type: null })}>Choose another type</Button>}
          {activity && <Button variant="destructive" icon="trash" block onClick={remove}>Delete</Button>}
        </>
      )}
    </Sheet>
  );
}
