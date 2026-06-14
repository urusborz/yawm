import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
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
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { currentUser, habitSummary, initialBills, initialEvents, initialNotes, initialTasks, prayerTimes } from './data/mock';
import { dayProgress, daysUntil, formatShortDate, formatTime, formatToday, getGreeting } from './lib/dates';
import { getNextPrayer } from './lib/prayer-times';
import type { Bill, FamilyEvent, Note, Scope, Task } from './types';

type View = 'me' | 'family' | 'tasks' | 'notes' | 'calendar' | 'prayer' | 'settings';
type QuickAddType = 'task' | 'event' | 'bill' | 'note';

const themeNames = ['slate', 'emerald', 'rose', 'midnight'] as const;
const ADMIN_PASSWORD_KEY = 'yawm-admin-password';
const ADMIN_SESSION_KEY = 'yawm-admin-session';

function money(value: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(value);
}

function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function encodePassword(value: string) {
  return window.btoa(unescape(encodeURIComponent(value)));
}

function AdminGate({ children }: { children: ReactNode }) {
  const [hasAdmin, setHasAdmin] = useState(() => Boolean(window.localStorage.getItem(ADMIN_PASSWORD_KEY)));
  const [isUnlocked, setIsUnlocked] = useState(() => window.localStorage.getItem(ADMIN_SESSION_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password.trim().length < 4) {
      setError('Mindestens 4 Zeichen.');
      return;
    }

    if (!hasAdmin) {
      window.localStorage.setItem(ADMIN_PASSWORD_KEY, encodePassword(password));
      window.localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setHasAdmin(true);
      setIsUnlocked(true);
      return;
    }

    if (window.localStorage.getItem(ADMIN_PASSWORD_KEY) === encodePassword(password)) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsUnlocked(true);
      return;
    }

    setError('Passwort stimmt nicht.');
  }

  if (isUnlocked) return <>{children}</>;

  return (
    <div className="admin-screen" data-theme="slate" data-mode="dark">
      <form className="admin-card" onSubmit={submit}>
        <div className="brand-mark">Y</div>
        <span>Yawm Admin</span>
        <h1>{hasAdmin ? 'Einloggen' : 'Admin anlegen'}</h1>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError('');
          }}
          placeholder={hasAdmin ? 'Admin-Passwort' : 'Neues Passwort'}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit">
          <ShieldCheck size={18} />
          {hasAdmin ? 'Entsperren' : 'Admin speichern'}
        </button>
      </form>
    </div>
  );
}

function StatTile({ icon, value, label, locked }: { icon: ReactNode; value: ReactNode; label: string; locked?: boolean }) {
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
  initialType,
  onClose,
  onCreateTask,
  onCreateBill,
  onCreateEvent,
  onCreateNote,
}: {
  open: boolean;
  initialType: QuickAddType;
  onClose: () => void;
  onCreateTask: (title: string, scope: Scope, dueAt?: string) => void;
  onCreateBill: (bill: Omit<Bill, 'id' | 'status'>) => void;
  onCreateEvent: (event: Omit<FamilyEvent, 'id'>) => void;
  onCreateNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
}) {
  const [type, setType] = useState<QuickAddType>(initialType);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('private');
  const [dueAt, setDueAt] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open) setType(initialType);
  }, [initialType, open]);

  function reset() {
    setTitle('');
    setScope('private');
    setDueAt('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime('18:00');
    setLocation('');
    setContent('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() && type !== 'note') return;

    if (type === 'task') onCreateTask(title.trim(), scope, dueAt || undefined);
    if (type === 'bill') {
      onCreateBill({
        title: title.trim(),
        amount: Number(amount.replace(',', '.')) || 0,
        dueDate: date,
        category: 'Haushalt',
      });
    }
    if (type === 'event') {
      onCreateEvent({
        title: title.trim(),
        startsAt: `${date}T${time}:00+02:00`,
        location: location.trim() || undefined,
        scope,
      });
    }
    if (type === 'note') {
      onCreateNote({
        title: title.trim() || 'Schnelle Notiz',
        content: content.trim(),
        scope,
      });
    }

    reset();
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
            <div className="type-grid">
              {(['task', 'event', 'bill', 'note'] as QuickAddType[]).map((item) => (
                <button className={type === item ? 'active' : ''} key={item} type="button" onClick={() => setType(item)}>
                  {item === 'task' ? 'Aufgabe' : item === 'event' ? 'Termin' : item === 'bill' ? 'Rechnung' : 'Notiz'}
                </button>
              ))}
            </div>
            <input className="field" data-testid="quick-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === 'note' ? 'Titel optional' : 'Titel'} />
            {type === 'note' ? (
              <textarea className="field field--textarea" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Notiz" />
            ) : null}
            {type === 'task' ? <input className="field" type="time" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /> : null}
            {type === 'event' || type === 'bill' ? (
              <div className="form-grid">
                <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                {type === 'event' ? <input className="field" type="time" value={time} onChange={(event) => setTime(event.target.value)} /> : null}
                {type === 'bill' ? <input className="field" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Betrag" /> : null}
              </div>
            ) : null}
            {type === 'event' ? <input className="field" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ort" /> : null}
            {type === 'task' || type === 'event' || type === 'note' ? (
              <div className="segmented">
                <button className={scope === 'private' ? 'active' : ''} type="button" onClick={() => setScope('private')}>
                  Privat
                </button>
                <button className={scope === 'shared' ? 'active' : ''} type="button" onClick={() => setScope('shared')}>
                  Geteilt
                </button>
              </div>
            ) : null}
            <button className="primary-button" type="submit">
              <Plus size={18} />
              Speichern
            </button>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CheckinSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [mood, setMood] = useState('7');
  const [goal, setGoal] = useState('');
  const [gratitude, setGratitude] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem(
      'yawm-checkin-today',
      JSON.stringify({ mood, goal, gratitude, savedAt: new Date().toISOString() })
    );
    onSave();
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="sheet__backdrop" type="button" onClick={onClose} aria-label="Schliessen" />
          <motion.form className="sheet__panel" onSubmit={submit} initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}>
            <div className="sheet__handle" />
            <div className="sheet__header">
              <h2>Daily Check-in</h2>
              <button className="icon-button" type="button" onClick={onClose} title="Schliessen">
                <X size={18} />
              </button>
            </div>
            <label className="range-row">
              <span>Stimmung</span>
              <strong>{mood}/10</strong>
              <input type="range" min="1" max="10" value={mood} onChange={(event) => setMood(event.target.value)} />
            </label>
            <input className="field" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Hauptziel heute" />
            <textarea className="field field--textarea" value={gratitude} onChange={(event) => setGratitude(event.target.value)} placeholder="Wofuer bist du dankbar?" />
            <button className="primary-button" type="submit">
              <ShieldCheck size={18} />
              Check-in speichern
            </button>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PrayerCard({ now, onOpen }: { now: Date; onOpen: () => void }) {
  const nextPrayer = useMemo(() => getNextPrayer(prayerTimes, now), [now]);
  const dash = 251.3 * (1 - nextPrayer.progress);

  return (
    <button className="prayer-card" type="button" onClick={onOpen}>
      <div className="prayer-card__header">
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
    </button>
  );
}

function MeDashboard({
  now,
  tasks,
  onToggleTask,
  checkinDone,
  onOpenCheckin,
  onOpenPrayer,
}: {
  now: Date;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  checkinDone: boolean;
  onOpenCheckin: () => void;
  onOpenPrayer: () => void;
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
      <PrayerCard now={now} onOpen={onOpenPrayer} />
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
      <button className={checkinDone ? 'checkin checkin--done' : 'checkin'} type="button" onClick={onOpenCheckin}>
        <Sparkles size={21} />
        <span>{checkinDone ? 'Check-in ansehen' : 'Daily Check-in'}</span>
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
  onToggleBill,
  onOpenAdd,
}: {
  tasks: Task[];
  bills: Bill[];
  events: FamilyEvent[];
  onToggleTask: (id: string) => void;
  onToggleBill: (id: string) => void;
  onOpenAdd: (type: QuickAddType) => void;
}) {
  const sharedTasks = tasks.filter((task) => task.scope === 'shared');
  const openBills = bills.filter((bill) => bill.status === 'open');
  const billTotal = openBills.reduce((sum, bill) => sum + bill.amount, 0);
  const dueValues = openBills.map((bill) => daysUntil(bill.dueDate));
  const nextDue = dueValues.length ? Math.min(...dueValues) : 0;

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
          <button type="button" onClick={() => onOpenAdd('bill')}>{nextDue <= 0 ? 'faellig' : `in ${nextDue} Tagen`}</button>
        </div>
        <strong className="total">{money(billTotal)}</strong>
        <p>{openBills.length} Rechnungen offen</p>
        <div className="rows rows--compact">
          {bills.map((bill) => (
            <button className={bill.status === 'paid' ? 'bill-row bill-row--paid' : 'bill-row'} key={bill.id} type="button" onClick={() => onToggleBill(bill.id)}>
              <CircleDollarSign size={20} />
              <div>
                <strong>{bill.title}</strong>
                <span>{formatShortDate(bill.dueDate)} - {bill.category}</span>
              </div>
              <b>{bill.status === 'paid' ? 'bezahlt' : money(bill.amount)}</b>
            </button>
          ))}
        </div>
        <button className="inline-action" type="button" onClick={() => onOpenAdd('bill')}>
          <Plus size={17} />
          Rechnung
        </button>
      </section>
      <section className="panel">
        <div className="panel__header">
          <h2>Termine</h2>
          <button type="button" onClick={() => onOpenAdd('event')}>{events.filter((event) => event.scope === 'shared').length}</button>
        </div>
        <div className="rows">
          {events
            .filter((event) => event.scope === 'shared')
            .map((event) => (
              <button className="event-row" key={event.id} type="button" onClick={() => onOpenAdd('event')}>
                <div className="date-badge">
                  <strong>{new Date(event.startsAt).getDate()}</strong>
                  <span>Jun</span>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatTime(event.startsAt)}{event.location ? ` - ${event.location}` : ''}</span>
                </div>
              </button>
            ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel__header">
          <h2>Geteilte Aufgaben</h2>
          <button type="button" onClick={() => onOpenAdd('task')}>{sharedTasks.filter((task) => !task.done).length} offen</button>
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

function TasksView({ tasks, onToggleTask, onCreateTask, onDeleteTask }: { tasks: Task[]; onToggleTask: (id: string) => void; onCreateTask: (title: string, scope: Scope, dueAt?: string) => void; onDeleteTask: (id: string) => void }) {
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
        <input className="field" data-testid="task-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Neue Aufgabe" />
        <div className="segmented">
          <button className={scope === 'private' ? 'active' : ''} type="button" onClick={() => setScope('private')}>Privat</button>
          <button className={scope === 'shared' ? 'active' : ''} type="button" onClick={() => setScope('shared')}>Geteilt</button>
        </div>
      </form>
      <section className="panel">
        <div className="rows">
          {tasks.map((task) => (
            <div className="managed-row" key={task.id}>
              <TaskRow task={task} onToggle={onToggleTask} />
              <button className="delete-button" type="button" onClick={() => onDeleteTask(task.id)} title="Aufgabe loeschen">
                <Trash2 size={16} />
              </button>
            </div>
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
    setNotes([{ id: crypto.randomUUID(), title: 'Schnelle Notiz', content: content.trim(), createdAt: new Date().toISOString(), scope: 'private' }, ...notes]);
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
        <button className="primary-button" type="submit"><Plus size={18} />Speichern</button>
      </form>
      <div className="note-grid">
        {notes.map((note) => (
          <article className="note-card" key={note.id}>
            <div className="note-card__header">
              <span>{note.scope === 'private' ? 'Privat' : 'Geteilt'}</span>
              <button className="delete-button" type="button" onClick={() => setNotes(notes.filter((item) => item.id !== note.id))} title="Notiz loeschen">
                <Trash2 size={16} />
              </button>
            </div>
            <h2>{note.title}</h2>
            <p>{note.content}</p>
          </article>
        ))}
      </div>
    </motion.div>
  );
}

function SettingsView({ setView, mode, setMode, theme, setTheme, onReset, onLogout }: { setView: (view: View) => void; mode: 'dark' | 'light'; setMode: (mode: 'dark' | 'light') => void; theme: string; setTheme: (theme: (typeof themeNames)[number]) => void; onReset: () => void; onLogout: () => void }) {
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
            <strong>Lokaler Admin-Modus</strong>
            <span>Daten bleiben vorerst auf diesem Geraet. Supabase bleibt aus.</span>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="theme-grid theme-grid--wide">
          {themeNames.map((name) => (
            <button className={theme === name ? 'theme-dot active' : 'theme-dot'} data-dot={name} key={name} type="button" onClick={() => setTheme(name)} title={name} />
          ))}
        </div>
        <button className="menu-row" type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
          {mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{mode === 'dark' ? 'Dunkelmodus' : 'Hellmodus'}</span>
        </button>
      </section>
      <section className="panel">
        <button className="menu-row" type="button" onClick={() => setView('prayer')}><Sun size={20} /><span>Gebetszeiten</span></button>
        <button className="menu-row" type="button" onClick={() => setView('notes')}><NotebookPen size={20} /><span>Notizen</span></button>
        <button className="menu-row" type="button" onClick={onLogout}><Lock size={20} /><span>Admin sperren</span></button>
        <button className="menu-row danger-row" type="button" onClick={onReset}><X size={20} /><span>Lokale Daten zuruecksetzen</span></button>
      </section>
    </motion.div>
  );
}

function GenericListView({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="simple-header"><h1>{title}</h1>{icon}</header>
      {children}
    </motion.div>
  );
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [view, setView] = usePersistentState<View>('yawm-view', 'me');
  const [theme, setTheme] = usePersistentState<(typeof themeNames)[number]>('yawm-theme', 'slate');
  const [mode, setMode] = usePersistentState<'dark' | 'light'>('yawm-mode', 'dark');
  const [tasks, setTasks] = usePersistentState<Task[]>('yawm-tasks', initialTasks);
  const [bills, setBills] = usePersistentState<Bill[]>('yawm-bills', initialBills);
  const [events, setEvents] = usePersistentState<FamilyEvent[]>('yawm-events', initialEvents);
  const [notes, setNotes] = usePersistentState<Note[]>('yawm-notes', initialNotes);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<QuickAddType>('task');
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinDone, setCheckinDone] = usePersistentState('yawm-checkin-done', habitSummary.checkinDone);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  function openAdd(type: QuickAddType) {
    setQuickAddType(type);
    setQuickAddOpen(true);
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function toggleBill(id: string) {
    setBills((current) => current.map((bill) => (bill.id === id ? { ...bill, status: bill.status === 'paid' ? 'open' : 'paid' } : bill)));
  }

  function createTask(title: string, scope: Scope, dueAt?: string) {
    setTasks((current) => [{ id: crypto.randomUUID(), title, scope, dueAt, done: false, ownerInitials: currentUser.initials, priority: 'normal' }, ...current]);
  }

  function resetLocalData() {
    if (!window.confirm('Lokale Yawm-Daten auf diesem Geraet zuruecksetzen?')) return;
    ['yawm-tasks', 'yawm-bills', 'yawm-events', 'yawm-notes', 'yawm-checkin-done', 'yawm-checkin-today'].forEach((key) => window.localStorage.removeItem(key));
    setTasks(initialTasks);
    setBills(initialBills);
    setEvents(initialEvents);
    setNotes(initialNotes);
    setCheckinDone(false);
  }

  function logoutAdmin() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.reload();
  }

  return (
    <AdminGate>
    <div className="app" data-theme={theme} data-mode={mode}>
      <div className="app-shell">
        <aside className="desktop-rail">
          <div className="brand-mark">Y</div>
          <button className={view === 'me' ? 'rail-button active' : 'rail-button'} data-testid="rail-me" type="button" onClick={() => setView('me')} title="Ich"><UserRound size={21} /></button>
          <button className={view === 'family' ? 'rail-button active' : 'rail-button'} data-testid="rail-family" type="button" onClick={() => setView('family')} title="Familie"><UsersRound size={21} /></button>
          <button className={view === 'tasks' ? 'rail-button active' : 'rail-button'} data-testid="rail-tasks" type="button" onClick={() => setView('tasks')} title="Tasks"><ClipboardCheck size={21} /></button>
          <button className={view === 'settings' ? 'rail-button active' : 'rail-button'} data-testid="rail-settings" type="button" onClick={() => setView('settings')} title="Mehr"><Settings size={21} /></button>
        </aside>

        <main className="phone-frame">
          <div className="status-bar"><span>{new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' }).format(now)}</span><div><Moon size={14} /><span>100%</span></div></div>
          <div className="notch" />
          <div className="content">
            <AnimatePresence mode="wait">
              {view === 'me' ? <MeDashboard key="me" now={now} tasks={tasks} onToggleTask={toggleTask} checkinDone={checkinDone} onOpenCheckin={() => setCheckinOpen(true)} onOpenPrayer={() => setView('prayer')} /> : null}
              {view === 'family' ? <FamilyDashboard key="family" tasks={tasks} bills={bills} events={events} onToggleTask={toggleTask} onToggleBill={toggleBill} onOpenAdd={openAdd} /> : null}
              {view === 'tasks' ? <TasksView key="tasks" tasks={tasks} onToggleTask={toggleTask} onCreateTask={createTask} onDeleteTask={deleteTask} /> : null}
              {view === 'notes' ? <NotesView key="notes" notes={notes} setNotes={setNotes} /> : null}
              {view === 'calendar' ? (
                <GenericListView key="calendar" title="Kalender" icon={<CalendarDays size={25} />}>
                  <section className="panel">
                    <button className="inline-action inline-action--top" type="button" onClick={() => openAdd('event')}><Plus size={17} />Termin</button>
                    <div className="rows">
                      {events.map((event) => (
                        <div className="managed-row" key={event.id}>
                          <div className="event-row">
                            <div className="date-badge"><strong>{new Date(event.startsAt).getDate()}</strong><span>Jun</span></div>
                            <div><strong>{event.title}</strong><span>{formatTime(event.startsAt)}{event.location ? ` - ${event.location}` : ''}</span></div>
                          </div>
                          <button className="delete-button" type="button" onClick={() => setEvents((current) => current.filter((item) => item.id !== event.id))} title="Termin loeschen">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </GenericListView>
              ) : null}
              {view === 'prayer' ? (
                <GenericListView key="prayer" title="Gebetszeiten" icon={<Sun size={25} />}>
                  <PrayerCard now={now} onOpen={() => undefined} />
                  <section className="panel">
                    <div className="rows">
                      {prayerTimes.map((prayer) => <div className="menu-row" key={prayer.name}><Sun size={18} /><span>{prayer.name}</span><strong>{prayer.time}</strong></div>)}
                    </div>
                  </section>
                </GenericListView>
              ) : null}
              {view === 'settings' ? <SettingsView key="settings" setView={setView} mode={mode} setMode={setMode} theme={theme} setTheme={setTheme} onReset={resetLocalData} onLogout={logoutAdmin} /> : null}
            </AnimatePresence>
          </div>
          <button className="fab" type="button" onClick={() => openAdd('task')} title="Hinzufuegen"><Plus size={26} /></button>
          <BottomNav view={view} setView={setView} />
          <QuickAdd
            open={quickAddOpen}
            initialType={quickAddType}
            onClose={() => setQuickAddOpen(false)}
            onCreateTask={createTask}
            onCreateBill={(bill) => setBills((current) => [{ ...bill, id: crypto.randomUUID(), status: 'open' }, ...current])}
            onCreateEvent={(event) => setEvents((current) => [{ ...event, id: crypto.randomUUID() }, ...current])}
            onCreateNote={(note) => setNotes((current) => [{ ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current])}
          />
          <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} onSave={() => setCheckinDone(true)} />
          <div className="home-indicator" />
        </main>

        <aside className="control-panel">
          <div><span>Yawm</span><h1>v0 App</h1></div>
          <div className="theme-grid">
            {themeNames.map((name) => <button className={theme === name ? 'theme-dot active' : 'theme-dot'} data-dot={name} key={name} type="button" onClick={() => setTheme(name)} title={name} />)}
          </div>
          <button className="mode-toggle" type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>{mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}{mode === 'dark' ? 'Dunkel' : 'Hell'}</button>
          <div className="setup-list"><span><Check size={14} /> Lokale Persistenz</span><span><Check size={14} /> Mobile Shell</span><span><Check size={14} /> Supabase vorbereitet</span></div>
        </aside>
      </div>
    </div>
    </AdminGate>
  );
}
