import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DataProvider, useAuthGate } from './store';
import { supabase } from './lib/supabase';
import { BottomNav, type View } from './components/Shell';
import { QuickAdd, type QuickAddType } from './components/QuickAdd';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import DashboardMe from './pages/DashboardMe';
import DashboardFamily from './pages/DashboardFamily';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Bills from './pages/Bills';
import Prayer from './pages/Prayer';
import Habits from './pages/Habits';
import Quran from './pages/Quran';
import Clean from './pages/Clean';
import Checkin from './pages/Checkin';
import More from './pages/More';
import Settings from './pages/Settings';

const THEMES = ['slate', 'rose', 'midnight'] as const;
type Theme = (typeof THEMES)[number];

function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => { window.localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue] as const;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function App() {
  const { state, reboot } = useAuthGate();
  const [theme, setTheme] = usePersistentState<Theme>('yawm-theme', 'slate');
  const [mode, setMode] = usePersistentState<'dark' | 'light'>('yawm-mode', 'dark');

  useEffect(() => {
    if (!(THEMES as readonly string[]).includes(theme)) setTheme('slate');
  }, [theme, setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.mode = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#09090b' : '#f6f6f7');
  }, [theme, mode]);

  if (state.phase === 'loading') {
    return <div className="boot-screen" data-theme="slate" data-mode="dark"><div className="brand-mark brand-mark--lg pulse">Y</div></div>;
  }
  if (state.phase === 'unconfigured') {
    return (
      <div className="boot-screen" data-theme="slate" data-mode="dark">
        <div className="auth-card"><div className="brand-mark brand-mark--lg">Y</div><h1>Konfiguration fehlt</h1><p className="form-hint">VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY sind nicht gesetzt.</p></div>
      </div>
    );
  }
  if (state.phase === 'signed-out') {
    return <div data-theme={theme} data-mode={mode}><Auth /></div>;
  }
  if (state.phase === 'onboarding') {
    return <div data-theme={theme} data-mode={mode}><Onboarding user={state.user} onReady={() => reboot(state.user)} /></div>;
  }

  return (
    <DataProvider
      user={state.user}
      household={state.household}
      workspace={state.workspace}
      profileName={state.profileName}
      prayerIsFallback={state.prayerIsFallback}
    >
      <Shell theme={theme} setTheme={setTheme} mode={mode} setMode={setMode} />
    </DataProvider>
  );
}

function Shell({ theme, setTheme, mode, setMode }: { theme: Theme; setTheme: (t: Theme) => void; mode: 'dark' | 'light'; setMode: (m: 'dark' | 'light') => void }) {
  const now = useNow();
  const [view, setView] = usePersistentState<View>('yawm-view', 'me');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<QuickAddType>('task');

  function openAdd(type: QuickAddType = 'task') {
    setQuickAddType(type);
    setQuickAddOpen(true);
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <div className="app" data-theme={theme} data-mode={mode}>
      <div className="viewport">
        <div className="content">
          <AnimatePresence mode="wait">
            {view === 'me' && <DashboardMe key="me" now={now} setView={setView} onAdd={openAdd} />}
            {view === 'family' && <DashboardFamily key="family" setView={setView} onAdd={openAdd} />}
            {view === 'tasks' && <Tasks key="tasks" />}
            {view === 'calendar' && <Calendar key="calendar" onAdd={openAdd} />}
            {view === 'notes' && <Notes key="notes" />}
            {view === 'bills' && <Bills key="bills" />}
            {view === 'prayer' && <Prayer key="prayer" now={now} setView={setView} />}
            {view === 'habits' && <Habits key="habits" />}
            {view === 'quran' && <Quran key="quran" />}
            {view === 'clean' && <Clean key="clean" />}
            {view === 'checkin' && <Checkin key="checkin" />}
            {view === 'more' && <More key="more" setView={setView} />}
            {view === 'settings' && <Settings key="settings" theme={theme} setTheme={setTheme} mode={mode} setMode={setMode} onSignOut={signOut} />}
          </AnimatePresence>
        </div>

        <QuickAdd open={quickAddOpen} initialType={quickAddType} onClose={() => setQuickAddOpen(false)} />
      </div>
      <BottomNav view={view} setView={setView} onAdd={() => openAdd('task')} />
    </div>
  );
}
