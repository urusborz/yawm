import { motion } from 'framer-motion';
import { ClipboardCheck, Home, LayoutGrid, Plus, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

export type View =
  | 'me'
  | 'family'
  | 'tasks'
  | 'calendar'
  | 'notes'
  | 'bills'
  | 'prayer'
  | 'habits'
  | 'quran'
  | 'clean'
  | 'checkin'
  | 'routines'
  | 'reminders'
  | 'focus'
  | 'prepare'
  | 'settings'
  | 'more';

const TABS: { view: View; label: string; icon: ReactNode }[] = [
  { view: 'me', label: 'Ich', icon: <Home size={21} strokeWidth={2.1} /> },
  { view: 'family', label: 'Familie', icon: <UsersRound size={21} strokeWidth={2.1} /> },
  { view: 'tasks', label: 'Aufgaben', icon: <ClipboardCheck size={21} strokeWidth={2.1} /> },
  { view: 'more', label: 'Mehr', icon: <LayoutGrid size={21} strokeWidth={2.1} /> },
];

export function BottomNav({ view, setView, onAdd }: { view: View; setView: (v: View) => void; onAdd: () => void }) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <nav className="tabbar">
      <div className="tabbar__inner">
        {left.map((t) => <TabButton key={t.view} tab={t} active={view === t.view} onClick={() => setView(t.view)} />)}
        <div className="tabbar__center">
          <motion.button className="tabbar__add" type="button" onClick={onAdd} title="Hinzufügen" whileTap={{ scale: 0.92 }}>
            <Plus size={22} strokeWidth={2.4} />
          </motion.button>
        </div>
        {right.map((t) => <TabButton key={t.view} tab={t} active={view === t.view} onClick={() => setView(t.view)} />)}
      </div>
    </nav>
  );
}

function TabButton({ tab, active, onClick }: { tab: { view: View; label: string; icon: ReactNode }; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'} data-testid={`tab-${tab.view}`} type="button" onClick={onClick} title={tab.label}>
      <span className="tabbar__glyph">{tab.icon}</span>
      <span className="tabbar__label">{tab.label}</span>
    </button>
  );
}
