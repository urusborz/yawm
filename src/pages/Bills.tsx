import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDollarSign, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState, Sheet } from '../components/ui';
import { useData } from '../store';
import { daysUntil, formatShortDate, viennaDate } from '../lib/dates';
import { money } from '../lib/format';
import type { Bill, Scope } from '../types';

type Filter = 'open' | 'paid' | 'all';

export default function Bills() {
  const data = useData();
  const isFamily = data.household.members.length > 1;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(viennaDate());
  const [category, setCategory] = useState('Haushalt');
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [scope, setScope] = useState<Scope>(isFamily ? 'shared' : 'private');
  const [filter, setFilter] = useState<Filter>('open');
  const [edit, setEdit] = useState<Bill | null>(null);

  const open = data.bills.filter((b) => b.status === 'open');
  const paid = data.bills.filter((b) => b.status === 'paid');
  const openTotal = open.reduce((s, b) => s + b.amount, 0);
  const paidTotal = paid.reduce((s, b) => s + b.amount, 0);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    open.forEach((b) => m.set(b.category, (m.get(b.category) ?? 0) + b.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);

  const byPayer = useMemo(() => {
    const m = new Map<string, number>();
    paid.forEach((b) => { if (b.paidById) m.set(b.paidById, (m.get(b.paidById) ?? 0) + b.amount); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [paid]);

  const filtered = useMemo(() => data.bills.filter((b) => (filter === 'all' ? true : b.status === filter)), [data.bills, filter]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await data.createBill({ title: title.trim(), amount: Number(amount.replace(',', '.')) || 0, dueDate, category: category.trim() || 'Haushalt', note: note.trim() || undefined, repeatRule: recurring ? 'monthly' : undefined, scope: isFamily ? scope : 'private' });
    setTitle(''); setAmount(''); setNote(''); setRecurring(false);
  }

  return (
    <Screen>
      <SimpleHeader title="Rechnungen" subtitle={isFamily ? 'Privat & Haushalt' : 'Privat'} icon={<CircleDollarSign size={22} />} />

      <section className="summary-cards">
        <div className="summary-card summary-card--accent"><span>Offen</span><strong>{money(openTotal)}</strong></div>
        <div className="summary-card"><span>Bezahlt</span><strong>{money(paidTotal)}</strong></div>
      </section>

      {byCategory.length ? (
        <section className="panel">
          <div className="panel__header"><h2>Offen nach Kategorie</h2></div>
          <div className="catbars">
            {byCategory.slice(0, 5).map(([cat, sum]) => (
              <div className="catbar" key={cat}>
                <div className="catbar__top"><span>{cat}</span><b>{money(sum)}</b></div>
                <div className="catbar__track"><span style={{ width: `${openTotal ? (sum / openTotal) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <form className="panel compose" onSubmit={submit}>
        <div className="panel__header"><h2>Neue Rechnung</h2></div>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel (z. B. Strom)" />
        <div className="form-grid">
          <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag €" />
          <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <input className="field form-grid__full" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategorie" />
        </div>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" />
        <label className="switch-row"><span>Monatlich wiederkehrend</span><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /></label>
        {isFamily ? (
          <Segmented value={scope} onChange={setScope} options={[{ value: 'private', label: 'Privat' }, { value: 'shared', label: 'Haushalt' }]} />
        ) : null}
        <button className="primary-button" type="submit"><Plus size={18} /> Anlegen</button>
      </form>

      <div className="filter-bar">
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Offen' }, { value: 'paid', label: 'Bezahlt' }, { value: 'all', label: 'Alle' }]} />
      </div>

      <section className="panel">
        <div className="rows">
          <AnimatePresence initial={false}>
            {filtered.length ? filtered.map((b) => {
              const overdue = b.status === 'open' && daysUntil(b.dueDate) < 0;
              return (
                <motion.div className={b.status === 'paid' ? 'bill-row bill-row--paid' : 'bill-row'} key={b.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -16 }}>
                  <button className="bill-row__main" type="button" onClick={() => data.toggleBill(b.id)}>
                    <CircleDollarSign size={20} />
                    <div>
                      <strong>{b.title}</strong>
                      <span className={overdue ? 'overdue' : ''}>{formatShortDate(b.dueDate)} · {b.category}{b.scope === 'private' ? ' · privat' : ''}{b.repeatRule ? ' · ↻' : ''}{overdue ? ' · überfällig' : ''}{b.status === 'paid' && b.paidByInitials ? ` · ${b.paidByInitials}` : ''}</span>
                    </div>
                    <b>{b.status === 'paid' ? 'bezahlt' : money(b.amount)}</b>
                  </button>
                  <button className="row-icon" type="button" onClick={() => setEdit(b)} title="Bearbeiten"><Pencil size={15} /></button>
                  <button className="delete-button" type="button" onClick={() => data.deleteBill(b.id)} title="Löschen"><Trash2 size={15} /></button>
                </motion.div>
              );
            }) : <EmptyState icon={<CircleDollarSign size={26} />} title="Keine Rechnungen" hint="Lege oben deine erste Rechnung an." />}
          </AnimatePresence>
        </div>
      </section>

      {byPayer.length ? (
        <section className="panel">
          <div className="panel__header"><h2>Wer hat gezahlt</h2></div>
          <div className="rows">
            {byPayer.map(([uid, sum]) => (
              <div className="payer-row" key={uid}>
                <span className="avatar">{data.initialsOf(uid)}</span>
                <span className="payer-row__name">{data.nameOf(uid)}</span>
                <b>{money(sum)}</b>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <EditSheet bill={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}

function EditSheet({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const data = useData();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(viennaDate());
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);

  useEffect(() => {
    if (!bill) return;
    setTitle(bill.title); setAmount(String(bill.amount)); setDueDate(bill.dueDate);
    setCategory(bill.category); setNote(bill.note ?? ''); setRecurring(bill.repeatRule === 'monthly');
  }, [bill]);

  async function save() {
    if (!bill) return;
    await data.updateBill(bill.id, {
      title: title.trim() || bill.title,
      amount: Number(amount.replace(',', '.')) || 0,
      dueDate, category: category.trim() || 'Haushalt',
      note: note.trim() || null,
      repeatRule: recurring ? 'monthly' : null,
    });
    onClose();
  }

  return (
    <Sheet open={Boolean(bill)} title="Rechnung bearbeiten" onClose={onClose}>
      <div className="form-stack">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
        <div className="form-grid">
          <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag €" />
          <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <input className="field" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategorie" />
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" />
        <label className="switch-row"><span>Monatlich wiederkehrend</span><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /></label>
        <button className="primary-button" type="button" onClick={save}><Save size={18} /> Speichern</button>
      </div>
    </Sheet>
  );
}
