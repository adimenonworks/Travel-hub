import { useEffect, useState } from 'react';
import { Button, FieldRow, Select, Sheet, TextArea, TextField } from '../../design/components';
import { store } from '../../data';
import { useMe } from '../../data/hooks';
import type { Activity, Category, LinkItem, Trip } from '../../data/types';
import { dayWord, formatDay, tripDays } from '../../lib/dates';
import { geocodePlace } from '../../lib/geocode';
import { CATEGORIES } from '../../lib/categories';
import { LinkEditor, cleanLinks } from '../shared/Links';

export type ActivityDraft = Partial<Pick<Activity, 'title' | 'category' | 'notes' | 'cost' | 'links' | 'date' | 'startTime' | 'endTime' | 'locationText'>>;

type Form = { title: string; category: Category; date: string; startTime: string; endTime: string; locationText: string; notes: string; cost: string; links: LinkItem[] };

const toForm = (a: ActivityDraft | Activity | undefined, date: string): Form => ({
  title: a?.title ?? '',
  category: a?.category ?? 'activity',
  date: a?.date ?? date,
  startTime: a?.startTime ?? '',
  endTime: a?.endTime ?? '',
  locationText: a?.locationText ?? '',
  notes: a?.notes ?? '',
  cost: a?.cost ? String(a.cost) : '',
  links: a?.links?.length ? a.links : [],
});

/**
 * Create or edit an activity. `activity` = edit; `draft` prefills a new one
 * (e.g. from an approved idea). `onCreated` gets the new id.
 */
export function ActivityForm({ open, trip, date, activity, draft, onClose, onCreated }: {
  open: boolean; trip: Trip; date: string; activity?: Activity; draft?: ActivityDraft; onClose: () => void; onCreated?: (id: string) => void;
}) {
  const me = useMe();
  const [f, setF] = useState<Form>(() => toForm(activity ?? draft, date));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setF(toForm(activity ?? draft, date)); }, [open, activity, draft, date]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const submit = async () => {
    setBusy(true);
    try {
      const locChanged = f.locationText.trim() !== (activity?.locationText ?? '');
      const location = !f.locationText.trim() ? null : locChanged || !activity?.location ? await geocodePlace(f.locationText, trip.destination) : activity.location;
      const data = {
        title: f.title.trim(),
        category: f.category,
        date: f.date,
        startTime: f.startTime,
        endTime: f.endTime,
        locationText: f.locationText.trim(),
        location,
        notes: f.notes.trim(),
        cost: Number(f.cost) || 0,
        links: cleanLinks(f.links),
      };
      if (activity) await store.updateSub(trip.id, 'activities', activity.id, data);
      else {
        const id = await store.addSub(trip.id, 'activities', { ...data, attendeeIds: [me.uid] });
        onCreated?.(id);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!activity || !confirm(`Delete "${activity.title}"?`)) return;
    await store.deleteSub(trip.id, 'activities', activity.id);
    onClose();
  };

  return (
    <Sheet open={open} title={activity ? 'Edit event' : 'Add to itinerary'} onClose={onClose} onSubmit={submit} submitLabel={activity ? 'Save' : 'Add'} submitDisabled={!f.title.trim() || !f.locationText.trim() || busy}>
      <TextField label="What" placeholder="Sunset at Miradouro da Graça" value={f.title} onChange={(e) => set({ title: e.target.value })} />
      <FieldRow>
        <Select label="Day" value={f.date} onChange={(e) => set({ date: e.target.value })}>
          {tripDays(trip.startDate, trip.endDate).map((d) => <option key={d} value={d}>{dayWord(d, trip.startDate)} · {formatDay(d)}</option>)}
        </Select>
        <Select label="Type" value={f.category} onChange={(e) => set({ category: e.target.value as Category })}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      </FieldRow>
      <FieldRow>
        <TextField label="Starts" type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
        <TextField label="Ends" type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} />
      </FieldRow>
      <TextField label="Where" placeholder="Address or place name" value={f.locationText} onChange={(e) => set({ locationText: e.target.value })} required
        hint="Needed for directions and Uber. A flight or hotel in a new country adds it to the trip." />
      <FieldRow>
        <TextField label={`Cost per person (${trip.currency})`} type="number" inputMode="decimal" min={0} step="any" placeholder="0" value={f.cost} onChange={(e) => set({ cost: e.target.value })} />
      </FieldRow>
      <TextArea label="Notes" placeholder="Booking reference, what to bring…" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      <LinkEditor links={f.links} onChange={(links) => set({ links })} />
      {activity && <Button variant="destructive" icon="trash" block onClick={remove}>Delete</Button>}
    </Sheet>
  );
}
