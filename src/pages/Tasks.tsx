import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Plus } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useData } from '../store';
import type { Priority, Scope } from '../types';

type StatusFilter = 'open' | 'done' | 'all';
type ScopeFilter = 'all' | 'private' | 'shared';

export default function Tasks() {
  const data = useData();
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('private');
  const [priority, setPriority] = useState<Priority>('normal');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');

  const filtered = useMemo(() => {
    return data.tasks.filter((t) => {
      if (status === 'open' && t.done) return false;
      if (status === 'done' && !t.done) return false;
      if (scopeFilter !== 'all' && t.scope !== scopeFilter) return false;
      return true;
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
      <SimpleHeader title="Aufgaben" subtitle={`${data.tasks.filter((t) => !t.done).length} offen`} icon={<ClipboardCheck size={24} />} />

      <form className="panel compose" onSubmit={submit}>
        <input className="field" data-testid="task-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe…" />
        <div className="form-grid form-grid--2">
          <Segmented value={scope} onChange={setScope} options={[{ value: 'private', label: 'Privat' }, { value: 'shared', label: 'Geteilt' }]} />
          <Segmented value={priority} onChange={setPriority} options={[{ value: 'low', label: 'Niedrig' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Hoch' }]} />
        </div>
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
              ? filtered.map((t) => <TaskRow key={t.id} task={t} onToggle={data.toggleTask} onDelete={data.deleteTask} />)
              : <EmptyState icon={<ClipboardCheck size={26} />} title="Nichts hier" hint="Lege oben eine neue Aufgabe an." />}
          </AnimatePresence>
        </div>
      </section>
    </Screen>
  );
}
