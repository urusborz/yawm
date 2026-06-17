import { FormEvent, useState } from 'react';
import { CalendarCheck, ListChecks, Plus, Save, Sparkles, Sunrise, X } from 'lucide-react';
import { Screen, SimpleHeader } from '../components/ui';
import { useData } from '../store';
import { addDays, formatToday, viennaDate } from '../lib/dates';

function parseNoon(date: string) {
  return new Date(`${date}T12:00:00`);
}

export default function Prepare() {
  const data = useData();
  const today = viennaDate();
  const tomorrow = addDays(today, 1);
  const existing = data.dayPreps.find((d) => d.targetDate === tomorrow);
  const todayPrep = data.dayPreps.find((d) => d.targetDate === today);

  const [intentions, setIntentions] = useState(existing?.intentions ?? '');
  const [tasks, setTasks] = useState<string[]>(existing?.plannedTasks ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  function addTask() {
    const t = draft.trim();
    if (!t) return;
    setTasks((p) => [...p, t]);
    setDraft('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await data.saveDayPreparation({
      targetDate: tomorrow,
      intentions: intentions.trim() || undefined,
      plannedTasks: tasks,
      notes: notes.trim() || undefined,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Screen>
      <SimpleHeader title="Tag vorbereiten" subtitle="Vorausblick statt Rückblick" icon={<Sunrise size={22} />} />

      <section className="today-card today-card--alive">
        <div className="today-card__top">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> Morgen</span>
            <h2>{formatToday(parseNoon(tomorrow))}</h2>
          </div>
          <span className="header-icon"><CalendarCheck size={20} /></span>
        </div>
        <p>Leg die wichtigsten Dinge fest, solange der Kopf noch frei ist.</p>
      </section>

      {todayPrep && (todayPrep.intentions || todayPrep.plannedTasks.length) ? (
        <section className="panel panel--color">
          <div className="panel__header"><h2>Für heute geplant</h2></div>
          {todayPrep.intentions ? <p style={{ color: 'var(--ink)' }}>{todayPrep.intentions}</p> : null}
          {todayPrep.plannedTasks.length ? (
            <div className="rows rows--compact">
              {todayPrep.plannedTasks.map((t, i) => <div className="prep-line" key={i}><ListChecks size={15} /> <span>{t}</span></div>)}
            </div>
          ) : null}
        </section>
      ) : null}

      <form className="panel compose" onSubmit={submit}>
        <div className="panel__header"><h2>Worauf kommt es an?</h2></div>
        <textarea className="field field--textarea" value={intentions} onChange={(e) => setIntentions(e.target.value)} placeholder="Deine Absicht / dein Fokus für morgen" />

        <label className="field-label"><ListChecks size={12} /> Geplante Punkte</label>
        {tasks.length ? (
          <div className="rows rows--compact">
            {tasks.map((t, i) => (
              <div className="prep-line prep-line--edit" key={i}>
                <span>{t}</span>
                <button className="row-icon" type="button" onClick={() => setTasks((p) => p.filter((_, j) => j !== i))} title="Entfernen"><X size={15} /></button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="field-row">
          <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Punkt hinzufügen…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }} />
          <button className="field-row__save" type="button" onClick={addTask} title="Hinzufügen"><Plus size={18} /></button>
        </div>

        <textarea className="field field--textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notizen (optional)" />
        <button className="primary-button" type="submit"><Save size={18} /> {saved ? 'Gespeichert ✓' : 'Vorbereitung speichern'}</button>
      </form>
    </Screen>
  );
}
