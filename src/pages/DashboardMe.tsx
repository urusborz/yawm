import { motion } from 'framer-motion';
import { BookOpen, CalendarClock, ChevronRight, ClipboardCheck, Flame, Sparkles, Target } from 'lucide-react';
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

  const privateTasks = data.tasks.filter((t) => t.scope === 'private');
  const privateOpen = privateTasks.filter((t) => !t.done);
  const topTasks = [...privateTasks].sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 4);
  const quranToday = data.quran.filter((q) => q.date === today).reduce((s, q) => s + q.minutes, 0);
  const cleanDays = data.sobrietySettings?.cleanStartDate ? Math.max(0, daysBetween(data.sobrietySettings.cleanStartDate, today)) : null;
  const todaysEvents = data.events
    .filter((e) => viennaDate(new Date(e.startsAt)) === today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const habitsToday = data.habits.slice(0, 3);
  const nextEvent = todaysEvents[0];
  const liveTime = new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Vienna' }).format(now);
  const [timeMain, timeSeconds] = liveTime.replace(/\./g, ':').split(/:(?=\d{2}$)/);

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

      <section className="today-card">
        <div className="today-card__top">
          <div>
            <span className="eyebrow">Heute</span>
            <h2>{privateOpen[0]?.title || (nextEvent ? nextEvent.title : 'Ruhig starten')}</h2>
            <p>{nextEvent ? `${formatTime(nextEvent.startsAt)} · ${nextEvent.location || 'Termin'}` : `${privateOpen.length} offene private Aufgaben`}</p>
          </div>
          <div className="today-time" aria-label={`Aktuelle Uhrzeit ${liveTime}`}>
            <span>{timeMain}</span>
            <strong>{timeSeconds}</strong>
          </div>
        </div>
        <div className="today-metrics">
          <button type="button" onClick={() => setView('tasks')}>
            <ClipboardCheck size={16} />
            <strong>{privateOpen.length}</strong>
            <span>offen</span>
          </button>
          <button type="button" onClick={() => setView('quran')}>
            <BookOpen size={16} />
            <strong>{quranToday}</strong>
            <span>Quran min</span>
          </button>
          <button type="button" onClick={() => setView('clean')}>
            <Flame size={16} />
            <strong>{cleanDays === null ? '-' : cleanDays}</strong>
            <span>clean</span>
          </button>
        </div>
      </section>

      <PrayerCard prayerDay={data.prayerToday} now={now} isFallback={data.prayerIsFallback} onOpen={() => setView('prayer')} />

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

      <section className="panel">
        <div className="panel__header"><h2><CalendarClock size={17} /> Heute</h2><button type="button" onClick={() => setView('calendar')}>Kalender</button></div>
        <div className="rows">
          {todaysEvents.length ? todaysEvents.map((e) => (
            <div className="event-row" key={e.id}>
              <span className="time-badge">{formatTime(e.startsAt)}</span>
              <div><strong>{e.title}</strong>{e.location ? <span>{e.location}</span> : null}</div>
              {e.scope === 'shared' ? <span className="owner-chip">{data.initialsOf(e.ownerId)}</span> : null}
            </div>
          )) : <p className="muted">Keine Termine heute.</p>}
        </div>
      </section>

      <button className={data.checkinToday ? 'checkin checkin--done' : 'checkin'} type="button" onClick={() => setView('checkin')}>
        {data.checkinToday ? <Target size={20} /> : <Sparkles size={20} />}
        <span>{data.checkinToday ? 'Check-in ansehen' : 'Daily Check-in starten'}</span>
        <ChevronRight size={18} />
      </button>
    </Screen>
  );
}
