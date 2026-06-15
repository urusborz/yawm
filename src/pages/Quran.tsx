import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Flame, Minus, Plus, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, EmptyState, Ring, Sheet } from '../components/ui';
import { useData } from '../store';
import { formatShortDate, formatWeekday, lastNDates, streakFromDates, viennaDate } from '../lib/dates';

const SURAHS = ['Al-Fatiha', 'Al-Baqara', 'Aal-e-Imran', 'An-Nisa', 'Al-Maida', 'Al-Kahf', 'Yasin', 'Al-Mulk', 'Ar-Rahman', 'Al-Waqia'];

function useGoal() {
  const [goal, setGoal] = useState<number>(() => Number(localStorage.getItem('yawm-quran-goal')) || 20);
  return [goal, (v: number) => { const n = Math.max(5, v); setGoal(n); localStorage.setItem('yawm-quran-goal', String(n)); }] as const;
}

export default function Quran() {
  const data = useData();
  const [goal, setGoal] = useGoal();
  const [minutes, setMinutes] = useState('15');
  const [surah, setSurah] = useState('');
  const [ayahFrom, setAyahFrom] = useState('');
  const [ayahTo, setAyahTo] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  const today = viennaDate();
  const todayMinutes = data.quran.filter((q) => q.date === today).reduce((s, q) => s + q.minutes, 0);
  const dateSet = useMemo(() => new Set(data.quran.map((q) => q.date)), [data.quran]);
  const streak = streakFromDates(dateSet, today);
  const week = lastNDates(7);
  const weekMinutes = week.map((d) => data.quran.filter((q) => q.date === d).reduce((s, q) => s + q.minutes, 0));
  const maxWeek = Math.max(...weekMinutes, goal);
  const totalMinutes = data.quran.reduce((s, q) => s + q.minutes, 0);
  const goalProgress = goal ? Math.min(1, todayMinutes / goal) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    if (!m || m <= 0) return;
    await data.addQuranSession({ minutes: m, surah: surah.trim() || undefined, ayahFrom: ayahFrom ? Number(ayahFrom) : undefined, ayahTo: ayahTo ? Number(ayahTo) : undefined, note: note.trim() || undefined });
    setSurah('');
    setAyahFrom('');
    setAyahTo('');
    setNote('');
    setAdding(false);
  }

  return (
    <Screen>
      <SimpleHeader
        title="Quran"
        subtitle="Privat"
        action={<button className="header-add" type="button" onClick={() => setAdding(true)} title="Session eintragen"><Plus size={20} /></button>}
      />

      <section className="goal-hero goal-hero--calm">
        <Ring progress={goalProgress} size={96} stroke={9} color="var(--accent)" track="var(--surface-2)">
          <div className="goal-hero__center"><strong>{todayMinutes}</strong><span>/ {goal} min</span></div>
        </Ring>
        <div className="goal-hero__info">
          <span className="eyebrow">Heutiges Ziel</span>
          <div className="goal-hero__adjust">
            <button type="button" onClick={() => setGoal(goal - 5)} aria-label="weniger"><Minus size={15} /></button>
            <b>{goal} min</b>
            <button type="button" onClick={() => setGoal(goal + 5)} aria-label="mehr"><Plus size={15} /></button>
          </div>
          <div className="goal-hero__streak"><Flame size={14} /> {streak} Tage Streak</div>
        </div>
      </section>

      <button className="focus-action" type="button" onClick={() => setAdding(true)}>
        <BookOpen size={18} />
        <span>Session eintragen</span>
        <strong>{Math.max(0, goal - todayMinutes)} min offen</strong>
      </button>

      <section className="stats-grid">
        <div className="stat-tile"><div className="stat-tile__icon"><BookOpen size={18} /></div><strong>{totalMinutes}<small> min</small></strong><span>gesamt</span></div>
        <div className="stat-tile"><div className="stat-tile__icon"><BookOpen size={18} /></div><strong>{data.quran.length}</strong><span>Sitzungen</span></div>
        <div className="stat-tile"><div className="stat-tile__icon"><Flame size={18} /></div><strong>{streak}</strong><span>Streak</span></div>
      </section>

      <section className="panel">
        <div className="panel__header"><h2>Woche</h2></div>
        <div className="habit-week">
          {weekMinutes.map((v, i) => (
            <div className="habit-week__col" key={week[i]}>
              <div className="habit-week__bar" style={{ height: `${Math.max(6, (v / maxWeek) * 100)}%`, background: v >= goal ? 'var(--accent)' : v > 0 ? 'color-mix(in srgb, var(--accent) 45%, transparent)' : 'var(--surface-2)' }} />
              <span>{formatWeekday(week[i])[0]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header"><h2>Verlauf</h2><span>{data.quran.length}</span></div>
        <div className="rows">
          <AnimatePresence initial={false}>
            {data.quran.length ? data.quran.map((q) => (
              <motion.div className="history-row" key={q.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -16 }}>
                <div className="history-row__badge">{q.minutes}'</div>
                <div>
                  <strong>{q.surah || 'Lesung'}{q.ayahFrom ? ` ${q.ayahFrom}${q.ayahTo ? `-${q.ayahTo}` : ''}` : ''}</strong>
                  <span>{formatShortDate(q.date)}{q.note ? ` · ${q.note}` : ''}</span>
                </div>
                <button className="delete-button" type="button" onClick={() => data.deleteQuranSession(q.id)}><Trash2 size={15} /></button>
              </motion.div>
            )) : <EmptyState icon={<BookOpen size={26} />} title="Noch nichts gelesen" hint="Trage deine erste Session ein." />}
          </AnimatePresence>
        </div>
      </section>

      <Sheet open={adding} title="Session eintragen" onClose={() => setAdding(false)}>
        <form className="form-stack" onSubmit={submit}>
          <div className="chip-row">
            {SURAHS.map((s) => <button key={s} type="button" className={surah === s ? 'chip chip--active' : 'chip'} onClick={() => setSurah(s)}>{s}</button>)}
          </div>
          <div className="form-grid">
            <input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minuten" />
            <input className="field" value={surah} onChange={(e) => setSurah(e.target.value)} placeholder="Surah" />
            <input className="field" inputMode="numeric" value={ayahFrom} onChange={(e) => setAyahFrom(e.target.value)} placeholder="Ayah von" />
            <input className="field" inputMode="numeric" value={ayahTo} onChange={(e) => setAyahTo(e.target.value)} placeholder="Ayah bis" />
          </div>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" />
          <button className="primary-button" type="submit"><Plus size={18} /> Eintragen</button>
        </form>
      </Sheet>
    </Screen>
  );
}
