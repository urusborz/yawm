import { BookOpen, CalendarDays, ChevronRight, CircleDollarSign, ClipboardCheck, Flame, Lock, NotebookPen, Settings as SettingsIcon, Sparkles, Sun, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Screen, SimpleHeader } from '../components/ui';
import { useData } from '../store';
import type { View } from '../components/Shell';

type Tile = { view: View; label: string; hint: string; icon: ReactNode; color: string; group: 'plan' | 'private' | 'family' };

const TILES: Tile[] = [
  { view: 'calendar', label: 'Kalender', hint: 'Termine und Monatsansicht', icon: <CalendarDays size={20} />, color: '#6c8ef5', group: 'plan' },
  { view: 'notes', label: 'Notizen', hint: 'Gedanken, Listen und Tags', icon: <NotebookPen size={20} />, color: '#0ea5e9', group: 'plan' },
  { view: 'prayer', label: 'Gebetszeiten', hint: 'Heute und Wochenvorschau', icon: <Sun size={20} />, color: '#f59e0b', group: 'plan' },
  { view: 'habits', label: 'Habits', hint: 'Gewohnheiten und Heatmap', icon: <Flame size={20} />, color: '#db2777', group: 'private' },
  { view: 'quran', label: 'Quran', hint: 'Sessions, Ziel und Verlauf', icon: <BookOpen size={20} />, color: '#10b981', group: 'private' },
  { view: 'clean', label: 'Clean-Tracker', hint: 'Privater Verlauf', icon: <Lock size={20} />, color: '#a855f7', group: 'private' },
  { view: 'checkin', label: 'Check-in', hint: 'Tägliche Reflexion', icon: <Sparkles size={20} />, color: '#f472b6', group: 'private' },
  { view: 'bills', label: 'Rechnungen', hint: 'Geteilte Haushaltskosten', icon: <CircleDollarSign size={20} />, color: '#34c77b', group: 'family' },
  { view: 'family', label: 'Familien-Dashboard', hint: 'Gemeinsame Übersicht', icon: <UsersRound size={20} />, color: '#60a5fa', group: 'family' },
];

const GROUPS: { id: Tile['group']; title: string }[] = [
  { id: 'plan', title: 'Planung' },
  { id: 'private', title: 'Privat' },
  { id: 'family', title: 'Familie' },
];

export default function More({ setView }: { setView: (v: View) => void }) {
  const data = useData();

  return (
    <Screen>
      <SimpleHeader title="Mehr" subtitle={data.household.name} icon={<ClipboardCheck size={24} />} />

      <section className="more-hero">
        <div>
          <span className="eyebrow">Yawm</span>
          <h2>{data.household.members.length} Mitglieder · {TILES.length} Bereiche</h2>
        </div>
        <button type="button" onClick={() => setView('settings')} title="Einstellungen">
          <SettingsIcon size={19} />
        </button>
      </section>

      {GROUPS.map((group) => (
        <section className="panel more-section" key={group.id}>
          <div className="panel__header"><h2>{group.title}</h2></div>
          <div className="more-list">
            {TILES.filter((t) => t.group === group.id).map((t) => (
              <button className="more-row" type="button" key={t.view} onClick={() => setView(t.view)}>
                <span className="more-row__icon" style={{ background: `${t.color}20`, color: t.color }}>{t.icon}</span>
                <span className="more-row__text">
                  <strong>{t.label}</strong>
                  <small>{t.hint}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="panel more-section">
        <div className="more-list">
          <button className="more-row" type="button" onClick={() => setView('settings')}>
            <span className="more-row__icon" style={{ background: 'color-mix(in srgb, var(--ink-2) 16%, transparent)', color: 'var(--ink-2)' }}><SettingsIcon size={20} /></span>
            <span className="more-row__text">
              <strong>Einstellungen</strong>
              <small>Profil, Haushalt, Benachrichtigungen, Design</small>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </Screen>
  );
}
