import { useEffect, useState } from 'react';
import { Button, Calendar, CelebrationScreen, Chip, FlowScreen, Icon, Illustration, ListGroup, ListItem, OptionCard, SearchField, useToast } from '../../design/components';
import { useCountries, placeCounts } from '../saves/Collections';
import { store } from '../../data';
import type { Place, Trip } from '../../data/types';
import { useMe, usePlaces } from '../../data/hooks';
import { cityOf, eventCategoryOf, groupBy } from '../../lib/places';
import { addDays, daysBetween, formatDay, today } from '../../lib/dates';
import { countryCodeOf, countryName, flagUrl } from '../../lib/countries';
import { searchCities } from '../../lib/geocode';
import { haptic, isNativeApp, PUBLIC_SITE, shareLink } from '../../lib/native';
import s from './trip.module.css';

type Step = 1 | 2 | 3 | 4;


const defaultCurrency = () => (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD');

/**
 * New trip (Figma "New trip — 1…5"): a full-screen, brand-coloured flow, never a sheet. Where to next? (search a city)
 * → When are you going? (a date range on the Calendar) → Who's coming? (Option cards) → Create my trip → the
 * Celebration screen with a days-to-go count-up. A trip is never made from a collection: when you have saved Places
 * in the destination's country, step 4 "Bring your saves?" lets you pick cities, and their Places become the new trip's
 * Ideas (each one points at the Place). The trip is named after its city; rename it any time in Edit trip.
 */
export function NewTrip({ open, onClose, onOpenTrip }: { open: boolean; onClose: () => void; onOpenTrip: (id: string) => void }) {
  const [step, setStep] = useState<Step>(1);
  const [place, setPlace] = useState<Place | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [company, setCompany] = useState<'me' | 'others' | null>(null);
  /** Exact dates, or roughly: a month */
  const [dateMode, setDateMode] = useState<'exact' | 'month'>('exact');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string; start: string; brought?: number } | null>(null);
  /** Cities left out on step 4 (every matching city comes along unless unticked). */
  const [leftBehind, setLeftBehind] = useState<string[]>([]);
  const toast = useToast();
  // Your saved Places in the destination's country, by city: what step 4 offers.
  const places = usePlaces() ?? [];
  const me = useMe();
  const code = countryCodeOf(place);
  const matching = code ? places.filter((p) => p.ownerId === me.uid && p.countryCode === code) : [];
  // Places by city, then the country's Links & notes as one more row
  const cities = [
    ...groupBy(matching.filter((p) => (p.type ?? 'place') === 'place'), cityOf).sort((a, b) => b[1].length - a[1].length),
    ...(matching.some((p) => (p.type ?? 'place') !== 'place') ? [['Links & notes', matching.filter((p) => (p.type ?? 'place') !== 'place')] as [string, typeof matching]] : []),
  ];
  const groupOf = (p: (typeof matching)[number]) => ((p.type ?? 'place') === 'place' ? cityOf(p) : 'Links & notes');
  const savedCountries = (useCountries() ?? []).filter((c) => c.code);
  const steps = cities.length ? 4 : 3;

  useEffect(() => {
    if (!open) return;
    setStep(1); setPlace(null); setStart(''); setEnd(''); setCompany(null); setBusy(false); setCreated(null); setLeftBehind([]); setDateMode('exact');
  }, [open]);
  if (!open) return null;

  const city = place?.name.split(',')[0] ?? '';
  const nDays = start && end ? daysBetween(start, end) + 1 : 0;

  const create = async (bringSaves = true) => {
    if (!place || !start || !end) return;
    setBusy(true);
    try {
      const id = await store.createTrip({
        name: city, destination: place, startDate: start, endDate: end, currency: defaultCurrency(), ...(dateMode === 'month' ? { dateMode } : {}),
        coverPhoto: null, coverPosition: null,
      });
      // "Bring your saves?": each chosen Place becomes an Idea that points at it.
      const bring = bringSaves ? matching.filter((p) => !leftBehind.includes(groupOf(p))) : [];
      await Promise.all(bring.map((p) => store.addSub(id, 'ideas', { title: p.name, category: eventCategoryOf(p.category), notes: '', links: [], votes: {}, status: 'open', placeId: p.id })));
      haptic('success');
      setCreated({ id, name: city, start, brought: bring.length });
    } catch {
      haptic('error');
      toast({ tone: 'error', label: "Couldn't create the trip. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  const invite = async (id: string, name: string) => {
    // The trip as stored (createInvite needs the whole record): read it once from its listener.
    const trip = await new Promise<Trip | null>((resolve) => { const off = store.watchTrip(id, (t) => { resolve(t); setTimeout(() => off(), 0); }, () => resolve(null)); });
    if (!trip) return;
    const code = await store.createInvite(trip);
    const url = `${isNativeApp ? PUBLIC_SITE : location.origin + location.pathname}#/join/${code}`;
    if (await shareLink({ title: `Join ${name}`, text: `Join our trip "${name}" on Rove`, url })) return;
    try { await navigator.clipboard.writeText(url); toast({ icon: 'copy', label: 'Invite link copied' }); } catch { /* shown nowhere else; the People tab has it */ }
  };

  if (created) {
    const until = Math.max(0, daysBetween(today(), created.start));
    return (
      <CelebrationScreen
        illustration={<Illustration name="suitcase" size={144} />}
        title={`${created.name}, here you come`}
        subtitle={[created.brought ? `Trip created. ${created.brought} idea${created.brought === 1 ? '' : 's'} came with you.` : 'Trip created.',
          company === 'others' ? 'Share the invite link so everyone can plan with you.' : 'Add your plans, ideas and bookings as they come.'].join(' ')}
        number={until} numberLabel={until === 1 ? 'day to go' : 'days to go'}
        primary={<Button iconEnd="chevron-right" onClick={() => { onClose(); onOpenTrip(created.id); }}>Open my trip</Button>}
        secondary={<Button variant="ghost" className={s.onDarkGhost} onClick={() => invite(created.id, created.name)}>Share with friends</Button>} />
    );
  }

  const next = (to: Step) => setStep(to);

  const create3 = steps === 4 ? () => next(4) : () => create();
  const createLabel = busy ? 'Creating your trip…' : 'Create my trip';

  if (step === 1)
    return (
      <FlowScreen step={1} of={steps} stepKey={1} title="Where to next?" subtitle="Pick a place you’ve saved, or search anywhere." onClose={onClose}
        footer={<Button variant="inverse" iconEnd="chevron-right" disabled={!place} onClick={() => next(2)}>{place ? `Plan ${city}` : 'Pick a place'}</Button>}>
        <DestinationSearch value={place} onPick={(p) => { haptic('selection'); setPlace(p); setLeftBehind([]); }} />
        {savedCountries.length > 0 && (
          <section className={s.flowSection} aria-labelledby="from-saved">
            <h2 className={s.flowSectionTitle} id="from-saved">From your saved places</h2>
            <div className={s.flowList}>
            <ListGroup label="From your saved places">
              {savedCountries.map((c) => {
                const at = c.places.find((p) => p.lat != null && p.lng != null);
                const picked = countryCodeOf(place) === c.code && place?.name === c.name;
                return (
                  <ListItem key={c.code} round media={<img src={c.flag} alt="" className={s.flagThumb} />} title={c.name} meta={placeCounts(c.places)}
                    trailing={picked ? 'Selected' : undefined} label={`${c.name}${picked ? ', selected' : ''}`}
                    onClick={() => { haptic('selection'); setPlace({ name: c.name, lat: at?.lat ?? 0, lng: at?.lng ?? 0, country: c.name, countryCode: c.code }); setLeftBehind([]); }} />
                );
              })}
            </ListGroup></div>
          </section>
        )}
      </FlowScreen>
    );

  // Roughly: pick a month (the next 12); the trip runs the whole month until real dates are set.
  // Months as 'YYYY-MM' strings, worked out without Date→ISO (which can shift a day across time zones)
  const ym = (y: number, m: number) => `${y + Math.floor((m - 1) / 12)}-${String(((m - 1) % 12) + 1).padStart(2, '0')}`;
  const [y0, m0] = today().split('-').map(Number);
  const months = Array.from({ length: 12 }, (_, i) => ym(y0, m0 + i));
  const pickMonth = (m: string) => { const [y, mo] = m.split('-').map(Number); const first = `${m}-01`; const last = addDays(`${ym(y, mo + 1)}-01`, -1); setStart(first < today() ? today() : first); setEnd(last); };
  const monthLabel = (m: string, opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }) => new Date(m + '-15T12:00').toLocaleDateString(undefined, opts);
  if (step === 2)
    return (
      <FlowScreen step={2} of={steps} stepKey={2} title="When are you going?" subtitle="Roughly is fine. You can change it later." onClose={onClose}
        footer={<Button variant="inverse" iconEnd="chevron-right" disabled={!start || !end} onClick={() => next(3)}>
          {!start || !end ? (dateMode === 'month' ? 'Pick a month' : 'Pick your dates') : dateMode === 'month' ? `Continue · ${monthLabel(start.slice(0, 7), { month: 'long' })}` : `Continue · ${nDays} day${nDays === 1 ? '' : 's'}`}
        </Button>}>
        <div className={s.flowChips} role="group" aria-label="How sure are you?">
          {(['exact', 'month'] as const).map((m) => (
            <Chip key={m} active={dateMode === m} onClick={() => { haptic('selection'); setDateMode(m); setStart(''); setEnd(''); }}
              label={`${m === 'exact' ? 'Exact dates' : 'Roughly'}${dateMode === m ? ', selected' : ''}`}>{m === 'exact' ? 'Exact dates' : 'Roughly'}</Chip>
          ))}
        </div>
        {dateMode === 'exact' ? (
          <>
            <Calendar start={start} end={end} min={today()} onChange={(a, b) => { haptic('selection'); setStart(a); setEnd(b); }} />
            {start && (
              <div className={s.flowSummary}>
                <span className={s.flowSummaryTitle}>{formatDay(start)}{end ? ` → ${formatDay(end)}` : ' → pick the last day'}</span>
                {nDays > 0 && <span className={s.flowSummaryMeta}>{nDays} day{nDays === 1 ? '' : 's'} · {nDays - 1} night{nDays === 2 ? '' : 's'}</span>}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={[s.optionGrid, s.monthGrid].join(' ')} role="group" aria-label="Month">
              {months.map((m) => (
                <OptionCard key={m} icon="calendar" label={monthLabel(m, { month: 'short', year: m.slice(0, 4) === today().slice(0, 4) ? undefined : 'numeric' })}
                  selected={!!start && start.slice(0, 7) === m} onClick={() => { haptic('light'); pickMonth(m); }} />
              ))}
            </div>
            {start && (
              <div className={s.flowSummary}>
                <span className={s.flowSummaryTitle}>{monthLabel(start.slice(0, 7))}</span>
                <span className={s.flowSummaryMeta}>Dates to confirm. Set them in Edit trip when you know.</span>
              </div>
            )}
          </>
        )}
      </FlowScreen>
    );

  if (step === 3)
    return (
      <FlowScreen step={3} of={steps} stepKey={3} title="Who’s coming?" subtitle="Everyone you add can see and edit the plan." onClose={onClose}
        footer={<>
          <Button variant="inverse" iconEnd="chevron-right" loading={busy && steps !== 4} disabled={busy} onClick={create3}>{steps === 4 ? 'Continue' : createLabel}</Button>
          <Button variant="ghost" className={s.flowSkip} disabled={busy} onClick={() => { setCompany('me'); create3(); }}>Skip for now</Button>
        </>}>
        <div className={s.optionGrid}>
          <OptionCard icon="person" label="Just me" selected={company === 'me'} onClick={() => { haptic('light'); setCompany('me'); }} />
          <OptionCard icon="people" label="With others" selected={company === 'others'} onClick={() => { haptic('light'); setCompany('others'); }} />
        </div>
        {company === 'others' && (
          <div className={s.flowList}>
          <ListGroup label="Invited">
            <ListItem icon="person" title="You" meta="Owner" />
            <ListItem icon="link" title="Share an invite link" meta="Next, once your trip is made. Anyone with it can join for 14 days." />
          </ListGroup></div>
        )}
      </FlowScreen>
    );

  // Step 4: "Bring your saves?" — the cities you've saved Places in, in this country; untick one to leave it out.
  const kept = matching.filter((p) => !leftBehind.includes(groupOf(p))).length;
  return (
    <FlowScreen step={4} of={4} stepKey={4} title={`Bring your ${countryName(code!)} saves?`} subtitle="They’ll wait in Ideas until you add them to a day." onClose={onClose}
      footer={<>
        <Button variant="inverse" iconEnd="chevron-right" loading={busy} disabled={busy} onClick={() => create()}>{createLabel}</Button>
        <Button variant="ghost" className={s.flowSkip} disabled={busy} onClick={() => create(false)}>Skip for now</Button>
      </>}>
      <div className={s.flowList}>
      <ListGroup label="Saved places by city">
        {cities.map(([c, list]) => {
          const on = !leftBehind.includes(c);
          return (
            <ListItem key={c} icon={c === 'Links & notes' ? 'link' : 'pin'} title={c}
              meta={list.slice(0, 3).map((p) => p.name).join(', ') + (list.length > 3 ? ` +${list.length - 3}` : '')}
              trailing={<span className={s.tick}>{list.length}{on && <Icon name="check" size={16} />}</span>}
              onClick={() => { haptic('selection'); setLeftBehind((x) => (on ? [...x, c] : x.filter((y) => y !== c))); }}
              label={`${c}, ${list.length} saved places, ${on ? 'coming with you' : 'left out'}`} />
          );
        })}
      </ListGroup></div>
      <div className={s.flowSummary}>
        <span className={s.flowSummaryTitle}>{kept} of {matching.length} selected</span>
        <span className={s.flowSummaryMeta}>Untick a city to leave it behind.</span>
      </div>
    </FlowScreen>
  );
}

/** Step 1: the Figma Search field, and matching cities as a List group with their flags. */
function DestinationSearch({ value, onPick }: { value: Place | null; onPick: (p: Place) => void }) {
  const [text, setText] = useState(value?.name ?? '');
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (text.trim().length < 2 || text === value?.name) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchCities(text, ctrl.signal).then((r) => { setResults(r); setError(false); }).catch((e) => { if (e.name !== 'AbortError') setError(true); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [text, value?.name]);
  const shown = value && text === value.name ? [value] : results;
  return (
    <>
      <SearchField label="Search a country or city" placeholder="Search a country or city" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      {error && <p className={s.flowSummaryMeta} role="alert">City search isn’t working right now. Check your connection and try again.</p>}
      {shown.length > 0 && (
        <div className={s.flowList}>
        <ListGroup label="Places">
          {shown.map((p) => {
            const code = countryCodeOf(p);
            const picked = value?.name === p.name && value.lat === p.lat;
            return (
              <ListItem key={`${p.lat},${p.lng}`} round media={code && flagUrl(code) ? <img src={flagUrl(code)} alt="" className={s.flagThumb} /> : undefined}
                icon={code ? undefined : 'pin'} title={p.name.split(',')[0]} meta={p.name.split(',').slice(1).join(',').trim() || undefined}
                trailing={picked ? 'Selected' : undefined} onClick={() => { setText(p.name); onPick(p); }}
                label={`${p.name}${picked ? ', selected' : ''}`} />
            );
          })}
        </ListGroup></div>
      )}
    </>
  );
}
