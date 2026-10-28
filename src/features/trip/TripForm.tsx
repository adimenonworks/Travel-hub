import { useEffect, useRef, useState } from 'react';
import { Button, ColorPicker, FieldRow, Select, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import type { Place, Trip } from '../../data/types';
import { COVER_COLORS, coverName } from '../../lib/colors';
import { addDays, today } from '../../lib/dates';
import { CURRENCIES } from '../../lib/format';
import { shrinkPhoto } from '../../lib/image';
import { CityPicker } from '../shared/CityPicker';
import s from './trip.module.css';

type Draft = { name: string; destination: Place | null; startDate: string; endDate: string; currency: string; dailyBudget: string; coverColor: string; coverPhoto: string | null };

const fromTrip = (t?: Trip): Draft => ({
  name: t?.name ?? '',
  destination: t?.destination ?? null,
  startDate: t?.startDate ?? addDays(today(), 30),
  endDate: t?.endDate ?? addDays(today(), 34),
  currency: t?.currency ?? (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD'),
  dailyBudget: t ? String(t.dailyBudget || '') : '',
  coverColor: t ? coverName(t.coverColor) : COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)].value,
  coverPhoto: t?.coverPhoto ?? null,
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
      coverPhoto: d.coverPhoto,
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
      <ColorPicker label="Trip colour" options={COVER_COLORS} value={d.coverColor} onChange={(coverColor) => set({ coverColor })} />
      <CoverPhotoField value={d.coverPhoto} onChange={(coverPhoto) => set({ coverPhoto })} />
      {error && <p className="t-footnote t-danger">{error}</p>}
    </Sheet>
  );
}

/** Pick a photo from the device; it's shrunk before saving. */
function CoverPhotoField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await shrinkPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo couldn't be used.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className={s.coverField}>
      <div className="t-subhead t-bold">Cover photo</div>
      {value && <img src={value} alt="Cover photo preview" className={s.coverPreview} />}
      <div className={s.coverButtons}>
        <Button variant="tinted" size="small" icon="photo" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Preparing photo…' : value ? 'Change photo' : 'Choose photo'}
        </Button>
        {value && <Button variant="plain" size="small" onClick={() => onChange(null)}>Remove photo</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} aria-hidden="true"
        onChange={(e) => pick(e.target.files?.[0])} />
      {error ? <p className="t-footnote t-danger" role="alert">{error}</p>
        : !value && <p className="t-footnote t-secondary">Optional. Shown on the trip card and at the top of the trip. Without one, the colour is used.</p>}
    </div>
  );
}
