import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flag, Plus, Quote, Rocket, Target, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState } from '../components/ui';
import { useData } from '../store';
import { daysBetween, formatShortDate, viennaDate } from '../lib/dates';
import type { FocusProject, FocusStatus } from '../types';

const STATUS_OPTS = [
  { value: 'active' as FocusStatus, label: 'Aktiv' },
  { value: 'paused' as FocusStatus, label: 'Pause' },
  { value: 'done' as FocusStatus, label: 'Fertig' },
  { value: 'abandoned' as FocusStatus, label: 'Verworfen' },
];

function elapsed(startedAt: string) {
  const days = Math.max(0, daysBetween(viennaDate(new Date(startedAt)), viennaDate()));
  if (days === 0) return 'heute gestartet';
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'} gestartet`;
}

export default function Focus() {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [thought, setThought] = useState('');
  const [goal, setGoal] = useState('');
  const [remind, setRemind] = useState('3');

  const sorted = [...data.focusProjects].sort((a, b) => {
    const rank = (s: FocusStatus) => (s === 'active' ? 0 : s === 'paused' ? 1 : 2);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return b.startedAt.localeCompare(a.startedAt);
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await data.createFocusProject({
      title: title.trim(),
      initialThought: thought.trim() || undefined,
      goal: goal.trim() || undefined,
      remindEveryDays: Number(remind) > 0 ? Number(remind) : null,
    });
    setTitle(''); setThought(''); setGoal(''); setRemind('3'); setOpen(false);
  }

  return (
    <Screen>
      <SimpleHeader
        title="Fokus"
        subtitle="Warum du angefangen hast"
        action={<button className="header-add" type="button" onClick={() => setOpen((v) => !v)} title="Projekt hinzufügen"><Plus size={20} /></button>}
      />

      <AnimatePresence>
        {open ? (
          <motion.form className="panel compose" onSubmit={submit} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Projekt / Vorhaben" />
            <textarea className="field field--textarea" value={thought} onChange={(e) => setThought(e.target.value)} placeholder="Was geht dir gerade durch den Kopf? Warum jetzt? (dein Funke)" />
            <input className="field" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Was ist das Ziel?" />
            <label className="range-row"><span>Erinnere mich alle … Tage</span><strong>{remind} T</strong>
              <input type="range" min="0" max="14" value={remind} onChange={(e) => setRemind(e.target.value)} />
            </label>
            <button className="primary-button" type="submit"><Rocket size={18} /> Projekt festhalten</button>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {data.focusProjects.length === 0 && !open ? (
        <EmptyState icon={<Target size={26} />} title="Noch kein Fokus-Projekt" hint="Halte beim Start fest, was dich antreibt und was das Ziel ist – damit du es später wiederfindest." actionLabel="Projekt anlegen" onAction={() => setOpen(true)} />
      ) : null}

      <div className="habit-list">
        <AnimatePresence initial={false}>
          {sorted.map((p) => (
            <motion.div className={`panel focus-card focus-card--${p.status}`} key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div className="focus-card__head">
                <div>
                  <strong>{p.title}</strong>
                  <span>{elapsed(p.startedAt)} · {formatShortDate(viennaDate(new Date(p.startedAt)))}</span>
                </div>
                <button className="delete-button" type="button" onClick={() => data.deleteFocusProject(p.id)} title="Löschen"><Trash2 size={15} /></button>
              </div>

              {p.goal ? <div className="focus-goal"><Flag size={14} /> <span>{p.goal}</span></div> : null}
              {p.initialThought ? (
                <blockquote className="focus-thought"><Quote size={14} /> {p.initialThought}</blockquote>
              ) : null}

              <Segmented value={p.status} onChange={(s) => data.updateFocusProject(p.id, { status: s })} options={STATUS_OPTS} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Screen>
  );
}
