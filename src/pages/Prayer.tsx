import { useMemo } from 'react';
import { Moon, Sun, Sunrise, Sunset, Info } from 'lucide-react';
import { Screen, SimpleHeader } from '../components/ui';
import { PrayerCard } from '../components/PrayerCard';
import { useData } from '../store';
import { getNextPrayer } from '../lib/prayer-times';
import { formatWeekday, viennaDate } from '../lib/dates';
import type { PrayerName } from '../types';

const ICONS: Record<PrayerName, JSX.Element> = {
  Fajr: <Moon size={18} />,
  Sunrise: <Sunrise size={18} />,
  Dhuhr: <Sun size={18} />,
  Asr: <Sun size={18} />,
  Maghrib: <Sunset size={18} />,
  Isha: <Moon size={18} />,
};

export default function Prayer({ now, setView }: { now: Date; setView: (v: 'settings') => void }) {
  const data = useData();
  const targets = data.prayerToday.times.filter((t) => t.name !== 'Sunrise');
  const next = useMemo(() => getNextPrayer(targets, now), [targets, now]);

  return (
    <Screen>
      <SimpleHeader title="Gebetszeiten" subtitle="Wien · IZW" icon={<Sun size={24} />} />
      <PrayerCard prayerDay={data.prayerToday} now={now} isFallback={data.prayerIsFallback} />

      <section className="panel">
        <div className="panel__header"><h2>Heute</h2><span>{data.prayerToday.times.length} Zeiten</span></div>
        <div className="rows">
          {data.prayerToday.times.map((p) => {
            const isNext = p.name === next.next.name;
            return (
              <div className={isNext ? 'prayer-row prayer-row--next' : 'prayer-row'} key={p.name}>
                <span className="prayer-row__icon">{ICONS[p.name]}</span>
                <span className="prayer-row__name">{p.name}{p.name === 'Sunrise' ? ' (Sonnenaufgang)' : ''}</span>
                {isNext ? <span className="pill pill--soft">als Nächstes</span> : null}
                <strong>{p.time}</strong>
              </div>
            );
          })}
        </div>
      </section>

      {data.prayerWeek.length > 1 ? (
        <section className="panel">
          <div className="panel__header"><h2>Diese Woche</h2></div>
          <div className="rows">
            {data.prayerWeek.slice(1, 7).map((day) => {
              const fajr = day.times.find((t) => t.name === 'Fajr')?.time ?? '–';
              const maghrib = day.times.find((t) => t.name === 'Maghrib')?.time ?? '–';
              return (
                <div className="week-row" key={day.date}>
                  <span className="week-row__day">{day.date === viennaDate() ? 'Heute' : formatWeekday(day.date)}</span>
                  <span className="week-row__pair"><Moon size={13} /> {fajr}</span>
                  <span className="week-row__pair"><Sunset size={13} /> {maghrib}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {data.prayerIsFallback ? (
        <button className="info-banner" type="button" onClick={() => setView('settings')}>
          <Info size={18} />
          <span>Beispielzeiten aktiv. Importiere die IZW-Jahres-XLSX unter „Mehr → Einstellungen", um echte Zeiten zu laden.</span>
        </button>
      ) : null}
    </Screen>
  );
}
