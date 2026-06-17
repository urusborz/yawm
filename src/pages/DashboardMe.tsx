import { motion } from 'framer-motion';
import { BookOpen, CalendarClock, ChevronRight, CircleDollarSign, ClipboardCheck, Flame, Moon, Plus, Sparkles, Target, UsersRound } from 'lucide-react';
import { Screen, Ring, EmptyState } from '../components/ui';
import { PrayerCard } from '../components/PrayerCard';
import { TaskRow } from '../components/TaskRow';
import { useData } from '../store';
import type { View } from '../components/Shell';
import type { QuickAddType } from '../components/QuickAdd';
import { dayProgress, daysBetween, formatTime, formatToday, getGreeting, viennaDate } from '../lib/dates';
import { initials } from '../lib/format';
import { getNextPrayer } from '../lib/prayer-times';

type TimelineItem = {
  key: string;
  title: string;
  meta: string;
  icon: JSX.Element;
  tone: string;
  onClick: () => void;
};

export default function DashboardMe({ now, setView, onAdd }: { now: Date; setView: (v: View) => void; onAdd: (t: QuickAddType) => void }) {
  const data = useData();
  const today = viennaDate();

  const privateTasks = data.tasks.filter((t) => t.scope === 'private');
  const privateOpen = privateTasks.filter((t) => !t.done);
  const sharedOpen = data.tasks.filter((t) => t.scope === 'shared' && !t.done).length;
  const openBills = data.bills.filter((b) => b.status === 'open').length;
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
  const nextPrayer = getNextPrayer(data.prayerToday.times.filter((t) => t.name !== 'Sunrise'), now);
  const focusTitle = privateOpen[0]?.title || nextEvent?.title || (data.checkinToday ? 'Ruhig weitergehen' : 'Check-in starten');
  const focusMeta = nextEvent ? `${formatTime(nextEvent.startsAt)} · ${nextEvent.location || 'Termin'}` : `${privateOpen.length} offene private Aufgaben`;

  const timeline: TimelineItem[] = [
    {
      key: 'prayer',
      title: `${nextPrayer.next.name} in ${nextPrayer.countdown}${nextPrayer.seconds}`,
      meta: 'Nächstes Gebet',
      icon: <Moon size={16} />,
      tone: 'prayer',
      onClick: () => setView('prayer'),
    },
    ...(nextEvent ? [{
      key: 'event',
      title: nextEvent.title,
      meta: `${formatTime(nextEvent.startsAt)}${nextEvent.location ? ` · ${nextEvent.location}` : ''}`,
      icon: <CalendarClock size={16} />,
      tone: 'event',
      onClick: () => setView('calendar'),
    }] : []),
    ...(privateOpen[0] ? [{
      key: 'task',
      title: privateOpen[0].title,
      meta: privateOpen[0].priority === 'high' ? 'Hohe Priorität' : 'Nächste Aufgabe',
      icon: <ClipboardCheck size={16} />,
      tone: 'task',
      onClick: () => setView('tasks'),
    }] : []),
    {
      key: 'quran',
      title: quranToday > 0 ? `${quranToday} Minuten gelesen` : 'Quran-Session eintragen',
      meta: quranToday > 0 ? 'Heute dokumentiert' : 'Noch offen für heute',
      icon: <BookOpen size={16} />,
      tone: 'quran',
      onClick: () => setView('quran'),
    },
    {
      key: 'checkin',
      title: data.checkinToday ? 'Check-in erledigt' : 'Daily Check-in offen',
      meta: data.checkinToday ? 'Reflexion gespeichert' : '2 Minuten für dich',
      icon: <Sparkles size={16} />,
      tone: 'checkin',
      onClick: () => setView('checkin'),
    },
  ];

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

      <section className="today-card today-card--alive">
        <div className="today-card__top">
          <div>
            <span className="eyebrow">Heute</span>
            <h2>{focusTitle}</h2>
            <p>{focusMeta}</p>
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

      <section className="quick-actions" aria-label="Schnellaktionen">
        <button type="button" onClick={() => onAdd('task')}><Plus size={16} /><span>Aufgabe</span></button>
        <button type="button" onClick={() => setView('quran')}><BookOpen size={16} /><span>Quran</span></button>
        <button type="button" onClick={() => setView('checkin')}><Sparkles size={16} /><span>Check-in</span></button>
      </section>

      <section className="daily-compass" aria-label="Tagesstatus">
        <button className="daily-compass__item daily-compass__item--task" type="button" onClick={() => setView('tasks')}>
          <ClipboardCheck size={16} />
          <span>Nächster Schritt</span>
          <strong>{privateOpen[0]?.title || 'Alles frei'}</strong>
        </button>
        <button className="daily-compass__item daily-compass__item--family" type="button" onClick={() => setView('family')}>
          <UsersRound size={16} />
          <span>Familie</span>
          <strong>{sharedOpen ? `${sharedOpen} geteilt offen` : 'Ruhig'}</strong>
        </button>
        <button className="daily-compass__item daily-compass__item--bill" type="button" onClick={() => setView('bills')}>
          <CircleDollarSign size={16} />
          <span>Haushalt</span>
          <strong>{openBills ? `${openBills} Rechnungen` : 'Bezahlt'}</strong>
        </button>
      </section>

      <section className="panel timeline-panel">
        <div className="panel__header"><h2>Heute auf einen Blick</h2><button type="button" onClick={() => setView('calendar')}>Plan</button></div>
        <div className="day-timeline">
          {timeline.map((item) => (
            <button className={`timeline-item timeline-item--${item.tone}`} type="button" key={item.key} onClick={item.onClick}>
              <span className="timeline-item__icon">{item.icon}</span>
              <span className="timeline-item__body"><strong>{item.title}</strong><small>{item.meta}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <PrayerCard prayerDay={data.prayerToday} now={now} isFallback={data.prayerIsFallback} onOpen={() => setView('prayer')} />

      {habitsToday.length ? (
        <section className="panel panel--color panel--habits">
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
      ) : (
        <section className="panel panel--color panel--habits">
          <EmptyState icon={<Target size={24} />} title="Noch keine Habits" hint="Lege einen kleinen täglichen Rhythmus an." actionLabel="Habit anlegen" onAction={() => setView('habits')} />
        </section>
      )}

      <section className="panel">
        <div className="panel__header">
          <h2>Top-Aufgaben</h2>
          <button type="button" onClick={() => setView('tasks')}>{privateOpen.length} offen</button>
        </div>
        <div className="rows">
          {topTasks.length ? topTasks.map((t) => <TaskRow key={t.id} task={t} onToggle={data.toggleTask} />) : <EmptyState icon={<ClipboardCheck size={24} />} title="Keine privaten Aufgaben" hint="Tippe auf + und plane den nächsten kleinen Schritt." actionLabel="Aufgabe anlegen" onAction={() => onAdd('task')} />}
        </div>
      </section>

      <section className="panel panel--color panel--events">
        <div className="panel__header"><h2><CalendarClock size={17} /> Heute</h2><button type="button" onClick={() => setView('calendar')}>Kalender</button></div>
        <div className="rows">
          {todaysEvents.length ? todaysEvents.map((e) => (
            <div className="event-row" key={e.id}>
              <span className="time-badge">{formatTime(e.startsAt)}</span>
              <div><strong>{e.title}</strong>{e.location ? <span>{e.location}</span> : null}</div>
              {e.scope === 'shared' ? <span className="owner-chip">{data.initialsOf(e.ownerId)}</span> : null}
            </div>
          )) : <EmptyState icon={<CalendarClock size={24} />} title="Kein Termin heute" hint="Der Tag hat Luft. Nutze sie bewusst." actionLabel="Termin planen" onAction={() => onAdd('event')} />}
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
