import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Flame, Lock, Sparkles, Target } from 'lucide-react';
import { EmptyState, Screen, SimpleHeader } from '../components/ui';
import { useData } from '../store';
import { formatShortDate, streakFromDates, viennaDate } from '../lib/dates';

const moodLabel = (m?: number) => {
  const value = m ?? 5;
  if (value <= 3) return 'Schwer';
  if (value <= 5) return 'Ruhig';
  if (value <= 7) return 'Stabil';
  return 'Leicht';
};

export default function Checkin() {
  const data = useData();
  const existing = data.checkinToday;
  const [mood, setMood] = useState(existing?.mood ?? 7);
  const [energy, setEnergy] = useState(existing?.energy ?? 6);
  const [focus, setFocus] = useState(existing?.focus ?? 6);
  const [stress, setStress] = useState(existing?.stress ?? 4);
  const [gratitude, setGratitude] = useState(existing?.gratitude ?? '');
  const [mainGoal, setMainGoal] = useState(existing?.mainGoal ?? '');
  const [reflection, setReflection] = useState(existing?.reflection ?? '');
  const [saved, setSaved] = useState(false);

  const today = viennaDate();
  const streak = useMemo(() => streakFromDates(new Set([today, ...data.checkinHistory.map((c) => c.date)]), today), [data.checkinHistory, today]);
  const trend = useMemo(() => [...data.checkinHistory].sort((a, b) => a.date.localeCompare(b.date)).slice(-14), [data.checkinHistory]);
  const avg = useMemo(() => {
    const f = (key: 'mood' | 'energy' | 'focus' | 'stress') => {
      const vals = data.checkinHistory.map((c) => c[key]).filter((v): v is number => typeof v === 'number');
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    };
    return { mood: f('mood'), energy: f('energy'), focus: f('focus'), stress: f('stress') };
  }, [data.checkinHistory]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await data.saveCheckin({ mood, energy, focus, stress, gratitude: gratitude.trim(), mainGoal: mainGoal.trim(), reflection: reflection.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Screen>
      <SimpleHeader title="Daily Check-in" subtitle="Privat · nur für dich" icon={<Lock size={20} />} />

      <motion.section className="checkin-hero" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="eyebrow">Heute</span>
          <h2>{moodLabel(mood)}</h2>
          <p>{existing ? 'Du hast heute bereits eingecheckt.' : 'Ein kurzer Stand, damit der Tag greifbarer wird.'}</p>
        </div>
        <div className="checkin-score">
          <strong>{mood}</strong>
          <span>/10</span>
        </div>
      </motion.section>

      <section className="checkin-summary">
        <div><Flame size={16} /><b>{streak}</b><span>Streak</span></div>
        <div><Target size={16} /><b>{focus}</b><span>Fokus</span></div>
        <div><Sparkles size={16} /><b>{energy}</b><span>Energie</span></div>
      </section>

      {trend.length > 1 ? (
        <section className="panel">
          <div className="panel__header"><h2>Stimmungs-Verlauf</h2></div>
          <div className="habit-week">
            {trend.map((c) => (
              <div className="habit-week__col" key={c.id}>
                <div className="habit-week__bar" style={{ height: `${Math.max(6, ((c.mood ?? 0) / 10) * 100)}%`, background: 'var(--accent)' }} />
                <span>{Number(c.date.slice(8))}</span>
              </div>
            ))}
          </div>
          {avg.mood !== null ? (
            <div className="recap">
              <div><b>{avg.mood ?? '-'}</b><span>Stimmung</span></div>
              <div><b>{avg.energy ?? '-'}</b><span>Energie</span></div>
              <div><b>{avg.focus ?? '-'}</b><span>Fokus</span></div>
              <div><b>{avg.stress ?? '-'}</b><span>Stress</span></div>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="panel">
          <EmptyState icon={<Sparkles size={24} />} title="Noch kein Verlauf" hint="Nach ein paar Tagen entsteht hier dein Trend." />
        </section>
      )}

      <form className="panel compose checkin-form" onSubmit={submit}>
        <Slider label="Stimmung" value={mood} setValue={setMood} />
        <Slider label="Energie" value={energy} setValue={setEnergy} />
        <Slider label="Fokus" value={focus} setValue={setFocus} />
        <Slider label="Stress" value={stress} setValue={setStress} />
        <div className="form-stack">
          <input className="field" value={mainGoal} onChange={(e) => setMainGoal(e.target.value)} placeholder="Hauptziel heute" />
          <input className="field" value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="Wofür bist du dankbar?" />
          <textarea className="field field--textarea" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Freie Reflexion (optional)" />
        </div>
        <button className={saved ? 'primary-button primary-button--ok' : 'primary-button'} type="submit">
          {saved ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
          {saved ? 'Gespeichert' : existing ? 'Check-in aktualisieren' : 'Check-in speichern'}
        </button>
      </form>

      {data.checkinHistory.length ? (
        <section className="panel">
          <div className="panel__header"><h2>Letzte Tage</h2></div>
          <div className="rows">
            {data.checkinHistory.slice(0, 10).map((c) => (
              <div className="history-row" key={c.id}>
                <div className="history-row__badge">{c.mood ?? '-'}/10</div>
                <div>
                  <strong>{formatShortDate(c.date)}{c.mood ? ` · ${moodLabel(c.mood)}` : ''}</strong>
                  {c.mainGoal || c.gratitude ? <span>{c.mainGoal || c.gratitude}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Screen>
  );
}

function Slider({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return (
    <label className="range-row range-row--styled">
      <span>{label}</span>
      <strong>{value}/10</strong>
      <input style={{ ['--range-value' as string]: `${((value - 1) / 9) * 100}%` }} type="range" min="1" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} />
    </label>
  );
}
