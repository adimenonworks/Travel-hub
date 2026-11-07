import { useEffect, useState } from 'react';
import { Button, Calendar, CelebrationScreen, FlowScreen, Icon, Illustration, ListGroup, ListItem, OptionCard, SearchField, useToast } from '../../design/components';
import { store } from '../../data';
import type { Place, Trip } from '../../data/types';
import { useMe, usePlaces } from '../../data/hooks';
import { cityOf, eventCategoryOf, groupBy } from '../../lib/places';
import { daysBetween, formatDay, today } from '../../lib/dates';
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
  const cities = groupBy(matching, cityOf).sort((a, b) => b[1].length - a[1].length);
  const steps = cities.length ? 4 : 3;

  useEffect(() => {
    if (!open) return;
    setStep(1); setPlace(null); setStart(''); setEnd(''); setCompany(null); setBusy(false); setCreated(null); setLeftBehind([]);
  }, [open]);
  if (!open) return null;

  const city = place?.name.split(',')[0] ?? '';
  const nDays = start && end ? daysBetween(start, end) + 1 : 0;

  const create = async () => {
    if (!place || !start || !end) return;
    setBusy(true);
    try {
      const id = await store.createTrip({
        name: city, destination: place, startDate: start, endDate: end, currency: defaultCurrency(),
        coverPhoto: null, coverPosition: null,
      });
      // "Bring your saves?": each chosen Place becomes an Idea that points at it.
      const bring = matching.filter((p) => !leftBehind.includes(cityOf(p)));
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
      <FlowScreen step={1} of={steps} stepKey={1} title="Where to next?" subtitle="Search for a city, anywhere." onClose={onClose}
        footer={<Button variant="inverse" iconEnd="chevron-right" disabled={!place} onClick={() => next(2)}>{place ? `Plan ${city}` : 'Pick a place'}</Button>}>
        <DestinationSearch value={place} onPick={(p) => { haptic('selection'); setPlace(p); setLeftBehind([]); }} />
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
        footer={<Button variant="inverse" iconEnd="chevron-right" loading={busy && steps !== 4} disabled={busy} onClick={create3}>{steps === 4 ? 'Continue' : createLabel}</Button>}>
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

  // Step 4: "Bring your saves?" — the cities you've saved Places in, in this country; untick one to leave it out.
  const kept = matching.filter((p) => !leftBehind.includes(cityOf(p))).length;
  return (
    <FlowScreen step={4} of={4} stepKey={4} title={`Bring your ${countryName(code!)} saves?`} subtitle="They’ll wait in Ideas until you add them to a day." onClose={onClose}
      footer={<Button variant="inverse" iconEnd="chevron-right" loading={busy} disabled={busy} onClick={create}>{createLabel}</Button>}>
      <ListGroup label="Saved places by city">
        {cities.map(([c, list]) => {
          const on = !leftBehind.includes(c);
          return (
            <ListItem key={c} icon="pin" title={c}
              meta={list.slice(0, 3).map((p) => p.name).join(', ') + (list.length > 3 ? ` +${list.length - 3}` : '')}
              trailing={<span className={s.tick}>{list.length}{on && <Icon name="check" size={16} />}</span>}
              onClick={() => { haptic('selection'); setLeftBehind((x) => (on ? [...x, c] : x.filter((y) => y !== c))); }}
              label={`${c}, ${list.length} saved places, ${on ? 'coming with you' : 'left out'}`} />
          );
        })}
      </ListGroup>
      <div className={s.flowSummary}>
        <span className={s.flowSummaryTitle}>{kept} of {matching.length} selected</span>
        <span className={s.flowSummaryMeta}>Untick a city to leave it out. Your saves stay in your collection either way.</span>
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
