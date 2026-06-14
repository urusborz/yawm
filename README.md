# Yawm

Yawm ist eine Familien-PWA für Tagesplanung, Selbstreflexion und gemeinsame Haushaltsplanung.

## Lokal starten

```bash
npm install
npm run dev
```

Für Supabase später `.env.example` nach `.env.local` kopieren und `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_ANON_KEY` eintragen.

## Nächste aktive Schritte

1. Supabase-Projekt erstellen.
2. Auth mit E-Mail/Magic-Link aktivieren.
3. Migration aus `supabase/migrations` ausführen.
4. Zwei Accounts anlegen und beide einem Haushalt zuordnen.
5. Vercel-Projekt mit diesen Environment-Variablen verbinden.
