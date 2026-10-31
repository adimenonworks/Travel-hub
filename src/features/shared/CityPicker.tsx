import { useEffect, useState } from 'react';
import { TextField } from '../../design/components';
import type { Place } from '../../data/types';
import { searchCities } from '../../lib/geocode';
import s from './shared.module.css';

/** Text field with city autocomplete; resolves to a Place with coordinates. */
export function CityPicker({ label = 'Destination', value, onChange, placeholder = 'Lisbon, Portugal', hint }: {
  label?: string;
  /** Helper text shown under the field when there's nothing more urgent to say */
  hint?: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value?.name ?? '');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || text === value?.name) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchCities(text, ctrl.signal)
        .then((r) => { setResults(r); setError(false); })
        .catch((e) => { if (e.name !== 'AbortError') setError(true); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [text, open, value?.name]);

  const pick = (p: Place) => {
    onChange(p);
    setText(p.name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className={s.suggest}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={text}
        autoComplete="off"
        onChange={(e) => { setText(e.target.value); setOpen(true); if (value) onChange(null); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        hint={error ? 'City search is unavailable right now. You can still save; weather and maps need a picked city.' : value ? hint : text && !open ? 'Pick a suggestion so we can show weather and maps.' : hint}
      />
      {open && results.length > 0 && (
        <div className={s.suggestList} role="listbox">
          {results.map((r) => (
            <button key={`${r.lat},${r.lng}`} type="button" role="option" aria-selected={false} className={s.suggestItem} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)}>
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
