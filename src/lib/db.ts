import { supabase } from './supabase';
import { addDays, lastNDates, streakFromDates, viennaDate } from './dates';
import type {
  Bill,
  DailyCheckin,
  DayPreparation,
  FamilyEvent,
  FocusProject,
  FocusStatus,
  HabitLog,
  HabitType,
  HabitWithProgress,
  Household,
  HouseholdMember,
  NotificationPreferences,
  Note,
  PrayerDay,
  PrayerTime,
  Priority,
  QuranSession,
  Reminder,
  ReminderPriority,
  Routine,
  RoutineWithProgress,
  Scope,
  ShoppingItem,
  SobrietyLog,
  SobrietySettings,
  Task,
} from '../types';

function client() {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.');
  return supabase;
}

const PRAYER_ORDER: { key: string; name: PrayerTime['name'] }[] = [
  { key: 'fajr', name: 'Fajr' },
  { key: 'sunrise', name: 'Sunrise' },
  { key: 'dhuhr', name: 'Dhuhr' },
  { key: 'asr', name: 'Asr' },
  { key: 'maghrib', name: 'Maghrib' },
  { key: 'isha', name: 'Isha' },
];

// ---------------------------------------------------------------------------
// Mappers (DB row -> app type). Owner initials are filled in by the store.
// ---------------------------------------------------------------------------
function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueAt: row.due_at ?? undefined,
    done: row.status === 'done',
    status: row.status,
    scope: row.household_id ? 'shared' : 'private',
    priority: (row.priority as Priority) || 'normal',
    ownerId: row.user_id,
    ownerInitials: '',
  };
}

function rowToBill(row: any): Bill {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency || 'EUR',
    dueDate: row.due_date,
    status: row.status,
    category: row.category || 'Haushalt',
    note: row.note ?? undefined,
    repeatRule: row.repeat_rule ?? undefined,
    scope: row.household_id ? 'shared' : 'private',
    ownerId: row.created_by ?? undefined,
    ownerInitials: '',
    paidById: row.paid_by ?? undefined,
    paidByInitials: undefined,
  };
}

function rowToEvent(row: any): FamilyEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startsAt: row.start_at,
    endsAt: row.end_at ?? undefined,
    location: row.location ?? undefined,
    forLabel: row.for_label ?? undefined,
    scope: row.household_id ? 'shared' : 'private',
    ownerId: row.user_id,
  };
}

function rowToNote(row: any): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    scope: row.household_id ? 'shared' : 'private',
    ownerId: row.user_id,
  };
}

function rowToShopping(row: any): ShoppingItem {
  return { id: row.id, title: row.title, quantity: row.quantity ?? undefined, category: row.category || 'Sonstiges', done: row.done };
}

function rowToRoutine(row: any): Routine {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'Repeat',
    targetPerDay: Number(row.target_per_day) || 1,
    reminderTimes: (row.reminder_times ?? []).map((t: string) => String(t).slice(0, 5)),
    daysOfWeek: row.days_of_week ?? [0, 1, 2, 3, 4, 5, 6],
    active: row.active ?? true,
  };
}

function rowToReminder(row: any): Reminder {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    dueAt: row.due_at ?? undefined,
    priority: (row.priority as ReminderPriority) || 'medium',
    done: row.done ?? false,
    createdAt: row.created_at,
  };
}

function rowToFocus(row: any): FocusProject {
  return {
    id: row.id,
    title: row.title,
    startedAt: row.started_at,
    initialThought: row.initial_thought ?? undefined,
    goal: row.goal ?? undefined,
    status: (row.status as FocusStatus) || 'active',
    remindEveryDays: row.remind_every_days ?? undefined,
    lastRemindedAt: row.last_reminded_at ?? undefined,
  };
}

function rowToDayPrep(row: any): DayPreparation {
  return {
    id: row.id,
    targetDate: row.target_date,
    intentions: row.intentions ?? undefined,
    plannedTasks: Array.isArray(row.planned_tasks) ? row.planned_tasks : [],
    notes: row.notes ?? undefined,
  };
}

function rowToHabitType(row: any): HabitType {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit || 'count',
    targetValue: Number(row.target_value) || 1,
    icon: row.icon || 'Flame',
    color: row.color || '#6c8ef5',
  };
}

function rowToQuran(row: any): QuranSession {
  return {
    id: row.id,
    date: row.date,
    minutes: Number(row.minutes) || 0,
    surah: row.surah ?? undefined,
    ayahFrom: row.ayah_from ?? undefined,
    ayahTo: row.ayah_to ?? undefined,
    note: row.note ?? undefined,
  };
}

function rowToCheckin(row: any): DailyCheckin {
  return {
    id: row.id,
    date: row.date,
    mood: row.mood ?? undefined,
    energy: row.energy ?? undefined,
    focus: row.focus ?? undefined,
    stress: row.stress ?? undefined,
    gratitude: row.gratitude ?? undefined,
    mainGoal: row.main_goal ?? undefined,
    reflection: row.reflection ?? undefined,
  };
}

function rowToSobrietyLog(row: any): SobrietyLog {
  return {
    date: row.date,
    clean: row.clean,
    cravingLevel: row.craving_level ?? undefined,
    triggerNote: row.trigger_note ?? undefined,
    reflection: row.reflection ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Identity & household
// ---------------------------------------------------------------------------
export async function ensureProfile(user: { id: string; email?: string | null }, displayName?: string) {
  const c = client();
  const { data: existing } = await c.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing) return; // keep the user's chosen display name
  await c.from('profiles').insert({
    id: user.id,
    display_name: displayName?.trim() || user.email?.split('@')[0] || 'Nutzer',
    timezone: 'Europe/Vienna',
  });
}

export async function updateProfileName(userId: string, displayName: string) {
  const { error } = await client().from('profiles').update({ display_name: displayName.trim() }).eq('id', userId);
  if (error) throw error;
}

export async function getMyHousehold(): Promise<Household | null> {
  const c = client();
  const { data: memberships, error } = await c
    .from('household_members')
    .select('household_id, role')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const first = memberships?.[0] as any;
  if (!first?.household_id) return null;

  return loadHousehold(first.household_id);
}

export async function loadHousehold(householdId: string): Promise<Household> {
  const c = client();
  // select('*') keeps this working even before the feature-expansion migration
  // (which adds the join_code column) has been applied.
  const [{ data: hh, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    c.from('households').select('*').eq('id', householdId).single(),
    c.from('household_members').select('user_id, role').eq('household_id', householdId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const memberIds = (rows ?? []).map((r: any) => r.user_id);
  const names = new Map<string, string>();
  if (memberIds.length) {
    const { data: profiles } = await c.from('profiles').select('id, display_name').in('id', memberIds);
    (profiles ?? []).forEach((p: any) => names.set(p.id, p.display_name));
  }

  const members: HouseholdMember[] = (rows ?? []).map((r: any) => ({
    userId: r.user_id,
    role: r.role,
    displayName: names.get(r.user_id) || 'Mitglied',
  }));

  return { id: hh.id, name: hh.name, joinCode: hh.join_code ?? '—', members };
}

export async function createHousehold(name: string, userId: string): Promise<Household> {
  const c = client();
  // Generate the id client-side so we never need to SELECT the new row back
  // before the membership exists (the households SELECT policy is
  // is_household_member(id), which would otherwise filter the RETURNING row out).
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const { error } = await c.from('households').insert({ id, name: name.trim() || 'Familie' });
  if (error) throw error;
  const { error: memberError } = await c
    .from('household_members')
    .insert({ household_id: id, user_id: userId, role: 'owner' });
  if (memberError) throw memberError;
  return loadHousehold(id);
}

export async function joinHouseholdByCode(code: string): Promise<Household> {
  const c = client();
  const { data, error } = await c.rpc('join_household_by_code', { code });
  if (error) throw error;
  return loadHousehold(data as string);
}

export async function renameHousehold(householdId: string, name: string) {
  const c = client();
  const { error } = await c.from('households').update({ name: name.trim() }).eq('id', householdId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Workspace loader (everything visible to the current user)
// ---------------------------------------------------------------------------
export async function loadWorkspace(householdId: string, userId: string) {
  const c = client();
  const today = viennaDate();
  const monthAgo = addDays(today, -34);
  const window = addDays(today, -180);

  const safe = async <T>(query: any, fallback: T): Promise<T> => {
    try {
      const { data, error } = await query;
      if (error) return fallback;
      return (data ?? fallback) as T;
    } catch {
      return fallback;
    }
  };

  const [
    tasks,
    bills,
    events,
    notes,
    shopping,
    habitTypes,
    habitLogs,
    quran,
    checkinToday,
    checkinHistory,
    sobrietySettingsRow,
    sobrietyLogs,
    prayerToday,
    prayerWeek,
    prefs,
    routinesRows,
    routineLogs,
    remindersRows,
    focusRows,
    dayPrepRows,
  ] = await Promise.all([
    safe<any[]>(c.from('tasks').select('*').order('created_at', { ascending: false }), []),
    // Bills: RLS liefert Haushalts-Bills UND eigene private Bills (household_id null).
    safe<any[]>(c.from('bills').select('*').order('due_date', { ascending: true }), []),
    safe<any[]>(c.from('events').select('*').order('start_at', { ascending: true }), []),
    safe<any[]>(c.from('notes').select('*').order('created_at', { ascending: false }), []),
    safe<any[]>(c.from('shopping_items').select('*').eq('household_id', householdId).order('created_at', { ascending: false }), []),
    safe<any[]>(c.from('habit_types').select('*').eq('user_id', userId).order('created_at', { ascending: true }), []),
    safe<any[]>(c.from('habit_logs').select('*').eq('user_id', userId).gte('date', monthAgo), []),
    safe<any[]>(c.from('quran_sessions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(60), []),
    safe<any>(c.from('daily_checkins').select('*').eq('user_id', userId).eq('date', today).maybeSingle(), null),
    safe<any[]>(c.from('daily_checkins').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(14), []),
    safe<any>(c.from('sobriety_settings').select('*').eq('user_id', userId).maybeSingle(), null),
    safe<any[]>(c.from('sobriety_logs').select('*').eq('user_id', userId).gte('date', window).order('date', { ascending: false }), []),
    safe<any>(c.from('prayer_times').select('*').eq('date', today).maybeSingle(), null),
    safe<any[]>(c.from('prayer_times').select('*').gte('date', today).lte('date', addDays(today, 6)).order('date', { ascending: true }), []),
    safe<any>(c.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(), null),
    safe<any[]>(c.from('routines').select('*').eq('user_id', userId).order('created_at', { ascending: true }), []),
    safe<any[]>(c.from('routine_logs').select('*').eq('user_id', userId).gte('date', monthAgo), []),
    safe<any[]>(c.from('reminders').select('*').eq('user_id', userId).order('created_at', { ascending: false }), []),
    safe<any[]>(c.from('focus_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }), []),
    safe<any[]>(c.from('day_preparations').select('*').eq('user_id', userId).gte('target_date', today).order('target_date', { ascending: true }), []),
  ]);

  return {
    tasks: tasks.map(rowToTask),
    bills: bills.map(rowToBill),
    events: events.map(rowToEvent),
    notes: notes.map(rowToNote),
    shopping: shopping.map(rowToShopping),
    habits: buildHabits(habitTypes.map(rowToHabitType), habitLogs, today),
    quran: quran.map(rowToQuran),
    checkinToday: checkinToday ? rowToCheckin(checkinToday) : null,
    checkinHistory: checkinHistory.map(rowToCheckin),
    sobrietySettings: mapSobrietySettings(sobrietySettingsRow),
    sobrietyLogs: sobrietyLogs.map(rowToSobrietyLog),
    prayerToday: prayerToday ? prayerRowToDay(prayerToday) : null,
    prayerWeek: prayerWeek.map(prayerRowToDay),
    notificationPrefs: mapPrefs(prefs),
    routines: buildRoutines(routinesRows.map(rowToRoutine), routineLogs, today),
    reminders: remindersRows.map(rowToReminder),
    focusProjects: focusRows.map(rowToFocus),
    dayPreps: dayPrepRows.map(rowToDayPrep),
  };
}

function prayerRowToDay(row: any): PrayerDay {
  return {
    date: row.date,
    times: PRAYER_ORDER.filter((p) => row[p.key])
      .map((p) => ({ name: p.name, time: String(row[p.key]).slice(0, 5) })),
  };
}

function buildHabits(types: HabitType[], logRows: any[], today: string): HabitWithProgress[] {
  const week = lastNDates(7, today);
  const month = lastNDates(35, today);
  return types.map((type) => {
    const logs = logRows.filter((l) => l.habit_type_id === type.id);
    const byDate = new Map<string, number>();
    logs.forEach((l) => byDate.set(l.date, Number(l.value) || 0));
    const doneDates = new Set(logs.filter((l) => Number(l.value) >= type.targetValue).map((l) => l.date));
    const monthValues = month.map((d) => byDate.get(d) ?? 0);
    const hitDays = monthValues.filter((v) => v >= type.targetValue).length;
    return {
      ...type,
      todayValue: byDate.get(today) ?? 0,
      streak: streakFromDates(doneDates, today),
      weekValues: week.map((d) => byDate.get(d) ?? 0),
      monthValues,
      successRate: hitDays / month.length,
    };
  });
}

function buildRoutines(routines: Routine[], logRows: any[], today: string): RoutineWithProgress[] {
  const week = lastNDates(7, today);
  return routines.map((r) => {
    const logs = logRows.filter((l) => l.routine_id === r.id);
    const byDate = new Map<string, number>();
    logs.forEach((l) => byDate.set(l.date, Number(l.count) || 0));
    const doneDates = new Set([...byDate.entries()].filter(([, v]) => v >= r.targetPerDay).map(([d]) => d));
    return {
      ...r,
      todayCount: byDate.get(today) ?? 0,
      weekCounts: week.map((d) => byDate.get(d) ?? 0),
      streak: streakFromDates(doneDates, today),
    };
  });
}

function mapSobrietySettings(row: any): SobrietySettings | null {
  if (!row) return null;
  return {
    substance: row.substance ?? '',
    cleanStartDate: row.clean_start_date ?? undefined,
    goalNote: row.goal_note ?? undefined,
    longestStreakDays: row.longest_streak_days ?? 0,
  };
}

function mapPrefs(row: any): NotificationPreferences {
  return {
    prayerFajr: row?.prayer_fajr_enabled ?? true,
    prayerDhuhr: row?.prayer_dhuhr_enabled ?? true,
    prayerAsr: row?.prayer_asr_enabled ?? true,
    prayerMaghrib: row?.prayer_maghrib_enabled ?? true,
    prayerIsha: row?.prayer_isha_enabled ?? true,
    minutesBeforePrayer: row?.minutes_before_prayer ?? 0,
    dailyCheckin: row?.daily_checkin_enabled ?? false,
    billReminders: row?.bill_reminders_enabled ?? true,
    eventReminders: row?.event_reminders_enabled ?? true,
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export async function createTask(input: {
  title: string;
  description?: string;
  scope: Scope;
  priority?: Priority;
  dueAt?: string | null;
  householdId: string;
  userId: string;
}): Promise<Task> {
  const c = client();
  const { data, error } = await c
    .from('tasks')
    .insert({
      user_id: input.userId,
      household_id: input.scope === 'shared' ? input.householdId : null,
      title: input.title,
      description: input.description ?? null,
      due_at: input.dueAt ?? null,
      status: 'open',
      priority: input.priority ?? 'normal',
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToTask(data);
}

export async function updateTask(id: string, patch: Partial<{ title: string; description: string | null; priority: Priority; dueAt: string | null; status: Task['status'] }>): Promise<Task> {
  const c = client();
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.dueAt !== undefined) dbPatch.due_at = patch.dueAt;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  const { data, error } = await c.from('tasks').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToTask(data);
}

export async function setTaskDone(id: string, done: boolean) {
  return updateTask(id, { status: done ? 'done' : 'open' });
}

export async function deleteTask(id: string) {
  const { error } = await client().from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export async function createEvent(input: {
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  forLabel?: string | null;
  scope: Scope;
  householdId: string;
  userId: string;
}): Promise<FamilyEvent> {
  const c = client();
  const { data, error } = await c
    .from('events')
    .insert({
      user_id: input.userId,
      household_id: input.scope === 'shared' ? input.householdId : null,
      title: input.title,
      description: input.description ?? null,
      start_at: input.startsAt,
      end_at: input.endsAt ?? null,
      location: input.location ?? null,
      for_label: input.forLabel ?? null,
      source: 'manual',
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToEvent(data);
}

export async function updateEvent(id: string, patch: Partial<{ title: string; description: string | null; startsAt: string; endsAt: string | null; location: string | null; forLabel: string | null }>): Promise<FamilyEvent> {
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.startsAt !== undefined) dbPatch.start_at = patch.startsAt;
  if (patch.endsAt !== undefined) dbPatch.end_at = patch.endsAt;
  if (patch.location !== undefined) dbPatch.location = patch.location;
  if (patch.forLabel !== undefined) dbPatch.for_label = patch.forLabel;
  const { data, error } = await client().from('events').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToEvent(data);
}

export async function deleteEvent(id: string) {
  const { error } = await client().from('events').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export async function createNote(input: {
  title: string;
  content: string;
  tags?: string[];
  scope: Scope;
  householdId: string;
  userId: string;
}): Promise<Note> {
  const c = client();
  const { data, error } = await c
    .from('notes')
    .insert({
      user_id: input.userId,
      household_id: input.scope === 'shared' ? input.householdId : null,
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToNote(data);
}

export async function updateNote(id: string, patch: { title?: string; content?: string; tags?: string[] }): Promise<Note> {
  const { data, error } = await client().from('notes').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToNote(data);
}

export async function deleteNote(id: string) {
  const { error } = await client().from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Bills
// ---------------------------------------------------------------------------
export async function createBill(input: {
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  note?: string;
  repeatRule?: string;
  scope: Scope;
  householdId: string;
  userId: string;
}): Promise<Bill> {
  const c = client();
  const { data, error } = await c
    .from('bills')
    .insert({
      household_id: input.scope === 'shared' ? input.householdId : null,
      created_by: input.userId,
      title: input.title,
      amount: input.amount,
      due_date: input.dueDate,
      category: input.category,
      note: input.note ?? null,
      repeat_rule: input.repeatRule ?? null,
      status: 'open',
      currency: 'EUR',
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToBill(data);
}

export async function setBillStatus(id: string, status: 'open' | 'paid', userId: string): Promise<Bill> {
  const { data, error } = await client()
    .from('bills')
    .update({ status, paid_by: status === 'paid' ? userId : null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToBill(data);
}

export async function updateBill(id: string, patch: Partial<{ title: string; amount: number; dueDate: string; category: string; note: string | null; repeatRule: string | null }>): Promise<Bill> {
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.amount !== undefined) dbPatch.amount = patch.amount;
  if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.note !== undefined) dbPatch.note = patch.note;
  if (patch.repeatRule !== undefined) dbPatch.repeat_rule = patch.repeatRule;
  const { data, error } = await client().from('bills').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToBill(data);
}

export async function deleteBill(id: string) {
  const { error } = await client().from('bills').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Shopping list (shared)
// ---------------------------------------------------------------------------
export async function createShoppingItem(input: { title: string; quantity?: string; category?: string; householdId: string; userId: string }): Promise<ShoppingItem> {
  const { data, error } = await client()
    .from('shopping_items')
    .insert({ household_id: input.householdId, created_by: input.userId, title: input.title, quantity: input.quantity ?? null, category: input.category || 'Sonstiges' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToShopping(data);
}

export async function setShoppingDone(id: string, done: boolean): Promise<ShoppingItem> {
  const { data, error } = await client().from('shopping_items').update({ done }).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToShopping(data);
}

export async function deleteShoppingItem(id: string) {
  const { error } = await client().from('shopping_items').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------
export async function createHabitType(input: { name: string; unit: string; targetValue: number; icon: string; color: string; userId: string }): Promise<HabitType> {
  const { data, error } = await client()
    .from('habit_types')
    .insert({ user_id: input.userId, name: input.name, unit: input.unit, target_value: input.targetValue, icon: input.icon, color: input.color })
    .select('*')
    .single();
  if (error) throw error;
  return rowToHabitType(data);
}

export async function updateHabitType(id: string, patch: Partial<{ name: string; unit: string; targetValue: number; icon: string; color: string }>): Promise<HabitType> {
  const dbPatch: any = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.unit !== undefined) dbPatch.unit = patch.unit;
  if (patch.targetValue !== undefined) dbPatch.target_value = patch.targetValue;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;
  if (patch.color !== undefined) dbPatch.color = patch.color;
  const { data, error } = await client().from('habit_types').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToHabitType(data);
}

export async function deleteHabitType(id: string) {
  const { error } = await client().from('habit_types').delete().eq('id', id);
  if (error) throw error;
}

export async function setHabitLog(input: { habitTypeId: string; userId: string; date: string; value: number }) {
  const { error } = await client()
    .from('habit_logs')
    .upsert({ habit_type_id: input.habitTypeId, user_id: input.userId, date: input.date, value: input.value }, { onConflict: 'habit_type_id,date' });
  if (error) throw error;
}

export async function loadHabitLogs(userId: string, fromDate: string): Promise<HabitLog[]> {
  const { data, error } = await client().from('habit_logs').select('*').eq('user_id', userId).gte('date', fromDate);
  if (error) throw error;
  return (data ?? []).map((l: any) => ({ habitTypeId: l.habit_type_id, date: l.date, value: Number(l.value) || 0 }));
}

// ---------------------------------------------------------------------------
// Quran
// ---------------------------------------------------------------------------
export async function createQuranSession(input: {
  userId: string;
  date: string;
  minutes: number;
  surah?: string;
  ayahFrom?: number;
  ayahTo?: number;
  note?: string;
}): Promise<QuranSession> {
  const { data, error } = await client()
    .from('quran_sessions')
    .insert({
      user_id: input.userId,
      date: input.date,
      minutes: input.minutes,
      surah: input.surah ?? null,
      ayah_from: input.ayahFrom ?? null,
      ayah_to: input.ayahTo ?? null,
      note: input.note ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToQuran(data);
}

export async function deleteQuranSession(id: string) {
  const { error } = await client().from('quran_sessions').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Sobriety / Clean tracker
// ---------------------------------------------------------------------------
export async function saveSobrietySettings(input: { userId: string; substance: string; cleanStartDate?: string; goalNote?: string; longestStreakDays?: number }) {
  const { error } = await client()
    .from('sobriety_settings')
    .upsert(
      {
        user_id: input.userId,
        substance: input.substance,
        clean_start_date: input.cleanStartDate ?? null,
        goal_note: input.goalNote ?? null,
        ...(input.longestStreakDays !== undefined ? { longest_streak_days: input.longestStreakDays } : {}),
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function saveSobrietyLog(input: { userId: string; date: string; clean: boolean; cravingLevel?: number; triggerNote?: string; reflection?: string }) {
  const { error } = await client()
    .from('sobriety_logs')
    .upsert(
      {
        user_id: input.userId,
        date: input.date,
        clean: input.clean,
        craving_level: input.cravingLevel ?? null,
        trigger_note: input.triggerNote ?? null,
        reflection: input.reflection ?? null,
      },
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Daily check-in
// ---------------------------------------------------------------------------
export async function saveDailyCheckin(input: {
  userId: string;
  date: string;
  mood?: number;
  energy?: number;
  focus?: number;
  stress?: number;
  gratitude?: string;
  mainGoal?: string;
  reflection?: string;
}): Promise<DailyCheckin> {
  const { data, error } = await client()
    .from('daily_checkins')
    .upsert(
      {
        user_id: input.userId,
        date: input.date,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        focus: input.focus ?? null,
        stress: input.stress ?? null,
        gratitude: input.gratitude ?? null,
        main_goal: input.mainGoal ?? null,
        reflection: input.reflection ?? null,
      },
      { onConflict: 'user_id,date' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return rowToCheckin(data);
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------
export async function saveNotificationPrefs(userId: string, prefs: NotificationPreferences) {
  const { error } = await client()
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        prayer_fajr_enabled: prefs.prayerFajr,
        prayer_dhuhr_enabled: prefs.prayerDhuhr,
        prayer_asr_enabled: prefs.prayerAsr,
        prayer_maghrib_enabled: prefs.prayerMaghrib,
        prayer_isha_enabled: prefs.prayerIsha,
        minutes_before_prayer: prefs.minutesBeforePrayer,
        daily_checkin_enabled: prefs.dailyCheckin,
        bill_reminders_enabled: prefs.billReminders,
        event_reminders_enabled: prefs.eventReminders,
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------
export async function createRoutine(input: { userId: string; name: string; icon: string; targetPerDay: number; reminderTimes: string[]; daysOfWeek: number[] }): Promise<Routine> {
  const { data, error } = await client()
    .from('routines')
    .insert({
      user_id: input.userId,
      name: input.name,
      icon: input.icon,
      target_per_day: input.targetPerDay,
      reminder_times: input.reminderTimes,
      days_of_week: input.daysOfWeek,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToRoutine(data);
}

export async function updateRoutine(id: string, patch: Partial<{ name: string; icon: string; targetPerDay: number; reminderTimes: string[]; daysOfWeek: number[]; active: boolean }>): Promise<Routine> {
  const dbPatch: any = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.icon !== undefined) dbPatch.icon = patch.icon;
  if (patch.targetPerDay !== undefined) dbPatch.target_per_day = patch.targetPerDay;
  if (patch.reminderTimes !== undefined) dbPatch.reminder_times = patch.reminderTimes;
  if (patch.daysOfWeek !== undefined) dbPatch.days_of_week = patch.daysOfWeek;
  if (patch.active !== undefined) dbPatch.active = patch.active;
  const { data, error } = await client().from('routines').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToRoutine(data);
}

export async function deleteRoutine(id: string) {
  const { error } = await client().from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function setRoutineCount(input: { userId: string; routineId: string; date: string; count: number }) {
  const { error } = await client()
    .from('routine_logs')
    .upsert(
      { user_id: input.userId, routine_id: input.routineId, date: input.date, count: Math.max(0, input.count) },
      { onConflict: 'routine_id,date' }
    );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------
export async function createReminder(input: { userId: string; title: string; note?: string; dueAt?: string | null; priority: ReminderPriority }): Promise<Reminder> {
  const { data, error } = await client()
    .from('reminders')
    .insert({ user_id: input.userId, title: input.title, note: input.note ?? null, due_at: input.dueAt ?? null, priority: input.priority })
    .select('*')
    .single();
  if (error) throw error;
  return rowToReminder(data);
}

export async function updateReminder(id: string, patch: Partial<{ title: string; note: string | null; dueAt: string | null; priority: ReminderPriority; done: boolean }>): Promise<Reminder> {
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.note !== undefined) dbPatch.note = patch.note;
  if (patch.dueAt !== undefined) dbPatch.due_at = patch.dueAt;
  if (patch.priority !== undefined) dbPatch.priority = patch.priority;
  if (patch.done !== undefined) dbPatch.done = patch.done;
  const { data, error } = await client().from('reminders').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToReminder(data);
}

export async function deleteReminder(id: string) {
  const { error } = await client().from('reminders').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Focus projects
// ---------------------------------------------------------------------------
export async function createFocusProject(input: { userId: string; title: string; initialThought?: string; goal?: string; remindEveryDays?: number | null }): Promise<FocusProject> {
  const { data, error } = await client()
    .from('focus_projects')
    .insert({
      user_id: input.userId,
      title: input.title,
      initial_thought: input.initialThought ?? null,
      goal: input.goal ?? null,
      remind_every_days: input.remindEveryDays ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToFocus(data);
}

export async function updateFocusProject(id: string, patch: Partial<{ title: string; initialThought: string | null; goal: string | null; status: FocusStatus; remindEveryDays: number | null; lastRemindedAt: string | null }>): Promise<FocusProject> {
  const dbPatch: any = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.initialThought !== undefined) dbPatch.initial_thought = patch.initialThought;
  if (patch.goal !== undefined) dbPatch.goal = patch.goal;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.remindEveryDays !== undefined) dbPatch.remind_every_days = patch.remindEveryDays;
  if (patch.lastRemindedAt !== undefined) dbPatch.last_reminded_at = patch.lastRemindedAt;
  const { data, error } = await client().from('focus_projects').update(dbPatch).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToFocus(data);
}

export async function deleteFocusProject(id: string) {
  const { error } = await client().from('focus_projects').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Day preparation (replaces daily check-in)
// ---------------------------------------------------------------------------
export async function saveDayPreparation(input: { userId: string; targetDate: string; intentions?: string; plannedTasks: string[]; notes?: string }): Promise<DayPreparation> {
  const { data, error } = await client()
    .from('day_preparations')
    .upsert(
      {
        user_id: input.userId,
        target_date: input.targetDate,
        intentions: input.intentions ?? null,
        planned_tasks: input.plannedTasks,
        notes: input.notes ?? null,
      },
      { onConflict: 'user_id,target_date' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return rowToDayPrep(data);
}
