import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';

type Mode = 'signin' | 'signup' | 'magic';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setError('Supabase ENV fehlt.'); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      if (mode === 'magic') {
        const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
        if (e) throw e;
        setInfo('Magic-Link gesendet. Prüfe dein E-Mail-Postfach.');
      } else if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) throw e;
        if (data.user && data.session) {
          await db.ensureProfile(data.user, name);
          // auth listener takes over from here
        } else {
          setInfo('Konto erstellt. Bitte E-Mail bestätigen, dann einloggen.');
          setMode('signin');
        }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen" data-theme="slate" data-mode="dark">
      <motion.form
        className="auth-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 240 }}
      >
        <div className="brand-mark brand-mark--lg">Y</div>
        <div className="auth-card__intro">
          <span>Yawm</span>
          <h1>{mode === 'signup' ? 'Konto erstellen' : 'Willkommen zurück'}</h1>
          <p>Persönliche Tagesplanung & gemeinsames Familien-Dashboard.</p>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }}>Einloggen</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Registrieren</button>
        </div>

        {mode === 'signup' ? (
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" autoComplete="name" />
        ) : null}
        <input className="field" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="E-Mail" autoComplete="email" required />
        {mode !== 'magic' ? (
          <input className="field" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="Passwort" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={6} />
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {info ? <p className="form-info">{info}</p> : null}

        <button className="primary-button" type="submit" disabled={busy}>
          {mode === 'magic' ? <Mail size={18} /> : mode === 'signup' ? <Sparkles size={18} /> : <ShieldCheck size={18} />}
          {busy ? 'Bitte warten…' : mode === 'magic' ? 'Magic-Link senden' : mode === 'signup' ? 'Konto erstellen' : 'Einloggen'}
        </button>

        <button type="button" className="link-button" onClick={() => { setMode(mode === 'magic' ? 'signin' : 'magic'); setError(''); }}>
          {mode === 'magic' ? 'Lieber mit Passwort' : 'Stattdessen Magic-Link per E-Mail'}
        </button>
      </motion.form>
    </div>
  );
}
