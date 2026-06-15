import { BookOpen, CalendarDays, CircleDollarSign, ClipboardCheck, Flame, Lock, NotebookPen, Settings as SettingsIcon, Sparkles, Sun, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Screen, SimpleHeader, StaggerList, StaggerItem } from '../components/ui';
import { useData } from '../store';
import type { View } from '../components/Shell';

type Tile = { view: View; label: string; hint: string; icon: ReactNode; color: string };

const TILES: Tile[] = [
  { view: 'calendar', label: 'Kalender', hint: 'Termine planen', icon: <CalendarDays size={22} />, color: '#6c8ef5' },
  { view: 'notes', label: 'Notizen', hint: 'Gedanken & Listen', icon: <NotebookPen size={22} />, color: '#0ea5e9' },
  { view: 'bills', label: 'Rechnungen', hint: 'Geteilt im Haushalt', icon: <CircleDollarSign size={22} />, color: '#34c77b' },
  { view: 'prayer', label: 'Gebetszeiten', hint: 'Wien · IZW', icon: <Sun size={22} />, color: '#f59e0b' },
  { view: 'habits', label: 'Habits', hint: 'Gewohnheiten', icon: <Flame size={22} />, color: '#db2777' },
  { view: 'quran', label: 'Quran', hint: 'Lernfortschritt', icon: <BookOpen size={22} />, color: '#10b981' },
  { view: 'clean', label: 'Clean-Tracker', hint: 'Privat', icon: <Lock size={22} />, color: '#a855f7' },
  { view: 'checkin', label: 'Check-in', hint: 'Tägliche Reflexion', icon: <Sparkles size={22} />, color: '#f472b6' },
];

export default function More({ setView }: { setView: (v: View) => void }) {
  const data = useData();
  return (
    <Screen>
      <SimpleHeader title="Mehr" subtitle={data.household.name} icon={<ClipboardCheck size={24} />} />

      <StaggerList className="hub-grid">
        {TILES.map((t) => (
          <StaggerItem key={t.view}>
            <button className="hub-card" type="button" onClick={() => setView(t.view)}>
              <span className="hub-card__icon" style={{ background: `${t.color}22`, color: t.color }}>{t.icon}</span>
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
            </button>
          </StaggerItem>
        ))}
      </StaggerList>

      <button className="settings-row" type="button" onClick={() => setView('settings')}>
        <SettingsIcon size={20} />
        <div><strong>Einstellungen</strong><span>Haushalt, Benachrichtigungen, Design</span></div>
      </button>
      <button className="settings-row" type="button" onClick={() => setView('family')}>
        <UsersRound size={20} />
        <div><strong>Familien-Dashboard</strong><span>Gemeinsame Übersicht</span></div>
      </button>
    </Screen>
  );
}
