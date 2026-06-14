import type { Bill, FamilyEvent, HabitSummary, Note, PrayerTime, Task } from '../types';

export const currentUser = {
  name: 'Ibragim',
  initials: 'IB',
  spouseInitials: 'MA',
  householdName: 'Familie',
};

export const initialTasks: Task[] = [
  {
    id: 't-1',
    title: 'Quran lesen - 30 Min',
    done: false,
    scope: 'private',
    ownerInitials: 'IB',
    priority: 'normal',
  },
  {
    id: 't-2',
    title: 'Madina anrufen',
    dueAt: '18:00',
    done: false,
    scope: 'private',
    ownerInitials: 'IB',
    priority: 'normal',
  },
  {
    id: 't-3',
    title: 'Strom-Rechnung pruefen',
    done: true,
    scope: 'private',
    ownerInitials: 'IB',
    priority: 'high',
  },
  {
    id: 't-4',
    title: 'Windeln und Milch besorgen',
    done: false,
    scope: 'shared',
    ownerInitials: 'MA',
    priority: 'normal',
  },
  {
    id: 't-5',
    title: 'Kita-Beitrag ueberweisen',
    done: false,
    scope: 'shared',
    ownerInitials: 'IB',
    priority: 'high',
  },
];

export const initialBills: Bill[] = [
  { id: 'b-1', title: 'Strom', amount: 180, dueDate: '2026-06-16', status: 'open', category: 'Energie' },
  { id: 'b-2', title: 'Miete', amount: 620, dueDate: '2026-07-01', status: 'open', category: 'Wohnen' },
  { id: 'b-3', title: 'Internet', amount: 47.5, dueDate: '2026-06-20', status: 'open', category: 'Haushalt' },
];

export const initialEvents: FamilyEvent[] = [
  {
    id: 'e-1',
    title: 'Impftermin Yusuf',
    startsAt: '2026-06-16T14:30:00+02:00',
    location: 'Kinderarzt Dr. Wagner',
    scope: 'shared',
  },
  {
    id: 'e-2',
    title: 'Elternabend',
    startsAt: '2026-06-18T18:00:00+02:00',
    location: 'Kindergarten Spatzennest',
    scope: 'shared',
  },
  {
    id: 'e-3',
    title: 'Fokusblock: Admin erledigen',
    startsAt: '2026-06-15T20:00:00+02:00',
    scope: 'private',
  },
];

export const initialNotes: Note[] = [
  {
    id: 'n-1',
    title: 'Tagesfokus',
    content: 'Heute nur die wichtigsten offenen Dinge abschliessen und den Abend ruhig halten.',
    createdAt: '2026-06-15T08:00:00+02:00',
    scope: 'private',
  },
];

export const prayerTimes: PrayerTime[] = [
  { name: 'Fajr', time: '03:18' },
  { name: 'Sunrise', time: '05:02' },
  { name: 'Dhuhr', time: '13:01' },
  { name: 'Asr', time: '17:18' },
  { name: 'Maghrib', time: '20:54' },
  { name: 'Isha', time: '22:38' },
];

export const habitSummary: HabitSummary = {
  cleanDays: 23,
  quranMinutesToday: 45,
  checkinDone: false,
};
