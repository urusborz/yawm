import { motion } from 'framer-motion';
import {
  CalendarDays,
  ClipboardCheck,
  Home,
  LayoutGrid,
  Plus,
  UsersRound,
} from 'lucide-react';
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
  | 'settings'
  | 'more';

const TABS: { view: View; label: string; icon: ReactNode }[] = [
  { view: 'me', label: 'Ich', icon: <Home size={22} /> },
  { view: 'family', label: 'Familie', icon: <UsersRound size={22} /> },
  { view: 'tasks', label: 'Aufgaben', icon: <ClipboardCheck size={22} /> },
  { view: 'more', label: 'Mehr', icon: <LayoutGrid size={22} /> },
];

export function BottomNav({ view, setView, onAdd }: { view: View; setView: (v: View) => void; onAdd: () => void }) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  return (
    <nav className="tabbar">
      <div className="tabbar__inner">
        {left.map((t) => (
          <TabButton key={t.view} tab={t} active={view === t.view} onClick={() => setView(t.view)} />
        ))}

        <div className="tabbar__center">
          <motion.button
            className="tabbar__add"
            type="button"
            onClick={onAdd}
            title="Hinzufuegen"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
          >
            <Plus size={26} />
          </motion.button>
        </div>

        {right.map((t) => (
          <TabButton key={t.view} tab={t} active={view === t.view} onClick={() => setView(t.view)} />
        ))}
      </div>
    </nav>
  );
}

function TabButton({ tab, active, onClick }: { tab: { view: View; label: string; icon: ReactNode }; active: boolean; onClick: () => void }) {
  return (
    <button
      className={active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'}
      data-testid={`tab-${tab.view}`}
      type="button"
      onClick={onClick}
      title={tab.label}
    >
      <span className="tabbar__icon">
        {active ? <motion.span layoutId="tab-bubble" className="tabbar__bubble" transition={{ type: 'spring', damping: 26, stiffness: 320 }} /> : null}
        <span className="tabbar__glyph">{tab.icon}</span>
      </span>
      <span className="tabbar__label">{tab.label}</span>
    </button>
  );
}

const RAIL: { view: View; label: string; icon: ReactNode }[] = [
  { view: 'me', label: 'Ich', icon: <Home size={21} /> },
  { view: 'family', label: 'Familie', icon: <UsersRound size={21} /> },
  { view: 'tasks', label: 'Aufgaben', icon: <ClipboardCheck size={21} /> },
  { view: 'calendar', label: 'Kalender', icon: <CalendarDays size={21} /> },
  { view: 'more', label: 'Mehr', icon: <LayoutGrid size={21} /> },
];

export function DesktopRail({ view, setView, onAdd }: { view: View; setView: (v: View) => void; onAdd: () => void }) {
  return (
    <aside className="desktop-rail">
      <div className="brand-mark">Y</div>
      {RAIL.map((r) => (
        <button
          key={r.view}
          className={view === r.view ? 'rail-button active' : 'rail-button'}
          data-testid={`rail-${r.view}`}
          type="button"
          onClick={() => setView(r.view)}
          title={r.label}
        >
          {r.icon}
        </button>
      ))}
      <button className="rail-button rail-button--add" type="button" onClick={onAdd} title="Hinzufuegen">
        <Plus size={21} />
      </button>
    </aside>
  );
}
