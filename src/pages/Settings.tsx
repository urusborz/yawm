import { useRef, useState } from 'react';
import { Bell, Check, Copy, LogOut, Moon, Sun, Upload, UserRound, UsersRound } from 'lucide-react';
import { Screen, SimpleHeader } from '../components/ui';
import { useData } from '../store';
import { supabase } from '../lib/supabase';
import { subscribeToPush } from '../lib/push';
import type { NotificationPreferences } from '../types';

const THEMES = ['slate', 'emerald', 'rose', 'midnight'] as const;

export default function Settings({ theme, setTheme, mode, setMode, onSignOut }: {
  theme: string;
  setTheme: (t: (typeof THEMES)[number]) => void;
  mode: 'dark' | 'light';
  setMode: (m: 'dark' | 'light') => void;
  onSignOut: () => void;
}) {
  const data = useData();
  const [name, setName] = useState(data.profileName);
  const [householdName, setHouseholdName] = useState(data.household.name);
  const [copied, setCopied] = useState(false);
  const [pushMsg, setPushMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const prefs = data.notificationPrefs;
  const setPref = (patch: Partial<NotificationPreferences>) => data.saveNotificationPrefs({ ...prefs, ...patch });

  async function copyCode() {
    try { await navigator.clipboard.writeText(data.household.joinCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  async function enablePush() {
    setPushMsg('');
    try {
      await subscribeToPush(data.user.id);
      setPushMsg('Push aktiviert ✓');
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Push fehlgeschlagen');
    }
  }

  async function importXlsx(file: File) {
    setImportMsg('Importiere…');
    try {
      const { data: sessionData } = await supabase!.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-prayer-times`;
      const form = new FormData();
      form.append('file', file);
      form.append('city', 'Wien');
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import fehlgeschlagen');
      setImportMsg(`${json.imported} Tage importiert ✓`);
      await data.refresh();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    }
  }

  return (
    <Screen>
      <SimpleHeader title="Einstellungen" subtitle={data.syncState} />

      {/* Profile */}
      <section className="panel compose">
        <div className="panel__header"><h2><UserRound size={17} /> Profil</h2></div>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
        <button className="primary-button" type="button" onClick={() => data.setProfileName(name)}><Check size={18} /> Name speichern</button>
      </section>

      {/* Household */}
      <section className="panel compose">
        <div className="panel__header"><h2><UsersRound size={17} /> Haushalt</h2></div>
        <input className="field" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Name des Haushalts" />
        <button className="primary-button" type="button" onClick={() => data.renameHousehold(householdName)}><Check size={18} /> Speichern</button>
        <div className="join-code">
          <div>
            <span className="eyebrow">Beitritts-Code</span>
            <strong>{data.household.joinCode}</strong>
          </div>
          <button className="icon-button icon-button--solid" type="button" onClick={copyCode} title="Kopieren">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
        </div>
        <p className="form-hint">Teile diesen Code mit deiner Frau, damit sie demselben Haushalt beitritt.</p>
        <div className="member-list">
          {data.household.members.map((m) => (
            <div className="member" key={m.userId}>
              <span className="avatar">{data.initialsOf(m.userId)}</span>
              <div><strong>{m.displayName}</strong><span>{m.role === 'owner' ? 'Eigentümer' : 'Mitglied'}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section className="panel">
        <div className="panel__header"><h2><Bell size={17} /> Benachrichtigungen</h2></div>
        <button className="menu-row" type="button" onClick={enablePush}><Bell size={19} /><span>Push auf diesem Gerät aktivieren</span></button>
        {pushMsg ? <p className="form-hint">{pushMsg}</p> : null}
        <div className="toggle-list">
          <Toggle label="Fajr" checked={prefs.prayerFajr} onChange={(v) => setPref({ prayerFajr: v })} />
          <Toggle label="Dhuhr" checked={prefs.prayerDhuhr} onChange={(v) => setPref({ prayerDhuhr: v })} />
          <Toggle label="Asr" checked={prefs.prayerAsr} onChange={(v) => setPref({ prayerAsr: v })} />
          <Toggle label="Maghrib" checked={prefs.prayerMaghrib} onChange={(v) => setPref({ prayerMaghrib: v })} />
          <Toggle label="Isha" checked={prefs.prayerIsha} onChange={(v) => setPref({ prayerIsha: v })} />
          <Toggle label="Rechnungs-Erinnerungen" checked={prefs.billReminders} onChange={(v) => setPref({ billReminders: v })} />
          <Toggle label="Termin-Erinnerungen" checked={prefs.eventReminders} onChange={(v) => setPref({ eventReminders: v })} />
          <Toggle label="Check-in-Erinnerung" checked={prefs.dailyCheckin} onChange={(v) => setPref({ dailyCheckin: v })} />
        </div>
      </section>

      {/* Prayer import */}
      <section className="panel">
        <div className="panel__header"><h2><Sun size={17} /> Gebetszeiten-Import</h2></div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importXlsx(f); }} />
        <button className="menu-row" type="button" onClick={() => fileRef.current?.click()}><Upload size={19} /><span>IZW-Jahres-XLSX hochladen</span></button>
        {importMsg ? <p className="form-hint">{importMsg}</p> : null}
        <p className="form-hint">Einmal pro Jahr. Lädt 365 Tage Wiener Gebetszeiten in die Datenbank.</p>
      </section>

      {/* Appearance */}
      <section className="panel">
        <div className="panel__header"><h2>Design</h2></div>
        <div className="theme-grid theme-grid--wide">
          {THEMES.map((t) => <button key={t} className={theme === t ? 'theme-dot active' : 'theme-dot'} data-dot={t} type="button" onClick={() => setTheme(t)} title={t} />)}
        </div>
        <button className="menu-row" type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
          {mode === 'dark' ? <Moon size={19} /> : <Sun size={19} />}<span>{mode === 'dark' ? 'Dunkelmodus' : 'Hellmodus'}</span>
        </button>
      </section>

      <button className="menu-row menu-row--danger" type="button" onClick={onSignOut}><LogOut size={19} /><span>Abmelden</span></button>
    </Screen>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="toggle" type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span className={checked ? 'toggle__track toggle__track--on' : 'toggle__track'}><span className="toggle__thumb" /></span>
    </button>
  );
}
