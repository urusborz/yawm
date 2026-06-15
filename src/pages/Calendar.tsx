import { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, EmptyState, StaggerList, StaggerItem } from '../components/ui';
import { useData } from '../store';
import type { QuickAddType } from '../components/QuickAdd';
import { formatTime, formatWeekday, viennaDate } from '../lib/dates';
import type { FamilyEvent } from '../types';

export default function Calendar({ onAdd }: { onAdd: (t: QuickAddType) => void }) {
  const data = useData();
  const today = viennaDate();

  const groups = useMemo(() => {
    const upcoming = data.events
      .filter((e) => viennaDate(new Date(e.startsAt)) >= today)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const map = new Map<string, FamilyEvent[]>();
    upcoming.forEach((e) => {
      const day = viennaDate(new Date(e.startsAt));
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return Array.from(map.entries());
  }, [data.events, today]);

  return (
    <Screen>
      <SimpleHeader title="Kalender" subtitle="Anstehende Termine" action={<button className="header-add" type="button" onClick={() => onAdd('event')}><Plus size={18} /></button>} />

      {groups.length === 0 ? (
        <EmptyState icon={<CalendarDays size={26} />} title="Keine Termine" hint="Plane deinen ersten Termin mit +." />
      ) : (
        <StaggerList className="day-groups">
          {groups.map(([day, items]) => (
            <StaggerItem key={day} className="day-group">
              <div className="day-group__head">
                <span className="day-group__weekday">{day === today ? 'Heute' : formatWeekday(day)}</span>
                <span className="day-group__date">{new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: 'long', timeZone: 'Europe/Vienna' }).format(new Date(`${day}T12:00:00`))}</span>
              </div>
              <div className="panel">
                <div className="rows">
                  {items.map((e) => (
                    <div className="event-row" key={e.id}>
                      <span className="time-badge">{formatTime(e.startsAt)}</span>
                      <div>
                        <strong>{e.title}</strong>
                        {e.location ? <span><MapPin size={12} /> {e.location}</span> : null}
                      </div>
                      {e.scope === 'shared' ? <span className="owner-chip">{data.initialsOf(e.ownerId)}</span> : null}
                      <button className="delete-button" type="button" onClick={() => data.deleteEvent(e.id)} title="Löschen"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </Screen>
  );
}
