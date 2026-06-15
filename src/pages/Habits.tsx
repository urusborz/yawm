import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BookOpen, Droplet, Dumbbell, Flame, Heart, Minus, Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Ring, EmptyState, Pill } from '../components/ui';
import { useData } from '../store';
import { formatWeekday, lastNDates } from '../lib/dates';
import type { ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  Flame: <Flame size={18} />, BookOpen: <BookOpen size={18} />, Droplet: <Droplet size={18} />,
  Dumbbell: <Dumbbell size={18} />, Heart: <Heart size={18} />, Moon: <Moon size={18} />,
  Sun: <Sun size={18} />, Activity: <Activity size={18} />,
};
const ICON_KEYS = Object.keys(ICONS);
const COLORS = ['#6c8ef5', '#34c77b', '#f59e0b', '#db2777', '#0ea5e9', '#a855f7'];

export default function Habits() {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('mal');
  const [target, setTarget] = useState('1');
  const [icon, setIcon] = useState('Flame');
  const [color, setColor] = useState(COLORS[0]);
  const weekLabels = lastNDates(7).map((d) => formatWeekday(d)[0]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await data.createHabit({ name: name.trim(), unit: unit.trim() || 'mal', targetValue: Number(target) || 1, icon, color });
    setName(''); setUnit('mal'); setTarget('1'); setOpen(false);
  }

  return (
    <Screen>
      <SimpleHeader title="Habits" subtitle="Privat" action={<button className="header-add" type="button" onClick={() => setOpen((v) => !v)}><Plus size={18} /></button>} />

      <AnimatePresence>
        {open ? (
          <motion.form className="panel compose" onSubmit={submit} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (z. B. Wasser trinken)" autoFocus />
            <div className="form-grid">
              <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Einheit" />
              <input className="field" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Tagesziel" />
            </div>
            <div className="picker-row">
              {ICON_KEYS.map((k) => <button key={k} type="button" className={icon === k ? 'picker active' : 'picker'} onClick={() => setIcon(k)}>{ICONS[k]}</button>)}
            </div>
            <div className="picker-row">
              {COLORS.map((c) => <button key={c} type="button" className={color === c ? 'swatch active' : 'swatch'} style={{ background: c }} onClick={() => setColor(c)} />)}
            </div>
            <button className="primary-button" type="submit"><Plus size={18} /> Habit erstellen</button>
          </motion.form>
        ) : null}
      </AnimatePresence>

      {data.habits.length === 0 && !open ? (
        <EmptyState icon={<Flame size={26} />} title="Noch keine Habits" hint="Tippe oben auf +, um deinen ersten Habit anzulegen." />
      ) : null}

      <div className="habit-list">
        <AnimatePresence initial={false}>
          {data.habits.map((h) => {
            const pct = h.targetValue ? Math.min(1, h.todayValue / h.targetValue) : 0;
            const maxWeek = Math.max(h.targetValue, ...h.weekValues, 1);
            return (
              <motion.div className="panel habit-card" key={h.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                <div className="habit-card__top">
                  <Ring progress={pct} size={62} stroke={6} color={h.color} track="var(--line)">
                    <span style={{ color: h.color }}>{ICONS[h.icon] ?? ICONS.Flame}</span>
                  </Ring>
                  <div className="habit-card__info">
                    <strong>{h.name}</strong>
                    <span>{h.todayValue} / {h.targetValue} {h.unit}</span>
                    <div className="habit-streak"><Flame size={13} /> {h.streak} Tage Streak</div>
                  </div>
                  <div className="stepper">
                    <button type="button" onClick={() => data.logHabit(h.id, Math.max(0, h.todayValue - 1))} aria-label="weniger"><Minus size={16} /></button>
                    <button type="button" className="stepper__plus" style={{ background: h.color }} onClick={() => data.logHabit(h.id, h.todayValue + 1)} aria-label="mehr"><Plus size={16} /></button>
                  </div>
                </div>
                <div className="habit-week">
                  {h.weekValues.map((v, i) => (
                    <div className="habit-week__col" key={i}>
                      <div className="habit-week__bar" style={{ height: `${Math.max(8, (v / maxWeek) * 100)}%`, background: v >= h.targetValue ? h.color : 'var(--line)' }} />
                      <span>{weekLabels[i]}</span>
                    </div>
                  ))}
                </div>
                <button className="habit-card__delete" type="button" onClick={() => data.deleteHabit(h.id)}><Trash2 size={14} /> Löschen</button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Screen>
  );
}
