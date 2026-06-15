import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, LogIn, Users } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import * as db from '../lib/db';
import { supabase } from '../lib/supabase';
import { errMsg } from '../lib/format';

export default function Onboarding({ user, onReady }: { user: User; onReady: () => void }) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('Familie');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await db.ensureProfile(user);
      if (tab === 'create') {
        await db.createHousehold(name, user.id);
      } else {
        await db.joinHouseholdByCode(code.trim());
      }
      onReady();
    } catch (e) {
      setError(errMsg(e, 'Konnte nicht abgeschlossen werden.'));
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen" data-theme="slate" data-mode="dark">
      <motion.form
        className="auth-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 240 }}
      >
        <div className="brand-mark brand-mark--lg">Y</div>
        <div className="auth-card__intro">
          <span>Fast geschafft</span>
          <h1>Haushalt einrichten</h1>
          <p>Ein Haushalt verbindet dich und deine Frau. Erstelle einen neuen oder tritt mit einem Code bei.</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={tab === 'create' ? 'active' : ''} onClick={() => { setTab('create'); setError(''); }}><Home size={15} /> Neu</button>
          <button type="button" className={tab === 'join' ? 'active' : ''} onClick={() => { setTab('join'); setError(''); }}><Users size={15} /> Beitreten</button>
        </div>

        {tab === 'create' ? (
          <>
            <label className="field-label">Name des Haushalts</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Familie Borz" />
            <p className="form-hint">Du wirst Eigentümer. Danach bekommst du einen Beitritts-Code für deine Frau.</p>
          </>
        ) : (
          <>
            <label className="field-label">Beitritts-Code</label>
            <input className="field field--code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="z. B. A1B2C3" maxLength={8} />
            <p className="form-hint">Den Code findest du beim anderen Mitglied unter „Mehr → Haushalt".</p>
          </>
        )}

        {error ? <p className="form-error">{error}</p> : null}

        <button className="primary-button" type="submit" disabled={busy}>
          <LogIn size={18} />
          {busy ? 'Bitte warten…' : tab === 'create' ? 'Haushalt erstellen' : 'Haushalt beitreten'}
        </button>

        <button type="button" className="link-button" onClick={() => supabase?.auth.signOut()}>Abmelden</button>
      </motion.form>
    </div>
  );
}
