const dateFormatter = new Intl.DateTimeFormat('de-AT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Vienna',
});

const shortDateFormatter = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Vienna',
});

const timeFormatter = new Intl.DateTimeFormat('de-AT', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Vienna',
});

export function formatToday(date: Date) {
  return dateFormatter.format(date);
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

export function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

export function getGreeting(date: Date, name: string) {
  const hour = Number(
    new Intl.DateTimeFormat('de-AT', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Vienna',
    }).format(date)
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
    timeZone: 'Europe/Vienna',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return ((hour * 60 + minute) / 1440) * 100;
}

export function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(`${date}T12:00:00+02:00`);
  const todayMidday = new Date(today);
  todayMidday.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - todayMidday.getTime()) / 86_400_000);
}
