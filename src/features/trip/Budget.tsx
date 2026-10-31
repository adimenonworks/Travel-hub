import { useEffect, useState } from 'react';
import { BudgetCard, Button, useLarge, FieldRow, List, ListRow, Section, Select, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Category, Expense } from '../../data/types';
import { dayWord, formatDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { CATEGORIES, categoryInfo } from '../../lib/categories';
import { tripBudget } from './tripBudget';
import type { TripCtx } from './TripPage';

/**
 * Figma "Budget card" under the trip header: the chosen day's budget (worked out from the trip's total) and the total.
 * Its button: "Add budget" (no total yet) opens Edit trip; "Edit today's budget" sets the shown day's own budget,
 * and the other days re-share what's left. Organizers only, like the total.
 */
export function TripBudget({ ctx, day, onSetBudget }: { ctx: TripCtx; day: string; onSetBudget?: () => void }) {
  const { trip, expenses, profiles, canManage } = ctx;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [amount, setAmount] = useState('');
  const large = useLarge();
  const b = tripBudget(ctx);
  const fmt = (n: number) => money(n, trip.currency);
  const t = today();
  const word = dayWord(day, trip.startDate, t);
  const whose = day === t ? 'today’s' : `${word === 'Tomorrow' || word === 'Yesterday' ? word.toLowerCase() : word}’s`;
  const size = large ? 'regular' : 'small';
  const d = b.forDay(day);
  const openEditor = () => { setAmount(String(d.daily)); setOpen(true); };

  const card = b.total > 0 ? (() => {
    const when = day === t ? 'today' : word === 'Tomorrow' || word === 'Yesterday' ? word.toLowerCase() : `on ${word}`;
    return <BudgetCard amount={fmt(Math.abs(d.left))} label={d.left < 0 ? `Over ${when}` : `Left ${when}`} total={fmt(b.total)} level={d.level}
      action={canManage && <Button variant="secondary" size={size} icon="pencil" onClick={openEditor}>Edit {whose} budget</Button>} />;
  })() : (
    <BudgetCard amount={fmt(b.planned)} label="Planned so far" total="No total set" level="ok"
      action={onSetBudget && <Button variant="secondary" size={size} icon="pencil" onClick={onSetBudget}>Add budget</Button>} />
  );

  const save = async () => {
    const n = Number(amount);
    const next = { ...b.fixed };
    if (amount.trim() === '' || !(n >= 0)) delete next[day]; else next[day] = n;
    await store.updateTrip(trip.id, { dayBudgets: next });
    setOpen(false);
  };
  const days = tripDays(trip.startDate, trip.endDate);
  return (
    <div id="budget">
      {card}
      <Sheet open={open} title={`${whose[0].toUpperCase()}${whose.slice(1)} budget`} onClose={() => setOpen(false)} onSubmit={save} submitLabel="Save">
        <TextField label={`Budget for ${day === t ? 'today' : word} (${trip.currency})`} type="number" inputMode="decimal" min={0} step="any"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          hint="For the whole group. The other days share what's left of the total. Leave it empty to go back to the worked-out amount." />
        <p className="t-body t-secondary">
          {fmt(b.planned)} planned{b.total > 0 ? ` of ${fmt(b.total)}` : ''} for the whole group.
          {b.total > 0 ? ' Each day gets what’s left of the total, shared over the days still to come.' : ''}
        </p>
        <Section title="Day by day">
          <List>
            {days.map((d) => {
              const x = b.forDay(d);
              return (
                <ListRow key={d} title={dayWord(d, trip.startDate, t)} subtitle={formatDay(d)}
                  trailing={<span className={['t-num', x.left < 0 && b.total > 0 ? 't-danger' : ''].join(' ')}>
                    {b.total > 0 ? (x.left < 0 ? `${fmt(-x.left)} over` : `${fmt(x.left)} left`) : fmt(x.daily - x.left)}
                  </span>} />
              );
            })}
          </List>
        </Section>
        <Section title="Other expenses" action={<Button size="small" icon="plus" onClick={() => { setOpen(false); setEditing('new'); }}>Add expense</Button>}
          footer="Event prices come from the itinerary. Add flights, hotels, car hire and anything else here.">
          {expenses.length === 0 ? <p className="t-body-small t-secondary">No expenses yet.</p> : (
            <List>
              {expenses.slice().sort((x, y) => (x.date || '0').localeCompare(y.date || '0')).map((e) => (
                <ListRow key={e.id} icon={categoryInfo(e.category).icon} title={e.title}
                  subtitle={`${e.date ? formatDay(e.date) : 'Whole trip'} · paid by ${personName(profiles, e.paidBy)}`}
                  trailing={<span className="t-num">{fmt(e.amount)}</span>} chevron onClick={() => { setOpen(false); setEditing(e); }} />
              ))}
            </List>
          )}
        </Section>
      </Sheet>
      <ExpenseForm open={!!editing} ctxTrip={{ id: trip.id, currency: trip.currency, startDate: trip.startDate, endDate: trip.endDate, memberIds: trip.memberIds }}
        profiles={profiles} expense={editing === 'new' ? undefined : editing ?? undefined} onClose={() => { setEditing(null); setOpen(true); }} />
    </div>
  );
}

type Form = { title: string; amount: string; category: Category; date: string; paidBy: string };

function ExpenseForm({ open, ctxTrip, profiles, expense, onClose }: {
  open: boolean;
  ctxTrip: { id: string; currency: string; startDate: string; endDate: string; memberIds: string[] };
  profiles: TripCtx['profiles'];
  expense?: Expense;
  onClose: () => void;
}) {
  const me = useMe();
  const [f, setF] = useState<Form>({ title: '', amount: '', category: 'stay', date: '', paidBy: me.uid });
  useEffect(() => {
    if (open) setF(expense ? { title: expense.title, amount: String(expense.amount), category: expense.category, date: expense.date, paidBy: expense.paidBy } : { title: '', amount: '', category: 'stay', date: '', paidBy: me.uid });
  }, [open, expense, me.uid]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const submit = async () => {
    const data = { title: f.title.trim(), amount: Number(f.amount) || 0, category: f.category, date: f.date, paidBy: f.paidBy };
    if (expense) await store.updateSub(ctxTrip.id, 'expenses', expense.id, data);
    else await store.addSub(ctxTrip.id, 'expenses', data);
    onClose();
  };

  return (
    <Sheet open={open} title={expense ? 'Edit expense' : 'New expense'} onClose={onClose} onSubmit={submit} submitLabel={expense ? 'Save' : 'Add'} submitDisabled={!f.title.trim() || !(Number(f.amount) > 0)}>
      <TextField label="What" placeholder="Airbnb in Alfama" value={f.title} onChange={(e) => set({ title: e.target.value })} />
      <FieldRow>
        <TextField label={`Total amount (${ctxTrip.currency})`} type="number" inputMode="decimal" min={0} step="any" value={f.amount} onChange={(e) => set({ amount: e.target.value })} />
        <Select label="Type" value={f.category} onChange={(e) => set({ category: e.target.value as Category })}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      </FieldRow>
      <FieldRow>
        <Select label="Day" value={f.date} onChange={(e) => set({ date: e.target.value })}>
          <option value="">Whole trip</option>
          {tripDays(ctxTrip.startDate, ctxTrip.endDate).map((d) => <option key={d} value={d}>{dayWord(d, ctxTrip.startDate)} · {formatDay(d)}</option>)}
        </Select>
        <Select label="Paid by" value={f.paidBy} onChange={(e) => set({ paidBy: e.target.value })}>
          {ctxTrip.memberIds.map((id) => <option key={id} value={id}>{id === me.uid ? 'Me' : personName(profiles, id)}</option>)}
        </Select>
      </FieldRow>
      {expense && (
        <Button variant="destructive" icon="trash" block onClick={async () => { await store.deleteSub(ctxTrip.id, 'expenses', expense.id); onClose(); }}>Delete expense</Button>
      )}
    </Sheet>
  );
}

