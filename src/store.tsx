import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import * as db from './lib/db';
import { errMsg, initials } from './lib/format';
import { daysBetween, viennaDate } from './lib/dates';
import type {
  Bill,
  DailyCheckin,
  FamilyEvent,
  HabitWithProgress,
  Household,
  NotificationPreferences,
  Note,
  PrayerDay,
  Priority,
  QuranSession,
  Scope,
  ShoppingItem,
  SobrietyLog,
  SobrietySettings,
  Task,
} from './types';

export const FALLBACK_PRAYERS: PrayerDay = {
  date: viennaDate(),
  times: [
    { name: 'Fajr', time: '03:18' },
    { name: 'Sunrise', time: '05:02' },
    { name: 'Dhuhr', time: '13:01' },
    { name: 'Asr', time: '17:18' },
    { name: 'Maghrib', time: '20:54' },
    { name: 'Isha', time: '22:38' },
  ],
};

type Workspace = Awaited<ReturnType<typeof db.loadWorkspace>>;

/** Fills owner/payer initials on freshly loaded rows using household members. */
function enrichWorkspace(ws: Workspace, household: Household): Workspace {
  const nameOf = (id: string) => household.members.find((m) => m.userId === id)?.displayName || 'Mitglied';
  const ini = (id: string) => initials(nameOf(id));
  return {
    ...ws,
    tasks: ws.tasks.map((t) => ({ ...t, ownerInitials: ini(t.ownerId) })),
    bills: ws.bills.map((b) => ({ ...b, paidByInitials: b.paidById ? ini(b.paidById) : undefined })),
  };
}

type DataContextValue = {
  user: User;
  household: Household;
  profileName: string;
  syncState: string;
  prayerIsFallback: boolean;

  tasks: Task[];
  bills: Bill[];
  events: FamilyEvent[];
  notes: Note[];
  shopping: ShoppingItem[];
  habits: HabitWithProgress[];
  quran: QuranSession[];
  checkinToday: DailyCheckin | null;
  checkinHistory: DailyCheckin[];
  sobrietySettings: SobrietySettings | null;
  sobrietyLogs: SobrietyLog[];
  prayerToday: PrayerDay;
  prayerWeek: PrayerDay[];
  notificationPrefs: NotificationPreferences;

  nameOf: (userId: string) => string;
  initialsOf: (userId: string) => string;
  refresh: () => Promise<void>;

  createTask: (input: { title: string; description?: string; scope: Scope; priority?: Priority; dueAt?: string | null }) => Promise<void>;
  updateTask: (id: string, patch: Partial<{ title: string; description: string | null; priority: Priority; dueAt: string | null; status: Task['status'] }>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  createEvent: (input: { title: string; description?: string; startsAt: string; endsAt?: string | null; location?: string; scope: Scope }) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  createNote: (input: { title: string; content: string; tags?: string[]; scope: Scope }) => Promise<void>;
  updateNote: (id: string, patch: { title?: string; content?: string; tags?: string[] }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  createBill: (input: { title: string; amount: number; dueDate: string; category: string; note?: string; repeatRule?: string }) => Promise<void>;
  toggleBill: (id: string) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;

  createShoppingItem: (input: { title: string; quantity?: string }) => Promise<void>;
  toggleShopping: (id: string) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;

  createHabit: (input: { name: string; unit: string; targetValue: number; icon: string; color: string }) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  logHabit: (habitTypeId: string, value: number) => Promise<void>;

  addQuranSession: (input: { minutes: number; surah?: string; ayahFrom?: number; ayahTo?: number; note?: string }) => Promise<void>;
  deleteQuranSession: (id: string) => Promise<void>;

  saveSobrietySettings: (input: { substance: string; cleanStartDate?: string; goalNote?: string }) => Promise<void>;
  saveSobrietyLog: (input: { clean: boolean; cravingLevel?: number; triggerNote?: string; reflection?: string }) => Promise<void>;
  registerRelapse: () => Promise<void>;

  saveCheckin: (input: { mood?: number; energy?: number; focus?: number; stress?: number; gratitude?: string; mainGoal?: string; reflection?: string }) => Promise<void>;

  saveNotificationPrefs: (prefs: NotificationPreferences) => Promise<void>;
  renameHousehold: (name: string) => Promise<void>;
  setProfileName: (name: string) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

// ---------------------------------------------------------------------------
// Auth gate state machine (used by App)
// ---------------------------------------------------------------------------
export type AuthState =
  | { phase: 'loading' }
  | { phase: 'unconfigured' }
  | { phase: 'signed-out' }
  | { phase: 'onboarding'; user: User }
  | { phase: 'ready'; user: User; household: Household; workspace: Workspace; profileName: string; prayerIsFallback: boolean };

export function useAuthGate() {
  const [state, setState] = useState<AuthState>({ phase: 'loading' });
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setState({ phase: 'unconfigured' });
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const boot = useCallback(async (user: User) => {
    try {
      await db.ensureProfile(user);
      const household = await db.getMyHousehold();
      if (!household) {
        setState({ phase: 'onboarding', user });
        return;
      }
      const workspace = await db.loadWorkspace(household.id, user.id);
      setState({
        phase: 'ready',
        user,
        household,
        workspace,
        profileName: household.members.find((m) => m.userId === user.id)?.displayName || user.email?.split('@')[0] || 'Nutzer',
        prayerIsFallback: !workspace.prayerToday,
      });
    } catch (error) {
      console.error(error);
      setState({ phase: 'onboarding', user });
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (session?.user) {
      setState((prev) => (prev.phase === 'ready' && prev.user.id === session.user.id ? prev : { phase: 'loading' }));
      boot(session.user);
    } else if (state.phase !== 'unconfigured') {
      setState({ phase: 'signed-out' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return { state, setState, reboot: boot };
}

// ---------------------------------------------------------------------------
// Data provider (mounted only when auth phase === 'ready')
// ---------------------------------------------------------------------------
export function DataProvider({
  user,
  household: initialHousehold,
  workspace: initialWorkspace,
  profileName,
  prayerIsFallback: initialFallback,
  children,
}: {
  user: User;
  household: Household;
  workspace: Workspace;
  profileName: string;
  prayerIsFallback: boolean;
  children: ReactNode;
}) {
  const [household, setHousehold] = useState(initialHousehold);
  const [ws, setWs] = useState(() => enrichWorkspace(initialWorkspace, initialHousehold));
  const [syncState, setSyncState] = useState('Supabase verbunden');
  const fallbackRef = useRef(initialFallback);

  const nameOf = useCallback(
    (userId: string) => household.members.find((m) => m.userId === userId)?.displayName || 'Mitglied',
    [household]
  );
  const initialsOf = useCallback((userId: string) => initials(nameOf(userId)), [nameOf]);

  const enrichTask = useCallback((t: Task): Task => ({ ...t, ownerInitials: initialsOf(t.ownerId) }), [initialsOf]);
  const enrichBill = useCallback(
    (b: Bill): Bill => ({ ...b, paidByInitials: b.paidById ? initialsOf(b.paidById) : undefined }),
    [initialsOf]
  );

  const fail = useCallback((error: unknown, fallback: string) => {
    setSyncState(errMsg(error, fallback));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setSyncState('Synchronisiere…');
      const next = await db.loadWorkspace(household.id, user.id);
      fallbackRef.current = !next.prayerToday;
      setWs(enrichWorkspace(next, household));
      setSyncState('Supabase verbunden');
    } catch (error) {
      fail(error, 'Sync fehlgeschlagen');
    }
  }, [household.id, user.id, fail]);

  // --- Tasks ---
  const createTask = useCallback<DataContextValue['createTask']>(async (input) => {
    try {
      const saved = await db.createTask({ ...input, householdId: household.id, userId: user.id });
      setWs((p) => ({ ...p, tasks: [enrichTask(saved), ...p.tasks] }));
    } catch (e) { fail(e, 'Aufgabe nicht gespeichert'); }
  }, [household.id, user.id, enrichTask, fail]);

  const updateTask = useCallback<DataContextValue['updateTask']>(async (id, patch) => {
    setWs((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch, done: patch.status ? patch.status === 'done' : t.done } as Task : t)) }));
    try {
      const saved = await db.updateTask(id, patch);
      setWs((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? enrichTask(saved) : t)) }));
    } catch (e) { fail(e, 'Aufgabe nicht aktualisiert'); }
  }, [enrichTask, fail]);

  const toggleTask = useCallback<DataContextValue['toggleTask']>(async (id) => {
    const task = ws.tasks.find((t) => t.id === id);
    if (!task) return;
    const done = !task.done;
    setWs((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done, status: done ? 'done' : 'open' } : t)) }));
    try {
      const saved = await db.setTaskDone(id, done);
      setWs((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? enrichTask(saved) : t)) }));
    } catch (e) { fail(e, 'Aufgabe nicht gespeichert'); }
  }, [ws.tasks, enrichTask, fail]);

  const deleteTask = useCallback<DataContextValue['deleteTask']>(async (id) => {
    const prev = ws.tasks;
    setWs((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }));
    try { await db.deleteTask(id); } catch (e) { setWs((p) => ({ ...p, tasks: prev })); fail(e, 'Aufgabe nicht geloescht'); }
  }, [ws.tasks, fail]);

  // --- Events ---
  const createEvent = useCallback<DataContextValue['createEvent']>(async (input) => {
    try {
      const saved = await db.createEvent({ ...input, householdId: household.id, userId: user.id });
      setWs((p) => ({ ...p, events: [...p.events, saved].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }));
    } catch (e) { fail(e, 'Termin nicht gespeichert'); }
  }, [household.id, user.id, fail]);

  const deleteEvent = useCallback<DataContextValue['deleteEvent']>(async (id) => {
    const prev = ws.events;
    setWs((p) => ({ ...p, events: p.events.filter((ev) => ev.id !== id) }));
    try { await db.deleteEvent(id); } catch (e) { setWs((p) => ({ ...p, events: prev })); fail(e, 'Termin nicht geloescht'); }
  }, [ws.events, fail]);

  // --- Notes ---
  const createNote = useCallback<DataContextValue['createNote']>(async (input) => {
    try {
      const saved = await db.createNote({ ...input, householdId: household.id, userId: user.id });
      setWs((p) => ({ ...p, notes: [saved, ...p.notes] }));
    } catch (e) { fail(e, 'Notiz nicht gespeichert'); }
  }, [household.id, user.id, fail]);

  const updateNote = useCallback<DataContextValue['updateNote']>(async (id, patch) => {
    try {
      const saved = await db.updateNote(id, patch);
      setWs((p) => ({ ...p, notes: p.notes.map((n) => (n.id === id ? saved : n)) }));
    } catch (e) { fail(e, 'Notiz nicht aktualisiert'); }
  }, [fail]);

  const deleteNote = useCallback<DataContextValue['deleteNote']>(async (id) => {
    const prev = ws.notes;
    setWs((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) }));
    try { await db.deleteNote(id); } catch (e) { setWs((p) => ({ ...p, notes: prev })); fail(e, 'Notiz nicht geloescht'); }
  }, [ws.notes, fail]);

  // --- Bills ---
  const createBill = useCallback<DataContextValue['createBill']>(async (input) => {
    try {
      const saved = await db.createBill({ ...input, householdId: household.id, userId: user.id });
      setWs((p) => ({ ...p, bills: [enrichBill(saved), ...p.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }));
    } catch (e) { fail(e, 'Rechnung nicht gespeichert'); }
  }, [household.id, user.id, enrichBill, fail]);

  const toggleBill = useCallback<DataContextValue['toggleBill']>(async (id) => {
    const bill = ws.bills.find((b) => b.id === id);
    if (!bill) return;
    const status = bill.status === 'paid' ? 'open' : 'paid';
    setWs((p) => ({ ...p, bills: p.bills.map((b) => (b.id === id ? { ...b, status, paidById: status === 'paid' ? user.id : undefined, paidByInitials: status === 'paid' ? initialsOf(user.id) : undefined } : b)) }));
    try {
      const saved = await db.setBillStatus(id, status, user.id);
      setWs((p) => ({ ...p, bills: p.bills.map((b) => (b.id === id ? enrichBill(saved) : b)) }));
    } catch (e) { fail(e, 'Rechnung nicht gespeichert'); }
  }, [ws.bills, user.id, enrichBill, initialsOf, fail]);

  const deleteBill = useCallback<DataContextValue['deleteBill']>(async (id) => {
    const prev = ws.bills;
    setWs((p) => ({ ...p, bills: p.bills.filter((b) => b.id !== id) }));
    try { await db.deleteBill(id); } catch (e) { setWs((p) => ({ ...p, bills: prev })); fail(e, 'Rechnung nicht geloescht'); }
  }, [ws.bills, fail]);

  // --- Shopping ---
  const createShoppingItem = useCallback<DataContextValue['createShoppingItem']>(async (input) => {
    try {
      const saved = await db.createShoppingItem({ ...input, householdId: household.id, userId: user.id });
      setWs((p) => ({ ...p, shopping: [saved, ...p.shopping] }));
    } catch (e) { fail(e, 'Eintrag nicht gespeichert'); }
  }, [household.id, user.id, fail]);

  const toggleShopping = useCallback<DataContextValue['toggleShopping']>(async (id) => {
    const item = ws.shopping.find((s) => s.id === id);
    if (!item) return;
    const done = !item.done;
    setWs((p) => ({ ...p, shopping: p.shopping.map((s) => (s.id === id ? { ...s, done } : s)) }));
    try { await db.setShoppingDone(id, done); } catch (e) { fail(e, 'Eintrag nicht gespeichert'); }
  }, [ws.shopping, fail]);

  const deleteShoppingItem = useCallback<DataContextValue['deleteShoppingItem']>(async (id) => {
    const prev = ws.shopping;
    setWs((p) => ({ ...p, shopping: p.shopping.filter((s) => s.id !== id) }));
    try { await db.deleteShoppingItem(id); } catch (e) { setWs((p) => ({ ...p, shopping: prev })); fail(e, 'Eintrag nicht geloescht'); }
  }, [ws.shopping, fail]);

  // --- Habits ---
  const createHabit = useCallback<DataContextValue['createHabit']>(async (input) => {
    try {
      const saved = await db.createHabitType({ ...input, userId: user.id });
      setWs((p) => ({ ...p, habits: [...p.habits, { ...saved, todayValue: 0, streak: 0, weekValues: [0, 0, 0, 0, 0, 0, 0] }] }));
    } catch (e) { fail(e, 'Habit nicht gespeichert'); }
  }, [user.id, fail]);

  const deleteHabit = useCallback<DataContextValue['deleteHabit']>(async (id) => {
    const prev = ws.habits;
    setWs((p) => ({ ...p, habits: p.habits.filter((h) => h.id !== id) }));
    try { await db.deleteHabitType(id); } catch (e) { setWs((p) => ({ ...p, habits: prev })); fail(e, 'Habit nicht geloescht'); }
  }, [ws.habits, fail]);

  const logHabit = useCallback<DataContextValue['logHabit']>(async (habitTypeId, value) => {
    const today = viennaDate();
    setWs((p) => ({
      ...p,
      habits: p.habits.map((h) => {
        if (h.id !== habitTypeId) return h;
        const weekValues = [...h.weekValues];
        weekValues[weekValues.length - 1] = value;
        return { ...h, todayValue: value };
      }),
    }));
    try {
      await db.setHabitLog({ habitTypeId, userId: user.id, date: today, value });
      const logs = await db.loadHabitLogs(user.id, viennaDate());
      // streak recompute is cheap on next full refresh; keep optimistic value here
      void logs;
    } catch (e) { fail(e, 'Habit-Log nicht gespeichert'); }
  }, [user.id, fail]);

  // --- Quran ---
  const addQuranSession = useCallback<DataContextValue['addQuranSession']>(async (input) => {
    try {
      const saved = await db.createQuranSession({ ...input, userId: user.id, date: viennaDate() });
      setWs((p) => ({ ...p, quran: [saved, ...p.quran] }));
    } catch (e) { fail(e, 'Quran-Eintrag nicht gespeichert'); }
  }, [user.id, fail]);

  const deleteQuranSession = useCallback<DataContextValue['deleteQuranSession']>(async (id) => {
    const prev = ws.quran;
    setWs((p) => ({ ...p, quran: p.quran.filter((q) => q.id !== id) }));
    try { await db.deleteQuranSession(id); } catch (e) { setWs((p) => ({ ...p, quran: prev })); fail(e, 'Quran-Eintrag nicht geloescht'); }
  }, [ws.quran, fail]);

  // --- Sobriety ---
  const saveSobrietySettings = useCallback<DataContextValue['saveSobrietySettings']>(async (input) => {
    try {
      await db.saveSobrietySettings({ ...input, userId: user.id });
      setWs((p) => ({ ...p, sobrietySettings: { substance: input.substance, cleanStartDate: input.cleanStartDate, goalNote: input.goalNote, longestStreakDays: p.sobrietySettings?.longestStreakDays ?? 0 } }));
    } catch (e) { fail(e, 'Einstellungen nicht gespeichert'); }
  }, [user.id, fail]);

  const saveSobrietyLog = useCallback<DataContextValue['saveSobrietyLog']>(async (input) => {
    const today = viennaDate();
    try {
      await db.saveSobrietyLog({ ...input, userId: user.id, date: today });
      setWs((p) => ({ ...p, sobrietyLogs: [{ date: today, ...input }, ...p.sobrietyLogs.filter((l) => l.date !== today)] }));
    } catch (e) { fail(e, 'Eintrag nicht gespeichert'); }
  }, [user.id, fail]);

  const registerRelapse = useCallback<DataContextValue['registerRelapse']>(async () => {
    const today = viennaDate();
    const stored = ws.sobrietySettings?.longestStreakDays ?? 0;
    const current = ws.sobrietySettings?.cleanStartDate ? Math.max(0, daysBetween(ws.sobrietySettings.cleanStartDate, today)) : 0;
    const longest = Math.max(stored, current);
    try {
      await db.saveSobrietyLog({ userId: user.id, date: today, clean: false });
      await db.saveSobrietySettings({
        userId: user.id,
        substance: ws.sobrietySettings?.substance ?? '',
        cleanStartDate: today,
        goalNote: ws.sobrietySettings?.goalNote,
        longestStreakDays: longest,
      });
      await refresh();
    } catch (e) { fail(e, 'Rueckfall nicht gespeichert'); }
  }, [ws.sobrietySettings, user.id, refresh, fail]);

  // --- Check-in ---
  const saveCheckin = useCallback<DataContextValue['saveCheckin']>(async (input) => {
    try {
      const saved = await db.saveDailyCheckin({ ...input, userId: user.id, date: viennaDate() });
      setWs((p) => ({ ...p, checkinToday: saved, checkinHistory: [saved, ...p.checkinHistory.filter((c) => c.date !== saved.date)] }));
    } catch (e) { fail(e, 'Check-in nicht gespeichert'); }
  }, [user.id, fail]);

  // --- Prefs / household ---
  const saveNotificationPrefs = useCallback<DataContextValue['saveNotificationPrefs']>(async (prefs) => {
    setWs((p) => ({ ...p, notificationPrefs: prefs }));
    try { await db.saveNotificationPrefs(user.id, prefs); } catch (e) { fail(e, 'Einstellungen nicht gespeichert'); }
  }, [user.id, fail]);

  const renameHousehold = useCallback<DataContextValue['renameHousehold']>(async (name) => {
    setHousehold((h) => ({ ...h, name }));
    try { await db.renameHousehold(household.id, name); } catch (e) { fail(e, 'Haushalt nicht umbenannt'); }
  }, [household.id, fail]);

  const [profileNameState, setProfileNameState] = useState(profileName);
  const setProfileName = useCallback<DataContextValue['setProfileName']>(async (name) => {
    setProfileNameState(name);
    setHousehold((h) => ({ ...h, members: h.members.map((m) => (m.userId === user.id ? { ...m, displayName: name } : m)) }));
    try { await db.updateProfileName(user.id, name); } catch (e) { fail(e, 'Name nicht gespeichert'); }
  }, [user.id, fail]);

  const value = useMemo<DataContextValue>(() => ({
    user,
    household,
    profileName: profileNameState,
    syncState,
    prayerIsFallback: !ws.prayerToday,
    tasks: ws.tasks,
    bills: ws.bills,
    events: ws.events,
    notes: ws.notes,
    shopping: ws.shopping,
    habits: ws.habits,
    quran: ws.quran,
    checkinToday: ws.checkinToday,
    checkinHistory: ws.checkinHistory,
    sobrietySettings: ws.sobrietySettings,
    sobrietyLogs: ws.sobrietyLogs,
    prayerToday: ws.prayerToday ?? FALLBACK_PRAYERS,
    prayerWeek: ws.prayerWeek,
    notificationPrefs: ws.notificationPrefs,
    nameOf,
    initialsOf,
    refresh,
    createTask, updateTask, toggleTask, deleteTask,
    createEvent, deleteEvent,
    createNote, updateNote, deleteNote,
    createBill, toggleBill, deleteBill,
    createShoppingItem, toggleShopping, deleteShoppingItem,
    createHabit, deleteHabit, logHabit,
    addQuranSession, deleteQuranSession,
    saveSobrietySettings, saveSobrietyLog, registerRelapse,
    saveCheckin,
    saveNotificationPrefs, renameHousehold, setProfileName,
  }), [
    user, household, profileNameState, syncState, ws,
    nameOf, initialsOf, refresh,
    createTask, updateTask, toggleTask, deleteTask,
    createEvent, deleteEvent, createNote, updateNote, deleteNote,
    createBill, toggleBill, deleteBill,
    createShoppingItem, toggleShopping, deleteShoppingItem,
    createHabit, deleteHabit, logHabit,
    addQuranSession, deleteQuranSession,
    saveSobrietySettings, saveSobrietyLog, registerRelapse,
    saveCheckin, saveNotificationPrefs, renameHousehold, setProfileName,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
