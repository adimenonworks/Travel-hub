import { useEffect, useState } from 'react';
import { Button, EmptyState, FieldRow, IdeaRow, ListGroup, SectionHeader, SegmentedControl, Select, Sheet, TextArea, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Category, Idea, LinkItem } from '../../data/types';
import { haptic } from '../../lib/native';
import { CATEGORIES, categoryInfo } from '../../lib/categories';
import { money } from '../../lib/format';
import { Comments } from '../shared/Comments';
import { LinkChips, LinkEditor, cleanLinks } from '../shared/Links';
import { ActivityForm } from './ActivityForm';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

type Filter = 'open' | 'approved' | 'rejected';

const ups = (i: Idea) => Object.keys(i.votes ?? {}).length;

/**
 * Trip "Ideas" tab (Figma "Trip — Ideas"): things the group might do. A Section header, the To decide · Planned ·
 * Passed segments, then a List group of Idea rows sorted by votes (the leader gets a "Most votes" tag). Tapping a
 * row opens the idea: its notes, links and comments, and (for organizers) "Add to a day" or "Pass".
 */
export function Ideas(ctx: TripCtx) {
  const { trip, ideas } = ctx;
  const me = useMe();
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<Idea | 'new' | null>(null);
  const [viewing, setViewing] = useState<Idea | null>(null);
  const [scheduling, setScheduling] = useState<Idea | null>(null);
  const toast = useToast();

  const shown = ideas
    .filter((i) => i.status === filter)
    .sort((a, b) => ups(b) - ups(a) || b.createdAt - a.createdAt);
  const count = (f: Filter) => ideas.filter((i) => i.status === f).length;
  const top = shown[0] && ups(shown[0]) > 0 && (shown.length === 1 || ups(shown[0]) > ups(shown[1])) ? shown[0].id : null;
  const vote = async (i: Idea) => {
    const mine = !!i.votes?.[me.uid];
    haptic('light');
    try { await store.setVote(trip.id, i.id, me.uid, mine ? 0 : 1); }
    catch { toast({ tone: 'error', label: "Couldn't save your vote. Check your connection" }); }
  };
  const live = viewing ? ideas.find((i) => i.id === viewing.id) ?? null : null;

  return (
    <>
      <SectionHeader title="Ideas board" meta={ctx.canManage ? 'Vote, then add the winners to a day' : 'Vote for the ones you like; organizers add the winners to a day'}
        action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setEditing('new')}>Add idea</Button>} />
      <SegmentedControl label="Show ideas" block value={filter} onChange={setFilter} options={[
        { value: 'open', label: `To decide · ${count('open')}` },
        { value: 'approved', label: `Planned · ${count('approved')}` },
        { value: 'rejected', label: `Passed · ${count('rejected')}` },
      ]} />
      {shown.length === 0 ? (
        <EmptyState illustration="ideas" title={filter === 'open' ? 'No ideas to decide on' : 'Nothing here yet'}
          message={filter === 'open' ? 'Saw a great restaurant or tour? Add it so everyone can vote.' : undefined} />
      ) : (
        <ListGroup label="Ideas">
          {shown.map((i) => {
            const cat = categoryInfo(i.category);
            const meta = [cat.label, i.cost > 0 ? `~${money(i.cost, trip.currency)}` : '', i.createdBy === me.uid ? 'you' : personName(ctx.profiles, i.createdBy).split(' ')[0]].filter(Boolean).join(' · ');
            return (
              <IdeaRow key={i.id} title={i.title} meta={meta} icon={cat.icon}
                tag={i.id === top ? { icon: 'star', label: 'Most votes' } : undefined}
                vote={{ count: ups(i), voted: !!i.votes?.[me.uid], onClick: () => vote(i) }}
                onClick={() => setViewing(i)} />
            );
          })}
        </ListGroup>
      )}
      <IdeaSheet idea={live} ctx={ctx} onClose={() => setViewing(null)}
        onEdit={() => { setEditing(live); setViewing(null); }}
        onSchedule={() => { setScheduling(live); setViewing(null); }} />
      <IdeaForm open={!!editing} tripId={trip.id} currency={trip.currency} idea={editing === 'new' ? undefined : editing ?? undefined} onClose={() => setEditing(null)} />
      <ActivityForm
        open={!!scheduling}
        trip={trip}
        date={trip.startDate}
        draft={scheduling ?? undefined}
        onClose={() => setScheduling(null)}
        onCreated={(activityId) => scheduling && store.updateSub(trip.id, 'ideas', scheduling.id, { status: 'approved', activityId })}
      />
    </>
  );
}

/** One idea opened: what it is, links, who added it, comments; organizers add it to a day or pass on it. */
function IdeaSheet({ idea, ctx, onClose, onEdit, onSchedule }: { idea: Idea | null; ctx: TripCtx; onClose: () => void; onEdit: () => void; onSchedule: () => void }) {
  const me = useMe();
  const toast = useToast();
  if (!idea) return <Sheet open={false} title="" onClose={onClose}>{null}</Sheet>;
  const cat = categoryInfo(idea.category);
  const canEdit = ctx.canManage || idea.createdBy === me.uid;
  const setStatus = async (status: Idea['status'], label: string) => {
    try { await store.updateSub(ctx.trip.id, 'ideas', idea.id, { status }); toast({ icon: 'check', label }); onClose(); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  return (
    <Sheet open title={idea.title} subtitle={[cat.label, idea.cost > 0 ? `~${money(idea.cost, ctx.trip.currency)} per person` : '', `added by ${idea.createdBy === me.uid ? 'you' : personName(ctx.profiles, idea.createdBy)}`].filter(Boolean).join(' · ')} onClose={onClose}>
      {idea.notes && <p className="t-body">{idea.notes}</p>}
      <LinkChips links={idea.links} />
      {ctx.canManage && idea.status === 'open' && (
        <div className={s.ideaButtons}>
          <Button variant="secondary" onClick={() => setStatus('rejected', 'Idea passed')}>Pass</Button>
          <Button icon="calendar" onClick={onSchedule}>Add to a day</Button>
        </div>
      )}
      {ctx.canManage && idea.status === 'rejected' && <Button variant="secondary" block onClick={() => setStatus('open', 'Idea back to decide')}>Back to “To decide”</Button>}
      {canEdit && <Button variant="ghost" icon="pencil" onClick={onEdit}>Edit idea</Button>}
      <Comments tripId={ctx.trip.id} targetId={idea.id} comments={ctx.comments} profiles={ctx.profiles} />
    </Sheet>
  );
}

type Form = { title: string; category: Category; notes: string; cost: string; links: LinkItem[] };

function IdeaForm({ open, tripId, currency, idea, onClose }: { open: boolean; tripId: string; currency: string; idea?: Idea; onClose: () => void }) {
  const blank: Form = { title: '', category: 'food', notes: '', cost: '', links: [] };
  const [f, setF] = useState<Form>(blank);
  useEffect(() => {
    if (open) setF(idea ? { title: idea.title, category: idea.category, notes: idea.notes, cost: idea.cost ? String(idea.cost) : '', links: idea.links } : blank);
  }, [open, idea]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const toast = useToast();

  const submit = async () => {
    const data = { title: f.title.trim(), category: f.category, notes: f.notes.trim(), cost: Number(f.cost) || 0, links: cleanLinks(f.links) };
    try {
      if (idea) await store.updateSub(tripId, 'ideas', idea.id, data);
      else await store.addSub(tripId, 'ideas', { ...data, votes: {}, status: 'open' });
      toast({ icon: 'check', label: idea ? 'Idea saved' : 'Idea added' });
      onClose();
    } catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  const remove = async () => {
    if (!idea || !confirm(`Delete "${idea.title}"?`)) return;
    try { await store.deleteSub(tripId, 'ideas', idea.id); toast({ icon: 'trash', label: 'Idea deleted' }); onClose(); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };

  return (
    <Sheet open={open} title={idea ? 'Edit idea' : 'New idea'} onClose={onClose} onSubmit={submit} submitLabel={idea ? 'Save' : 'Add'} submitDisabled={!f.title.trim()}>
      <TextField label="Idea" placeholder="Dinner at Taberna da Rua das Flores" value={f.title} onChange={(e) => set({ title: e.target.value })} />
      <FieldRow>
        <Select label="Type" value={f.category} onChange={(e) => set({ category: e.target.value as Category })}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <TextField label={`Est. cost pp (${currency})`} type="number" inputMode="decimal" min={0} step="any" value={f.cost} onChange={(e) => set({ cost: e.target.value })} />
      </FieldRow>
      <TextArea label="Why it's great" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      <LinkEditor links={f.links} onChange={(links) => set({ links })} />
      {idea && <Button variant="destructive" icon="trash" block onClick={remove}>Delete idea</Button>}
    </Sheet>
  );
}
