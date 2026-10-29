import { useEffect, useState, type CSSProperties } from 'react';
import { Button, Card, FieldRow, List, ListRow, SegmentedControl, Section, Select, Sheet, TextField } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Category, Expense } from '../../data/types';
import { formatDay, tripDays } from '../../lib/dates';
import { money } from '../../lib/format';
import { CATEGORIES, categoryInfo } from '../../lib/categories';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

type View = 'me' | 'group';

/**
 * Activity costs are per person (counted for each attendee). Expenses are
 * group totals split evenly across members. The daily budget is per person.
 */
/** Categories have no colours of their own, so the chart uses shades of the brand ink (largest category darkest). */
const shade = (i: number) => Math.max(0.25, 1 - i * 0.18);

export function Budget({ trip, activities, expenses, profiles, canManage }: TripCtx) {
  const me = useMe();
  const [view, setView] = useState<View>('me');
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const days = tripDays(trip.startDate, trip.endDate);
  const members = Math.max(1, trip.memberIds.length);

  const activityCost = (a: (typeof activities)[number]) =>
    view === 'group' ? a.cost * a.attendeeIds.length : a.attendeeIds.includes(me.uid) ? a.cost : 0;
  const expenseCost = (e: Expense) => (view === 'group' ? e.amount : e.amount / members);

  const perDay = days.map((d) => ({
    date: d,
    total: activities.filter((a) => a.date === d).reduce((n, a) => n + activityCost(a), 0) + expenses.filter((e) => e.date === d).reduce((n, e) => n + expenseCost(e), 0),
  }));
  const tripWide = expenses.filter((e) => !e.date || !days.includes(e.date)).reduce((n, e) => n + expenseCost(e), 0);
  const total = perDay.reduce((n, d) => n + d.total, 0) + tripWide;
  const dayLimit = view === 'group' ? trip.dailyBudget * members : trip.dailyBudget;
  const budgetTotal = dayLimit * days.length;
  const scaleMax = Math.max(dayLimit, ...perDay.map((d) => d.total), 1);

  const byCat = new Map<Category, number>();
  activities.forEach((a) => byCat.set(a.category, (byCat.get(a.category) ?? 0) + activityCost(a)));
  expenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + expenseCost(e)));
  const cats = [...byCat.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const fmt = (n: number) => money(n, trip.currency);

  return (
    <>
      <div className={s.dayHead}>
        <h2 className="t-title1">Budget</h2>
        <SegmentedControl label="Budget view" value={view} onChange={setView} options={[{ value: 'me', label: 'My share' }, { value: 'group', label: 'Whole group' }]} />
      </div>

      <div className={s.stats}>
        <Card tone="accent" className={s.stat}><span className={s.statLabel}>Planned spend</span><span className={s.statValue}>{fmt(total)}</span></Card>
        <Card className={s.stat}><span className={s.statLabel}>Budget</span><span className={s.statValue}>{budgetTotal ? fmt(budgetTotal) : '—'}</span></Card>
        <Card className={s.stat}>
          <span className={s.statLabel}>{budgetTotal && total > budgetTotal ? 'Over by' : 'Left'}</span>
          <span className={[s.statValue, budgetTotal && total > budgetTotal ? s.over : ''].join(' ')}>{budgetTotal ? fmt(Math.abs(budgetTotal - total)) : '—'}</span>
        </Card>
        <Card className={s.stat}><span className={s.statLabel}>Daily budget</span><span className={s.statValue}>{dayLimit ? fmt(dayLimit) : '—'}</span></Card>
      </div>

      <Section title="Day by day" footer={dayLimit ? 'The line marks the daily budget.' : canManage ? 'Set a daily budget from Edit trip to compare each day.' : undefined}>
        <Card className={s.bars}>
          {perDay.map((d, i) => {
            const over = dayLimit > 0 && d.total > dayLimit;
            return (
              <div key={d.date} className={s.barRow}>
                <span className="t-secondary">Day {i + 1}<br /><span className="t-caption1">{formatDay(d.date, { month: 'short', day: 'numeric' })}</span></span>
                <div className={s.barTrack} role="img" aria-label={`Day ${i + 1}: ${fmt(d.total)}`}>
                  <div className={s.barFill} style={{ width: `${(d.total / scaleMax) * 100}%`, '--bar-color': over ? 'var(--status-error)' : 'var(--icon-brand)' } as CSSProperties} />
                  {dayLimit > 0 && <div className={s.barLimit} style={{ left: `calc(${(dayLimit / scaleMax) * 100}% - 1px)` }} />}
                </div>
                <span className={[s.barValue, over && s.over].filter(Boolean).join(' ')}>{fmt(d.total)}</span>
              </div>
            );
          })}
          {tripWide > 0 && (
            <div className={s.barRow}>
              <span className="t-secondary">Trip-wide</span>
              <span className="t-footnote t-secondary">Flights, stays and other costs not tied to a day</span>
              <span className={s.barValue}>{fmt(tripWide)}</span>
            </div>
          )}
        </Card>
      </Section>

      {cats.length > 0 && (
        <Section title="By category">
          <Card className={s.bars}>
            <div className={s.cats}>
              {cats.map(([c, v], i) => <div key={c} style={{ flex: v, background: 'var(--icon-brand)', opacity: shade(i) }} title={`${categoryInfo(c).label}: ${fmt(v)}`} />)}
            </div>
            <div className={s.legend}>
              {cats.map(([c, v], i) => <span key={c}><i style={{ background: 'var(--icon-brand)', opacity: shade(i) }} />{categoryInfo(c).label} {fmt(v)}</span>)}
            </div>
          </Card>
        </Section>
      )}

      <Section title="Other expenses" action={<Button size="small" icon="plus" onClick={() => setEditing('new')}>Add expense</Button>}
        footer="Activity prices come from the itinerary. Add flights, hotels, car hire and anything else here; they're split evenly across the group.">
        {expenses.length === 0 ? (
          <Card><span className="t-subhead t-secondary">No expenses yet.</span></Card>
        ) : (
          <List>
            {expenses.slice().sort((a, b) => (a.date || '0').localeCompare(b.date || '0')).map((e) => {
              const c = categoryInfo(e.category);
              return (
                <ListRow key={e.id} icon={c.icon} title={e.title}
                  subtitle={`${e.date ? formatDay(e.date) : 'Whole trip'} · paid by ${personName(profiles, e.paidBy)}`}
                  trailing={<span className="t-num">{fmt(e.amount)}</span>} chevron onClick={() => setEditing(e)} />
              );
            })}
          </List>
        )}
      </Section>

      <ExpenseForm open={!!editing} ctxTrip={{ id: trip.id, currency: trip.currency, startDate: trip.startDate, endDate: trip.endDate, memberIds: trip.memberIds }}
        profiles={profiles} expense={editing === 'new' ? undefined : editing ?? undefined} onClose={() => setEditing(null)} />
    </>
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
          {tripDays(ctxTrip.startDate, ctxTrip.endDate).map((d, i) => <option key={d} value={d}>Day {i + 1} · {formatDay(d)}</option>)}
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

