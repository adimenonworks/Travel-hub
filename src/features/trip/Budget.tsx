import { useEffect, useState } from 'react';
import { BudgetCard, Button, IconButton, useToast, FieldRow, ListGroup, ListItem, PageSection, Select, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Category, Expense } from '../../data/types';
import { dayWord, formatDay, today, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { CATEGORIES, categoryInfo } from '../../lib/categories';
import { tripBudget } from './tripBudget';
import type { TripCtx } from './TripPage';

/**
 * Figma "Budget card" on the trip's Overview. Planning (before and after the trip): what it costs so far (flights,
 * stays, planned activities and food) and the spending money left. During: today's planned spend against the day's
 * budget (worked out from the trip's total). "Details" opens the budgets sheet, where organizers can set a day's own
 * budget (today and later) or correct what was spent (past days), and add costs that aren't events.
 */
export function TripBudget({ ctx, day, onSetBudget }: { ctx: TripCtx; day: string; onSetBudget?: () => void }) {
  const { trip, expenses, profiles, canManage } = ctx;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [dayEdit, setDayEdit] = useState<string | null>(null);
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const b = tripBudget(ctx);
  const fmt = (n: number) => money(n, trip.currency);
  const t = today();
  const word = (d: string) => dayWord(d, trip.startDate, t);
  const lower = (w: string) => (w === 'Today' || w === 'Tomorrow' || w === 'Yesterday' ? w.toLowerCase() : w);
  const d = b.forDay(day);

  // Figma "Budget card": Phase During (today, while the trip is on) or Planning (before and after it).
  const during = day === t && t >= trip.startDate && t <= trip.endDate;
  const details = <Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setOpen(true)}>Details</Button>;
  const card = during ? (
    <BudgetCard label="Today" amount={b.total > 0 ? `${fmt(d.spent)} of ${fmt(d.daily)}` : fmt(d.spent)} action={details}
      segments={[
        { label: 'Planned today', value: fmt(d.spent), amount: d.spent, color: 'orange' },
        ...(b.total > 0 ? [
          { label: d.left < 0 ? 'Over today' : 'Left today', value: fmt(Math.abs(d.left)), amount: Math.max(0, d.left), color: 'empty' as const },
          { label: 'Left for the trip', value: fmt(b.total - b.planned), amount: 0, color: 'empty' as const },
        ] : []),
      ]}
      note={d.level !== 'ok' && b.total > 0 ? <p className={d.level === 'over' ? 't-body-small t-danger' : 't-body-small t-secondary'}>{d.level === 'over' ? 'Today’s plans are over the daily budget.' : 'Less than half of today’s budget is left.'}</p> : undefined} />
  ) : (
    <BudgetCard label="Trip cost so far" amount={fmt(b.planned)} action={details}
      segments={[
        { label: 'Flights', value: fmt(b.flights), amount: b.flights, color: 'brand' },
        { label: 'Stays', value: fmt(b.stays), amount: b.stays, color: 'mid' },
        { label: 'Planned activities & food', value: fmt(b.plans), amount: b.plans, color: 'orange' },
        ...(b.total > 0
          ? [{ label: 'Spending money left', value: `${fmt(Math.max(0, b.total - b.planned))} of ${fmt(b.total)}`, amount: Math.max(0, b.total - b.planned), color: 'empty' as const }]
          : []),
      ]}
      note={b.total === 0 && onSetBudget ? <Button variant="secondary" size="regular" icon="plus" onClick={onSetBudget}>Add a budget</Button> : undefined} />
  );

  // One day's editor: a past day corrects what was spent; today and later set the day's own budget.
  const past = !!dayEdit && dayEdit < t;
  const editDay = (x: string) => { const f = b.forDay(x); setAmount(String(x < t ? f.spent : f.daily)); setOpen(false); setDayEdit(x); };
  const closeDay = () => { setDayEdit(null); setOpen(true); };
  const saveDay = async () => {
    if (!dayEdit) return;
    const n = Number(amount);
    const next = { ...(past ? trip.daySpent : trip.dayBudgets) };
    if (amount.trim() === '' || !(n >= 0)) delete next[dayEdit]; else next[dayEdit] = n;
    try {
      await store.updateTrip(trip.id, past ? { daySpent: next } : { dayBudgets: next });
      toast({ icon: 'check', label: 'Budget updated' });
      closeDay();
    } catch {
      toast({ tone: 'error', label: "Couldn't save. Check your connection" });
    }
  };

  const days = tripDays(trip.startDate, trip.endDate);
  return (
    <div id="budget">
      {card}
      <Sheet open={open} title="Budget" subtitle="For the whole group" onClose={() => setOpen(false)}>
        <p className="t-body t-secondary">
          {fmt(b.planned)} planned{b.total > 0 ? ` of ${fmt(b.total)}` : ''} for the whole group.
          {b.total > 0 ? ' Each day gets what’s left of the total, shared over the days still to come.' : ''}
        </p>
        <PageSection title="Day by day">
          <ListGroup label="Day by day">
            {days.map((x) => {
              const f = b.forDay(x);
              const isPast = x < t;
              return (
                <ListItem key={x} title={word(x)} meta={`${formatDay(x)} · ${isPast ? `${fmt(f.spent)} used` : b.total > 0 ? (f.left < 0 ? `${fmt(-f.left)} over` : `${fmt(f.left)} left`) : `${fmt(f.spent)} planned`}`}
                  trailing={canManage ? <IconButton icon="pencil" label={isPast ? `Edit what was spent ${lower(word(x))}` : `Edit ${lower(word(x))}’s budget`} onClick={() => editDay(x)} /> : undefined} />
              );
            })}
          </ListGroup>
        </PageSection>
        <PageSection title="Other costs" meta="Bookings that aren’t events: choose Flight or Stay so they count in the right place"
          action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => { setOpen(false); setEditing('new'); }}>Add cost</Button>}>
          {expenses.length === 0 ? <p className="t-body-small t-secondary">Nothing yet. Event prices come from the itinerary.</p> : (
            <ListGroup label="Other costs">
              {expenses.slice().sort((x, y) => (x.date || '0').localeCompare(y.date || '0')).map((e) => (
                <ListItem key={e.id} icon={categoryInfo(e.category).icon} title={e.title}
                  meta={`${e.date ? formatDay(e.date) : 'Whole trip'} · paid by ${personName(profiles, e.paidBy)}`}
                  trailing={fmt(e.amount)} onClick={() => { setOpen(false); setEditing(e); }} />
              ))}
            </ListGroup>
          )}
        </PageSection>
      </Sheet>
      <Sheet open={!!dayEdit} title={dayEdit ? (past ? `Spent ${lower(word(dayEdit))}` : `${word(dayEdit)}’s budget`) : ''} onClose={closeDay} onSubmit={saveDay} submitLabel="Save">
        {dayEdit && (past ? (
          <TextField label={`Spent ${lower(word(dayEdit))} (${trip.currency})`} type="number" inputMode="decimal" min={0} step="any"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            hint="What the whole group actually spent that day. The days still to come re-share what's left. Leave it empty to go back to the amount worked out from events and expenses." />
        ) : (
          <TextField label={`Budget for ${lower(word(dayEdit))} (${trip.currency})`} type="number" inputMode="decimal" min={0} step="any"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            hint="For the whole group. The other days share what's left of the total. Leave it empty to go back to the worked-out amount." />
        ))}
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
  const toast = useToast();
  const [f, setF] = useState<Form>({ title: '', amount: '', category: 'stay', date: '', paidBy: me.uid });
  useEffect(() => {
    if (open) setF(expense ? { title: expense.title, amount: String(expense.amount), category: expense.category, date: expense.date, paidBy: expense.paidBy } : { title: '', amount: '', category: 'stay', date: '', paidBy: me.uid });
  }, [open, expense, me.uid]);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const submit = async () => {
    const data = { title: f.title.trim(), amount: Number(f.amount) || 0, category: f.category, date: f.date, paidBy: f.paidBy };
    try {
      if (expense) await store.updateSub(ctxTrip.id, 'expenses', expense.id, data);
      else await store.addSub(ctxTrip.id, 'expenses', data);
      toast({ icon: 'check', label: expense ? 'Expense saved' : 'Expense added' });
      onClose();
    } catch {
      toast({ tone: 'error', label: "Couldn't save. Check your connection" });
    }
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
        <Button variant="destructive" icon="trash" block onClick={async () => {
          try { await store.deleteSub(ctxTrip.id, 'expenses', expense.id); toast({ icon: 'trash', label: 'Expense deleted' }); onClose(); }
          catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
        }}>Delete expense</Button>
      )}
    </Sheet>
  );
}

