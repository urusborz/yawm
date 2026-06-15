import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake, Lock, RotateCcw, ShieldCheck, Sprout } from 'lucide-react';
import { Screen, SimpleHeader, EmptyState } from '../components/ui';
import { useData } from '../store';
import { daysBetween, formatShortDate, viennaDate } from '../lib/dates';

export default function Clean() {
  const data = useData();
  const settings = data.sobrietySettings;
  const today = viennaDate();

  // setup form
  const [substance, setSubstance] = useState(settings?.substance ?? '');
  const [startDate, setStartDate] = useState(settings?.cleanStartDate ?? today);
  const [goal, setGoal] = useState(settings?.goalNote ?? '');

  // daily form
  const todayLog = data.sobrietyLogs.find((l) => l.date === today);
  const [craving, setCraving] = useState(String(todayLog?.cravingLevel ?? 3));
  const [trigger, setTrigger] = useState(todayLog?.triggerNote ?? '');
  const [reflection, setReflection] = useState(todayLog?.reflection ?? '');

  const hasSetup = Boolean(settings?.cleanStartDate);
  const currentStreak = settings?.cleanStartDate ? Math.max(0, daysBetween(settings.cleanStartDate, today)) : 0;
  const longest = Math.max(settings?.longestStreakDays ?? 0, currentStreak);

  async function saveSetup(e: FormEvent) {
    e.preventDefault();
    await data.saveSobrietySettings({ substance: substance.trim(), cleanStartDate: startDate, goalNote: goal.trim() || undefined });
  }

  async function saveDaily(e: FormEvent) {
    e.preventDefault();
    await data.saveSobrietyLog({ clean: true, cravingLevel: Number(craving), triggerNote: trigger.trim() || undefined, reflection: reflection.trim() || undefined });
  }

  async function relapse() {
    if (!window.confirm('Rückfall eintragen? Dein längster Streak bleibt erhalten – wir starten sanft neu.')) return;
    await data.registerRelapse();
  }

  return (
    <Screen>
      <SimpleHeader title="Clean-Tracker" subtitle="Privat · nur für dich" icon={<Lock size={20} />} />

      {!hasSetup ? (
        <form className="panel compose" onSubmit={saveSetup}>
          <EmptyState icon={<Sprout size={26} />} title="Einrichten" hint="Setze deinen Startpunkt. Niemand sonst sieht diese Daten." />
          <input className="field" value={substance} onChange={(e) => setSubstance(e.target.value)} placeholder="Worauf verzichtest du? (z. B. Nikotin)" />
          <label className="field-label">Clean seit</label>
          <input className="field" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={today} />
          <input className="field" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Dein Warum / Ziel (optional)" />
          <button className="primary-button" type="submit"><ShieldCheck size={18} /> Tracker starten</button>
        </form>
      ) : (
        <>
          <motion.section className="clean-hero" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="clean-hero__glow" aria-hidden />
            <span className="eyebrow">Aktueller Streak</span>
            <strong>{currentStreak}<small> Tage</small></strong>
            <p>clean seit {formatShortDate(settings!.cleanStartDate!)}{settings?.substance ? ` · ${settings.substance}` : ''}</p>
            <div className="clean-hero__stats">
              <div><b>{longest}</b><span>längster Streak</span></div>
              <div><b>{data.sobrietyLogs.filter((l) => l.clean).length}</b><span>Check-ins</span></div>
            </div>
            {settings?.goalNote ? <div className="clean-hero__goal"><HeartHandshake size={14} /> {settings.goalNote}</div> : null}
          </motion.section>

          <form className="panel compose" onSubmit={saveDaily}>
            <div className="panel__header"><h2>Heutiger Check-in</h2>{todayLog ? <span className="pill pill--success">erledigt</span> : null}</div>
            <label className="range-row">
              <span>Verlangen (Craving)</span>
              <strong>{craving}/10</strong>
              <input type="range" min="1" max="10" value={craving} onChange={(e) => setCraving(e.target.value)} />
            </label>
            <input className="field" value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Auslöser heute? (optional)" />
            <textarea className="field field--textarea" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Reflexion – was hat geholfen?" />
            <button className="primary-button" type="submit"><ShieldCheck size={18} /> Check-in speichern</button>
          </form>

          <button className="soft-danger" type="button" onClick={relapse}>
            <RotateCcw size={17} /> Rückfall eintragen (sanfter Neustart)
          </button>

          {data.sobrietyLogs.length ? (
            <section className="panel">
              <div className="panel__header"><h2>Verlauf</h2></div>
              <div className="rows">
                {data.sobrietyLogs.slice(0, 10).map((l) => (
                  <div className="history-row" key={l.date}>
                    <div className={l.clean ? 'history-row__badge history-row__badge--ok' : 'history-row__badge history-row__badge--bad'}>{l.clean ? '✓' : '↺'}</div>
                    <div>
                      <strong>{formatShortDate(l.date)}{l.cravingLevel ? ` · Craving ${l.cravingLevel}/10` : ''}</strong>
                      {l.triggerNote || l.reflection ? <span>{l.triggerNote || l.reflection}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
