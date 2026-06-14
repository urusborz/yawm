import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Flame,
  Heart,
  Home,
  Lock,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  currentUser,
  habitSummary,
  initialBills,
  initialEvents,
  initialNotes,
  initialTasks,
  prayerTimes,
} from './data/mock';
import { dayProgress, daysUntil, formatShortDate, formatTime, formatToday, getGreeting } from './lib/dates';
import { getNextPrayer } from './lib/prayer-times';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type { Bill, FamilyEvent, Note, Scope, Task } from './types';

type View = 'me' | 'family' | 'tasks' | 'notes' | 'calendar' | 'prayer' | 'settings';

const themeNames = ['slate', 'emerald', 'rose', 'midnight'] as const;

function money(value: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);
}

function StatTile({
  icon,
  value,
  label,
  locked,
}: {
  icon: ReactNode;
  value: React.ReactNode;
  label: string;
  locked?: boolean;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__icon">
        {icon}
        {locked ? <Lock size={13} /> : null}
      </div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <button className="task-row" type="button" onClick={() => onToggle(task.id)}>
      <span className={task.done ? 'task-check task-check--done' : 'task-check'}>{task.done ? <Check size={14} /> : null}</span>
      <span className={task.done ? 'task-title task-title--done' : 'task-title'}>{task.title}</span>
      {task.dueAt ? <span className="muted-chip">{task.dueAt}</span> : null}
      {task.scope === 'shared' ? <span className="owner-chip">{task.ownerInitials}</span> : null}
    </button>
  );
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  const items: Array<{ view: View; label: string; icon: ReactNode }> = [
    { view: 'me', label: 'Ich', icon: <Home size={22} /> },
    { view: 'calendar', label: 'Kalender', icon: <CalendarDays size={22} /> },
    { view: 'tasks', label: 'Tasks', icon: <ClipboardCheck size={22} /> },
    { view: 'family', label: 'Familie', icon: <Heart size={22} /> },
    { view: 'settings', label: 'Mehr', icon: <MoreHorizontal size={22} /> },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          className={view === item.view ? 'bottom-nav__item bottom-nav__item--active' : 'bottom-nav__item'}
          data-testid={`bottom-nav-${item.view}`}
          key={item.view}
          type="button"
          onClick={() => setView(item.view)}
          title={item.label}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function QuickAdd({
  open,
  onClose,
  onCreateTask,
}: {
  open: boolean;
  onClose: () => void;
  onCreateTask: (title: string, scope: Scope) => void;
}) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('private');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onCreateTask(title.trim(), scope);
    setTitle('');
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="sheet__backdrop" type="button" onClick={onClose} aria-label="Schliessen" />
          <motion.form
            className="sheet__panel"
            onSubmit={submit}
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          >
            <div className="sheet__handle" />
            <div className="sheet__header">
              <h2>Schnell hinzufuegen</h2>
              <button className="icon-button" type="button" onClick={onClose} title="Schliessen">
                <X size={18} />
              </button>
            </div>
            <input
              className="field"
              data-testid="quick-task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Aufgabe"
            />
            <div className="segmented">
              <button className={scope === 'private' ? 'active' : ''} type="button" onClick={() => setScope('private')}>
                Privat
              </button>
              <button className={scope === 'shared' ? 'active' : ''} type="button" onClick={() => setScope('shared')}>
                Geteilt
              </button>
            </div>
            <button className="primary-button" type="submit">
              <Plus size={18} />
              Hinzufuegen
            </button>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PrayerCard({ now }: { now: Date }) {
  const nextPrayer = useMemo(() => getNextPrayer(prayerTimes, now), [now]);
  const dash = 251.3 * (1 - nextPrayer.progress);

  return (
    <section className="prayer-card">
      <div>
        <span className="eyebrow">Naechstes Gebet</span>
        <h2>{nextPrayer.next.name}</h2>
        <p>{nextPrayer.next.time} Uhr</p>
      </div>
      <div className="prayer-card__countdown">
        <div>
          <strong>{nextPrayer.countdown}</strong>
          <span>{nextPrayer.seconds}</span>
        </div>
        <small>bis zum Gebet</small>
      </div>
      <svg className="progress-ring" width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="40" />
        <circle cx="46" cy="46" r="40" style={{ strokeDashoffset: dash }} />
      </svg>
      <div className="prayer-dots">
        {prayerTimes.map((prayer, index) => (
          <span className={index === nextPrayer.index ? 'active' : ''} key={prayer.name} title={`${prayer.name} ${prayer.time}`} />
        ))}
      </div>
    </section>
  );
}

function MeDashboard({
  now,
  tasks,
  onToggleTask,
  checkinDone,
  setCheckinDone,
}: {
  now: Date;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  checkinDone: boolean;
  setCheckinDone: (value: boolean) => void;
}) {
  const privateTasks = tasks.filter((task) => task.scope === 'private');
  const openTasks = privateTasks.filter((task) => !task.done);

  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="screen-header">
        <div>
          <span>{formatToday(now)}</span>
          <h1>{getGreeting(now, currentUser.name)}</h1>
        </div>
        <div className="avatar">{currentUser.initials}</div>
      </header>
      <div className="daybar">
        <span style={{ width: `${dayProgress(now)}%` }} />
      </div>

      <PrayerCard now={now} />

      <section className="stats-grid">
        <StatTile icon={<Flame size={20} />} value={habitSummary.cleanDays} label="Tage clean" locked />
        <StatTile icon={<BookOpen size={20} />} value={<>{habitSummary.quranMinutesToday} min</>} label="Quran heute" locked />
        <StatTile icon={<ClipboardCheck size={20} />} value={openTasks.length} label="offene Tasks" />
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Top-Aufgaben</h2>
          <span>{openTasks.length} offen</span>
        </div>
        <div className="rows">
          {privateTasks.slice(0, 4).map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggleTask} />
          ))}
        </div>
      </section>

      <button className={checkinDone ? 'checkin checkin--done' : 'checkin'} type="button" onClick={() => setCheckinDone(!checkinDone)}>
        <Sparkles size={21} />
        <span>{checkinDone ? 'Check-in erledigt' : 'Daily Check-in'}</span>
        <ShieldCheck size={18} />
      </button>
    </motion.div>
  );
}

function FamilyDashboard({
  tasks,
  bills,
  events,
  onToggleTask,
}: {
  tasks: Task[];
  bills: Bill[];
  events: FamilyEvent[];
  onToggleTask: (id: string) => void;
}) {
  const sharedTasks = tasks.filter((task) => task.scope === 'shared');
  const openBills = bills.filter((bill) => bill.status === 'open');
  const billTotal = openBills.reduce((sum, bill) => sum + bill.amount, 0);
  const nextDue = Math.min(...openBills.map((bill) => daysUntil(bill.dueDate)));

  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="screen-header">
        <div>
          <span>Gemeinsam</span>
          <h1>{currentUser.householdName}</h1>
        </div>
        <div className="avatar-stack">
          <span>{currentUser.initials}</span>
          <span>{currentUser.spouseInitials}</span>
        </div>
      </header>

      <section className="panel panel--accent">
        <div className="panel__header">
          <h2>Offene Rechnungen</h2>
          <span>{nextDue <= 0 ? 'faellig' : `in ${nextDue} Tagen`}</span>
        </div>
        <strong className="total">{money(billTotal)}</strong>
        <p>{openBills.length} Rechnungen offen</p>
        <div className="rows rows--compact">
          {openBills.map((bill) => (
            <div className="bill-row" key={bill.id}>
              <CircleDollarSign size={20} />
              <div>
                <strong>{bill.title}</strong>
                <span>{formatShortDate(bill.dueDate)} · {bill.category}</span>
              </div>
              <b>{money(bill.amount)}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Termine</h2>
          <span>{events.filter((event) => event.scope === 'shared').length}</span>
        </div>
        <div className="rows">
          {events
            .filter((event) => event.scope === 'shared')
            .map((event) => (
              <div className="event-row" key={event.id}>
                <div className="date-badge">
                  <strong>{new Date(event.startsAt).getDate()}</strong>
                  <span>Jun</span>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatTime(event.startsAt)}{event.location ? ` · ${event.location}` : ''}</span>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Geteilte Aufgaben</h2>
          <span>{sharedTasks.filter((task) => !task.done).length} offen</span>
        </div>
        <div className="rows">
          {sharedTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggleTask} />
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function TasksView({ tasks, onToggleTask, onCreateTask }: { tasks: Task[]; onToggleTask: (id: string) => void; onCreateTask: (title: string, scope: Scope) => void }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('private');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onCreateTask(title.trim(), scope);
    setTitle('');
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="simple-header">
        <h1>Aufgaben</h1>
        <ClipboardCheck size={25} />
      </header>
      <form className="compose" onSubmit={submit}>
        <input
          className="field"
          data-testid="task-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Neue Aufgabe"
        />
        <div className="segmented">
          <button className={scope === 'private' ? 'active' : ''} type="button" onClick={() => setScope('private')}>
            Privat
          </button>
          <button className={scope === 'shared' ? 'active' : ''} type="button" onClick={() => setScope('shared')}>
            Geteilt
          </button>
        </div>
      </form>
      <section className="panel">
        <div className="rows">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggleTask} />
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function NotesView({ notes, setNotes }: { notes: Note[]; setNotes: (notes: Note[]) => void }) {
  const [content, setContent] = useState('');

  function addNote(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setNotes([
      {
        id: crypto.randomUUID(),
        title: 'Schnelle Notiz',
        content: content.trim(),
        createdAt: new Date().toISOString(),
        scope: 'private',
      },
      ...notes,
    ]);
    setContent('');
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="simple-header">
        <h1>Notizen</h1>
        <NotebookPen size={25} />
      </header>
      <form className="compose" onSubmit={addNote}>
        <textarea className="field field--textarea" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Gedanke festhalten" />
        <button className="primary-button" type="submit">
          <Plus size={18} />
          Speichern
        </button>
      </form>
      <div className="note-grid">
        {notes.map((note) => (
          <article className="note-card" key={note.id}>
            <span>{note.scope === 'private' ? 'Privat' : 'Geteilt'}</span>
            <h2>{note.title}</h2>
            <p>{note.content}</p>
          </article>
        ))}
      </div>
    </motion.div>
  );
}

function SettingsView({ setView }: { setView: (view: View) => void }) {
  const [email, setEmail] = useState('');
  const [authStatus, setAuthStatus] = useState('');

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setAuthStatus(error ? error.message : 'Magic-Link wurde versendet.');
  }

  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="simple-header">
        <h1>Mehr</h1>
        <Settings size={25} />
      </header>
      <section className="panel">
        <div className="setup-row">
          <ShieldCheck size={22} />
          <div>
            <strong>{isSupabaseConfigured ? 'Supabase verbunden' : 'Lokaler Entwurf'}</strong>
            <span>{isSupabaseConfigured ? 'Auth und Datenbank koennen genutzt werden.' : '.env.local fehlt noch.'}</span>
          </div>
        </div>
        {isSupabaseConfigured ? (
          <form className="auth-form" onSubmit={signIn}>
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-Mail" />
            <button className="primary-button" type="submit">
              <Bell size={18} />
              Magic-Link
            </button>
            {authStatus ? <p>{authStatus}</p> : null}
          </form>
        ) : null}
      </section>
      <section className="panel">
        <button className="menu-row" type="button" onClick={() => setView('prayer')}>
          <Sun size={20} />
          <span>Gebetszeiten</span>
        </button>
        <button className="menu-row" type="button" onClick={() => setView('notes')}>
          <NotebookPen size={20} />
          <span>Notizen</span>
        </button>
      </section>
    </motion.div>
  );
}

function GenericListView({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="simple-header">
        <h1>{title}</h1>
        {icon}
      </header>
      {children}
    </motion.div>
  );
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState<View>('me');
  const [theme, setTheme] = useState<(typeof themeNames)[number]>('slate');
  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [checkinDone, setCheckinDone] = useState(habitSummary.checkinDone);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function createTask(title: string, scope: Scope) {
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title,
        scope,
        done: false,
        ownerInitials: currentUser.initials,
        priority: 'normal',
      },
      ...current,
    ]);
  }

  return (
    <div className="app" data-theme={theme} data-mode={mode}>
      <div className="app-shell">
        <aside className="desktop-rail">
          <div className="brand-mark">Y</div>
          <button className={view === 'me' ? 'rail-button active' : 'rail-button'} data-testid="rail-me" type="button" onClick={() => setView('me')} title="Ich">
            <UserRound size={21} />
          </button>
          <button className={view === 'family' ? 'rail-button active' : 'rail-button'} data-testid="rail-family" type="button" onClick={() => setView('family')} title="Familie">
            <UsersRound size={21} />
          </button>
          <button className={view === 'tasks' ? 'rail-button active' : 'rail-button'} data-testid="rail-tasks" type="button" onClick={() => setView('tasks')} title="Tasks">
            <ClipboardCheck size={21} />
          </button>
          <button className={view === 'settings' ? 'rail-button active' : 'rail-button'} data-testid="rail-settings" type="button" onClick={() => setView('settings')} title="Mehr">
            <Settings size={21} />
          </button>
        </aside>

        <main className="phone-frame">
          <div className="status-bar">
            <span>{new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' }).format(now)}</span>
            <div>
              <Moon size={14} />
              <span>100%</span>
            </div>
          </div>
          <div className="notch" />
          <div className="content">
            <AnimatePresence mode="wait">
              {view === 'me' ? (
                <MeDashboard
                  key="me"
                  now={now}
                  tasks={tasks}
                  onToggleTask={toggleTask}
                  checkinDone={checkinDone}
                  setCheckinDone={setCheckinDone}
                />
              ) : null}
              {view === 'family' ? (
                <FamilyDashboard key="family" tasks={tasks} bills={initialBills} events={initialEvents} onToggleTask={toggleTask} />
              ) : null}
              {view === 'tasks' ? <TasksView key="tasks" tasks={tasks} onToggleTask={toggleTask} onCreateTask={createTask} /> : null}
              {view === 'notes' ? <NotesView key="notes" notes={notes} setNotes={setNotes} /> : null}
              {view === 'calendar' ? (
                <GenericListView key="calendar" title="Kalender" icon={<CalendarDays size={25} />}>
                  <section className="panel">
                    <div className="rows">
                      {initialEvents.map((event) => (
                        <div className="event-row" key={event.id}>
                          <div className="date-badge">
                            <strong>{new Date(event.startsAt).getDate()}</strong>
                            <span>Jun</span>
                          </div>
                          <div>
                            <strong>{event.title}</strong>
                            <span>{formatTime(event.startsAt)}{event.location ? ` · ${event.location}` : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </GenericListView>
              ) : null}
              {view === 'prayer' ? (
                <GenericListView key="prayer" title="Gebetszeiten" icon={<Sun size={25} />}>
                  <PrayerCard now={now} />
                  <section className="panel">
                    <div className="rows">
                      {prayerTimes.map((prayer) => (
                        <div className="menu-row" key={prayer.name}>
                          <Sun size={18} />
                          <span>{prayer.name}</span>
                          <strong>{prayer.time}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </GenericListView>
              ) : null}
              {view === 'settings' ? <SettingsView key="settings" setView={setView} /> : null}
            </AnimatePresence>
          </div>
          <button className="fab" type="button" onClick={() => setQuickAddOpen(true)} title="Hinzufuegen">
            <Plus size={26} />
          </button>
          <BottomNav view={view} setView={setView} />
          <QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen(false)} onCreateTask={createTask} />
          <div className="home-indicator" />
        </main>

        <aside className="control-panel">
          <div>
            <span>Yawm</span>
            <h1>v0 Fundament</h1>
          </div>
          <div className="theme-grid">
            {themeNames.map((name) => (
              <button
                className={theme === name ? 'theme-dot active' : 'theme-dot'}
                data-dot={name}
                key={name}
                type="button"
                onClick={() => setTheme(name)}
                title={name}
              />
            ))}
          </div>
          <button className="mode-toggle" type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
            {mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            {mode === 'dark' ? 'Dunkel' : 'Hell'}
          </button>
          <div className="setup-list">
            <span><Check size={14} /> PWA Shell</span>
            <span><Check size={14} /> RLS Migration</span>
            <span><Check size={14} /> Supabase Adapter</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
