import { Fragment, useEffect, useState } from 'react';
import { Button, Calendar, Chip, Icon, IconButton, Illustration, ListGroup, ListItem, OptionCard, TextField, useToast } from '../../design/components';
import { CelebrationScreen, FlowScreen } from './NewTripScreens';
import { useCountries, placeCounts } from '../saves/Collections';
import { store } from '../../data';
import type { Place, Trip } from '../../data/types';
import { useMe, usePlaces } from '../../data/hooks';
import { PLACE_TYPES, placeTypeOf, cityOf, eventCategoryOf, groupBy, placeCategory } from '../../lib/places';
import { TYPE_TONE } from '../../lib/categories';
import { addDays, daysBetween, formatDay, today } from '../../lib/dates';
import { MAX_STOPS, countryCodeOf, countryName, flagUrl, samePlace } from '../../lib/countries';
import { searchCities } from '../../lib/geocode';
import { haptic, isNativeApp, PUBLIC_SITE, shareLink } from '../../lib/native';
import { PriceField, fromPriceDraft, useHomeCurrency, type PriceDraft } from '../shared/Price';
import s from './trip.module.css';

type Step = 1 | 2 | 3 | 4;


const defaultCurrency = () => (Intl.NumberFormat().resolvedOptions().locale.startsWith('en-GB') ? 'GBP' : 'USD');

/**
 * New trip (Figma "New trip — 1…5"): a full-screen, brand-coloured flow, never a sheet. Where are you going? (add every
 * stop, or just the first: saved as `stops`, the first is also `destination`, which names the trip and finds its cover)
 * → When are you going? (a date range on the Calendar) → Who's coming? (Option cards) → Create my trip → the
 * Celebration screen with a days-to-go count-up. A trip is never made from a collection: when you have saved Places
 * in the trip's countries, step 4 "Bring your saves?" lets you pick cities, and their Places become the new trip's
 * Ideas (each one points at the Place). The trip is named after its city; rename it any time in Edit trip.
 */
export function NewTrip({ open, onClose, onOpenTrip }: { open: boolean; onClose: () => void; onOpenTrip: (id: string) => void }) {
  const [step, setStep] = useState<Step>(1);
  /** Step 1: every stop picked, in order. The first names the trip. */
  const [stops, setStops] = useState<Place[]>([]);
  const place = stops[0] ?? null;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [company, setCompany] = useState<'me' | 'others' | null>(null);
  /** Exact dates, or roughly: a month */
  const [dateMode, setDateMode] = useState<'exact' | 'month'>('exact');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string; start: string; brought?: number } | null>(null);
  /** Step 4: the saved places chosen to come along (none until you pick), and the city whose places are showing. */
  const [picked, setPicked] = useState<string[]>([]);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  /** Step 2 "Want to set a budget?": null until chosen; the amount is per person */
  const [askBudget, setAskBudget] = useState(false);
  const [budgetOn, setBudgetOn] = useState<boolean | null>(null);
  const [budget, setBudget] = useState<PriceDraft>({ amount: '', currency: '' });
  const home = useHomeCurrency();
  const toast = useToast();
  // Step 4 offers only your saves in the trip's countries, in the order of the stops: places by city, plus each
  // country's links and notes as one more group. With none, the step is skipped (and the step bars count one less).
  const places = usePlaces() ?? [];
  const me = useMe();
  const codes = [...new Set(stops.map((p) => countryCodeOf(p)).filter((c): c is string => !!c))];
  const mine = places.filter((p) => p.ownerId === me.uid && p.countryCode && codes.includes(p.countryCode));
  const groupOf = (p: (typeof mine)[number]) => ((p.type ?? 'place') === 'place' ? cityOf(p) : 'Links & notes');
  const byCountry = groupBy(mine, (p) => p.countryCode!)
    .sort((a, b) => codes.indexOf(a[0]) - codes.indexOf(b[0]))
    .map(([c, list]) => ({
      code: c, list,
      groups: groupBy(list, groupOf).sort((a, b) => (a[0] === 'Links & notes' ? 1 : b[0] === 'Links & notes' ? -1 : b[1].length - a[1].length)),
    }));
  const savedCountries = (useCountries() ?? []).filter((c) => c.code);
  const steps = byCountry.length ? 5 : 4;

  useEffect(() => {
    if (!open) return;
    setStep(1); setStops([]); setStart(''); setEnd(''); setCompany(null); setBusy(false); setCreated(null); setPicked([]); setOpenGroup(null); setDateMode('exact');
    setAskBudget(false); setBudgetOn(null); setBudget({ amount: '', currency: '' });
  }, [open]);
  if (!open) return null;

  const city = place?.name.split(',')[0] ?? '';
  const nDays = start && end ? daysBetween(start, end) + 1 : 0;

  const create = async (bringSaves = true) => {
    if (!place || !start || !end) return;
    setBusy(true);
    try {
      const id = await store.createTrip({
        name: city, destination: place, stops, startDate: start, endDate: end, currency: defaultCurrency(), ...(dateMode === 'month' ? { dateMode } : {}),
        budget: budgetOn ? fromPriceDraft({ ...budget, currency: budget.currency || home }) : null,
        coverPhoto: null, coverPosition: null,
      });
      // "Bring your saves?": each chosen Place becomes an Idea that points at it.
      const bring = bringSaves ? mine.filter((p) => picked.includes(p.id)) : [];
      await Promise.all(bring.map((p) => store.addSub(id, 'ideas', { title: p.name, category: eventCategoryOf(p.category), notes: '', links: [], votes: {}, status: 'open', placeId: p.id })));
      haptic('success');
      setCreated({ id, name: city, start, brought: bring.length });
    } catch {
      haptic('error');
      toast({ tone: 'danger', label: "Couldn't create the trip. Check your connection" });
    } finally {
      setBusy(false);
    }
  };

  const invite = async (id: string, name: string) => {
    // The trip as stored (createInvite needs the whole record): read it once from its listener.
    const trip = await new Promise<Trip | null>((resolve) => { const off = store.watchTrip(id, (t) => { resolve(t); setTimeout(() => off(), 0); }, () => resolve(null)); });
    if (!trip) return;
    const code = await store.createInvite(trip, 'traveller');
    const url = `${isNativeApp ? PUBLIC_SITE : location.origin + location.pathname}#/join/${code}`;
    if (await shareLink({ title: `Join ${name}`, text: `Join us on ${name} in Rove`, url })) return;
    try { await navigator.clipboard.writeText(url); toast({ icon: 'copy', label: 'Link to join copied' }); } catch { /* shown nowhere else; the People tab has it */ }
  };

  if (created) {
    const until = Math.max(0, daysBetween(today(), created.start));
    return (
      <CelebrationScreen
        illustration={<Illustration name="suitcase" size={144} />}
        title={`${created.name}, here you come`}
        subtitle={[created.brought ? `Trip created. ${created.brought} idea${created.brought === 1 ? '' : 's'} came with you.` : 'Trip created.',
          company === 'others' ? 'Share a link so everyone can join and plan with you.' : 'Add your plans, ideas and bookings as they come.'].join(' ')}
        number={until} numberLabel={until === 1 ? 'day to go' : 'days to go'}
        primary={<Button size="large" iconEnd="chevron-right" onClick={() => { onClose(); onOpenTrip(created.id); }}>Open my trip</Button>}
        secondary={<Button size="large" tone="ghost" className={s.onDarkGhost} onClick={() => invite(created.id, created.name)}>Share with friends</Button>} />
    );
  }

  const next = (to: Step) => setStep(to);

  const create3 = steps === 5 ? () => next(4) : () => create();
  const createLabel = busy ? 'Creating your trip…' : 'Create my trip';

  // Step 2 "Want to set a budget?": Yes asks for a rough total per person; No skips it (it can be added in Edit trip)
  if (step === 1 && askBudget)
    return (
      <FlowScreen step={2} of={steps} stepKey="budget" title="Want to set a budget?" subtitle="Rove adds up what your bookings cost, so you know what’s left for everyday spending." onClose={onClose}
        footer={<Button size="large" iconEnd="chevron-right" disabled={budgetOn === null || (budgetOn && !fromPriceDraft({ ...budget, currency: budget.currency || home }))}
          onClick={() => { setAskBudget(false); next(2); }}>Continue</Button>}>
        <div className={s.optionGrid} role="group" aria-label="Budget">
          <OptionCard icon="wallet" label="Yes" description="Add costs to your bookings to see what the trip adds up to" selected={budgetOn === true}
            onClick={() => { haptic('selection'); setBudgetOn(true); }} />
          <OptionCard icon="x" label="No" description="I don’t want to track a budget for this trip" selected={budgetOn === false}
            onClick={() => { haptic('selection'); setBudgetOn(false); }} />
        </div>
        {budgetOn && (
          <div className={s.flowBudget}>
            <PriceField label="Budget per person" hint="A rough total is fine. You can change it in Edit trip."
              value={{ amount: budget.amount, currency: budget.currency || home }} onChange={setBudget} />
          </div>
        )}
      </FlowScreen>
    );

  const full = stops.length >= MAX_STOPS;
  const addStop = (p: Place) => { if (full || stops.some((x) => samePlace(x, p))) return; haptic('selection'); setStops((x) => [...x, p]); };
  const removeStop = (p: Place) => { haptic('light'); setStops((x) => x.filter((y) => !samePlace(y, p))); };
  if (step === 1)
    return (
      <FlowScreen step={1} of={steps} stepKey={1} title="Where are you going?" subtitle="Add every stop, or just the first. You can add more later." onClose={onClose}
        footer={<Button size="large" iconEnd="chevron-right" disabled={!place} onClick={() => setAskBudget(true)}>
          {!place ? 'Add a place' : stops.length > 1 ? `Continue · ${stops.length} stops` : 'Continue'}
        </Button>}>
        <StopSearch stops={stops} full={full} onPick={addStop} />
        {stops.length > 0 && (
          <section className={s.flowSection} aria-labelledby="stops">
            <h2 className={s.flowSectionTitle} id="stops">Your stops</h2>
            <ListGroup label="Your stops">
              {stops.map((p) => {
                const code = countryCodeOf(p), name = p.name.split(',')[0].trim();
                return (
                  <ListItem key={`${name}|${code}`} round media={code && flagUrl(code) ? <img src={flagUrl(code)} alt="" className={s.flagThumb} /> : undefined}
                    icon={code && flagUrl(code) ? undefined : 'pin'} title={name} meta={p.name.split(',').slice(1).join(',').trim() || (code && countryName(code) !== name ? countryName(code) : undefined)}
                    action={<IconButton icon="x" size="small" label={`Remove ${name}`} onClick={() => removeStop(p)} />} />
                );
              })}
            </ListGroup>
          </section>
        )}
        {savedCountries.length > 0 && (
          <section className={s.flowSection} aria-labelledby="from-saved">
            <h2 className={s.flowSectionTitle} id="from-saved">From your saved places</h2>
            <ListGroup label="From your saved places">
              {savedCountries.map((c) => {
                const at = c.places.find((p) => p.lat != null && p.lng != null);
                const country: Place = { name: c.name, lat: at?.lat ?? 0, lng: at?.lng ?? 0, country: c.name, countryCode: c.code };
                const on = stops.some((x) => samePlace(x, country));
                return (
                  <ListItem key={c.code} round media={<img src={c.flag} alt="" className={s.flagThumb} />} title={c.name} meta={placeCounts(c.places)}
                    trailing={on ? 'Selected' : undefined} label={`${c.name}${on ? ', selected. Tap to remove' : ''}`}
                    onClick={() => (on ? removeStop(country) : addStop(country))} />
                );
              })}
            </ListGroup>
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
      <FlowScreen step={3} of={steps} stepKey={2} title="When are you going?" subtitle="Roughly is fine. You can change it later." onClose={onClose}
        footer={<Button size="large" iconEnd="chevron-right" disabled={!start || !end} onClick={() => next(3)}>
          {!start || !end ? (dateMode === 'month' ? 'Pick a month' : 'Pick your dates') : dateMode === 'month' ? `Continue · ${monthLabel(start.slice(0, 7), { month: 'long' })}` : `Continue · ${nDays} day${nDays === 1 ? '' : 's'}`}
        </Button>}>
        <div className={s.flowChips} role="group" aria-label="How sure are you?">
          {(['exact', 'month'] as const).map((m) => (
            <Chip key={m} selected={dateMode === m} onClick={() => { haptic('selection'); setDateMode(m); setStart(''); setEnd(''); }}
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
      <FlowScreen step={4} of={steps} stepKey={3} title="Who’s coming?" subtitle="Everyone you add can see and edit the plan." onClose={onClose}
        footer={<>
          <Button size="large" iconEnd="chevron-right" loading={busy && steps !== 5} disabled={busy} onClick={create3}>{steps === 5 ? 'Continue' : createLabel}</Button>
          <Button tone="ghost" className={s.flowSkip} disabled={busy} onClick={() => { setCompany('me'); create3(); }}>Skip for now</Button>
        </>}>
        <div className={s.optionGrid}>
          <OptionCard icon="person" label="Just me" selected={company === 'me'} onClick={() => { haptic('light'); setCompany('me'); }} />
          <OptionCard icon="people" label="With others" selected={company === 'others'} onClick={() => { haptic('light'); setCompany('others'); }} />
        </div>
        {company === 'others' && (
          <ListGroup label="People">
            <ListItem icon="person" title="You" meta="Travelling" />
            <ListItem icon="link" title="Share a link to join" meta="Next, once your trip is made. Anyone with it can join for 14 days." />
          </ListGroup>
        )}
      </FlowScreen>
    );

  // Step 4 (Figma "New trip — 4. Bring your saves?"): nothing comes along until you pick it. Country → city (tap to
  // open; "All of <city>") → type (Food & drink, Stays, Activities; tap to open; "All …") → places to tick. Skipping is fine: Ideas → Add idea → From saved brings them in later.
  const toggle = (ids: string[], on: boolean) => setPicked((x) => (on ? [...new Set([...x, ...ids])] : x.filter((y) => !ids.includes(y))));
  return (
    <FlowScreen step={5} of={steps} stepKey={4} title="Bring your saves?" subtitle="Pick places you've saved to add to this trip's Ideas." onClose={onClose}
      footer={<>
        <Button size="large" iconEnd="chevron-right" loading={busy} disabled={busy} onClick={() => create()}>
          {picked.length ? `${createLabel} · ${picked.length} save${picked.length === 1 ? '' : 's'}` : createLabel}
        </Button>
        <Button tone="ghost" className={s.flowSkip} disabled={busy} onClick={() => create(false)}>Skip for now</Button>
        <p className={s.flowFootnote}>You can bring saves in any time from your trip's Ideas.</p>
      </>}>
      {byCountry.map((c) => (
        <section key={c.code} className={s.flowSection} aria-labelledby={`saves-${c.code}`}>
          <h2 className={s.flowSectionTitle} id={`saves-${c.code}`}>
            {flagUrl(c.code) && <img src={flagUrl(c.code)} alt="" className={s.flowFlag} />}{countryName(c.code)}
          </h2>
          <ListGroup label={`Saved places in ${countryName(c.code)}`}>
            {c.groups.map(([g, list]) => {
              const key = `${c.code}/${g}`, open = openGroup === key;
              const ids = list.map((p) => p.id), n = ids.filter((id) => picked.includes(id)).length;
              return (
                <Fragment key={key}>
                  <ListItem icon={g === 'Links & notes' ? 'link' : 'pin'} title={g}
                    meta={n ? `${n} of ${list.length} chosen` : `${list.length} saved`}
                    trailing={<Icon name="chevron-down" size={16} className={open ? s.flipped : undefined} />}
                    onClick={() => { haptic('selection'); setOpenGroup(open ? null : key); }}
                    label={`${g}, ${list.length} saved, ${n} chosen. ${open ? 'Hide' : 'Show'} places`} />
                  {open && (
                    <div className={s.flowDropdown}>
                      <ListItem size="small" icon={n === list.length ? 'check' : 'plus'} title={`All of ${g === 'Links & notes' ? 'these' : g}`}
                        onClick={() => { haptic('light'); toggle(ids, n !== list.length); }} label={`All of ${g}, ${n === list.length ? 'chosen' : 'not chosen'}`} />
                      {/* City → type → places: each type opens to its places (links and notes have none) */}
                      {(g === 'Links & notes' ? [{ c: null, places: list }] : PLACE_TYPES.map((c) => ({ c, places: list.filter((p) => placeTypeOf(p.category) === c.value) })).filter((x) => x.places.length > 0))
                        .map(({ c, places }) => {
                          const catKey = `${key}/${c?.value ?? 'links'}`, catOpen = !c || openCat === catKey;
                          const catIds = places.map((p) => p.id), m = catIds.filter((id) => picked.includes(id)).length;
                          return (
                            <Fragment key={catKey}>
                              {c && (
                                <ListItem size="small" icon={c.icon} type={TYPE_TONE[c.value]} title={c.label} meta={m ? `${m} of ${places.length} chosen` : `${places.length} saved`}
                                  trailing={<Icon name="chevron-down" size={16} className={catOpen ? s.flipped : undefined} />}
                                  onClick={() => { haptic('selection'); setOpenCat(catOpen ? null : catKey); }}
                                  label={`${c.label} in ${g}, ${places.length} saved, ${m} chosen. ${catOpen ? 'Hide' : 'Show'} places`} />
                              )}
                              {catOpen && (
                                <div className={c ? s.flowDropdown : undefined}>
                                  {c && places.length > 1 && (
                                    <ListItem size="small" icon={m === places.length ? 'check' : 'plus'} title={`All ${c.label.toLowerCase()}`}
                                      onClick={() => { haptic('light'); toggle(catIds, m !== places.length); }} label={`All ${c.label} in ${g}, ${m === places.length ? 'chosen' : 'not chosen'}`} />
                                  )}
                                  {places.map((p) => {
                                    const on = picked.includes(p.id);
                                    return (
                                      <ListItem key={p.id} size="small" icon={on ? 'check' : placeCategory(p.category).icon} type={on ? undefined : placeCategory(p.category).tone} title={p.name}
                                        trailing={on ? 'Chosen' : undefined}
                                        onClick={() => { haptic('light'); toggle([p.id], !on); }} label={`${p.name}, ${on ? 'chosen' : 'not chosen'}`} />
                                    );
                                  })}
                                </div>
                              )}
                            </Fragment>
                          );
                        })}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </ListGroup>
        </section>
      ))}
    </FlowScreen>
  );
}

/** Step 1: the Figma Search field, and matching places as a List group with their flags. A pick adds a stop and clears
 *  the field so the next one can be typed straight away; places already added say so and can't be added twice. */
function StopSearch({ stops, full, onPick }: { stops: Place[]; full: boolean; onPick: (p: Place) => void }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (text.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchCities(text, ctrl.signal).then((r) => { setResults(r); setError(false); }).catch((e) => { if (e.name !== 'AbortError') setError(true); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [text]);
  return (
    <>
      <TextField icon="pin" type="search" enterKeyHint="search" autoComplete="off" aria-label="Search a country or city" placeholder={stops.length ? 'Add another stop' : 'Search a country or city'}
        value={text} onChange={(e) => setText(e.target.value)} disabled={full} autoFocus />
      {full && <p className={s.flowSummaryMeta} role="status">That’s {MAX_STOPS} stops, the most one trip can have.</p>}
      {error && <p className={s.flowSummaryMeta} role="alert">City search isn’t working right now. Check your connection and try again.</p>}
      {!full && results.length > 0 && (
        <ListGroup label="Places">
          {results.map((p) => {
            const code = countryCodeOf(p);
            const added = stops.some((x) => samePlace(x, p));
            return (
              <ListItem key={`${p.lat},${p.lng}`} round media={code && flagUrl(code) ? <img src={flagUrl(code)} alt="" className={s.flagThumb} /> : undefined}
                icon={code ? undefined : 'pin'} title={p.name.split(',')[0]} meta={p.name.split(',').slice(1).join(',').trim() || undefined}
                trailing={added ? 'Added' : undefined} label={`${p.name}${added ? ', already a stop' : ''}`}
                onClick={added ? undefined : () => { onPick(p); setText(''); setResults([]); }} />
            );
          })}
        </ListGroup>
      )}
    </>
  );
}
