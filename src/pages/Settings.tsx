import { useRef, useState } from 'react';
import { Bell, Check, Copy, Download, LogOut, Palette, ShieldCheck, Sun, UserRound, UsersRound } from 'lucide-react';
import { Screen, SimpleHeader, Segmented } from '../components/ui';
import { useData } from '../store';
import { supabase } from '../lib/supabase';
import { subscribeToPush } from '../lib/push';
import type { NotificationPreferences } from '../types';

const THEMES: { key: 'slate' | 'rose' | 'midnight'; label: string; tone: string }[] = [
  { key: 'slate', label: 'Klar', tone: 'ruhig und grün' },
  { key: 'rose', label: 'Warm', tone: 'weich und persönlich' },
  { key: 'midnight', label: 'Nacht', tone: 'kontrastreich und blau' },
];

export default function Settings({ theme, setTheme, mode, setMode, onSignOut }: {
  theme: string;
  setTheme: (t: 'slate' | 'rose' | 'midnight') => void;
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
  const selectedTheme = THEMES.find((t) => t.key === theme) || THEMES[0];

  const prefs = data.notificationPrefs;
  const setPref = (patch: Partial<NotificationPreferences>) => data.saveNotificationPrefs({ ...prefs, ...patch });
  const nameDirty = name.trim() !== data.profileName;
  const householdDirty = householdName.trim() !== data.household.name;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.household.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function enablePush() {
    setPushMsg('');
    try {
      await subscribeToPush(data.user.id);
      setPushMsg('Push aktiviert');
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : 'Push fehlgeschlagen');
    }
  }

  async function importXlsx(file: File) {
    setImportMsg('Importiere...');
    try {
      const { data: s } = await supabase!.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-prayer-times`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
        body: (() => { const f = new FormData(); f.append('file', file); f.append('city', 'Wien'); return f; })(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import fehlgeschlagen');
      setImportMsg(`${json.imported} Tage importiert`);
      await data.refresh();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    }
  }

  return (
    <Screen>
      <SimpleHeader title="Einstellungen" subtitle={data.syncState} />

      <section className="panel set-section">
        <div className="panel__header"><h2><UserRound size={17} /> Profil</h2></div>
        <div className="field-row">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
          <button className="field-row__save" type="button" disabled={!nameDirty} onClick={() => data.setProfileName(name.trim())}><Check size={18} /></button>
        </div>
      </section>

      <section className="panel set-section">
        <div className="panel__header"><h2><UsersRound size={17} /> Haushalt</h2></div>
        <div className="field-row">
          <input className="field" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Name des Haushalts" />
          <button className="field-row__save" type="button" disabled={!householdDirty} onClick={() => data.renameHousehold(householdName.trim())}><Check size={18} /></button>
        </div>
        <button className="join-code" type="button" onClick={copyCode}>
          <div>
            <span className="eyebrow">Beitritts-Code</span>
            <strong>{data.household.joinCode}</strong>
          </div>
          <span className="join-code__copy">{copied ? <Check size={18} /> : <Copy size={18} />}</span>
        </button>
        <p className="form-hint">Teile den Code mit deiner Frau, damit sie demselben Haushalt beitreten kann.</p>
        <div className="member-list">
          {data.household.members.map((m) => (
            <div className="member" key={m.userId}>
              <span className="avatar">{data.initialsOf(m.userId)}</span>
              <div><strong>{m.displayName}</strong><span>{m.role === 'owner' ? 'Eigentümer' : 'Mitglied'}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel set-section">
        <div className="panel__header"><h2><Bell size={17} /> Benachrichtigungen</h2></div>
        <button className="action-row" type="button" onClick={enablePush}>
          <Bell size={19} />
          <div><strong>Push auf diesem Gerät</strong><span>{pushMsg || 'Aktivieren, um Erinnerungen zu erhalten'}</span></div>
        </button>
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

      <section className="panel set-section">
        <div className="panel__header"><h2><Sun size={17} /> Gebetszeiten</h2></div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importXlsx(f); }} />
        <button className="action-row" type="button" onClick={() => fileRef.current?.click()}>
          <Download size={19} />
          <div><strong>IZW-Jahres-XLSX importieren</strong><span>{importMsg || 'Lädt 365 Tage Wiener Gebetszeiten'}</span></div>
        </button>
      </section>

      <section className="panel set-section">
        <div className="panel__header"><h2><Palette size={17} /> Design</h2></div>
        <div className="theme-preview">
          <div>
            <span className="eyebrow">Vorschau</span>
            <strong>{selectedTheme.label}</strong>
            <small>{selectedTheme.tone}</small>
          </div>
          <div className="theme-preview__card">
            <span />
            <b>Heute</b>
            <i />
          </div>
        </div>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'light', label: 'Hell' }, { value: 'dark', label: 'Dunkel' }]} />
        <div className="theme-row">
          {THEMES.map((t) => (
            <button key={t.key} className="theme-pick" type="button" onClick={() => setTheme(t.key)}>
              <span className={theme === t.key ? 'theme-dot active' : 'theme-dot'} data-dot={t.key} />
              <span className="theme-pick__label">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      <button className="menu-row--danger" type="button" onClick={onSignOut}><LogOut size={19} /><span>Abmelden</span></button>
      <p className="set-footer"><ShieldCheck size={13} /> Private Tracker sind per RLS für andere unsichtbar.</p>
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
