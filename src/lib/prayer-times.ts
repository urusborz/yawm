import type { PrayerTime } from '../types';

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function viennaMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Vienna',
  }).formatToParts(now);

  const h = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const s = Number(parts.find((part) => part.type === 'second')?.value ?? 0);
  return h * 60 + m + s / 60;
}

export function getNextPrayer(prayers: PrayerTime[], now: Date) {
  const current = viennaMinutes(now);
  let index = prayers.findIndex((prayer) => toMinutes(prayer.time) > current);
  const wrapsToTomorrow = index === -1;
  if (wrapsToTomorrow) index = 0;

  const next = prayers[index];
  const previousMinutes = index === 0 ? toMinutes(prayers[prayers.length - 1].time) - 1440 : toMinutes(prayers[index - 1].time);
  const nextMinutes = toMinutes(next.time) + (wrapsToTomorrow ? 1440 : 0);
  const total = nextMinutes - previousMinutes;
  const elapsed = current - previousMinutes;
  const remainingSeconds = Math.max(0, Math.round((nextMinutes - current) * 60));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    next,
    index,
    progress: Math.max(0, Math.min(1, elapsed / total)),
    countdown: `${pad(hours)}:${pad(minutes)}`,
    seconds: `:${pad(seconds)}`,
  };
}
