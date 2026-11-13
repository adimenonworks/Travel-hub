import { useEffect, useState } from 'react';
import { SlideSwap } from '../shared/SlideSwap';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, IdeaRow, LinkButton, ListGroup, ListItem, PageSection, SectionHeader, SegmentControl, Select, Sheet, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe, usePlaces, usePlacesById } from '../../data/hooks';
import type { Category, Idea, LinkItem, SavedPlace } from '../../data/types';
import { countryName } from '../../lib/countries';
import { PLACE_TYPES, cityOf, eventCategoryOf, groupBy, placeCategory, placeTypeOf, sortPlaces, tripCountryCodes } from '../../lib/places';
import { PlaceMarks, PlaceRow } from '../saves/Collections';
import { usePlaceMarks } from '../saves/placeMarks';
import { haptic, confirmAction } from '../../lib/native';
import { EVENT_TYPES, categoryInfo, categoryTone, eventKind, isEveryday } from '../../lib/categories';
import { priceOf, priceText } from '../../lib/currency';
import { recordView } from '../../lib/recent';
import { hostOf, isPdf } from '../../lib/format';
import { PriceField, PriceWithConversion, fromPriceDraft, toPriceDraft, type PriceDraft } from '../shared/Price';
import { LinkChips, LinkEditor, cleanLinks } from '../shared/Links';
import { ActivityForm } from './ActivityForm';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';
import { isMapsLink } from '../../lib/links';

type Filter = 'open' | 'approved' | 'rejected';

const ups = (i: Idea) => Object.keys(i.votes ?? {}).length;

/**
 * Trip "Ideas" tab (Figma "Trip — Ideas"): things the group might do. A Section header, the To decide · Planned ·
 * Passed segments, then a List group of Idea rows sorted by votes (the leader gets a "Most votes" tag). Tapping a
 * row opens the idea: its notes, links and comments, and (for organizers) "Add to a day" or "Pass".
 */
const LINKS = 'Links & notes';

export function Ideas(ctx: TripCtx) {
  const { trip, ideas } = ctx;
  const me = useMe();
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<Idea | 'new' | null>(null);
  const [viewing, setViewing] = useState<Idea | null>(null);
  // ?idea=<id> (e.g. from Overview → Recently viewed) opens that idea's sheet
  const [params, setParams] = useSearchParams();
  const linked = params.get('idea');
  useEffect(() => {
    if (!linked) return;
    const hit = ctx.ideas.find((x) => x.id === linked);
    if (hit) setViewing(hit);
    setParams({}, { replace: true });
  }, [linked]); // eslint-disable-line react-hooks/exhaustive-deps
  const [scheduling, setScheduling] = useState<Idea | null>(null);
  const toast = useToast();

  const shownFor = (f: Filter) => ideas.filter((i) => i.status === f).sort((a, b) => ups(b) - ups(a) || b.createdAt - a.createdAt);
  const count = (f: Filter) => ideas.filter((i) => i.status === f).length;
  const topOf = (shown: Idea[]) => shown[0] && ups(shown[0]) > 0 && (shown.length === 1 || ups(shown[0]) > ups(shown[1])) ? shown[0].id : null;
  // Swipe the list sideways to move between To decide · Planned · Passed (the list slides like the trip's days)
  const FILTERS: Filter[] = ['open', 'approved', 'rejected'];
  const vote = async (i: Idea) => {
    if (!ctx.canContribute) { toast({ label: 'Viewers can see the votes but not vote' }); return; }
    const mine = !!i.votes?.[me.uid];
    haptic('light');
    try { await store.setVote(trip.id, i.id, me.uid, mine ? 0 : 1); }
    catch { toast({ tone: 'danger', label: "Couldn't save your vote. Check your connection" }); }
  };
  const live = viewing ? ideas.find((i) => i.id === viewing.id) ?? null : null;
  // Ideas that point at a saved Place show the Place (its name, kind and city); it's never copied into the idea.
  const places = usePlacesById(ideas.flatMap((i) => (i.placeId ? [i.placeId] : [])));
  const [adding, setAdding] = useState(false);

  return (
    <>
      <SectionHeader title="Ideas board"
        action={ctx.canContribute ? <Button size="regular" icon="lightbulb" onClick={() => setAdding(true)}>Add idea</Button> : undefined} />
      <SegmentControl label="Show ideas" block value={filter} onChange={setFilter} options={[
        { value: 'open', label: `To decide · ${count('open')}` },
        { value: 'approved', label: `Planned · ${count('approved')}` },
        { value: 'rejected', label: `Passed · ${count('rejected')}` },
      ]} />
      <div className={s.swipeArea}>
      <SlideSwap value={filter} id={filter} rank={FILTERS.indexOf(filter)}>{(filter) => { const shown = shownFor(filter); const top = topOf(shown); return (<div className={s.ideaList}>
      {shown.length === 0 ? (
        <EmptyState illustration="ideas" title={filter === 'open' ? 'No ideas to decide on' : 'Nothing here yet'}
          message={filter === 'open' ? 'Saw a great restaurant or tour? Add it so everyone can vote.' : undefined} />
      ) : (
        // Grouped by the Place's city (most-voted first inside each), then Links & notes for ideas with no place
        groupBy(shown, (i) => (i.placeId && places[i.placeId] ? cityOf(places[i.placeId]) : LINKS)).sort((x, y) => (x[0] === LINKS ? 1 : y[0] === LINKS ? -1 : 0)).map(([city, list]) => (
          <PageSection key={city} title={city} meta={`${list.length} idea${list.length === 1 ? '' : 's'}`}>
            <ListGroup label={city}>
              {list.map((i) => {
                const place = i.placeId ? places[i.placeId] : undefined;
                const cat = categoryInfo(i.category);
                const kind = place ? [place.kind || placeCategory(place.category).one, place.city].filter(Boolean).join(' · ') : cat.label;
                const meta = [kind, priceOf(i, trip) ? priceText(priceOf(i, trip)!) : '', i.createdBy === me.uid ? 'you' : personName(ctx.profiles, i.createdBy).split(' ')[0]].filter(Boolean).join(' · ');
                return (
                  <IdeaRow key={i.id} title={place?.name ?? i.title} meta={meta} icon={place ? placeCategory(place.category).icon : i.links.length ? 'link' : cat.icon}
                    tone={place ? placeCategory(place.category).tone : i.links.length ? undefined : categoryTone(i.category)}
                    tag={i.id === top ? { icon: 'star', label: 'Most votes' } : undefined}
                    vote={{ count: ups(i), selected: !!i.votes?.[me.uid], onClick: () => vote(i) }}
                    onClick={() => { setViewing(i); if (place) recordView(trip.id, { url: `/trip/${trip.id}/ideas?idea=${i.id}`, label: place.name, kind: 'Place' }); }} />
                );
              })}
            </ListGroup>
          </PageSection>
        ))
      )}
      </div>); }}</SlideSwap>
      </div>
      <AddIdeaSheet open={adding} ctx={ctx} onClose={() => setAdding(false)} onNew={() => { setAdding(false); setEditing('new'); }} />
      <IdeaSheet idea={live} place={live?.placeId ? places[live.placeId] : undefined} ctx={ctx} onClose={() => setViewing(null)}
        onEdit={() => { setEditing(live); setViewing(null); }}
        onSchedule={() => { setScheduling(live); setViewing(null); }} />
      <IdeaForm open={!!editing} tripId={trip.id} currency={trip.currency} idea={editing === 'new' ? undefined : editing ?? undefined} onClose={() => setEditing(null)} />
      <ActivityForm
        open={!!scheduling}
        trip={trip}
        date={trip.startDate}
        draft={scheduling ? { ...scheduling, ...(scheduling.placeId && places[scheduling.placeId] ? placeDraft(places[scheduling.placeId]) : {}) } : undefined}
        onClose={() => setScheduling(null)}
        onCreated={(activityId) => scheduling && store.updateSub(trip.id, 'ideas', scheduling.id, { status: 'approved', activityId })}
      />
    </>
  );
}

/** An event drafted from a Place: its name, where it is, and the Place it points at. */
const placeDraft = (p: SavedPlace) => ({ title: p.name, placeId: p.id, locationText: [p.name, p.city].filter(Boolean).join(', '), category: eventCategoryOf(p.category) });

/**
 * "Add idea": your saved Places from this trip's countries and cities, by city then category ("Add from saved"),
 * or a new idea. Choosing a Place adds an Idea that points at it.
 */
function AddIdeaSheet({ open, ctx, onClose, onNew }: { open: boolean; ctx: TripCtx; onClose: () => void; onNew: () => void }) {
  const me = useMe();
  const toast = useToast();
  const all = usePlaces() ?? [];
  const { visited, starred } = usePlaceMarks();
  const codes = tripCountryCodes(ctx.trip, ctx.activities);
  const added = new Set(ctx.ideas.flatMap((i) => (i.placeId ? [i.placeId] : [])));
  const fits = all.filter((p) => p.ownerId === me.uid && p.countryCode && codes.has(p.countryCode));
  const add = async (p: SavedPlace) => {
    try {
      await store.addSub(ctx.trip.id, 'ideas', { title: p.name, category: eventCategoryOf(p.category), notes: '', links: [], votes: {}, status: 'open', placeId: p.id });
      haptic('light');
      toast({ icon: 'check', label: `${p.name} added to ideas` });
    } catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  return (
    <Sheet open={open} title="Add an idea" subtitle={fits.length ? 'From your saved places, or something new' : undefined} onClose={onClose}>
      <Button tone="neutral" icon="plus" block onClick={onNew}>New idea</Button>
      {fits.length === 0 ? (
        <p className="t-body-small t-secondary">Places you save in {[...codes].map(countryName).join(' or ') || 'this trip’s countries'} show up here, ready to add.</p>
      ) : groupBy(sortPlaces(fits, visited), cityOf).map(([city, list]) => (
        <section key={city} className={s.addSection} aria-label={city}>
          <h3 className="t-heading-3">{city}</h3>
          {groupBy(list.slice().sort((a, b) => PLACE_TYPES.findIndex((t) => t.value === placeTypeOf(a.category)) - PLACE_TYPES.findIndex((t) => t.value === placeTypeOf(b.category))), (p) => placeTypeOf(p.category)).map(([type, items]) => (
            <ListGroup key={type} label={`${city}, ${PLACE_TYPES.find((t) => t.value === type)!.label}`}>
              {items.map((p) => added.has(p.id)
                ? <ListItem key={p.id} icon={placeCategory(p.category).icon} tone={placeCategory(p.category).tone} title={p.name} meta={placeCategory(p.category).one} trailing="Added" />
                : <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} starred={starred(p)} onClick={() => add(p)} />)}
            </ListGroup>
          ))}
        </section>
      ))}
    </Sheet>
  );
}

/** One idea opened: what it is (its Place, when it has one), links, who added it, comments; organizers add it to a day or pass on it. */
function IdeaSheet({ idea, place, ctx, onClose, onEdit, onSchedule }: { idea: Idea | null; place?: SavedPlace; ctx: TripCtx; onClose: () => void; onEdit: () => void; onSchedule: () => void }) {
  const me = useMe();
  const toast = useToast();
  const { visited, starred } = usePlaceMarks();
  if (!idea) return <Sheet open={false} title="" onClose={onClose}>{null}</Sheet>;
  const star = async () => {
    if (!place) return;
    haptic('light');
    const on = !starred(place);
    try { await store.starPlace(place.id, me.uid, on); toast({ icon: 'star', label: on ? 'Added to favourites' : 'Removed from favourites' }); }
    catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  const cat = categoryInfo(idea.category);
  const canEdit = ctx.canManage || idea.createdBy === me.uid;
  const setStatus = async (status: Idea['status'], label: string) => {
    try { await store.updateSub(ctx.trip.id, 'ideas', idea.id, { status }); toast({ icon: 'check', label }); onClose(); }
    catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  return (
    <Sheet open title={place?.name ?? idea.title} subtitle={[place ? [place.kind || placeCategory(place.category).one, place.city].filter(Boolean).join(' · ') : cat.label, `added by ${idea.createdBy === me.uid ? 'you' : personName(ctx.profiles, idea.createdBy)}`].filter(Boolean).join(' · ')} onClose={onClose}>
      {place?.image && <img src={place.image} alt="" className={s.ideaImage} />}
      {place && <PlaceMarks visited={visited.has(place.id)} starred={starred(place)} />}
      {priceOf(idea, ctx.trip) && <p className="t-body">Price: <PriceWithConversion price={priceOf(idea, ctx.trip)!} /></p>}
      {(idea.notes || place?.notes) && <p className="t-body">{idea.notes || place?.notes}</p>}
      <LinkChips links={idea.links} onOpen={(l) => recordView(ctx.trip.id, { url: l.url, kind: isPdf(l.url) ? 'PDF' : 'Link', label: l.label || hostOf(l.url), meta: idea.title })} />
      {place && (
        <div className={s.ideaButtons}>
          {place.url && <LinkButton href={place.url} tone="neutral" icon={isMapsLink(place.url) ? 'map' : 'arrow-up-right'} label={`Open ${place.name}`}>{isMapsLink(place.url) ? 'Open in Maps' : 'Open link'}</LinkButton>}
          <Button tone="neutral" icon="star" onClick={star}>{starred(place) ? 'Favourite' : 'Add to favourites'}</Button>
        </div>
      )}
      {ctx.canManage && idea.status === 'open' && (
        <div className={s.ideaButtons}>
          <Button tone="neutral" onClick={() => setStatus('rejected', 'Idea passed')}>Pass</Button>
          <Button icon="calendar" onClick={onSchedule}>Add to a day</Button>
        </div>
      )}
      {ctx.canManage && idea.status === 'rejected' && <Button tone="neutral" block onClick={() => setStatus('open', 'Idea back to decide')}>Back to “To decide”</Button>}
      {canEdit && <Button tone="ghost" icon="pencil" onClick={onEdit}>Edit idea</Button>}
    </Sheet>
  );
}

type Form = { title: string; category: Category; notes: string; price: PriceDraft; links: LinkItem[] };

function IdeaForm({ open, tripId, currency, idea, onClose }: { open: boolean; tripId: string; currency: string; idea?: Idea; onClose: () => void }) {
  const blank: Form = { title: '', category: 'restaurant', notes: '', price: toPriceDraft(null, currency), links: [] };
  const [f, setF] = useState<Form>(blank);
  useEffect(() => {
    if (open) setF(idea ? { title: idea.title, category: idea.category, notes: idea.notes, price: toPriceDraft(priceOf(idea, { currency }), currency), links: idea.links } : blank);
  }, [open, idea]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const toast = useToast();

  const submit = async () => {
    const data = { title: f.title.trim(), category: f.category, notes: f.notes.trim(), price: fromPriceDraft(f.price), cost: 0, links: cleanLinks(f.links) };
    try {
      if (idea) await store.updateSub(tripId, 'ideas', idea.id, data);
      else await store.addSub(tripId, 'ideas', { ...data, votes: {}, status: 'open' });
      toast({ icon: 'check', label: idea ? 'Idea saved' : 'Idea added' });
      onClose();
    } catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  const remove = async () => {
    if (!idea || !confirmAction(`Delete "${idea.title}"?`)) return;
    try { await store.deleteSub(tripId, 'ideas', idea.id); toast({ icon: 'trash', label: 'Idea deleted' }); onClose(); }
    catch { toast({ tone: 'danger', label: "Couldn't delete. Check your connection" }); }
  };

  return (
    <Sheet open={open} mode={idea ? 'edit' : 'default'} title={idea ? 'Edit idea' : 'New idea'} onClose={onClose} onSubmit={submit} submitLabel={idea ? 'Save' : 'Add'} submitDisabled={!f.title.trim()}
      secondary={idea ? <Button tone="destructive" size="large" onClick={remove}>Delete</Button> : undefined}>
      <TextField label="Idea" placeholder="Dinner at Taberna da Rua das Flores" value={f.title} onChange={(e) => set({ title: e.target.value })} />
      <Select label="Type" value={eventKind(f.category)} onChange={(e) => set({ category: e.target.value as Category })}>
        {EVENT_TYPES.filter((t) => t.value !== 'free' && t.value !== 'notes').map((t) => (
          <optgroup key={t.value} label={t.label}>{t.kinds.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</optgroup>
        ))}
      </Select>
      {!isEveryday(f.category) && <PriceField value={f.price} onChange={(price) => set({ price })} />}
      <TextArea label="Why it's great" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      <LinkEditor links={f.links} onChange={(links) => set({ links })} />
    </Sheet>
  );
}
