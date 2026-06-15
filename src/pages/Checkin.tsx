import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Screen, SimpleHeader } from '../components/ui';
import { useData } from '../store';
import { formatShortDate } from '../lib/dates';

const MOOD_EMOJI = ['😞', '😕', '😐', '🙂', '😄'];

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    await data.saveCheckin({ mood, energy, focus, stress, gratitude: gratitude.trim(), mainGoal: mainGoal.trim(), reflection: reflection.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Screen>
      <SimpleHeader title="Daily Check-in" subtitle="Privat · nur für dich" icon={<Lock size={20} />} />

      <motion.div className="checkin-mood" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <span className="checkin-mood__emoji">{MOOD_EMOJI[Math.min(4, Math.floor((mood - 1) / 2))]}</span>
        <div>
          <span className="eyebrow">Stimmung heute</span>
          <strong>{mood}/10</strong>
        </div>
      </motion.div>

      <form className="panel compose" onSubmit={submit}>
        <Slider label="Stimmung" value={mood} setValue={setMood} />
        <Slider label="Energie" value={energy} setValue={setEnergy} />
        <Slider label="Fokus" value={focus} setValue={setFocus} />
        <Slider label="Stress" value={stress} setValue={setStress} />
        <input className="field" value={mainGoal} onChange={(e) => setMainGoal(e.target.value)} placeholder="Hauptziel heute" />
        <input className="field" value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="Wofür bist du dankbar?" />
        <textarea className="field field--textarea" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Freie Reflexion (optional)" />
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
                <div className="history-row__badge">{MOOD_EMOJI[Math.min(4, Math.floor(((c.mood ?? 5) - 1) / 2))]}</div>
                <div>
                  <strong>{formatShortDate(c.date)}{c.mood ? ` · Stimmung ${c.mood}/10` : ''}</strong>
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
    <label className="range-row">
      <span>{label}</span>
      <strong>{value}/10</strong>
      <input type="range" min="1" max="10" value={value} onChange={(e) => setValue(Number(e.target.value))} />
    </label>
  );
}
