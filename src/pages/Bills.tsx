import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDollarSign, Plus, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState } from '../components/ui';
import { useData } from '../store';
import { daysUntil, formatShortDate, viennaDate } from '../lib/dates';
import { money } from '../lib/format';

type Filter = 'open' | 'paid' | 'all';

export default function Bills() {
  const data = useData();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(viennaDate());
  const [category, setCategory] = useState('Haushalt');
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [filter, setFilter] = useState<Filter>('open');

  const openTotal = data.bills.filter((b) => b.status === 'open').reduce((s, b) => s + b.amount, 0);
  const paidTotal = data.bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.amount, 0);

  const filtered = useMemo(() => data.bills.filter((b) => (filter === 'all' ? true : b.status === filter)), [data.bills, filter]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await data.createBill({
      title: title.trim(),
      amount: Number(amount.replace(',', '.')) || 0,
      dueDate,
      category: category.trim() || 'Haushalt',
      note: note.trim() || undefined,
      repeatRule: recurring ? 'monthly' : undefined,
    });
    setTitle(''); setAmount(''); setNote(''); setRecurring(false);
  }

  return (
    <Screen>
      <SimpleHeader title="Rechnungen" subtitle="Geteilt im Haushalt" icon={<CircleDollarSign size={24} />} />

      <section className="summary-cards">
        <div className="summary-card summary-card--accent">
          <span>Offen</span>
          <strong>{money(openTotal)}</strong>
        </div>
        <div className="summary-card">
          <span>Bezahlt</span>
          <strong>{money(paidTotal)}</strong>
        </div>
      </section>

      <form className="panel compose" onSubmit={submit}>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel (z. B. Strom)" />
        <div className="form-grid">
          <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag €" />
          <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <input className="field form-grid__full" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategorie" />
        </div>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" />
        <label className="switch-row"><span>Monatlich wiederkehrend</span><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /></label>
        <button className="primary-button" type="submit"><Plus size={18} /> Rechnung anlegen</button>
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
                      <span className={overdue ? 'overdue' : ''}>
                        {formatShortDate(b.dueDate)} · {b.category}
                        {b.repeatRule ? ' · ↻' : ''}
                        {overdue ? ' · überfällig' : ''}
                        {b.status === 'paid' && b.paidByInitials ? ` · ${b.paidByInitials}` : ''}
                      </span>
                    </div>
                    <b>{b.status === 'paid' ? 'bezahlt' : money(b.amount)}</b>
                  </button>
                  <button className="delete-button" type="button" onClick={() => data.deleteBill(b.id)} title="Löschen"><Trash2 size={15} /></button>
                </motion.div>
              );
            }) : <EmptyState icon={<CircleDollarSign size={26} />} title="Keine Rechnungen" hint="Lege oben deine erste Rechnung an." />}
          </AnimatePresence>
        </div>
      </section>
    </Screen>
  );
}
