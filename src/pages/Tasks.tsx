import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Plus, Save } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState, Sheet } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useData } from '../store';
import { viennaDate } from '../lib/dates';
import type { Priority, Scope, Task } from '../types';

type StatusFilter = 'open' | 'done' | 'all';
type ScopeFilter = 'all' | 'private' | 'shared';

const PRIO_OPTS = [{ value: 'low' as Priority, label: 'Niedrig' }, { value: 'normal' as Priority, label: 'Normal' }, { value: 'high' as Priority, label: 'Hoch' }];
const ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function localToISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function Tasks() {
  const data = useData();
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('private');
  const [priority, setPriority] = useState<Priority>('normal');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [edit, setEdit] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    const list = data.tasks.filter((t) => {
      if (status === 'open' && t.done) return false;
      if (status === 'done' && !t.done) return false;
      if (scopeFilter !== 'all' && t.scope !== scopeFilter) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (ORDER[a.priority] !== ORDER[b.priority]) return ORDER[a.priority] - ORDER[b.priority];
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return ad - bd;
    });
  }, [data.tasks, status, scopeFilter]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await data.createTask({ title: title.trim(), scope, priority });
    setTitle('');
  }

  return (
    <Screen>
      <SimpleHeader title="Aufgaben" subtitle={`${data.tasks.filter((t) => !t.done).length} offen`} icon={<ClipboardCheck size={22} />} />

      <form className="panel compose" onSubmit={submit}>
        <input className="field" data-testid="task-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe…" />
        <Segmented value={scope} onChange={setScope} options={[{ value: 'private', label: 'Privat' }, { value: 'shared', label: 'Geteilt' }]} />
        <Segmented value={priority} onChange={setPriority} options={PRIO_OPTS} />
        <button className="primary-button" type="submit"><Plus size={18} /> Hinzufügen</button>
      </form>

      <div className="filter-bar">
        <Segmented value={status} onChange={setStatus} options={[{ value: 'open', label: 'Offen' }, { value: 'done', label: 'Erledigt' }, { value: 'all', label: 'Alle' }]} />
        <Segmented value={scopeFilter} onChange={setScopeFilter} options={[{ value: 'all', label: 'Alle' }, { value: 'private', label: 'Privat' }, { value: 'shared', label: 'Geteilt' }]} />
      </div>

      <section className="panel">
        <div className="rows">
          <AnimatePresence initial={false}>
            {filtered.length
              ? filtered.map((t) => <TaskRow key={t.id} task={t} onToggle={data.toggleTask} onDelete={data.deleteTask} onEdit={setEdit} />)
              : <EmptyState icon={<ClipboardCheck size={26} />} title="Nichts hier" hint="Lege oben eine neue Aufgabe an." />}
          </AnimatePresence>
        </div>
      </section>

      <EditSheet task={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}

function EditSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const data = useData();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [hasDue, setHasDue] = useState(false);
  const [date, setDate] = useState(viennaDate());
  const [time, setTime] = useState('18:00');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setPriority(task.priority);
    setHasDue(Boolean(task.dueAt));
    if (task.dueAt) {
      setDate(viennaDate(new Date(task.dueAt)));
      setTime(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }).format(new Date(task.dueAt)));
    }
  }, [task]);

  async function save() {
    if (!task) return;
    await data.updateTask(task.id, { title: title.trim() || task.title, priority, dueAt: hasDue ? localToISO(date, time) : null });
    onClose();
  }

  return (
    <Sheet open={Boolean(task)} title="Aufgabe bearbeiten" onClose={onClose}>
      <div className="form-stack">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
        <Segmented value={priority} onChange={setPriority} options={PRIO_OPTS} />
        <label className="switch-row"><span>Fälligkeit</span><input type="checkbox" checked={hasDue} onChange={(e) => setHasDue(e.target.checked)} /></label>
        {hasDue ? (
          <div className="form-grid">
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        ) : null}
        <button className="primary-button" type="button" onClick={save}><Save size={18} /> Speichern</button>
      </div>
    </Sheet>
  );
}
