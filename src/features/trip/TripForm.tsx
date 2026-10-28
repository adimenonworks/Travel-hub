import { useEffect, useState } from 'react';
import { FieldRow, Select, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import type { Place, Trip } from '../../data/types';
import { addDays, today } from '../../lib/dates';
import { CURRENCIES } from '../../lib/format';
import { CityPicker } from '../shared/CityPicker';
import s from './trip.module.css';

export const COVER_COLORS = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#30b0c7', '#5856d6', '#a2845e'];

type Draft = { name: string; destination: Place | null; startDate: string; endDate: string; currency: string; dailyBudget: string; coverColor: string };

const fromTrip = (t?: Trip): Draft => ({
  name: t?.name ?? '',
  destination: t?.destination ?? null,
  startDate: t?.startDate ?? addDays(today(), 30),
  endDate: t?.endDate ?? addDays(today(), 34),
  currency: t?.currency ?? (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD'),
  dailyBudget: t ? String(t.dailyBudget || '') : '',
  coverColor: t?.coverColor ?? COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
});

/** Create a trip (no `trip`) or edit one. Calls onSaved with the trip id. */
export function TripForm({ open, trip, onClose, onSaved }: { open: boolean; trip?: Trip; onClose: () => void; onSaved?: (id: string) => void }) {
  const [d, setD] = useState<Draft>(() => fromTrip(trip));
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setD(fromTrip(trip)); setError(''); } }, [open, trip]);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const valid = d.name.trim() && d.startDate && d.endDate && d.endDate >= d.startDate;

  const submit = async () => {
    const data = {
      name: d.name.trim(),
      destination: d.destination,
      startDate: d.startDate,
      endDate: d.endDate,
      currency: d.currency,
      dailyBudget: Number(d.dailyBudget) || 0,
      coverColor: d.coverColor,
    };
    try {
      if (trip) {
        await store.updateTrip(trip.id, data);
        onSaved?.(trip.id);
      } else {
        const id = await store.createTrip(data);
        onSaved?.(id);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the trip');
    }
  };

  return (
    <Sheet open={open} title={trip ? 'Edit trip' : 'New trip'} onClose={onClose} onSubmit={submit} submitLabel={trip ? 'Save' : 'Create'} submitDisabled={!valid}>
      <TextField label="Trip name" placeholder="Summer in Lisbon" value={d.name} onChange={(e) => set({ name: e.target.value })} required />
      <CityPicker value={d.destination} onChange={(p) => set({ destination: p, name: d.name || (p ? `${p.name.split(',')[0]} trip` : '') })} />
      <FieldRow>
        <TextField label="Start" type="date" value={d.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: d.endDate < e.target.value ? e.target.value : d.endDate })} />
        <TextField label="End" type="date" value={d.endDate} min={d.startDate} onChange={(e) => set({ endDate: e.target.value })} />
      </FieldRow>
      <FieldRow>
        <TextField label="Daily budget" type="number" inputMode="decimal" min={0} placeholder="150" value={d.dailyBudget} onChange={(e) => set({ dailyBudget: e.target.value })} />
        <Select label="Currency" value={d.currency} onChange={(e) => set({ currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </FieldRow>
      <div className={s.colors} role="radiogroup" aria-label="Trip color">
        {COVER_COLORS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={d.coverColor === c} aria-label={c} className={s.swatch} style={{ background: c }} onClick={() => set({ coverColor: c })} />
        ))}
      </div>
      {error && <p className="t-footnote t-danger">{error}</p>}
    </Sheet>
  );
}
