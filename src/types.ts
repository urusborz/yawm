export type Scope = 'private' | 'shared';

export type Task = {
  id: string;
  title: string;
  dueAt?: string;
  done: boolean;
  scope: Scope;
  ownerInitials: string;
  priority: 'low' | 'normal' | 'high';
};

export type Bill = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'open' | 'paid';
  category: string;
};

export type FamilyEvent = {
  id: string;
  title: string;
  startsAt: string;
  location?: string;
  scope: Scope;
};

export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type PrayerTime = {
  name: PrayerName;
  time: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  scope: Scope;
};

export type HabitSummary = {
  cleanDays: number;
  quranMinutesToday: number;
  checkinDone: boolean;
};
