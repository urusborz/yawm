import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Save, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState, Sheet, StaggerList, StaggerItem } from '../components/ui';
import { useData } from '../store';
import type { QuickAddType } from '../components/QuickAdd';
import { formatTime, formatWeekday, viennaDate } from '../lib/dates';
import type { FamilyEvent } from '../types';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function localToISO(date: string, time: string) { return new Date(`${date}T${time}:00`).toISOString(); }
function monthLabel(anchor: string) {
  return new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric', timeZone: 'Europe/Vienna' }).format(new Date(`${anchor}T12:00:00`));
}
function monthGrid(anchor: string) {
  const first = new Date(`${anchor}T12:00:00`);
  const weekday = (first.getDay() + 6) % 7;
  const start = new Date(first); start.setDate(1 - weekday);
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return viennaDate(d); });
}

export default function Calendar({ onAdd }: { onAdd: (t: QuickAddType) => void }) {
  const data = useData();
  const today = viennaDate();
  const [view, setView] = useState<'list' | 'month'>('list');
  const [showPast, setShowPast] = useState(false);
  const [anchor, setAnchor] = useState(`${today.slice(0, 7)}-01`);
  const [selected, setSelected] = useState(today);
  const [edit, setEdit] = useState<FamilyEvent | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, FamilyEvent[]>();
    data.events.forEach((e) => {
      const day = viennaDate(new Date(e.startsAt));
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    map.forEach((arr) => arr.sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    return map;
  }, [data.events]);

  const listGroups = useMemo(() => {
    const days = [...byDay.keys()].filter((d) => (showPast ? d < today : d >= today)).sort();
    if (showPast) days.reverse();
    return days.map((d) => [d, byDay.get(d)!] as const);
  }, [byDay, showPast, today]);

  return (
    <Screen>
      <SimpleHeader title="Kalender" subtitle="Termine" action={<button className="header-add" type="button" onClick={() => onAdd('event')}><Plus size={18} /></button>} />

      <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'Liste' }, { value: 'month', label: 'Monat' }]} />

      {view === 'list' ? (
        <>
          <div className="filter-bar">
            <Segmented value={showPast ? 'past' : 'upcoming'} onChange={(v) => setShowPast(v === 'past')} options={[{ value: 'upcoming', label: 'Anstehend' }, { value: 'past', label: 'Vergangen' }]} />
          </div>
          {listGroups.length === 0 ? (
            <EmptyState icon={<Plus size={26} />} title={showPast ? 'Nichts Vergangenes' : 'Keine Termine'} hint={showPast ? undefined : 'Plane deinen ersten Termin mit +.'} />
          ) : (
            <StaggerList className="day-groups">
              {listGroups.map(([day, items]) => (
                <StaggerItem key={day} className="day-group">
                  <div className="day-group__head">
                    <span className="day-group__weekday">{day === today ? 'Heute' : formatWeekday(day)}</span>
                    <span className="day-group__date">{new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: 'long', timeZone: 'Europe/Vienna' }).format(new Date(`${day}T12:00:00`))}</span>
                  </div>
                  <div className="panel"><div className="rows">{items.map((e) => <EventRow key={e.id} ev={e} onEdit={setEdit} onDelete={data.deleteEvent} initials={data.initialsOf(e.ownerId)} />)}</div></div>
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </>
      ) : (
        <>
          <div className="cal-head">
            <button className="icon-button" type="button" onClick={() => { const d = new Date(`${anchor}T12:00:00`); d.setMonth(d.getMonth() - 1); setAnchor(`${viennaDate(d).slice(0, 7)}-01`); }}><ChevronLeft size={18} /></button>
            <strong>{monthLabel(anchor)}</strong>
            <button className="icon-button" type="button" onClick={() => { const d = new Date(`${anchor}T12:00:00`); d.setMonth(d.getMonth() + 1); setAnchor(`${viennaDate(d).slice(0, 7)}-01`); }}><ChevronRight size={18} /></button>
          </div>
          <div className="cal-grid">
            {WEEKDAYS.map((w) => <span className="cal-wd" key={w}>{w}</span>)}
            {monthGrid(anchor).map((day) => {
              const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
              const count = byDay.get(day)?.length ?? 0;
              return (
                <button key={day} className={`cal-cell${day === selected ? ' cal-cell--sel' : ''}${day === today ? ' cal-cell--today' : ''}${inMonth ? '' : ' cal-cell--muted'}`} type="button" onClick={() => setSelected(day)}>
                  <span>{Number(day.slice(8))}</span>
                  {count ? <i className="cal-dot" /> : null}
                </button>
              );
            })}
          </div>
          <div className="panel">
            <div className="panel__header"><h2>{selected === today ? 'Heute' : new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'Europe/Vienna' }).format(new Date(`${selected}T12:00:00`))}</h2></div>
            <div className="rows">
              {(byDay.get(selected) ?? []).length
                ? byDay.get(selected)!.map((e) => <EventRow key={e.id} ev={e} onEdit={setEdit} onDelete={data.deleteEvent} initials={data.initialsOf(e.ownerId)} />)
                : <p className="muted">Keine Termine an diesem Tag.</p>}
            </div>
          </div>
        </>
      )}

      <EditSheet event={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}

function EventRow({ ev, onEdit, onDelete, initials }: { ev: FamilyEvent; onEdit: (e: FamilyEvent) => void; onDelete: (id: string) => void; initials: string }) {
  return (
    <div className="event-row">
      <span className="time-badge">{formatTime(ev.startsAt)}</span>
      <button className="event-row__body" type="button" onClick={() => onEdit(ev)}>
        <strong>{ev.title}</strong>
        {ev.location ? <span><MapPin size={12} /> {ev.location}</span> : null}
      </button>
      {ev.forLabel ? <span className="muted-chip">{ev.forLabel}</span> : null}
      {ev.scope === 'shared' ? <span className="owner-chip">{initials}</span> : null}
      <button className="delete-button" type="button" onClick={() => onDelete(ev.id)} title="Löschen"><Trash2 size={15} /></button>
    </div>
  );
}

function EditSheet({ event, onClose }: { event: FamilyEvent | null; onClose: () => void }) {
  const data = useData();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(viennaDate());
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [forLabel, setForLabel] = useState('');

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDate(viennaDate(new Date(event.startsAt)));
    setStart(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }).format(new Date(event.startsAt)));
    setEnd(event.endsAt ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }).format(new Date(event.endsAt)) : '');
    setLocation(event.location ?? '');
    setForLabel(event.forLabel ?? '');
  }, [event]);

  async function save() {
    if (!event) return;
    await data.updateEvent(event.id, {
      title: title.trim() || event.title,
      startsAt: localToISO(date, start),
      endsAt: end ? localToISO(date, end) : null,
      location: location.trim() || null,
      forLabel: forLabel.trim() || null,
    });
    onClose();
  }

  return (
    <Sheet open={Boolean(event)} title="Termin bearbeiten" onClose={onClose}>
      <div className="form-stack">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
        <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="form-grid">
          <input className="field" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <input className="field" type="time" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Ende" />
        </div>
        <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ort (optional)" />
        <input className="field" value={forLabel} onChange={(e) => setForLabel(e.target.value)} placeholder="Betrifft (z. B. Kind, optional)" />
        <button className="primary-button" type="button" onClick={save}><Save size={18} /> Speichern</button>
      </div>
    </Sheet>
  );
}
