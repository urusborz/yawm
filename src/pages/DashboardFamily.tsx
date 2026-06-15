import { FormEvent, useState } from 'react';
import { CalendarClock, CircleDollarSign, Plus, ShoppingCart } from 'lucide-react';
import { Screen } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useData } from '../store';
import type { View } from '../components/Shell';
import type { QuickAddType } from '../components/QuickAdd';
import { daysUntil, formatShortDate, formatTime, viennaDate } from '../lib/dates';
import { money } from '../lib/format';

export default function DashboardFamily({ setView, onAdd }: { setView: (v: View) => void; onAdd: (t: QuickAddType) => void }) {
  const data = useData();
  const [shopTitle, setShopTitle] = useState('');

  const sharedTasks = data.tasks.filter((t) => t.scope === 'shared');
  const openBills = data.bills.filter((b) => b.status === 'open');
  const billTotal = openBills.reduce((s, b) => s + b.amount, 0);
  const nextDue = openBills.length ? Math.min(...openBills.map((b) => daysUntil(b.dueDate))) : null;
  const today = viennaDate();
  const upcomingEvents = data.events
    .filter((e) => e.scope === 'shared' && viennaDate(new Date(e.startsAt)) >= today)
    .slice(0, 4);
  const openShopping = data.shopping.filter((s) => !s.done);

  async function addShop(e: FormEvent) {
    e.preventDefault();
    if (!shopTitle.trim()) return;
    await data.createShoppingItem({ title: shopTitle.trim() });
    setShopTitle('');
  }

  return (
    <Screen>
      <header className="screen-header">
        <div>
          <span>Gemeinsam</span>
          <h1>{data.household.name}</h1>
        </div>
        <div className="avatar-stack">
          {data.household.members.slice(0, 3).map((m) => (
            <span key={m.userId} className="avatar" title={m.displayName}>{data.initialsOf(m.userId)}</span>
          ))}
        </div>
      </header>

      <section className="panel panel--accent">
        <div className="panel__header">
          <h2>Offene Rechnungen</h2>
          <button type="button" onClick={() => setView('bills')}>{nextDue === null ? 'keine' : nextDue <= 0 ? 'fällig' : `in ${nextDue} T`}</button>
        </div>
        <strong className="total">{money(billTotal)}</strong>
        <p>{openBills.length} offen · {data.bills.filter((b) => b.status === 'paid').length} bezahlt</p>
        <div className="rows rows--compact">
          {data.bills.slice(0, 4).map((b) => {
            const overdue = b.status === 'open' && daysUntil(b.dueDate) < 0;
            return (
              <button className={b.status === 'paid' ? 'bill-row bill-row--paid' : 'bill-row'} key={b.id} type="button" onClick={() => data.toggleBill(b.id)}>
                <CircleDollarSign size={20} />
                <div>
                  <strong>{b.title}</strong>
                  <span className={overdue ? 'overdue' : ''}>{formatShortDate(b.dueDate)} · {b.category}{overdue ? ' · überfällig' : ''}</span>
                </div>
                <b>{b.status === 'paid' ? 'bezahlt' : money(b.amount)}</b>
              </button>
            );
          })}
        </div>
        <button className="inline-action" type="button" onClick={() => onAdd('bill')}><Plus size={17} /> Rechnung</button>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2><CalendarClock size={17} /> Familien-Termine</h2>
          <button type="button" onClick={() => onAdd('event')}><Plus size={15} /></button>
        </div>
        <div className="rows">
          {upcomingEvents.length ? upcomingEvents.map((e) => (
            <button className="event-row" key={e.id} type="button" onClick={() => setView('calendar')}>
              <div className="date-badge">
                <strong>{new Date(e.startsAt).getDate()}</strong>
                <span>{new Intl.DateTimeFormat('de-AT', { month: 'short', timeZone: 'Europe/Vienna' }).format(new Date(e.startsAt))}</span>
              </div>
              <div><strong>{e.title}</strong><span>{formatTime(e.startsAt)}{e.location ? ` · ${e.location}` : ''}</span></div>
            </button>
          )) : <p className="muted">Keine anstehenden Termine.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header"><h2>Geteilte Aufgaben</h2><button type="button" onClick={() => onAdd('task')}><Plus size={15} /></button></div>
        <div className="rows">
          {sharedTasks.length ? sharedTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={data.toggleTask} />) : <p className="muted">Noch keine geteilten Aufgaben.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header"><h2><ShoppingCart size={17} /> Einkaufsliste</h2><span>{openShopping.length} offen</span></div>
        <form className="compose compose--inline" onSubmit={addShop}>
          <input className="field" value={shopTitle} onChange={(e) => setShopTitle(e.target.value)} placeholder="Artikel hinzufügen" />
          <button className="icon-button icon-button--solid" type="submit"><Plus size={18} /></button>
        </form>
        <div className="rows">
          {data.shopping.map((s) => (
            <div className="task-row" key={s.id}>
              <button className="task-row__main" type="button" onClick={() => data.toggleShopping(s.id)}>
                <span className={s.done ? 'task-check task-check--done' : 'task-check'}>{s.done ? '✓' : null}</span>
                <span className={s.done ? 'task-title task-title--done' : 'task-title'}>{s.title}{s.quantity ? ` · ${s.quantity}` : ''}</span>
              </button>
              <button className="delete-button" type="button" onClick={() => data.deleteShoppingItem(s.id)}>×</button>
            </div>
          ))}
        </div>
      </section>
    </Screen>
  );
}
