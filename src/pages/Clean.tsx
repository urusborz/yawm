import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, HeartHandshake, Lock, PiggyBank, RotateCcw, ShieldCheck, Sprout } from 'lucide-react';
import { Screen, SimpleHeader, EmptyState } from '../components/ui';
import { useData } from '../store';
import { daysBetween, formatShortDate, viennaDate } from '../lib/dates';
import { money } from '../lib/format';

const MILESTONES = [7, 30, 90, 180, 365];

export default function Clean() {
  const data = useData();
  const settings = data.sobrietySettings;
  const today = viennaDate();

  const [substance, setSubstance] = useState(settings?.substance ?? '');
  const [startDate, setStartDate] = useState(settings?.cleanStartDate ?? today);
  const [goal, setGoal] = useState(settings?.goalNote ?? '');

  const todayLog = data.sobrietyLogs.find((l) => l.date === today);
  const [craving, setCraving] = useState(String(todayLog?.cravingLevel ?? 3));
  const [trigger, setTrigger] = useState(todayLog?.triggerNote ?? '');
  const [reflection, setReflection] = useState(todayLog?.reflection ?? '');
  const [perDay, setPerDay] = useState<number>(() => Number(localStorage.getItem('yawm-clean-perday')) || 0);

  const hasSetup = Boolean(settings?.cleanStartDate);
  const currentStreak = settings?.cleanStartDate ? Math.max(0, daysBetween(settings.cleanStartDate, today)) : 0;
  const longest = Math.max(settings?.longestStreakDays ?? 0, currentStreak);
  const nextMilestone = MILESTONES.find((m) => currentStreak < m);
  const lastMilestone = [...MILESTONES].reverse().find((m) => currentStreak >= m) ?? 0;
  const milestoneProgress = nextMilestone ? (currentStreak - lastMilestone) / (nextMilestone - lastMilestone) : 1;
  const savings = perDay > 0 ? currentStreak * perDay : 0;
  const cravingLogs = [...data.sobrietyLogs].filter((l) => l.cravingLevel).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  function setSavingsRate(v: number) { const n = Math.max(0, v); setPerDay(n); localStorage.setItem('yawm-clean-perday', String(n)); }

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
            <span className="eyebrow">Aktueller Streak</span>
            <strong>{currentStreak}<small> Tage</small></strong>
            <p>clean seit {formatShortDate(settings!.cleanStartDate!)}{settings?.substance ? ` · ${settings.substance}` : ''}</p>
            <div className="clean-hero__stats">
              <div><b>{longest}</b><span>längster Streak</span></div>
              <div><b>{data.sobrietyLogs.filter((l) => l.clean).length}</b><span>Check-ins</span></div>
              {perDay > 0 ? <div><b>{money(savings)}</b><span>gespart</span></div> : null}
            </div>
            {settings?.goalNote ? <div className="clean-hero__goal"><HeartHandshake size={14} /> {settings.goalNote}</div> : null}
          </motion.section>

          <section className="panel">
            <div className="panel__header"><h2><Award size={17} /> Meilensteine</h2>{nextMilestone ? <span>noch {nextMilestone - currentStreak} T</span> : <span>alle erreicht 🎉</span>}</div>
            <div className="miles">
              {MILESTONES.map((m) => {
                const done = currentStreak >= m;
                return <div key={m} className={done ? 'mile mile--done' : 'mile'}><b>{m}</b><span>{done ? '✓' : 'Tage'}</span></div>;
              })}
            </div>
            {nextMilestone ? <div className="prayer-card__bar" style={{ marginTop: 12 }}><motion.span initial={false} animate={{ width: `${Math.round(milestoneProgress * 100)}%` }} /></div> : null}
          </section>

          <section className="panel">
            <div className="panel__header"><h2><PiggyBank size={17} /> Ersparnis</h2></div>
            <label className="switch-row"><span>Kosten pro Tag (€)</span>
              <input className="field field--mini" inputMode="decimal" value={perDay || ''} onChange={(e) => setSavingsRate(Number(e.target.value.replace(',', '.')) || 0)} placeholder="0" />
            </label>
            {perDay > 0 ? <p className="form-hint">Bisher gespart: <b>{money(savings)}</b> · hochgerechnet 1 Jahr: {money(perDay * 365)}</p> : <p className="form-hint">Trag deinen früheren Tagesverbrauch ein, um deine Ersparnis zu sehen.</p>}
          </section>

          {cravingLogs.length > 1 ? (
            <section className="panel">
              <div className="panel__header"><h2>Verlangen (14 Tage)</h2></div>
              <div className="habit-week">
                {cravingLogs.map((l) => (
                  <div className="habit-week__col" key={l.date}>
                    <div className="habit-week__bar" style={{ height: `${(l.cravingLevel! / 10) * 100}%`, background: l.cravingLevel! >= 7 ? 'var(--danger)' : 'var(--accent)' }} />
                    <span>{Number(l.date.slice(8))}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <form className="panel compose" onSubmit={saveDaily}>
            <div className="panel__header"><h2>Heutiger Check-in</h2>{todayLog ? <span className="pill pill--success">erledigt</span> : null}</div>
            <label className="range-row"><span>Verlangen (Craving)</span><strong>{craving}/10</strong><input style={{ ['--range-value' as string]: `${((Number(craving) - 1) / 9) * 100}%` }} type="range" min="1" max="10" value={craving} onChange={(e) => setCraving(e.target.value)} /></label>
            <input className="field" value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Auslöser heute? (optional)" />
            <textarea className="field field--textarea" value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Reflexion – was hat geholfen?" />
            <button className="primary-button" type="submit"><ShieldCheck size={18} /> Check-in speichern</button>
          </form>

          <button className="soft-danger" type="button" onClick={relapse}><RotateCcw size={17} /> Rückfall eintragen (sanfter Neustart)</button>

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
