import { useEffect, useState } from 'react';
import { Button, Calendar, CelebrationScreen, FlowScreen, Icon, Illustration, ListGroup, ListItem, OptionCard, SearchField, useToast } from '../../design/components';
import { store } from '../../data';
import type { Idea, Place, Trip } from '../../data/types';
import { useMyTrips, useSubFor } from '../../data/hooks';
import { UNSORTED, saveCity, saveCounts, savedPlaces } from '../../lib/saves';
import { daysBetween, formatDay, today } from '../../lib/dates';
import { countryCodeOf, countryName, flagUrl } from '../../lib/countries';
import { searchCities } from '../../lib/geocode';
import { haptic, isNativeApp, PUBLIC_SITE, shareLink } from '../../lib/native';
import s from './trip.module.css';

type Step = 1 | 2 | 3 | 4;

/** Where the flow starts: blank, or from a saved place ("Turn into a trip" fills in the destination). */
export type NewTripStart = { fromSaved?: string };

const defaultCurrency = () => (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD');

/**
 * New trip (Figma "New trip — 1…5"): a full-screen, brand-coloured flow, never a sheet. Where to next? (search a city)
 * → When are you going? (a date range on the Calendar) → Who's coming? (Option cards) → Create my trip → the
 * Celebration screen with a days-to-go count-up. Step 1 also lists your saved places; picking one (or starting from
 * one with "Turn into a trip") adds step 4, "Bring your saves?", and creating the trip turns that same record from
 * Saved into Planned: nothing is copied, its saves are already the trip's Ideas. Unticked cities' saves move to
 * Passed. The trip is named after its city (or the saved place); rename it any time in Edit trip.
 */
export function NewTrip({ open, start: begin, onClose, onOpenTrip }: { open: boolean; start?: NewTripStart; onClose: () => void; onOpenTrip: (id: string) => void }) {
  const [step, setStep] = useState<Step>(1);
  const [place, setPlace] = useState<Place | null>(null);
  const [fromSaved, setFromSaved] = useState<string | null>(null);
  const [leftBehind, setLeftBehind] = useState<string[]>([]);
  const trips = useMyTrips();
  const saved = savedPlaces(trips).filter((t) => t.name !== UNSORTED);
  const savesBy = useSubFor(saved.map((t) => t.id), 'ideas');
  const source = saved.find((t) => t.id === fromSaved);
  const saves = (source && savesBy[source.id]?.filter((i) => i.status === 'open')) ?? [];
  const steps = saves.length ? 4 : 3;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [company, setCompany] = useState<'me' | 'others' | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string; start: string; brought?: number } | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setStep(1); setPlace(null); setStart(''); setEnd(''); setCompany(null); setBusy(false); setCreated(null); setFromSaved(null); setLeftBehind([]);
  }, [open]);
  // "Turn into a trip": the destination is filled in, so the flow opens on the dates.
  useEffect(() => {
    if (!open || !begin?.fromSaved) return;
    const t = saved.find((x) => x.id === begin.fromSaved);
    // Straight to the dates when the saves say which city; a place with nothing saved yet starts at the search.
    if (t) { if (pickSaved(t)) setStep(2); }
  }, [open, begin?.fromSaved, saved.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;

  /** A saved place as the destination: its busiest city (from the saves) when it has one, else the country. */
  function pickSaved(t: Trip) {
    const ideas = (savesBy[t.id] ?? []).filter((i) => i.place);
    const counts = new Map<string, Idea>();
    const tally: Record<string, number> = {};
    for (const i of ideas) { const c = saveCity(i)!; tally[c] = (tally[c] ?? 0) + 1; if (!counts.has(c)) counts.set(c, i); }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    const at = top ? counts.get(top)!.place! : null;
    const known = t.destination && (t.destination.lat !== 0 || t.destination.lng !== 0) ? t.destination : null;
    const where = at ? { name: `${top}, ${at.country ?? countryName(at.countryCode ?? '')}`, lat: at.lat, lng: at.lng, country: at.country, countryCode: at.countryCode } : known;
    setPlace(where);
    setFromSaved(t.id);
    return !!where;
  }

  const city = source ? source.name : place?.name.split(',')[0] ?? '';
  const nDays = start && end ? daysBetween(start, end) + 1 : 0;

  const create = async () => {
    if (!place || !start || !end) return;
    setBusy(true);
    try {
      let id: string;
      if (source) {
        // The same record changes status: Saved → Planned. Its saves are already its Ideas.
        await store.updateTrip(source.id, { status: 'planned', name: city, destination: place, startDate: start, endDate: end });
        await Promise.all(saves.filter((i) => leftBehind.includes(saveCity(i) ?? '')).map((i) => store.updateSub(source.id, 'ideas', i.id, { status: 'rejected' })));
        id = source.id;
      } else {
        id = await store.createTrip({
          name: city, status: 'planned', destination: place, startDate: start, endDate: end, currency: defaultCurrency(),
          totalBudget: 0, dailyBudget: 0, coverPhoto: null, coverPosition: null,
        });
      }
      haptic('success');
      setCreated({ id, name: city, start, brought: source ? saves.length - saves.filter((i) => leftBehind.includes(saveCity(i) ?? '')).length : undefined });
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
        title={`${created.name}, here you come!`}
        subtitle={[created.brought ? `Trip created. ${created.brought} idea${created.brought === 1 ? '' : 's'} came with you.` : 'Trip created.',
          company === 'others' ? 'Share the invite link so everyone can plan with you.' : 'Add your plans, ideas and bookings as they come.'].join(' ')}
        number={until} numberLabel={until === 1 ? 'day to go' : 'days to go'}
        primary={<Button iconEnd="chevron-right" onClick={() => { onClose(); onOpenTrip(created.id); }}>Open my trip</Button>}
        secondary={<Button variant="ghost" className={s.onDarkGhost} onClick={() => invite(created.id, created.name)}>Share with friends</Button>} />
    );
  }

  const next = (to: Step) => setStep(to);

  const create3 = steps === 4 ? () => next(4) : create;
  const createLabel = busy ? 'Creating your trip…' : 'Create my trip';

  if (step === 1)
    return (
      <FlowScreen step={1} of={steps} stepKey={1} title="Where to next?" subtitle={saved.length ? 'Pick a place you’ve saved, or search anywhere.' : 'Search for a city, anywhere.'} onClose={onClose}
        footer={<Button variant="inverse" iconEnd="chevron-right" disabled={!place} onClick={() => next(2)}>{place ? `Plan ${city}` : 'Pick a place'}</Button>}>
        <DestinationSearch value={fromSaved ? null : place} onPick={(p) => {
          haptic('selection'); setPlace(p);
          // A city in the saved place's country keeps it as the source (its saves come along); anywhere else starts fresh.
          if (source && countryCodeOf(p) !== countryCodeOf(source.destination)) setFromSaved(null);
        }} />
        {saved.length > 0 && (
          <section className={s.flowSection} aria-label="From your saved places">
            <h2 className={s.flowSummaryTitle}>From your saved places</h2>
            <ListGroup label="Saved places">
              {saved.map((t) => {
                const code = countryCodeOf(t.destination);
                return (
                  <ListItem key={t.id} round media={code && flagUrl(code) ? <img src={flagUrl(code)} alt="" className={s.flagThumb} /> : undefined} icon={code ? undefined : 'pin'}
                    title={t.name} meta={saveCounts(savesBy[t.id] ?? [])} trailing={fromSaved === t.id ? 'Selected' : undefined}
                    onClick={() => { haptic('selection'); pickSaved(t); }} label={`${t.name}${fromSaved === t.id ? ', selected' : ''}`} />
                );
              })}
            </ListGroup>
          </section>
        )}
      </FlowScreen>
    );

  if (step === 2)
    return (
      <FlowScreen step={2} of={steps} stepKey={2} title="When are you going?" subtitle="Tap the first day, then the last. You can change it later." onClose={onClose}
        footer={<Button variant="inverse" iconEnd="chevron-right" disabled={!start || !end} onClick={() => next(3)}>{nDays ? `Continue · ${nDays} day${nDays === 1 ? '' : 's'}` : 'Pick your dates'}</Button>}>
        <Calendar start={start} end={end} min={today()} onChange={(a, b) => { haptic('selection'); setStart(a); setEnd(b); }} />
        {start && (
          <div className={s.flowSummary}>
            <span className={s.flowSummaryTitle}>{formatDay(start)}{end ? ` → ${formatDay(end)}` : ' → pick the last day'}</span>
            {nDays > 0 && <span className={s.flowSummaryMeta}>{nDays} day{nDays === 1 ? '' : 's'} · {nDays - 1} night{nDays === 2 ? '' : 's'}</span>}
          </div>
        )}
      </FlowScreen>
    );

  if (step === 3)
    return (
      <FlowScreen step={3} of={steps} stepKey={3} title="Who’s coming?" subtitle="Everyone you add can see and edit the plan." onClose={onClose}
        footer={<Button variant="inverse" iconEnd="chevron-right" disabled={busy} onClick={create3}>{steps === 4 ? 'Continue' : createLabel}</Button>}>
        <div className={s.optionGrid}>
          <OptionCard icon="person" label="Just me" selected={company === 'me'} onClick={() => { haptic('light'); setCompany('me'); }} />
          <OptionCard icon="people" label="With others" selected={company === 'others'} onClick={() => { haptic('light'); setCompany('others'); }} />
        </div>
        {company === 'others' && (
          <ListGroup label="Invited">
            <ListItem icon="person" title="You" meta="Owner" />
            <ListItem icon="link" title="Share an invite link" meta="Next, once your trip is made. Anyone with it can join for 14 days." />
          </ListGroup>
        )}
      </FlowScreen>
    );

  // Step 4: "Bring your saves?" — one row per city (and Links & notes); untick one to leave it behind.
  const groups = Object.entries(saves.reduce<Record<string, Idea[]>>((m, i) => { const k = saveCity(i) ?? ''; (m[k] ??= []).push(i); return m; }, {}))
    .sort((a, b) => (a[0] === '' ? 1 : b[0] === '' ? -1 : b[1].length - a[1].length));
  const kept = saves.filter((i) => !leftBehind.includes(saveCity(i) ?? '')).length;
  return (
    <FlowScreen step={4} of={4} stepKey={4} title={`Bring your ${source?.name ?? ''} saves?`} subtitle="They’ll wait in Ideas until you add them to a day." onClose={onClose}
      footer={<Button variant="inverse" iconEnd="chevron-right" disabled={busy} onClick={create}>{createLabel}</Button>}>
      <ListGroup label="Saves by city">
        {groups.map(([c, list]) => {
          const on = !leftBehind.includes(c);
          return (
            <ListItem key={c || 'links'} icon={c ? 'pin' : 'link'} title={c || 'Links & notes'}
              meta={list.slice(0, 3).map((i) => i.title).join(', ') + (list.length > 3 ? ` +${list.length - 3}` : '')}
              trailing={<span className={s.tick}>{list.length}{on && <Icon name="check" size={16} />}</span>}
              onClick={() => { haptic('selection'); setLeftBehind((x) => (on ? [...x, c] : x.filter((y) => y !== c))); }}
              label={`${c || 'Links and notes'}, ${list.length} saves, ${on ? 'coming with you' : 'left behind'}`} />
          );
        })}
      </ListGroup>
      <div className={s.flowSummary}>
        <span className={s.flowSummaryTitle}>{kept} of {saves.length} selected</span>
        <span className={s.flowSummaryMeta}>Untick a city to leave it behind</span>
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
        </ListGroup>
      )}
    </>
  );
}
