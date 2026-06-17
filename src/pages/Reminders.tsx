import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState, Collapsible } from '../components/ui';
import { useData } from '../store';
import { viennaDate } from '../lib/dates';
import type { Reminder, ReminderPriority } from '../types';

const PRIO_OPTS = [
  { value: 'high' as ReminderPriority, label: 'Hoch' },
  { value: 'medium' as ReminderPriority, label: 'Mittel' },
  { value: 'low' as ReminderPriority, label: 'Niedrig' },
];
const PRIO_LABEL: Record<ReminderPriority, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };
const PRIO_COLOR: Record<ReminderPriority, string> = { high: 'var(--danger)', medium: 'var(--accent)', low: 'var(--ink-3)' };
const PRIO_RANK: Record<ReminderPriority, number> = { high: 0, medium: 1, low: 2 };

function localToISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
function formatDue(iso: string) {
  return new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }).format(new Date(iso));
}

function ReminderRow({ r }: { r: Reminder }) {
  const data = useData();
  const overdue = !r.done && r.dueAt && new Date(r.dueAt).getTime() < Date.now();
  return (
    <motion.div className="task-row" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -16 }}>
      <button className="task-row__main" type="button" onClick={() => data.toggleReminder(r.id)}>
        <span className={r.done ? 'task-check task-check--done' : 'task-check'}>{r.done ? <Check size={14} /> : null}</span>
        <span className="task-row__body">
          <span className={r.done ? 'task-title task-title--done' : 'task-title'}>{r.title}</span>
          {r.note ? <span className="task-row__desc">{r.note}</span> : null}
          <span className="task-row__meta">
            <span className="priority-dot" style={{ background: PRIO_COLOR[r.priority] }} />
            <span className="muted-chip">{PRIO_LABEL[r.priority]}</span>
            {r.dueAt ? <span className={overdue ? 'muted-chip muted-chip--due' : 'muted-chip'}>{overdue ? 'überfällig · ' : ''}{formatDue(r.dueAt)}</span> : null}
          </span>
        </span>
      </button>
      <button className="delete-button" type="button" onClick={() => data.deleteReminder(r.id)} title="Löschen"><Trash2 size={15} /></button>
    </motion.div>
  );
}

export default function Reminders() {
  const data = useData();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('medium');
  const [hasDue, setHasDue] = useState(false);
  const [date, setDate] = useState(viennaDate());
  const [time, setTime] = useState('09:00');
  const [showDone, setShowDone] = useState(false);

  const open = useMemo(
    () => data.reminders.filter((r) => !r.done).sort((a, b) => {
      if (PRIO_RANK[a.priority] !== PRIO_RANK[b.priority]) return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return ad - bd;
    }),
    [data.reminders]
  );
  const done = useMemo(() => data.reminders.filter((r) => r.done), [data.reminders]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await data.createReminder({
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      dueAt: hasDue ? localToISO(date, time) : null,
    });
    setTitle(''); setNote(''); setPriority('medium'); setHasDue(false);
  }

  return (
    <Screen>
      <SimpleHeader title="Erinnerungen" subtitle={open.length ? `${open.length} offen` : 'Privat'} icon={<BellRing size={22} />} />

      <form className="panel compose" onSubmit={submit}>
        <div className="panel__header"><h2>Neue Erinnerung</h2></div>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Woran soll ich dich erinnern?" />
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" />
        <Segmented value={priority} onChange={setPriority} options={PRIO_OPTS} />
        <label className="switch-row"><span>Mit Ablauf / Fälligkeit</span><input type="checkbox" checked={hasDue} onChange={(e) => setHasDue(e.target.checked)} /></label>
        {hasDue ? (
          <div className="form-grid">
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        ) : null}
        <button className="primary-button" type="submit"><Plus size={18} /> Erinnerung anlegen</button>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState icon={<BellRing size={26} />} title="Keine Erinnerungen" hint="Notizen mit oder ohne Ablauf, nach Priorität sortiert." />
      ) : null}

      {open.length ? (
        <section className="panel">
          <div className="rows">
            <AnimatePresence initial={false}>
              {open.map((r) => <ReminderRow key={r.id} r={r} />)}
            </AnimatePresence>
          </div>
        </section>
      ) : null}

      {done.length ? (
        <section className="panel">
          <button className="panel__header" type="button" style={{ width: '100%', background: 'none', border: 0, padding: 0 }} onClick={() => setShowDone((v) => !v)}>
            <h2>Erledigt ({done.length})</h2>
            <motion.span animate={{ rotate: showDone ? 180 : 0 }}><ChevronDown size={18} /></motion.span>
          </button>
          <Collapsible open={showDone}>
            <div className="rows">
              <AnimatePresence initial={false}>
                {done.map((r) => <ReminderRow key={r.id} r={r} />)}
              </AnimatePresence>
            </div>
          </Collapsible>
        </section>
      ) : null}
    </Screen>
  );
}
