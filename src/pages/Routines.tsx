import { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Apple, Bell, Coffee, Droplet, Dumbbell, Flame, Heart, Minus, Pencil, Pill, Plus, Repeat, Save, Sun, Trash2, X } from 'lucide-react';
import { Screen, SimpleHeader, EmptyState, Sheet } from '../components/ui';
import { useData } from '../store';
import type { ReactNode } from 'react';
import type { RoutineWithProgress } from '../types';

const ICONS: Record<string, ReactNode> = {
  Repeat: <Repeat size={18} />, Pill: <Pill size={18} />, Droplet: <Droplet size={18} />,
  Dumbbell: <Dumbbell size={18} />, Apple: <Apple size={18} />, Coffee: <Coffee size={18} />,
  Heart: <Heart size={18} />, Sun: <Sun size={18} />,
};
const ICON_KEYS = Object.keys(ICONS);
// Anzeige Mo..So, gespeichert wird JS getDay (0=So)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = { 0: 'So', 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa' };

type FormValue = { name: string; icon: string; targetPerDay: number; reminderTimes: string[]; daysOfWeek: number[] };

function RoutineForm({ initial, submitLabel, onSubmit }: { initial?: Partial<RoutineWithProgress>; submitLabel: string; onSubmit: (v: FormValue) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'Repeat');
  const [target, setTarget] = useState(String(initial?.targetPerDay ?? 1));
  const [times, setTimes] = useState<string[]>(initial?.reminderTimes ?? []);
  const [days, setDays] = useState<number[]>(initial?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      icon,
      targetPerDay: Math.max(1, Number(target) || 1),
      reminderTimes: times.filter(Boolean),
      daysOfWeek: days.length ? [...days].sort((a, b) => a - b) : [0, 1, 2, 3, 4, 5, 6],
    });
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (z. B. Protein, Vitamin D)" />
      <div className="form-grid">
        <input className="field" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="pro Tag" />
        <div className="picker-row">{ICON_KEYS.map((k) => <button key={k} type="button" className={icon === k ? 'picker active' : 'picker'} onClick={() => setIcon(k)}>{ICONS[k]}</button>)}</div>
      </div>

      <div>
        <label className="field-label">Wochentage</label>
        <div className="day-toggle-row">
          {DAY_ORDER.map((d) => (
            <button key={d} type="button" className={days.includes(d) ? 'day-toggle day-toggle--on' : 'day-toggle'} onClick={() => toggleDay(d)}>{DAY_LABELS[d]}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label"><Bell size={12} /> Erinnerungszeiten</label>
        <div className="form-stack" style={{ gap: 8, marginTop: 6 }}>
          {times.map((t, i) => (
            <div className="field-row" key={i}>
              <input className="field" type="time" value={t} onChange={(e) => setTimes((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
              <button className="row-icon" type="button" onClick={() => setTimes((prev) => prev.filter((_, j) => j !== i))} title="Zeit entfernen"><X size={16} /></button>
            </div>
          ))}
          <button className="inline-action" type="button" onClick={() => setTimes((prev) => [...prev, '09:00'])}><Plus size={15} /> Zeit hinzufügen</button>
        </div>
      </div>

      <button className="primary-button" type="submit">{submitLabel === 'Speichern' ? <Save size={18} /> : <Plus size={18} />} {submitLabel}</button>
    </form>
  );
}

export default function Routines() {
  const data = useData();
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<RoutineWithProgress | null>(null);

  const activeCount = data.routines.filter((r) => r.todayCount >= r.targetPerDay).length;

  return (
    <Screen>
      <SimpleHeader
        title="Routinen"
        subtitle={data.routines.length ? `${activeCount} / ${data.routines.length} heute erledigt` : 'Privat · täglich'}
        action={<button className="header-add" type="button" onClick={() => setAdding(true)} title="Routine hinzufügen"><Plus size={20} /></button>}
      />

      {data.routines.length === 0 ? (
        <EmptyState icon={<Repeat size={26} />} title="Noch keine Routinen" hint="Wiederkehrende Erinnerungen wie Protein, Vitamine oder Wasser – tippe auf +." actionLabel="Routine anlegen" onAction={() => setAdding(true)} />
      ) : null}

      <div className="habit-list">
        <AnimatePresence initial={false}>
          {data.routines.map((r) => {
            const done = r.todayCount >= r.targetPerDay;
            const max = Math.max(r.targetPerDay, ...r.weekCounts, 1);
            return (
              <motion.div className="panel habit-card" key={r.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <div className="habit-card__top">
                  <span className="routine-glyph" data-done={done}>{ICONS[r.icon] ?? ICONS.Repeat}</span>
                  <div className="habit-card__info">
                    <strong>{r.name}</strong>
                    <span>{r.todayCount} / {r.targetPerDay} heute</span>
                    <div className="habit-meta">
                      <span className="habit-streak"><Flame size={13} /> {r.streak} Tage</span>
                      {r.reminderTimes.length ? <span className="habit-rate"><Bell size={12} /> {r.reminderTimes.join(' · ')}</span> : null}
                    </div>
                  </div>
                  <div className="stepper">
                    <button type="button" onClick={() => data.logRoutine(r.id, -1)} aria-label="weniger"><Minus size={16} /></button>
                    <button type="button" className="stepper__plus" onClick={() => data.logRoutine(r.id, 1)} aria-label="mehr"><Plus size={16} /></button>
                  </div>
                </div>

                <div className="habit-week">
                  {r.weekCounts.map((v, i) => (
                    <div className="habit-week__col" key={i}>
                      <div className="habit-week__bar" style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: v >= r.targetPerDay ? 'var(--accent)' : 'var(--surface-2)' }} />
                    </div>
                  ))}
                </div>

                <div className="habit-card__foot">
                  <button className="habit-card__delete" type="button" onClick={() => setEdit(r)}><Pencil size={13} /> Bearbeiten</button>
                  <button className="habit-card__delete" type="button" onClick={() => data.deleteRoutine(r.id)}><Trash2 size={13} /> Löschen</button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Sheet open={adding} title="Neue Routine" onClose={() => setAdding(false)}>
        <RoutineForm submitLabel="Routine anlegen" onSubmit={async (v) => { await data.createRoutine(v); setAdding(false); }} />
      </Sheet>

      <Sheet open={Boolean(edit)} title="Routine bearbeiten" onClose={() => setEdit(null)}>
        {edit ? <RoutineForm initial={edit} submitLabel="Speichern" onSubmit={async (v) => { await data.updateRoutine(edit.id, v); setEdit(null); }} /> : null}
      </Sheet>
    </Screen>
  );
}
