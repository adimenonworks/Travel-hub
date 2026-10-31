import { useEffect, useRef, useState } from 'react';
import { Button, FieldRow, Select, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import type { Place, Trip } from '../../data/types';
import { COVER_COLORS, coverName } from '../../lib/colors';
import { addDays, daysBetween, today } from '../../lib/dates';
import { CURRENCIES } from '../../lib/format';
import { shrinkPhoto } from '../../lib/image';
import { CityPicker } from '../shared/CityPicker';
import s from './trip.module.css';

type Draft = { name: string; destination: Place | null; startDate: string; endDate: string; currency: string; totalBudget: string; coverColor: string; coverPhoto: string | null; coverPosition: Pos | null };
type Pos = { x: number; y: number };

const fromTrip = (t?: Trip): Draft => ({
  name: t?.name ?? '',
  destination: t?.destination ?? null,
  startDate: t?.startDate ?? addDays(today(), 30),
  endDate: t?.endDate ?? addDays(today(), 34),
  currency: t?.currency ?? (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD'),
  // Older trips only have a per-person daily budget: show it as the total it adds up to.
  totalBudget: t ? String(t.totalBudget ?? (Math.round(t.dailyBudget * t.memberIds.length * (daysBetween(t.startDate, t.endDate) + 1)) || '')) : '',
  coverColor: t ? coverName(t.coverColor) : COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)].value,
  coverPhoto: t?.coverPhoto ?? null,
  coverPosition: t?.coverPosition ?? null,
});

/**
 * Create a trip (no `trip`) or edit one. Calls onSaved with the trip id.
 * Pass onDeleted to show a Delete trip button (only the owner can delete; the security rules enforce it too).
 */
export function TripForm({ open, trip, onClose, onSaved, onDeleted }: { open: boolean; trip?: Trip; onClose: () => void; onSaved?: (id: string) => void; onDeleted?: () => void }) {
  const [d, setD] = useState<Draft>(() => fromTrip(trip));
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setD(fromTrip(trip)); setError(''); } }, [open, trip]);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const valid = d.name.trim() && d.startDate && d.endDate && d.endDate >= d.startDate;

  const submit = async () => {
    const total = Number(d.totalBudget) || 0;
    const people = trip?.memberIds.length ?? 1;
    const data = {
      name: d.name.trim(),
      destination: d.destination,
      startDate: d.startDate,
      endDate: d.endDate,
      currency: d.currency,
      totalBudget: total,
      // Still saved per person per day, for anyone on an older version of the app.
      dailyBudget: Math.round(total / people / (daysBetween(d.startDate, d.endDate) + 1)),
      coverColor: d.coverColor,
      coverPhoto: d.coverPhoto,
      coverPosition: d.coverPhoto ? d.coverPosition : null,
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

  const remove = async () => {
    if (!trip || !confirm(`Delete "${trip.name}" for everyone? This can't be undone.`)) return;
    try {
      await store.deleteTrip(trip.id);
      onClose();
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the trip');
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
        <TextField label="Total budget" type="number" inputMode="decimal" min={0} placeholder="2000" value={d.totalBudget} onChange={(e) => set({ totalBudget: e.target.value })}
          hint="For the whole group. Each day's budget is worked out from it." />
        <Select label="Currency" value={d.currency} onChange={(e) => set({ currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </FieldRow>
      <CoverPhotoField value={d.coverPhoto} position={d.coverPosition}
        onChange={(coverPhoto) => set({ coverPhoto, coverPosition: null })} onMove={(coverPosition) => set({ coverPosition })} />
      {error && <p className="t-label-small t-danger">{error}</p>}
      {trip && onDeleted && <Button variant="destructive" icon="trash" block onClick={remove}>Delete trip</Button>}
    </Sheet>
  );
}

/** Pick a photo from the device; it's shrunk before saving. */
function CoverPhotoField({ value, position, onChange, onMove }: {
  value: string | null; position: Pos | null; onChange: (v: string | null) => void; onMove: (p: Pos | null) => void;
}) {
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
      <div className="t-body-small t-bold">Cover photo</div>
      {value && <CoverPositioner src={value} position={position ?? { x: 50, y: 50 }} onMove={onMove} />}
      <div className={s.coverButtons}>
        <Button variant="secondary" size="small" icon="photo" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Preparing photo…' : value ? 'Change photo' : 'Choose photo'}
        </Button>
        {value && position && <Button variant="ghost" size="small" onClick={() => onMove(null)}>Re-centre</Button>}
        {value && <Button variant="ghost" size="small" onClick={() => onChange(null)}>Remove photo</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} aria-hidden="true"
        onChange={(e) => pick(e.target.files?.[0])} />
      {error ? <p className="t-label-small t-danger" role="alert">{error}</p>
        : <p className="t-label-small t-secondary" id="cover-hint">{value ? 'Drag the photo (or use the arrow keys) to choose which part shows.' : 'Optional. Fills the trip card and shows at the top of the trip.'}</p>}
    </div>
  );
}

const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

/**
 * The cover photo cropped like it is on the trip, with a draggable focus point.
 * The position is stored as percentages (CSS object-position), so it works at any size.
 */
function CoverPositioner({ src, position, onMove }: { src: string; position: Pos; onMove: (p: Pos) => void }) {
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; start: Pos } | null>(null);

  // How far the photo overhangs its frame, in pixels, on each axis (object-fit: cover).
  const overhang = () => {
    const el = img.current!;
    const scale = Math.max(el.clientWidth / el.naturalWidth, el.clientHeight / el.naturalHeight);
    return { x: el.naturalWidth * scale - el.clientWidth, y: el.naturalHeight * scale - el.clientHeight };
  };

  return (
    <img
      ref={img}
      src={src}
      alt="Cover photo. Drag to reposition."
      draggable={false}
      tabIndex={0}
      aria-describedby="cover-hint"
      className={s.coverPreview}
      style={{ objectPosition: `${position.x}% ${position.y}%` }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, start: position };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const o = overhang();
        const { start } = drag.current;
        onMove({
          // Dragging right reveals more of the left edge, so the percentage goes down.
          x: o.x > 1 ? clamp(start.x - ((e.clientX - drag.current.x) / o.x) * 100) : start.x,
          y: o.y > 1 ? clamp(start.y - ((e.clientY - drag.current.y) / o.y) * 100) : start.y,
        });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 20 : 5;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        onMove({ x: clamp(position.x + d[0]), y: clamp(position.y + d[1]) });
      }}
    />
  );
}
