export type Scope = 'private' | 'shared';
export type Priority = 'low' | 'normal' | 'high';
export type TaskStatus = 'open' | 'done' | 'postponed';

export type Profile = {
  id: string;
  displayName: string;
  timezone: string;
};

export type HouseholdMember = {
  userId: string;
  role: 'owner' | 'member';
  displayName: string;
};

export type Household = {
  id: string;
  name: string;
  joinCode: string;
  members: HouseholdMember[];
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueAt?: string; // ISO timestamp
  done: boolean;
  status: TaskStatus;
  scope: Scope;
  priority: Priority;
  ownerId: string;
  ownerInitials: string;
};

export type Bill = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dueDate: string; // YYYY-MM-DD
  status: 'open' | 'paid';
  category: string;
  note?: string;
  repeatRule?: string;
  scope: Scope; // 'private' = nur ich, 'shared' = Haushalt
  ownerId?: string;
  ownerInitials?: string;
  paidById?: string;
  paidByInitials?: string;
};

export type FamilyEvent = {
  id: string;
  title: string;
  description?: string;
  startsAt: string; // ISO
  endsAt?: string;
  location?: string;
  forLabel?: string; // "Betrifft", z.B. Kind/Familie
  scope: Scope;
  ownerId: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  scope: Scope;
  ownerId: string;
};

export type ShoppingItem = {
  id: string;
  title: string;
  quantity?: string;
  category: string; // z.B. Lebensmittel, Kleidung, Haushalt, Drogerie, Sonstiges
  done: boolean;
};

export const SHOPPING_CATEGORIES = ['Lebensmittel', 'Kleidung', 'Haushalt', 'Drogerie', 'Sonstiges'] as const;

export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type PrayerTime = {
  name: PrayerName;
  time: string; // HH:MM
};

export type PrayerDay = {
  date: string;
  times: PrayerTime[];
};

export type HabitType = {
  id: string;
  name: string;
  unit: string;
  targetValue: number;
  icon: string;
  color: string;
};

export type HabitLog = {
  habitTypeId: string;
  date: string;
  value: number;
};

export type HabitWithProgress = HabitType & {
  todayValue: number;
  streak: number;
  weekValues: number[]; // last 7 days, oldest first
  monthValues: number[]; // last 35 days, oldest first
  successRate: number; // 0..1 over the last 35 days
};

export type SobrietySettings = {
  substance: string;
  cleanStartDate?: string;
  goalNote?: string;
  longestStreakDays: number;
};

export type SobrietyLog = {
  date: string;
  clean: boolean;
  cravingLevel?: number;
  triggerNote?: string;
  reflection?: string;
};

export type QuranSession = {
  id: string;
  date: string;
  minutes: number;
  surah?: string;
  ayahFrom?: number;
  ayahTo?: number;
  note?: string;
};

export type DailyCheckin = {
  id: string;
  date: string;
  mood?: number;
  energy?: number;
  focus?: number;
  stress?: number;
  gratitude?: string;
  mainGoal?: string;
  reflection?: string;
};

export type NotificationPreferences = {
  prayerFajr: boolean;
  prayerDhuhr: boolean;
  prayerAsr: boolean;
  prayerMaghrib: boolean;
  prayerIsha: boolean;
  minutesBeforePrayer: number;
  dailyCheckin: boolean;
  billReminders: boolean;
  eventReminders: boolean;
};

// --- Routinen (wiederkehrende Tages-Erinnerungen) --------------------------
export type Routine = {
  id: string;
  name: string;
  icon: string;
  targetPerDay: number;
  reminderTimes: string[]; // "HH:MM"
  daysOfWeek: number[]; // 0=Sonntag .. 6=Samstag (JS getDay)
  active: boolean;
};

export type RoutineWithProgress = Routine & {
  todayCount: number;
  weekCounts: number[]; // letzte 7 Tage, ältester zuerst
  streak: number;
};

// --- Allgemeine Erinnerungen ----------------------------------------------
export type ReminderPriority = 'low' | 'medium' | 'high';

export type Reminder = {
  id: string;
  title: string;
  note?: string;
  dueAt?: string; // ISO, optional = Ablauf/Fälligkeit
  priority: ReminderPriority;
  done: boolean;
  createdAt: string;
};

// --- Fokus-Projekte --------------------------------------------------------
export type FocusStatus = 'active' | 'paused' | 'done' | 'abandoned';

export type FocusProject = {
  id: string;
  title: string;
  startedAt: string; // ISO
  initialThought?: string; // was im Moment des Starts im Kopf war
  goal?: string;
  status: FocusStatus;
  remindEveryDays?: number;
  lastRemindedAt?: string;
};

// --- Tagesvorbereitung (ersetzt Daily Check-in) ----------------------------
export type DayPreparation = {
  id: string;
  targetDate: string; // YYYY-MM-DD
  intentions?: string;
  plannedTasks: string[];
  notes?: string;
};
