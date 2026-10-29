import { useEffect, useState } from 'react';
import { Avatar, Badge, Button, Card, EmptyState, FieldRow, Icon, IconButton, SegmentedControl, Select, Sheet, TextArea, TextField } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Category, Idea, LinkItem, Vote } from '../../data/types';
import { CATEGORIES, categoryInfo } from '../../lib/categories';
import { money } from '../../lib/format';
import { Comments } from '../shared/Comments';
import { LinkChips, LinkEditor, cleanLinks } from '../shared/Links';
import { ActivityForm } from './ActivityForm';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

type Filter = 'open' | 'approved' | 'rejected';

const ups = (i: Idea) => Object.keys(i.votes ?? {}).length;
const downs = (i: Idea) => Object.keys(i.downvotes ?? {}).length;
/** Ideas are ranked by thumbs up minus thumbs down. */
const score = (i: Idea) => ups(i) - downs(i);

export function Ideas(ctx: TripCtx) {
  const { trip, ideas } = ctx;
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<Idea | 'new' | null>(null);
  const [scheduling, setScheduling] = useState<Idea | null>(null);

  const shown = ideas
    .filter((i) => i.status === filter)
    .sort((a, b) => score(b) - score(a) || b.createdAt - a.createdAt);
  const count = (f: Filter) => ideas.filter((i) => i.status === f).length;

  return (
    <>
      <div className={s.dayHead}>
        <div>
          <h2 className="t-title1">Ideas board</h2>
          <div className={s.dayBudget}>Drop ideas, vote, and {ctx.canManage ? 'approve the winners into the itinerary' : 'organizers will schedule the winners'}.</div>
        </div>
        <Button icon="plus" onClick={() => setEditing('new')}>Add idea</Button>
      </div>
      <SegmentedControl label="Filter ideas" value={filter} onChange={setFilter} options={[
        { value: 'open', label: `Open (${count('open')})` },
        { value: 'approved', label: `Approved (${count('approved')})` },
        { value: 'rejected', label: `Passed (${count('rejected')})` },
      ]} />
      {shown.length === 0 ? (
        <Card>
          <EmptyState icon="lightbulb" title={filter === 'open' ? 'No open ideas' : 'Nothing here yet'}
            message={filter === 'open' ? 'Saw a great restaurant or tour? Add it so everyone can vote.' : undefined}
            action={filter === 'open' && <Button variant="tinted" icon="plus" onClick={() => setEditing('new')}>Add idea</Button>} />
        </Card>
      ) : (
        <div className={s.ideaGrid}>
          {shown.map((i) => <IdeaCard key={i.id} idea={i} ctx={ctx} onEdit={() => setEditing(i)} onApprove={() => setScheduling(i)} />)}
        </div>
      )}
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

function IdeaCard({ idea, ctx, onEdit, onApprove }: { idea: Idea; ctx: TripCtx; onEdit: () => void; onApprove: () => void }) {
  const me = useMe();
  const [showComments, setShowComments] = useState(false);
  const cat = categoryInfo(idea.category);
  const mine: Vote = idea.votes?.[me.uid] ? 1 : idea.downvotes?.[me.uid] ? -1 : 0;
  const vote = (v: 1 | -1) => store.setVote(ctx.trip.id, idea.id, me.uid, mine === v ? 0 : v);
  const nComments = ctx.comments.filter((c) => c.targetId === idea.id).length;
  const canEdit = ctx.canManage || idea.createdBy === me.uid;
  const author = personName(ctx.profiles, idea.createdBy);

  return (
    <Card className={s.idea}>
      <div className={s.actTop}>
        <div className={s.actMeta}>
          <Badge tone="category" icon={cat.icon}>{cat.label}</Badge>
          {idea.cost > 0 && <Badge>~{money(idea.cost, ctx.trip.currency)}</Badge>}
          {idea.status === 'approved' && <Badge tone="success" icon="check">Scheduled</Badge>}
        </div>
        {canEdit && <IconButton icon="pencil" size="small" label={`Edit ${idea.title}`} onClick={onEdit} />}
      </div>
      <h3 className="t-title3">{idea.title}</h3>
      {idea.notes && <div className={s.actNotes}>{idea.notes}</div>}
      <LinkChips links={idea.links} />
      <div className={s.ideaFoot}>
        <div className={s.votes} role="group" aria-label="Votes">
          <button type="button" className={s.vote} aria-pressed={mine === 1} onClick={() => vote(1)}
            aria-label={`Thumbs up, ${ups(idea)} ${ups(idea) === 1 ? 'vote' : 'votes'}`}>
            <Icon name="thumbs-up" size={16} />{ups(idea)}
          </button>
          <button type="button" className={s.vote} aria-pressed={mine === -1} onClick={() => vote(-1)}
            aria-label={`Thumbs down, ${downs(idea)} ${downs(idea) === 1 ? 'vote' : 'votes'}`}>
            <Icon name="thumbs-down" size={16} />{downs(idea)}
          </button>
        </div>
        <Button size="small" variant="plain" icon="chat" onClick={() => setShowComments((v) => !v)} aria-expanded={showComments} aria-label={`Comments (${nComments})`}>{nComments || ''}</Button>
        <span className={s.spacer} />
        <Avatar name={author} photo={ctx.profiles[idea.createdBy]?.photo} seed={idea.createdBy} size={22} />
        {ctx.canManage && idea.status === 'open' && (
          <>
            <IconButton icon="x" size="small" variant="gray" label="Pass on this idea" onClick={() => store.updateSub(ctx.trip.id, 'ideas', idea.id, { status: 'rejected' })} />
            <Button size="small" icon="calendar" onClick={onApprove}>Approve</Button>
          </>
        )}
        {ctx.canManage && idea.status === 'rejected' && (
          <Button size="small" variant="gray" onClick={() => store.updateSub(ctx.trip.id, 'ideas', idea.id, { status: 'open' })}>Reopen</Button>
        )}
      </div>
      {showComments && <Comments tripId={ctx.trip.id} targetId={idea.id} comments={ctx.comments} profiles={ctx.profiles} />}
    </Card>
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

  const submit = async () => {
    const data = { title: f.title.trim(), category: f.category, notes: f.notes.trim(), cost: Number(f.cost) || 0, links: cleanLinks(f.links) };
    if (idea) await store.updateSub(tripId, 'ideas', idea.id, data);
    else await store.addSub(tripId, 'ideas', { ...data, votes: {}, status: 'open' });
    onClose();
  };
  const remove = async () => {
    if (!idea || !confirm(`Delete "${idea.title}"?`)) return;
    await store.deleteSub(tripId, 'ideas', idea.id);
    onClose();
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
