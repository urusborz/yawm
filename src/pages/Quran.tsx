import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Flame, Plus, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, EmptyState } from '../components/ui';
import { useData } from '../store';
import { formatShortDate, formatWeekday, lastNDates, streakFromDates, viennaDate } from '../lib/dates';

export default function Quran() {
  const data = useData();
  const [minutes, setMinutes] = useState('15');
  const [surah, setSurah] = useState('');
  const [ayahFrom, setAyahFrom] = useState('');
  const [ayahTo, setAyahTo] = useState('');
  const [note, setNote] = useState('');

  const today = viennaDate();
  const todayMinutes = data.quran.filter((q) => q.date === today).reduce((s, q) => s + q.minutes, 0);
  const dateSet = useMemo(() => new Set(data.quran.map((q) => q.date)), [data.quran]);
  const streak = streakFromDates(dateSet, today);
  const week = lastNDates(7);
  const weekMinutes = week.map((d) => data.quran.filter((q) => q.date === d).reduce((s, q) => s + q.minutes, 0));
  const maxWeek = Math.max(...weekMinutes, 30);
  const totalWeek = weekMinutes.reduce((a, b) => a + b, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const m = Number(minutes);
    if (!m || m <= 0) return;
    await data.addQuranSession({
      minutes: m,
      surah: surah.trim() || undefined,
      ayahFrom: ayahFrom ? Number(ayahFrom) : undefined,
      ayahTo: ayahTo ? Number(ayahTo) : undefined,
      note: note.trim() || undefined,
    });
    setSurah(''); setAyahFrom(''); setAyahTo(''); setNote('');
  }

  return (
    <Screen>
      <SimpleHeader title="Quran" subtitle="Privat" icon={<BookOpen size={24} />} />

      <section className="stats-grid">
        <div className="stat-tile"><div className="stat-tile__icon"><BookOpen size={20} /></div><strong>{todayMinutes}<small> min</small></strong><span>heute</span></div>
        <div className="stat-tile"><div className="stat-tile__icon"><Flame size={20} /></div><strong>{streak}</strong><span>Tage Streak</span></div>
        <div className="stat-tile"><div className="stat-tile__icon"><BookOpen size={20} /></div><strong>{totalWeek}<small> min</small></strong><span>diese Woche</span></div>
      </section>

      <section className="panel">
        <div className="panel__header"><h2>Woche</h2></div>
        <div className="habit-week">
          {weekMinutes.map((v, i) => (
            <div className="habit-week__col" key={i}>
              <div className="habit-week__bar" style={{ height: `${Math.max(8, (v / maxWeek) * 100)}%`, background: v > 0 ? 'var(--accent)' : 'var(--line)' }} />
              <span>{formatWeekday(week[i])[0]}</span>
            </div>
          ))}
        </div>
      </section>

      <form className="panel compose" onSubmit={submit}>
        <div className="panel__header"><h2>Session eintragen</h2></div>
        <div className="form-grid">
          <input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minuten" />
          <input className="field" value={surah} onChange={(e) => setSurah(e.target.value)} placeholder="Surah (optional)" />
          <input className="field" inputMode="numeric" value={ayahFrom} onChange={(e) => setAyahFrom(e.target.value)} placeholder="Ayah von" />
          <input className="field" inputMode="numeric" value={ayahTo} onChange={(e) => setAyahTo(e.target.value)} placeholder="Ayah bis" />
        </div>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)" />
        <button className="primary-button" type="submit"><Plus size={18} /> Eintragen</button>
      </form>

      <section className="panel">
        <div className="panel__header"><h2>Verlauf</h2><span>{data.quran.length}</span></div>
        <div className="rows">
          <AnimatePresence initial={false}>
            {data.quran.length ? data.quran.map((q) => (
              <motion.div className="history-row" key={q.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -16 }}>
                <div className="history-row__badge">{q.minutes}′</div>
                <div>
                  <strong>{q.surah || 'Lesung'}{q.ayahFrom ? ` ${q.ayahFrom}${q.ayahTo ? `–${q.ayahTo}` : ''}` : ''}</strong>
                  <span>{formatShortDate(q.date)}{q.note ? ` · ${q.note}` : ''}</span>
                </div>
                <button className="delete-button" type="button" onClick={() => data.deleteQuranSession(q.id)}><Trash2 size={15} /></button>
              </motion.div>
            )) : <EmptyState icon={<BookOpen size={26} />} title="Noch nichts gelesen" hint="Trage deine erste Session ein." />}
          </AnimatePresence>
        </div>
      </section>
    </Screen>
  );
}
