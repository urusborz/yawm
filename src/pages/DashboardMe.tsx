import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Flame, ClipboardCheck, Sparkles, Target } from 'lucide-react';
import { Screen, Ring } from '../components/ui';
import { PrayerCard } from '../components/PrayerCard';
import { TaskRow } from '../components/TaskRow';
import { useData } from '../store';
import type { View } from '../components/Shell';
import { dayProgress, daysBetween, formatTime, formatToday, getGreeting, viennaDate } from '../lib/dates';
import { initials } from '../lib/format';

export default function DashboardMe({ now, setView }: { now: Date; setView: (v: View) => void }) {
  const data = useData();
  const today = viennaDate();

  const privateOpen = data.tasks.filter((t) => t.scope === 'private' && !t.done);
  const topTasks = data.tasks.filter((t) => t.scope === 'private').slice(0, 4);
  const quranToday = data.quran.filter((q) => q.date === today).reduce((s, q) => s + q.minutes, 0);
  const cleanDays = data.sobrietySettings?.cleanStartDate ? Math.max(0, daysBetween(data.sobrietySettings.cleanStartDate, today)) : null;
  const todaysEvents = data.events
    .filter((e) => viennaDate(new Date(e.startsAt)) === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const habitsToday = data.habits.slice(0, 3);

  return (
    <Screen>
      <header className="screen-header">
        <div>
          <span>{formatToday(now)}</span>
          <h1>{getGreeting(now, data.profileName)}</h1>
        </div>
        <span className="avatar">{initials(data.profileName)}</span>
      </header>

      <div className="daybar"><motion.span initial={{ width: 0 }} animate={{ width: `${dayProgress(now)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div>

      <PrayerCard prayerDay={data.prayerToday} now={now} isFallback={data.prayerIsFallback} onOpen={() => setView('prayer')} />

      <section className="stats-grid">
        <button className="stat-tile" type="button" onClick={() => setView('clean')}>
          <div className="stat-tile__icon"><Flame size={20} /></div>
          <strong>{cleanDays === null ? '–' : cleanDays}</strong>
          <span>Tage clean</span>
        </button>
        <button className="stat-tile" type="button" onClick={() => setView('quran')}>
          <div className="stat-tile__icon"><BookOpen size={20} /></div>
          <strong>{quranToday}<small> min</small></strong>
          <span>Quran heute</span>
        </button>
        <button className="stat-tile" type="button" onClick={() => setView('tasks')}>
          <div className="stat-tile__icon"><ClipboardCheck size={20} /></div>
          <strong>{privateOpen.length}</strong>
          <span>offene Tasks</span>
        </button>
      </section>

      {habitsToday.length ? (
        <section className="panel">
          <div className="panel__header">
            <h2>Habits</h2>
            <button type="button" onClick={() => setView('habits')}>alle</button>
          </div>
          <div className="ring-row">
            {habitsToday.map((h) => (
              <button key={h.id} className="ring-chip" type="button" onClick={() => setView('habits')}>
                <Ring progress={h.targetValue ? h.todayValue / h.targetValue : 0} size={56} stroke={5} color={h.color} track="var(--line)">
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((h.targetValue ? h.todayValue / h.targetValue : 0) * 100)}%</span>
                </Ring>
                <span>{h.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <h2>Top-Aufgaben</h2>
          <button type="button" onClick={() => setView('tasks')}>{privateOpen.length} offen</button>
        </div>
        <div className="rows">
          {topTasks.length ? topTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={data.toggleTask} />) : <p className="muted">Keine privaten Aufgaben. Tippe auf +.</p>}
        </div>
      </section>

      {todaysEvents.length ? (
        <section className="panel">
          <div className="panel__header"><h2>Heute</h2><button type="button" onClick={() => setView('calendar')}>Kalender</button></div>
          <div className="rows">
            {todaysEvents.map((e) => (
              <div className="event-row" key={e.id}>
                <span className="time-badge">{formatTime(e.startsAt)}</span>
                <div><strong>{e.title}</strong>{e.location ? <span>{e.location}</span> : null}</div>
                {e.scope === 'shared' ? <span className="owner-chip">{data.initialsOf(e.ownerId)}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <button className={data.checkinToday ? 'checkin checkin--done' : 'checkin'} type="button" onClick={() => setView('checkin')}>
        {data.checkinToday ? <Target size={20} /> : <Sparkles size={20} />}
        <span>{data.checkinToday ? 'Check-in ansehen' : 'Daily Check-in starten'}</span>
        <ChevronRight size={18} />
      </button>
    </Screen>
  );
}
