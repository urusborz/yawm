import { FormEvent, useState } from 'react';
import { CalendarClock, Check, CircleDollarSign, ClipboardCheck, Copy, Plus, ShoppingCart, Trash2, UserPlus } from 'lucide-react';
import { EmptyState, Screen, Segmented, Sheet } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useData } from '../store';
import type { View } from '../components/Shell';
import type { QuickAddType } from '../components/QuickAdd';
import { addDays, daysUntil, formatShortDate, formatTime, viennaDate } from '../lib/dates';
import { money } from '../lib/format';
import { SHOPPING_CATEGORIES, type Priority } from '../types';

function localToISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function DashboardFamily({ setView, onAdd }: { setView: (v: View) => void; onAdd: (t: QuickAddType) => void }) {
  const data = useData();
  const [shopTitle, setShopTitle] = useState('');
  const [shopQty, setShopQty] = useState('');
  const [shopCat, setShopCat] = useState<string>('Lebensmittel');
  const [copied, setCopied] = useState(false);
  const [eventSheet, setEventSheet] = useState(false);
  const [taskSheet, setTaskSheet] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(viennaDate());
  const [eventTime, setEventTime] = useState('18:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventFor, setEventFor] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('normal');

  const today = viennaDate();
  const weekEnd = addDays(today, 7);
  const sharedTasks = data.tasks.filter((t) => t.scope === 'shared');
  const openBills = data.bills.filter((b) => b.status === 'open');
  const billTotal = openBills.reduce((s, b) => s + b.amount, 0);
  const nextDue = openBills.length ? Math.min(...openBills.map((b) => daysUntil(b.dueDate))) : null;
  const upcomingEvents = data.events.filter((e) => e.scope === 'shared' && viennaDate(new Date(e.startsAt)) >= today).slice(0, 4);
  const openShopping = data.shopping.filter((s) => !s.done);
  const doneShopping = data.shopping.filter((s) => s.done);
  const soloMember = data.household.members.length < 2;

  const weekEvents = data.events.filter((e) => e.scope === 'shared' && viennaDate(new Date(e.startsAt)) >= today && viennaDate(new Date(e.startsAt)) <= weekEnd).length;
  const weekBills = openBills.filter((b) => b.dueDate <= weekEnd).reduce((s, b) => s + b.amount, 0);
  const openSharedTasks = sharedTasks.filter((t) => !t.done).length;

  async function addShop(e: FormEvent) {
    e.preventDefault();
    if (!shopTitle.trim()) return;
    await data.createShoppingItem({ title: shopTitle.trim(), quantity: shopQty.trim() || undefined, category: shopCat });
    setShopTitle('');
    setShopQty('');
  }

  async function addFamilyEvent(e: FormEvent) {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    await data.createEvent({ title: eventTitle.trim(), startsAt: localToISO(eventDate, eventTime), location: eventLocation.trim() || undefined, forLabel: eventFor.trim() || undefined, scope: 'shared' });
    setEventTitle('');
    setEventLocation('');
    setEventFor('');
    setEventSheet(false);
  }

  async function addSharedTask(e: FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await data.createTask({ title: taskTitle.trim(), scope: 'shared', priority: taskPriority });
    setTaskTitle('');
    setTaskPriority('normal');
    setTaskSheet(false);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.household.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function clearDone() {
    doneShopping.forEach((s) => data.deleteShoppingItem(s.id));
  }

  return (
    <Screen>
      <header className="screen-header">
        <div><span>Gemeinsam</span><h1>{data.household.name}</h1></div>
        <div className="avatar-stack">
          {data.household.members.slice(0, 3).map((m) => <span key={m.userId} className="avatar" title={m.displayName}>{data.initialsOf(m.userId)}</span>)}
        </div>
      </header>

      <section className="family-overview">
        <button type="button" onClick={() => setView('calendar')}>
          <CalendarClock size={16} /><b>{weekEvents}</b><span>Termine</span>
        </button>
        <button type="button" onClick={() => setView('bills')}>
          <CircleDollarSign size={16} /><b>{money(weekBills)}</b><span>fällig</span>
        </button>
        <button type="button" onClick={() => setTaskSheet(true)}>
          <ClipboardCheck size={16} /><b>{openSharedTasks}</b><span>Tasks</span>
        </button>
      </section>

      {soloMember ? (
        <button className="invite-card" type="button" onClick={copyCode}>
          <UserPlus size={20} />
          <div><strong>Frau einladen</strong><span>Code <b>{data.household.joinCode}</b> teilen</span></div>
          <span className="invite-card__copy">{copied ? <Check size={18} /> : <Copy size={18} />}</span>
        </button>
      ) : null}

      <section className="panel">
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
                <div><strong>{b.title}</strong><span className={overdue ? 'overdue' : ''}>{formatShortDate(b.dueDate)} · {b.category}{overdue ? ' · überfällig' : ''}</span></div>
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
          <button type="button" onClick={() => setEventSheet(true)}><Plus size={15} /></button>
        </div>
        <div className="rows">
          {upcomingEvents.length ? upcomingEvents.map((e) => (
            <button className="event-row" key={e.id} type="button" onClick={() => setView('calendar')}>
              <div className="date-badge"><strong>{new Date(e.startsAt).getDate()}</strong><span>{new Intl.DateTimeFormat('de-AT', { month: 'short', timeZone: 'Europe/Vienna' }).format(new Date(e.startsAt))}</span></div>
              <div><strong>{e.title}</strong><span>{formatTime(e.startsAt)}{e.location ? ` · ${e.location}` : ''}</span></div>
            </button>
          )) : <EmptyState icon={<CalendarClock size={24} />} title="Noch keine Termine" hint="Plane den nächsten gemeinsamen Termin." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2><ClipboardCheck size={17} /> Geteilte Aufgaben</h2>
          <button type="button" onClick={() => setTaskSheet(true)}><Plus size={15} /></button>
        </div>
        <div className="rows">
          {sharedTasks.length ? sharedTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={data.toggleTask} />) : <EmptyState icon={<ClipboardCheck size={24} />} title="Nichts Gemeinsames offen" hint="Lege eine Aufgabe an, die beide sehen sollen." />}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2><ShoppingCart size={17} /> Einkaufsliste</h2>
          {doneShopping.length ? <button type="button" onClick={clearDone}>{doneShopping.length} aufräumen</button> : <span>{openShopping.length} offen</span>}
        </div>
        <div className="chip-row shop-cat-row">
          {SHOPPING_CATEGORIES.map((c) => (
            <button key={c} type="button" className={shopCat === c ? 'chip chip--active' : 'chip'} onClick={() => setShopCat(c)}>{c}</button>
          ))}
        </div>
        <form className="shop-compose" onSubmit={addShop}>
          <input className="field" value={shopTitle} onChange={(e) => setShopTitle(e.target.value)} placeholder="Artikel" />
          <input className="field field--qty" value={shopQty} onChange={(e) => setShopQty(e.target.value)} placeholder="Menge" />
          <button className="icon-button--solid shop-add-button" type="submit" title="Zur Einkaufsliste hinzufügen"><Plus size={20} /></button>
        </form>
        {data.shopping.length ? (
          SHOPPING_CATEGORIES.filter((cat) => data.shopping.some((s) => s.category === cat)).map((cat) => (
            <div className="shop-group" key={cat}>
              <div className="shop-cat-label">{cat}</div>
              <div className="rows">
                {data.shopping.filter((s) => s.category === cat).map((s) => (
                  <div className="task-row" key={s.id}>
                    <button className="task-row__main" type="button" onClick={() => data.toggleShopping(s.id)}>
                      <span className={s.done ? 'task-check task-check--done' : 'task-check'}>{s.done ? <Check size={14} /> : null}</span>
                      <span className={s.done ? 'task-title task-title--done' : 'task-title'}>{s.title}</span>
                      {s.quantity ? <span className="muted-chip">{s.quantity}</span> : null}
                    </button>
                    <button className="delete-button" type="button" onClick={() => data.deleteShoppingItem(s.id)}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : <EmptyState icon={<ShoppingCart size={24} />} title="Liste ist leer" hint="Trage direkt den ersten Artikel ein." />}
      </section>

      <Sheet open={eventSheet} title="Familien-Termin" onClose={() => setEventSheet(false)}>
        <form className="form-stack" onSubmit={addFamilyEvent}>
          <input className="field" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Titel" />
          <div className="form-grid">
            <input className="field" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <input className="field" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </div>
          <input className="field" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Ort (optional)" />
          <input className="field" value={eventFor} onChange={(e) => setEventFor(e.target.value)} placeholder="Betrifft (z. B. Kind, optional)" />
          <p className="form-hint">Dieser Termin erscheint im gemeinsamen Familienbereich.</p>
          <button className="primary-button" type="submit"><Plus size={18} /> Termin speichern</button>
        </form>
      </Sheet>

      <Sheet open={taskSheet} title="Geteilte Aufgabe" onClose={() => setTaskSheet(false)}>
        <form className="form-stack" onSubmit={addSharedTask}>
          <input className="field" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Aufgabe" />
          <Segmented value={taskPriority} onChange={setTaskPriority} options={[{ value: 'low', label: 'Niedrig' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Hoch' }]} />
          <p className="form-hint">Geteilte Aufgaben sind für alle Haushaltsmitglieder sichtbar.</p>
          <button className="primary-button" type="submit"><Plus size={18} /> Aufgabe speichern</button>
        </form>
      </Sheet>
    </Screen>
  );
}
