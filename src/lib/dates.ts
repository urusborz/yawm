export const VIENNA_TZ = 'Europe/Vienna';

const dateFormatter = new Intl.DateTimeFormat('de-AT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: VIENNA_TZ,
});

const shortDateFormatter = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  timeZone: VIENNA_TZ,
});

const timeFormatter = new Intl.DateTimeFormat('de-AT', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: VIENNA_TZ,
});

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: VIENNA_TZ,
});

const weekdayShortFormatter = new Intl.DateTimeFormat('de-AT', {
  weekday: 'short',
  timeZone: VIENNA_TZ,
});

const monthShortFormatter = new Intl.DateTimeFormat('de-AT', {
  month: 'short',
  timeZone: VIENNA_TZ,
});

export function formatToday(date: Date) {
  return dateFormatter.format(date);
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(parse(value));
}

export function formatTime(value: string) {
  return timeFormatter.format(parse(value));
}

export function formatWeekday(value: string | Date) {
  return weekdayShortFormatter.format(typeof value === 'string' ? parse(value) : value);
}

export function formatMonthShort(value: string | Date) {
  return monthShortFormatter.format(typeof value === 'string' ? parse(value) : value);
}

function parse(value: string) {
  // Date-only strings (YYYY-MM-DD) are interpreted at local noon to avoid TZ slips.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  return new Date(value);
}

/** YYYY-MM-DD for the given date in Vienna local time (defaults to now). */
export function viennaDate(date: Date = new Date()) {
  return isoDateFormatter.format(date);
}

export function getGreeting(date: Date, name: string) {
  const hour = Number(
    new Intl.DateTimeFormat('de-AT', { hour: '2-digit', hour12: false, timeZone: VIENNA_TZ }).format(date)
  );
  if (hour < 11) return `Guten Morgen, ${name}`;
  if (hour < 18) return `Guten Tag, ${name}`;
  return `Guten Abend, ${name}`;
}

export function dayProgress(date: Date) {
  const parts = new Intl.DateTimeFormat('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VIENNA_TZ,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return ((hour * 60 + minute) / 1440) * 100;
}

export function daysUntil(date: string) {
  const target = new Date(`${date}T12:00:00`);
  const today = new Date(`${viennaDate()}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string) {
  const start = new Date(`${a}T12:00:00`).getTime();
  const end = new Date(`${b}T12:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function addDays(date: string, amount: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return viennaDate(d);
}

export function addMonths(date: string, amount: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setMonth(d.getMonth() + amount);
  return viennaDate(d);
}

/** Returns the last n calendar dates ending today, oldest first. */
export function lastNDates(n: number, end: string = viennaDate()) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(end, -i));
  return out;
}

/**
 * Counts consecutive days with a truthy entry, ending today (or yesterday if
 * today has no entry yet). `dates` is a set of YYYY-MM-DD strings.
 */
export function streakFromDates(dates: Set<string>, end: string = viennaDate()) {
  let streak = 0;
  let cursor = end;
  // Allow the streak to remain intact if today is not logged yet.
  if (!dates.has(cursor)) cursor = addDays(cursor, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
