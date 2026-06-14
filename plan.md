# PLAN — Build v0 (Master, konsolidiert)
**Familien-PWA: persönliche Dashboards + gemeinsames Familien-Dashboard**
Tagesvisualisierung · Gebetszeiten · Tasks · Notizen · Rechnungen · Habit-, Quran- & Clean-Tracking

Stand: 14.06.2026 · Sprache: Deutsch
Status: Neue Basis-Version. Ersetzt Plan v1 und v2 und integriert alle bisherigen Entscheidungen.

> **Was diese Version festlegt:**
> 1. **Multi-User von Anfang an:** zwei persönliche Accounts (du + deine Frau) + ein gemeinsamer Haushalt.
> 2. **Gemeinsames Familien-Dashboard:** geteilte Rechnungen, Familien-/Kind-Termine, geteilte Aufgaben.
> 3. **Gebetszeiten nur aus IZW-XLSX** (einmaliger Jahresimport, keine täglichen API-Abrufe).
> 4. **Push-Toleranz 30 s akzeptiert** → simpler 1-Minuten-Cron, kein Tight-Scheduling.
> 5. **Persönliche Tracker bleiben strikt privat** (per RLS erzwungen).

---

## 0. GRUNDENTSCHEIDUNGEN (fix)

| Thema | Entscheidung |
|---|---|
| Nutzer | 2 persönliche Accounts + 1 gemeinsamer Haushalt |
| Login | Pflicht, echte Auth (Supabase, E-Mail/Magic-Link) |
| Datenscope | persönlich (`user_id`) **oder** geteilt (`household_id`) |
| Sensible Tracker | Clean-Tracker & Daily-Check-in: **immer privat**, nie geteilt |
| Gebetszeiten-Quelle | IZW-XLSX 2026, **einmal** importiert, kein API-Abruf |
| Push-Genauigkeit | Cron 1×/Min, ~„innerhalb 1 Min" akzeptiert |
| Frontend | Vite + React + TS + Tailwind + shadcn/ui + Framer Motion |
| Backend | Supabase (Postgres, Auth, Edge Functions, Cron, RLS) |
| Hosting | Vercel + eigene Domain |
| Apple Dev Account | nicht nötig |

---

## 1. NUTZER- & SCOPE-MODELL (Herzstück)

Drei Sichtbarkeitsstufen:

1. **Privat** — nur der jeweilige Nutzer. (`user_id = auth.uid()`)
2. **Geteilt im Haushalt** — beide Haushaltsmitglieder. (`household_id` + Mitgliedschaft)
3. **Referenzdaten** — für alle eingeloggten Nutzer lesbar (z. B. Gebetszeiten), schreibbar nur serverseitig.

**Feature-Zuordnung:**

| Feature | Scope |
|---|---|
| Persönliches Dashboard | privat |
| Familien-Dashboard | geteilt |
| Tasks | privat **oder** geteilt (umschaltbar) |
| Events/Termine | privat **oder** geteilt |
| Notizen | privat (optional geteilt) |
| **Rechnungen (Bills)** | geteilt |
| **Kind-Termine** | geteilt (als Event mit `household_id`) |
| Habits | **privat** |
| Quran-Tracking | **privat** |
| **Clean-Tracker** | **privat (hart)** |
| **Daily Check-in** | **privat (hart)** |
| Gebetszeiten (Anzeige) | Referenz (alle) |
| Push-Preferences | privat (pro Nutzer) |

---

## 2. FEATURES

### 2.1 Persönliches Dashboard (pro Nutzer)
Datum, Uhrzeit, Tagesfortschritt, nächstes Gebet + Countdown, nächste eigene Aufgabe, eigene heutige Termine, offene Aufgaben, eigene Tagesziele, Tagesfokus. „Now / Next / Later", Karten, Fortschrittsringe, Streaks.

### 2.2 Familien-Dashboard (geteilt)
Ein zweiter Dashboard-Tab, den beide sehen:
- **Offene Rechnungen** (Summe + Liste, fällige hervorgehoben).
- **Anstehende Familien-/Kind-Termine**.
- **Geteilte Aufgaben** („Müll rausbringen", „Arzttermin Kind buchen").
- optional: gemeinsame Einkaufsliste, Wochenübersicht der Familie.

### 2.3 Tasks
Erstellen, abhaken, Fälligkeit, Priorität, Status (offen/erledigt/verschoben), optionale Wiederholung. **Scope-Schalter „privat / geteilt"** beim Anlegen. Geteilte Tasks erscheinen bei beiden + im Familien-Dashboard.

### 2.4 Events / Termine
MVP: eigene Events (Titel, Start, Ende, Beschreibung, Ort) mit **Scope-Schalter**. Kind-Termine = geteiltes Event. Später: Google Calendar (Phase 6).

### 2.5 Rechnungen (Bills) — NEU, geteilt
Titel, Betrag, Währung, Fälligkeitsdatum, Status (offen/bezahlt), `bezahlt_von` (welcher Account), Kategorie, optional wiederkehrend, Notiz. Anzeige im Familien-Dashboard, optional Erinnerungs-Push vor Fälligkeit an beide.

### 2.6 Notizen
Schnelle Tagesnotiz + allgemeine Notizen, Titel, Inhalt, Tags, Suche, Edit/Delete, optional Markdown. Default privat, optional geteilt.

### 2.7 Gebetszeiten Wien (IZW) — XLSX-only
- **Quelle:** IZW-Jahres-XLSX 2026 (offizieller Download). IZW folgt seit 1.1.2023 den einheitlichen österreichweiten Gebetszeiten → die Datei ist ein stabiles Jahresartefakt.
- **Import:** einmalig (manueller Upload im Admin/Settings-Bereich genügt; optional jährlicher Cron). → 365 Zeilen in `prayer_times`.
- **Kein** täglicher API-Abruf, **kein** AlAdhan im Normalbetrieb.
- Anzeige: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha; nächstes Gebet + Countdown; Tagesübersicht; animierte Karte.

### 2.8 Push-Benachrichtigungen
**Mechanik:** Supabase **Cron 1×/Min** → Edge Function liest heutige `prayer_times` + je Nutzer `notification_preferences` → „welches Gebet ist diese Minute fällig und laut `notification_log` heute noch nicht gesendet?" → Web Push an die `push_subscriptions` des Nutzers → Eintrag in `notification_log` (Dedupe).

**Arten von Pushes:**
- Gebets-Pushes: **pro Nutzer** (jeder abonniert/aktiviert selbst).
- Rechnungs-/Familien-Termin-Erinnerungen: **Haushalts-Fan-out** → an die Subscriptions *aller* Haushaltsmitglieder (jeweils nach deren Prefs).
- optional: Daily-Check-in-Erinnerung (privat).

**Subscription-Lebenszyklus:** beim App-Start `getSubscription()` prüfen → bei Bedarf neu anlegen + Upsert an Server. Beim Senden HTTP **410/404** → Subscription deaktivieren.

**Zeitzone:** Zeiten als lokale Wiener Zeit + Datum (Minutengranularität). Cron läuft UTC → über `Europe/Vienna` umrechnen, DST-Tage testen.

### 2.9 Habit Tracker (privat)
Habits anlegen (Einheit/Zielwert), täglicher Check-in, Streaks, Wochen-/Monatsübersicht, Ringe, Statistik.

### 2.10 Quran-Lerntracking (privat)
Dauer, Notiz, optional Surah/Ayah, Erinnerung, Streak, Wochenfortschritt.

### 2.11 Clean-Tracker (privat, hart)
Persönlicher Sobriety-Tracker, kein medizinisches Tool. Clean-Startdatum, täglicher Check-in (clean ja/nein), aktueller Streak, längster Streak, Craving-Level (1–10), Trigger-Notiz, Reflexion, optionaler Rückfall-Eintrag, Verlauf.
**Wellbeing-UX:** Rückfall nicht bestrafend — sanfter Reset, „längster Streak" bleibt erhalten, Fokus auf Trigger-Reflexion statt Shaming. **Per RLS für andere Haushaltsmitglieder unsichtbar.**

### 2.12 Daily Check-in (privat)
3–5 Fragen (Stimmung, Energie, Fokus, Stress, Dankbarkeit, Hauptziel, Quran?, clean?), Card/Swipe-UI, animierter Abschluss. **Privat.**

---

## 3. STACK & HOSTING
- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui + Framer Motion.
- **Backend/DB:** Supabase — Postgres, Auth (E-Mail/Magic-Link), Edge Functions, Cron (pg_cron, min. 1 Min), Row Level Security.
- **Hosting:** Vercel (HTTPS, eigene Domain).
- **Push:** Service Worker + PushSubscription + VAPID (selbst generiert) + `web-push` in Edge Function.
- **Hinweis Free-Tier:** Supabase-Free pausiert nach ~1 Woche Inaktivität — der 1-Min-Cron hält es aktiv.

---

## 4. ARCHITEKTUR
```
Domain → Vercel (Vite/React PWA, Service Worker)
                │  Auth: 2 Accounts
                ▼
            Supabase
   ├─ Postgres (RLS überall an)
   │    ├─ privat:    tasks/notes(privat), habits, quran, sobriety, checkins
   │    ├─ geteilt:   households, household_members, bills, geteilte tasks/events
   │    └─ referenz:  prayer_times
   ├─ Auth
   ├─ Edge Functions
   │    ├─ import-prayer-times      (XLSX → prayer_times, 1×/Jahr)
   │    ├─ prayer-push-dispatcher   (Cron 1×/Min)
   │    └─ reminder-dispatcher      (Bills/Events, Haushalts-Fan-out)
   └─ Cron (1×/Min)
                │
                ▼
   Extern: IZW-XLSX (jährlich) · später Google Calendar
```

---

## 5. DATENMODELL

**RLS-Helfer:** Funktion `is_household_member(hid uuid) → bool` (prüft, ob `auth.uid()` Mitglied des Haushalts ist). Wird in geteilten Policies genutzt.

**Allgemein:** `updated_at` per Trigger, Indizes auf `user_id`/`household_id`/Datum/Status, RLS auf **allen** Tabellen.

### Identität & Haushalt
```
profiles            id(=auth user), display_name, timezone('Europe/Vienna'), created_at

households          id, name, created_at

household_members   id, household_id, user_id, role('owner'|'member'),
                    created_at   [UNIQUE(household_id, user_id)]
                    RLS: sichtbar, wenn is_household_member(household_id)

household_invites   id, household_id, invite_email, token, status, expires_at
                    (vereinfacht möglich: Frau-Account manuell als member eintragen)
```

### Privat-oder-geteilt (Scope über household_id)
```
tasks               id, user_id(creator), household_id(NULLABLE), title,
                    description, due_at, status, priority, repeat_rule,
                    created_at, updated_at
   RLS: (household_id IS NULL AND user_id = auth.uid())
        OR (household_id IS NOT NULL AND is_household_member(household_id))

events              id, user_id, household_id(NULLABLE), title, description,
                    start_at, end_at, location, source, external_id,
                    created_at, updated_at        [gleiche RLS wie tasks]

notes               id, user_id, household_id(NULLABLE), title, content, tags,
                    created_at, updated_at        [gleiche RLS wie tasks]
```

### Geteilt (Haushalt)
```
bills               id, household_id(NOT NULL), created_by(user_id), title,
                    amount, currency('EUR'), due_date, status('open'|'paid'),
                    paid_by(user_id NULLABLE), category, repeat_rule(NULLABLE),
                    note, created_at, updated_at
   RLS: is_household_member(household_id)
```

### Privat (hart — nie geteilt, kein household_id)
```
habit_types         id, user_id, name, unit, target_value, icon, color, created_at
habit_logs          id, user_id, habit_type_id, date, value, note, created_at
                    [UNIQUE(habit_type_id, date)]
sobriety_settings   id, user_id, substance, clean_start_date, goal_note,
                    longest_streak_days, created_at, updated_at
sobriety_logs       id, user_id, date, clean, craving_level, trigger_note,
                    reflection, created_at   [UNIQUE(user_id, date)]
daily_checkins      id, user_id, date, mood, energy, focus, stress, gratitude,
                    main_goal, reflection, created_at   [UNIQUE(user_id, date)]
   RLS (alle vier): user_id = auth.uid()   ← anderes Mitglied sieht NICHTS
```

### Referenz & Push
```
prayer_times        id, city, date, fajr, sunrise, dhuhr, asr, maghrib, isha,
                    source, created_at, updated_at   [UNIQUE(city, date)]
   RLS: SELECT für authenticated; Schreiben nur Service-Role (Import)

push_subscriptions  id, user_id, endpoint[UNIQUE], p256dh, auth, user_agent,
                    enabled, last_seen_at, failure_count, created_at, updated_at
   RLS: user_id = auth.uid()

notification_preferences  id, user_id, prayer_fajr_enabled, prayer_dhuhr_enabled,
                    prayer_asr_enabled, prayer_maghrib_enabled,
                    prayer_isha_enabled, minutes_before_prayer,
                    daily_checkin_enabled, bill_reminders_enabled,
                    event_reminders_enabled, created_at, updated_at
   RLS: user_id = auth.uid()

notification_log    id, user_id, type, ref_date, ref_key(z.B. 'fajr'|'bill:<id>'),
                    sent_at   [UNIQUE(user_id, type, ref_date, ref_key)]
                    → Dedupe gegen Doppelversand

notification_jobs   id, user_id, type, scheduled_for, payload, status, sent_at,
                    error_message, created_at
                    → nur Einmal-Erinnerungen (Bills/Events), nicht für Gebete
```

---

## 6. ROADMAP (nach Risiko & Fundament sortiert)

> Multi-User + RLS betrifft jede Tabelle → muss von Anfang an drin sein. iOS-Push ist das technische Hauptrisiko → früh beweisen.

**Phase 0 — Fundament + De-Risking**
- Repo, Vite/React/Tailwind, Vercel-Deploy.
- Supabase + Auth: **zwei echte Accounts** anlegen.
- `households` + `household_members`: dich + deine Frau verknüpfen.
- RLS-Muster an *einer* Tabelle nachweisen (privat vs. geteilt sauber getrennt).
- PWA installierbar (manifest + Service Worker).
- **EINE echte Test-Push** zur geplanten Uhrzeit auf dein iPhone bei geschlossener App. Erst dann weiter.

**Phase 1 — Persönlicher Kern**
- Persönliches Dashboard, Tasks (privat), Notizen (privat).
- Verifizieren: Frau-Account sieht nur eigene Daten.

**Phase 2 — Haushalt & Familien-Dashboard**
- Scope-Schalter (privat/geteilt) für Tasks & Events.
- `bills`-CRUD, Kind-Termine als geteilte Events.
- Familien-Dashboard-Ansicht (Rechnungen + Termine + geteilte Tasks).

**Phase 3 — Gebetszeiten**
- `import-prayer-times` (XLSX → 365 Zeilen).
- Anzeige, nächstes Gebet, Countdown, animierte Karte.

**Phase 4 — Push produktiv**
- `notification_preferences`-UI pro Nutzer.
- `prayer-push-dispatcher` (Cron 1×/Min) + `notification_log`-Dedupe.
- `reminder-dispatcher` für Bills/Events (Haushalts-Fan-out).
- Subscription-Refresh beim App-Start + 410-Cleanup.

**Phase 5 — Private Tracker & Statistiken**
- Habits, Quran, Clean-Tracker, Daily Check-in (alle privat).
- Streaks, Wochenübersicht, Heatmap, Meilensteine.

**Phase 6 — Politur & Kalender**
- Offline-Read (React-Query-Cache), iOS-Feinschliff, Animationen.
- Google Calendar OAuth + inkrementeller Sync.

---

## 7. UI/UX
iOS-artiges Design, Dark Mode, Glas/Blur, weiche Animationen, Kartenlayout, große Countdowns, Fortschrittsringe, Tages-Timeline, Swipe-Gesten.
**Navigation:** unten Tab-Bar mit Umschalter **„Ich" ↔ „Familie"** für die beiden Dashboards. Persönliche Tracker nur unter „Ich".
Komponenten „Ich": Heute-Hero, Nächstes-Gebet, eigene Top-3-Aufgaben, Clean-Streak, Quran-Fortschritt, Check-in-Button.
Komponenten „Familie": offene Rechnungen, anstehende Familien-/Kind-Termine, geteilte Aufgaben.

---

## 8. SICHERHEITS-LEITPLANKEN
1. **RLS auf jeder Tabelle**, auch wenn es nur zwei Nutzer sind.
2. **Private Tracker (Clean, Check-in, Habits, Quran):** Policy strikt `user_id = auth.uid()` — kein `household_id`, damit das Mitglied nie Zugriff hat.
3. **Settings/Admin (inkl. XLSX-Import) hinter Auth.** *(Lektion aus dem HelloCash-Dashboard: keine ungeschützte Settings-Seite.)*
4. **Service-Role-Key nur in Edge Functions**, nie im Frontend.
5. **Push-Idempotenz** über `notification_log` bei jedem Versand.
6. **Zeitzone Europe/Vienna** konsequent; DST-Umstellungstage testen.

---

## 9. ORDNERSTRUKTUR
```
src/
  pages/        DashboardMe, DashboardFamily, Tasks, Notes, Calendar,
                Prayer, Bills, Habits, Quran, Clean, Checkin, Settings
  components/   dashboard/ family/ prayer/ tasks/ bills/ habits/ clean/ ui/
  lib/          supabase.ts  prayer-times.ts  push.ts  household.ts
                dates.ts  auth.ts
public/         manifest.json  sw.js  icons/
supabase/
  migrations/
  functions/    import-prayer-times/  prayer-push-dispatcher/
                reminder-dispatcher/
```

---

## 10. ENTWICKLUNGSAUFTRAG (für Claude Code / Cursor)
1. Vite + React + TS + Tailwind + shadcn/ui; Vercel-Deploy.
2. Supabase + Auth; **zwei Accounts**; `households` + `household_members` anlegen und verknüpfen.
3. RLS-Helfer `is_household_member()` + Policies (privat / geteilt / privat-hart) nach Abschnitt 5.
4. PWA installierbar; **Phase-0-Push-Spike** (VAPID, Subscription speichern, eine geplante Test-Push aufs iPhone).
5. Migrationen für alle Tabellen inkl. `notification_log`, UNIQUE-Constraints, Indizes, `updated_at`-Trigger.
6. Persönliches Dashboard + Tasks/Notes (privat).
7. Scope-Schalter + Bills + Familien-Dashboard.
8. `import-prayer-times` (XLSX) + Gebetsanzeige + Countdown.
9. `prayer-push-dispatcher` (Cron 1×/Min) + `reminder-dispatcher` + Dedupe + Subscription-Refresh/410-Cleanup.
10. Private Tracker (Habits/Quran/Clean/Check-in) + Statistiken; danach Politur + Google Calendar.
```
