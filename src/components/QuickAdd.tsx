import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet, Segmented } from './ui';
import { useData } from '../store';
import { viennaDate } from '../lib/dates';
import type { Priority, Scope } from '../types';

export type QuickAddType = 'task' | 'event' | 'bill' | 'note';

function localToISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function QuickAdd({ open, initialType, onClose }: { open: boolean; initialType: QuickAddType; onClose: () => void }) {
  const data = useData();
  const [type, setType] = useState<QuickAddType>(initialType);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('private');
  const [priority, setPriority] = useState<Priority>('normal');
  const [date, setDate] = useState(viennaDate());
  const [time, setTime] = useState('18:00');
  const [useTime, setUseTime] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Haushalt');
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => { if (open) setType(initialType); }, [initialType, open]);

  function reset() {
    setTitle(''); setScope('private'); setPriority('normal');
    setDate(viennaDate()); setTime('18:00'); setUseTime(false);
    setAmount(''); setCategory('Haushalt'); setLocation(''); setContent('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() && type !== 'note') return;

    if (type === 'task') {
      await data.createTask({ title: title.trim(), scope, priority, dueAt: useTime ? localToISO(date, time) : null });
    } else if (type === 'event') {
      await data.createEvent({ title: title.trim(), startsAt: localToISO(date, time), location: location.trim() || undefined, scope });
    } else if (type === 'bill') {
      await data.createBill({ title: title.trim(), amount: Number(amount.replace(',', '.')) || 0, dueDate: date, category: category.trim() || 'Haushalt' });
    } else if (type === 'note') {
      await data.createNote({ title: title.trim() || 'Schnelle Notiz', content: content.trim(), scope });
    }
    reset();
    onClose();
  }

  const types: { value: QuickAddType; label: string }[] = [
    { value: 'task', label: 'Aufgabe' },
    { value: 'event', label: 'Termin' },
    { value: 'bill', label: 'Rechnung' },
    { value: 'note', label: 'Notiz' },
  ];

  return (
    <Sheet open={open} title="Schnell hinzufügen" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <div className="type-grid">
          {types.map((t) => (
            <button key={t.value} type="button" className={type === t.value ? 'active' : ''} onClick={() => setType(t.value)}>{t.label}</button>
          ))}
        </div>

        <input className="field" data-testid="quick-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'note' ? 'Titel (optional)' : 'Titel'} autoFocus />

        {type === 'note' ? (
          <textarea className="field field--textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Was möchtest du festhalten?" />
        ) : null}

        {type === 'task' ? (
          <>
            <Segmented value={priority} onChange={setPriority} options={[{ value: 'low', label: 'Niedrig' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Hoch' }]} />
            <label className="switch-row">
              <span>Fällig zu Uhrzeit</span>
              <input type="checkbox" checked={useTime} onChange={(e) => setUseTime(e.target.checked)} />
            </label>
            {useTime ? (
              <div className="form-grid">
                <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            ) : null}
          </>
        ) : null}

        {type === 'event' ? (
          <>
            <div className="form-grid">
              <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ort (optional)" />
          </>
        ) : null}

        {type === 'bill' ? (
          <div className="form-grid">
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag €" />
            <input className="field form-grid__full" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategorie" />
          </div>
        ) : null}

        {type === 'task' || type === 'event' || type === 'note' ? (
          <Segmented value={scope} onChange={setScope} options={[{ value: 'private', label: 'Privat' }, { value: 'shared', label: 'Geteilt' }]} />
        ) : null}

        {type === 'bill' ? <p className="form-hint">Rechnungen sind immer im Familien-Haushalt geteilt.</p> : null}

        <button className="primary-button" type="submit"><Plus size={18} /> Speichern</button>
      </form>
    </Sheet>
  );
}
