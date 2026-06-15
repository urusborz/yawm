# Yawm — Handover-Dokumentation

## 0.1 Update v3 (15.06.2026) — UI-Fluss, Sheets, Themes

Diese Runde modernisiert die mobile Bedienung und reduziert sichtbare Verschachtelung:

- v4 Entwurf: Ich-Dashboard ist nun als Tageszentrale aufgebaut: farbiger Hero, Live-Uhr, Quick Actions und Timeline für Gebet, Termin, Aufgabe, Quran und Check-in.
- v4 Entwurf: Mehr-Tab enthält einen Status-Hub mit offenen Aufgaben, Rechnungen und privaten Signalen.
- v4 Entwurf: Check-in wurde ritualhafter mit schneller Stimmungswahl vor den Detail-Slidern.
- v4 Entwurf: Designsystem hat lebendigere, aber einheitliche Farbflächen für Hero, Timeline, Quick Actions, Familien-Übersicht, Panels und Mood-Chips.
- v3.1: Heute-Kachel im Ich-Dashboard zeigt statt Prozent-Ring nun eine Live-Uhr mit Sekunden, um iOS-SVG-Fokusrahmen zu vermeiden.
- v3.1: Einstellungen im Mehr-Tab nutzt dieselbe Listenzeile wie alle anderen Mehr-Einträge.
- Familien-Dashboard: Geteilte Aufgaben und Familien-Termine öffnen nun eigene Bottom-Sheets statt den globalen Misch-QuickAdd zu verwenden.
- Familien-Dashboard: Leerzustände für Termine, geteilte Aufgaben und Einkaufsliste sind stärker ausgearbeitet.
- Einkaufsliste: Eingabezeile wurde auf ein stabiles Grid umgestellt; der Plus-Button ist sauber ausgerichtet.
- Daily Check-in: neue Hero-Karte, bessere Tagesmetriken, sauber gestylte Range-Slider und leerer Verlauf-Zustand.
- Design: Themes auf drei klare Varianten reduziert (`Klar`, `Warm`, `Nacht`), mit Live-Vorschau direkt in den Einstellungen.
- Theme-Migration: lokal gespeicherte alte Theme-Werte werden beim App-Start auf `slate` zurückgeführt.

Validierung: `npm run build` erfolgreich. Bundle-Warnung wegen Chunk-Größe besteht weiterhin und ist aktuell nicht blockernd.

> **Stand:** 15.06.2026 (v2-Ausbau) · Familien-PWA: persönliche Tagesplanung (privat) **+** gemeinsames Familien-Dashboard (geteilt).
> Genutzt von **2 Personen** (du + deine Frau) in **einem Haushalt**.

## 0. Update v2 (15.06.2026 abends) — UI-Politur + Feature-Ausbau

**UI:** Einstellungen komplett neu (saubere Sektionen, Action-Rows, Design mit Hell/Dunkel-Segment + Theme-Picker); Aufgaben-Schalter entzerrt (eigene Zeilen); globaler Abstands-/Komponenten-Feinschliff.

**10 vertiefte Features (alle auf bestehendem Schema, KEIN neues SQL nötig):**
1. Aufgaben: Bearbeiten-Sheet (Titel/Priorität/Fälligkeit mit Datum+Zeit), Sortierung (offen→Priorität→Fälligkeit), überfällig-Markierung.
2. Kalender: Listen-/**Monatsansicht** (Grid mit Event-Punkten), vergangene Termine, Termin-Bearbeiten (inkl. Endzeit).
3. Notizen: Inline-Bearbeiten, **Anpinnen** (via `pin`-Tag), Tag-Filter-Chips.
4. Rechnungen: Bearbeiten, **wiederkehrende legen beim Bezahlen automatisch die Folge-Rechnung an**, Kategorie-Übersicht (Balken), „wer hat wie viel gezahlt".
5. Habits: **Monats-Heatmap (35 T)**, Erfolgsquote, Bearbeiten.
6. Quran: **Tagesziel mit Fortschrittsring** (localStorage), Gesamtstatistik, Surah-Schnellauswahl.
7. Clean-Tracker: **Meilensteine** (7/30/90/180/365), **Ersparnis-Rechner** (€/Tag, localStorage), Craving-Verlauf (14 T).
8. Daily Check-in: **Stimmungs-Trend-Chart**, Streak, Wochen-Durchschnitte (Recap).
9. Familien-Dashboard: **Wochenübersicht** (Termine/fällige Rechnungen/offene Tasks) + Einladen-Karte mit Code.
10. Einkaufsliste: Mengen-Feld + „Erledigte aufräumen".

**Neue DB-Funktionen** (`lib/db.ts`, alle bestehendes Schema): `updateBill`, `updateEvent`, `updateHabitType`; Habit-Logs laden 35 Tage; `HabitWithProgress` um `monthValues`/`successRate` erweitert.
**Persistente Mini-Settings ohne DB:** Quran-Tagesziel (`yawm-quran-goal`), Clean-Kosten/Tag (`yawm-clean-perday`) — nur lokal pro Gerät.

---

Dieses Dokument fasst **alle bisherigen Schritte, Entscheidungen und den aktuellen Stand** zusammen, damit jederzeit nahtlos weitergearbeitet werden kann.

---

## 1. Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind v4 (via `@tailwindcss/vite`) + handgeschriebenes CSS-Designsystem in `src/styles.css` |
| Animationen | Framer Motion |
| Icons | lucide-react |
| Backend / DB | Supabase (Postgres, Auth, Edge Functions, Row Level Security) |
| Hosting | Vercel (Auto-Deploy von `main`) |
| PWA | manifest.json + Service Worker (`public/sw.js`) |

Build-Skripte (`package.json`):
- `npm run dev` – lokaler Dev-Server (Vite)
- `npm run build` – `tsc --noEmit` (Type-Check) **und** `vite build`
- `npm run preview` – Production-Build lokal ansehen

---

## 2. Aktueller Status

✅ **Funktional fertig & getestet (Build grün, Type-Check grün, keine Konsolenfehler):**
- Echte Multi-User-Auth (Login / Registrierung / Magic-Link) — **kein** „local/admin"-Modus mehr.
- Onboarding: Haushalt **erstellen** oder per **Code beitreten**.
- 14 voll verdrahtete Features (siehe Abschnitt 9), alle Supabase-/RLS-basiert mit Optimistic Updates.
- Minimalistisches, flaches UI-Redesign + PWA-Safe-Area-Fix (kein schwarzer Statusbar-Rahmen mehr).

⏳ **Angelegt, aber noch nicht produktiv (bewusst offen):**
- Web-Push-Versand (Edge Functions vorhanden, VAPID-Keys + tatsächlicher Versand fehlen — Phase 4).

> **Verifizierungs-Hinweis:** Der eingeloggte Bereich wurde nicht im echten Browser durchgeklickt, weil in Supabase die **E-Mail-Bestätigung aktiv** ist (frischer Test-Account konnte sich nicht sofort einloggen). Verifiziert wurden: Type-Check, Production-Build, Login-Screen (gerendert, keine Fehler) und die Bottom-Nav per DOM-Inspektion. Logik wurde per Code-Review abgesichert.

---

## 3. Schnellstart

```bash
npm install
# .env.local muss existieren (siehe Abschnitt 4)
npm run dev      # lokaler Server
npm run build    # Type-Check + Production-Build
```

**Deploy:** Push auf `main` → Vercel baut & deployed automatisch. In Vercel müssen die Env-Variablen gesetzt sein (siehe Abschnitt 4).

---

## 4. Environment-Variablen

Datei `.env.local` (liegt **lokal**, ist via `.gitignore` **nicht** im Repo — bewusst):

```
VITE_SUPABASE_URL=https://vqchonadzakuwoklwjqc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Eyp-2h8r5rSeVhFTi59ZQg_4hKLhKuI
# Optional, erst für Web-Push:
# VITE_VAPID_PUBLIC_KEY=
```

Dieselben zwei Variablen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) **müssen in Vercel** als Environment-Variablen hinterlegt sein, sonst zeigt die App „Konfiguration fehlt".

> Die Datei `.env.local.md` enthält dieselben Werte als Notiz (Markdown, damit Vite sie nicht als echte env lädt). Die echte aktive Datei ist `.env.local`.

---

## 5. Supabase

**Projekt-URL:** `https://vqchonadzakuwoklwjqc.supabase.co`
**Key-Typ:** neuer „publishable" Key (`sb_publishable_…`) — funktioniert mit `@supabase/supabase-js` ≥ 2.50.

### 5.1 Auth-Einstellung (wichtig!)
Aktuell ist **„Confirm email" aktiv**. Für die private 2-Personen-Nutzung ist es praktischer, das **abzuschalten**:
**Supabase Dashboard → Authentication → Providers → Email → „Confirm email" deaktivieren.**
Dann kann man sich direkt nach der Registrierung einloggen (kein Bestätigungslink nötig). Alternativ: Bestätigungs-Mail anklicken.

### 5.2 Migrationen
Zwei SQL-Dateien unter `supabase/migrations/`. **Beide wurden bereits im Supabase SQL-Editor ausgeführt** (vom Nutzer bestätigt):

1. **`20260615000000_initial_schema.sql`** — komplettes Grundschema: alle Tabellen, Enums, `set_updated_at`-Trigger, `is_household_member()`-Helfer, RLS auf allen Tabellen + Policies.
2. **`20260615120000_feature_expansion.sql`** — Ergänzungen (idempotent, mehrfach ausführbar):
   - `households.join_code` (Beitritts-Code, 6 Zeichen, unique, mit Default) + Unique-Constraint
   - RPC **`join_household_by_code(code)`** (SECURITY DEFINER) — sicherer Haushalts-Beitritt
   - RPC **`shares_household_with(other)`** + Policy `profiles co-member select` — damit Mitglieder die Anzeigenamen der jeweils anderen sehen (Avatare/Initialen)
   - Tabelle **`quran_sessions`** (privat, RLS)
   - Tabelle **`shopping_items`** (geteilt im Haushalt, RLS) + `updated_at`-Trigger
   - Trigger **`ensure_notification_preferences`** — legt pro neuem Profil automatisch `notification_preferences` an

> **Robustheit:** Die App läuft auch, falls Migration 2 (noch) nicht ausgeführt ist — `loadWorkspace` fängt fehlende Tabellen ab (`safe()`), und `join_code` wird beim Lesen auf `'—'` zurückgefallen. Die neuen Features „leuchten auf", sobald das SQL läuft.

---

## 6. Datenmodell (Kurzüberblick)

Drei Sichtbarkeitsstufen, alle per **RLS** erzwungen:
- **Privat** (`user_id = auth.uid()`): `tasks`/`events`/`notes` ohne `household_id`, sowie die „harten" Tracker.
- **Geteilt** (`household_id` + `is_household_member()`): `tasks`/`events`/`notes` mit `household_id`, `bills`, `shopping_items`.
- **Referenz** (alle eingeloggten lesen): `prayer_times` (Schreiben nur Service-Role).

| Tabelle | Scope | Zweck |
|---|---|---|
| `profiles` | self (+ co-member read) | Anzeigename, Zeitzone |
| `households`, `household_members`, `household_invites` | Haushalt | Identität/Mitgliedschaft, `join_code` |
| `tasks`, `events`, `notes` | privat **oder** geteilt | Aufgaben/Termine/Notizen mit Scope-Schalter |
| `bills` | geteilt | Rechnungen (Status, paid_by, Kategorie, repeat) |
| `shopping_items` | geteilt | gemeinsame Einkaufsliste |
| `habit_types`, `habit_logs` | privat (hart) | Habit-Tracker |
| `quran_sessions` | privat (hart) | Quran-Lerntracking |
| `sobriety_settings`, `sobriety_logs` | privat (hart) | Clean-Tracker |
| `daily_checkins` | privat (hart) | täglicher Check-in |
| `prayer_times` | Referenz | Wiener Gebetszeiten (IZW) |
| `push_subscriptions`, `notification_preferences`, `notification_log`, `notification_jobs` | privat | Web-Push-Infrastruktur |

**„Harte" Privatheit:** `habit_*`, `quran_sessions`, `sobriety_*`, `daily_checkins` haben **kein** `household_id` und Policy strikt `user_id = auth.uid()` → das andere Haushaltsmitglied sieht davon **nichts**.

---

## 7. Architektur / Ordnerstruktur

```
src/
  App.tsx              Auth-Gate-Phasen + Routing + Layout (viewport/content/tab-bar)
  main.tsx             Einstieg, Service-Worker-Registrierung
  store.tsx            ⭐ Zentraler Context-Store: lädt Workspace, hält State,
                       alle CRUD-Aktionen (Optimistic), Initialen-Anreicherung,
                       useAuthGate() (Auth-Statemaschine)
  types.ts             Alle App-Typen
  styles.css           ⭐ Komplettes flaches Designsystem (Tokens, Komponenten)
  lib/
    supabase.ts        Supabase-Client (isSupabaseConfigured)
    db.ts              ⭐ Komplette Datenschicht (alle Reads/Writes, Mapper)
    dates.ts           Wiener Zeitzone, Streak-Berechnung, Wochenhelfer
    format.ts          money(), initials(), errMsg()
    prayer-times.ts    getNextPrayer() (nächstes Gebet + Countdown)
    push.ts            Service-Worker + Push-Subscription
  components/
    Shell.tsx          BottomNav (View-Typ wird hier exportiert)
    ui.tsx             Screen, SimpleHeader, Sheet, Segmented, Ring,
                       Stagger*, EmptyState, Pill, Avatar
    PrayerCard.tsx     Gebets-Karte (flach)
    TaskRow.tsx        Aufgaben-Zeile
    QuickAdd.tsx       globales „Schnell hinzufügen"-Sheet
  pages/
    Auth, Onboarding, DashboardMe, DashboardFamily, Tasks, Calendar,
    Notes, Bills, Prayer, Habits, Quran, Clean, Checkin, More, Settings
supabase/
  config.toml
  migrations/          20260615000000_initial_schema.sql, 20260615120000_feature_expansion.sql
  functions/           import-prayer-times, prayer-push-dispatcher, reminder-dispatcher
public/                manifest.json, sw.js, icons/icon.svg
.claude/launch.json    Dev-Server-Config für die Preview-Tooling (Port 5180)
```

**Datenfluss:** `App` (useAuthGate) → bei Phase `ready` wird `DataProvider` gemountet → Seiten lesen alles über `useData()` (State + Aktionen). `db.ts` kapselt sämtliche Supabase-Zugriffe und mappt DB-Zeilen ↔ App-Typen.

---

## 8. Auth- & Haushalts-Flow

`useAuthGate()` (in `store.tsx`) ist eine Zustandsmaschine:

```
loading → unconfigured            (keine Supabase-ENV)
        → signed-out              → <Auth/>      (Login/Registrierung/Magic-Link)
        → onboarding (user)       → <Onboarding/> (Haushalt erstellen/beitreten)
        → ready (user, household, workspace) → <DataProvider> + App-Shell
```

- Nach Login: `ensureProfile()` (legt Profil nur an, wenn nicht vorhanden → selbst gewählter Name bleibt erhalten) → `getMyHousehold()`.
- Kein Haushalt → Onboarding. „Erstellen" = `createHousehold()`, „Beitreten" = `joinHouseholdByCode()`.
- `onReady()` ruft `reboot(user)` → lädt Workspace → Phase `ready`.
- **Beitritts-Code** für die Frau steht unter **Mehr → Einstellungen → Haushalt** (kopierbar).

---

## 9. Features (alle implementiert)

1. **Auth** — E-Mail/Passwort + Magic-Link, saubere Fehlertexte.
2. **Onboarding** — Haushalt erstellen oder per Code beitreten.
3. **Ich-Dashboard** — Begrüßung, Tagesfortschritt, Gebets-Karte (Countdown), Stat-Tiles (Tage clean / Quran heute / offene Tasks, alle anklickbar → jeweilige Seite), Habit-Ringe, Top-Aufgaben (abhakbar), heutige Termine, Check-in-Button.
4. **Familien-Dashboard** — offene Rechnungen (Summe, fällig/überfällig, abhakbar), Familien-Termine, geteilte Aufgaben, Einkaufsliste (inline hinzufügen/abhaken), Mitglieder-Avatare.
5. **Aufgaben** — anlegen (Scope privat/geteilt + Priorität), Filter (Offen/Erledigt/Alle × Alle/Privat/Geteilt), abhaken, löschen.
6. **Kalender** — Termine nach Tagen gruppiert, anlegen (über +), löschen, Ort/Zeit, Scope.
7. **Notizen** — anlegen (Titel/Inhalt/Tags/Scope), Volltextsuche, löschen, Grid.
8. **Rechnungen** — anlegen (Betrag/Fälligkeit/Kategorie/Notiz/monatlich), Summen offen/bezahlt, überfällig hervorgehoben, bezahlt-von, Filter, löschen.
9. **Gebetszeiten** — heutige Zeiten (DB), nächstes Gebet + Countdown, Wochenvorschau, XLSX-Import-Hinweis; Beispiel-Fallback bis Import erfolgt.
10. **Habits** — Typen anlegen (Name/Einheit/Ziel/Icon/Farbe), täglicher +/- Log, Streak, Wochen-Chart, löschen.
11. **Quran** — Session eintragen (Minuten/Surah/Ayah/Notiz), heute/Streak/Woche, Wochen-Chart, Verlauf, löschen.
12. **Clean-Tracker** (privat, hart) — Setup (Substanz/Startdatum/Ziel), aktueller & längster Streak, täglicher Check-in (Craving/Trigger/Reflexion), **sanfter Rückfall-Reset** (längster Streak bleibt erhalten), Verlauf.
13. **Daily Check-in** (privat) — Mood/Energie/Fokus/Stress-Slider, Hauptziel, Dankbarkeit, Reflexion, Verlauf.
14. **Mehr-Hub + Einstellungen** — Hub-Grid zu allen Seiten; Einstellungen: Profilname, Haushalt umbenennen + Beitritts-Code + Mitglieder, Push-aktivieren-Button, Benachrichtigungs-Toggles, **IZW-XLSX-Import**, Theme (4) + Hell/Dunkel, Abmelden.

---

## 10. UI / Designsystem

- **Stil:** bewusst **minimalistisch & flach** — flache Flächen, Haarlinien-Ränder, viel Weißraum, ein zurückhaltender Akzent, tabellarische Zahlen. **Keine** Gradients/Glas-Optik (war der „AI-Look").
- **Tokens & Themes:** in `styles.css` als CSS-Variablen. `data-mode` (`dark`/`light`) steuert Neutraltöne, `data-theme` (`slate`/`emerald`/`rose`/`midnight`) steuert nur den Akzent. Beide werden auf `<html>` **und** auf den App-Container gesetzt (für korrekte Safe-Area-/Überscroll-Farbe).
- **Layout:** Flex-Spalte — `.content` scrollt, `.tabbar` sitzt in-flow unten (robust gegen Safari-Bottom-Bar). Auf Desktop zentrierte Spalte mit dezentem Rahmen.
- **PWA / iOS:** `apple-mobile-web-app-status-bar-style=black-translucent` + `viewport-fit=cover` → randlos, **kein schwarzer Statusbar-Rahmen**. `theme-color` folgt Hell/Dunkel.
  ⚠️ Damit das auf dem iPhone greift: **Homescreen-Icon einmal entfernen und neu hinzufügen** (alte Konfiguration ist gecacht).

---

## 11. Wichtige technische Entscheidungen & Stolpersteine

- **RLS-Read-back-Falle (gelöst):** `households` wurde mit `insert().select().single()` angelegt → die SELECT-Policy `is_household_member(id)` filterte die RETURNING-Zeile heraus (Mitgliedschaft existiert erst danach) → Fehler „konnte nicht abgeschlossen werden". **Fix:** `createHousehold` erzeugt die `id` clientseitig (`crypto.randomUUID()`) und liest **nicht** zurück; danach Mitgliedschaft, dann `loadHousehold`.
- **Supabase-Fehler sind keine `Error`-Instanzen:** Helfer `errMsg()` (in `format.ts`) extrahiert echte Meldungen aus PostgrestError/AuthError; wird in Auth, Onboarding und Store genutzt.
- **Initialen-Anreicherung:** Frisch geladene `tasks`/`bills` haben leere Owner-Initialen; `enrichWorkspace()` im Store füllt sie aus den Haushaltsmitgliedern (initial **und** nach `refresh()`).
- **Graceful Degradation:** `loadWorkspace` nutzt `safe()` → fehlende Tabellen/Spalten (vor Migration 2) führen nicht zum Crash.
- **Zeitzone:** durchgängig `Europe/Vienna`. `viennaDate()` liefert das korrekte lokale Datum (kein UTC-Verrutschen um Mitternacht). Streaks via `streakFromDates()`.
- **Gebets-Fallback:** ohne importierte `prayer_times` zeigt die App `FALLBACK_PRAYERS` (als „Beispiel" markiert), damit nichts leer ist.
- **Optimistic Updates:** alle Mutationen aktualisieren zuerst den lokalen State, dann die DB; bei Fehler Rollback + Statusmeldung.

---

## 12. Bekannte Einschränkungen / offene TODOs

- **Web-Push noch nicht produktiv (Phase 4):** `supabase/functions/prayer-push-dispatcher` und `reminder-dispatcher` lösen aktuell nur die fälligen Einträge auf, **senden aber noch nicht**. Offen:
  1. VAPID-Keypair generieren, Public-Key als `VITE_VAPID_PUBLIC_KEY` (Frontend) + Private-Key als Function-Secret hinterlegen.
  2. `web-push`-Versand in den Edge Functions verdrahten (inkl. `notification_log`-Dedupe und 410/404-Cleanup deaktivierter Subscriptions).
  3. pg_cron (1×/Min) auf `prayer-push-dispatcher` einrichten; `reminder-dispatcher` für Bills/Events (Haushalts-Fan-out).
  4. iOS: echte Test-Push bei geschlossener App beweisen (Phase-0-Spike laut `plan.md`).
- **E-Mail-Bestätigung** in Supabase noch aktiv (siehe 5.1) — bei Bedarf abschalten.
- **„Geister"-Haushalte:** durch die früheren fehlgeschlagenen Erstell-Versuche können leere Haushalte ohne Mitglied existieren. Durch RLS unsichtbar & harmlos; bei Bedarf im Dashboard löschen.
- **Habit-Streak** wird nach einem Log erst beim nächsten vollständigen `refresh()`/Reload exakt neu berechnet (Tageswert ist sofort optimistisch korrekt).
- **Bundle-Größe** ~566 KB (gz 162 KB) — okay; bei Bedarf Code-Splitting/lazy routes.
- **Magic-Link** benötigt funktionierendes SMTP/Redirect in Supabase; E-Mail/Passwort ist der zuverlässige Standardweg.

---

## 13. Git-Historie

| Commit | Inhalt |
|---|---|
| `e8b779d` | Initial Yawm app foundation |
| `46de0aa` | Build functional local app shell |
| `3a84356` | Compact mobile UI and local admin mode |
| `b9b2208` | **Voller App-Ausbau:** Multi-User-Auth, Haushalt, 14 Supabase-Features |
| `1f7d3c9` | **Fix:** Haushalt erstellen scheiterte an RLS-Read-back + `errMsg()` |
| `21e079b` | **UI-Redesign:** minimalistisch/flach + PWA-Safe-Areas |

Branch: `main` (Auto-Deploy auf Vercel). Pushen erfolgt direkt auf `main`.

---

## 14. Empfohlene nächste Schritte

1. **Supabase „Confirm email" abschalten** (sofort nutzbar) → einloggen → Haushalt erstellen → Code an die Frau geben → sie tritt bei.
2. **PWA neu installieren** (Icon entfernen + neu hinzufügen) für den randlosen iOS-Look.
3. **Web-Push fertigstellen** (Phase 4, siehe Abschnitt 12) — das ist die größte offene Funktion.
4. Optional: UI-Feinschliff nach echtem Gebrauch (Abstände/Farben/Schrift), Google-Kalender-Sync (Phase 6 laut `plan.md`).

---

*Quelle der Produktentscheidungen: `plan.md` (Master-Plan v0). Dieses Handover ergänzt den Plan um den tatsächlichen Implementierungsstand.*
