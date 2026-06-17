-- Yawm Feature-Reinvent (2026-06-17)
-- Neue Features: Routinen, Erinnerungen, Fokus-Projekte, Tagesvorbereitung.
-- Aenderungen: Bills privat ODER Haushalt, Einkaufs-Kategorien, Termin-"Betrifft".
-- RLS-Fix: geteilte Objekte (tasks/events/notes/bills/shopping) duerfen von
--          JEDEM Haushaltsmitglied geaendert/geloescht werden (vorher nur Ersteller).
-- Idempotent: kann gefahrlos mehrfach ausgefuehrt werden.

-- ===========================================================================
-- 1. Routinen (privat, hart) — wiederkehrende Tages-Erinnerungen + Abhaken
-- ===========================================================================
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text default 'Repeat',
  target_per_day integer not null default 1 check (target_per_day >= 1),
  reminder_times time[] not null default '{}',
  days_of_week integer[] not null default '{0,1,2,3,4,5,6}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists routines_user_idx on public.routines(user_id, active);
drop trigger if exists set_routines_updated_at on public.routines;
create trigger set_routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();
alter table public.routines enable row level security;
drop policy if exists "routines private hard" on public.routines;
create policy "routines private hard" on public.routines
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  unique (routine_id, date)
);
create index if not exists routine_logs_user_date_idx on public.routine_logs(user_id, date desc);
alter table public.routine_logs enable row level security;
drop policy if exists "routine logs private hard" on public.routine_logs;
create policy "routine logs private hard" on public.routine_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- 2. Erinnerungen (privat, hart) — Notizen mit optionalem Ablauf + Prioritaet
-- ===========================================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reminders_user_idx on public.reminders(user_id, done, due_at);
drop trigger if exists set_reminders_updated_at on public.reminders;
create trigger set_reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();
alter table public.reminders enable row level security;
drop policy if exists "reminders private hard" on public.reminders;
create policy "reminders private hard" on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- 3. Fokus-Projekte (privat, hart) — Start, urspruenglicher Gedanke, Ziel
-- ===========================================================================
create table if not exists public.focus_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  started_at timestamptz not null default now(),
  initial_thought text,
  goal text,
  status text not null default 'active' check (status in ('active','paused','done','abandoned')),
  remind_every_days integer,
  last_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists focus_projects_user_idx on public.focus_projects(user_id, status);
drop trigger if exists set_focus_projects_updated_at on public.focus_projects;
create trigger set_focus_projects_updated_at before update on public.focus_projects
  for each row execute function public.set_updated_at();
alter table public.focus_projects enable row level security;
drop policy if exists "focus projects private hard" on public.focus_projects;
create policy "focus projects private hard" on public.focus_projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- 4. Tagesvorbereitung (privat, hart) — ersetzt den Daily Check-in
-- ===========================================================================
create table if not exists public.day_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_date date not null,
  intentions text,
  planned_tasks jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, target_date)
);
create index if not exists day_preparations_user_idx on public.day_preparations(user_id, target_date desc);
drop trigger if exists set_day_preparations_updated_at on public.day_preparations;
create trigger set_day_preparations_updated_at before update on public.day_preparations
  for each row execute function public.set_updated_at();
alter table public.day_preparations enable row level security;
drop policy if exists "day preparations private hard" on public.day_preparations;
create policy "day preparations private hard" on public.day_preparations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===========================================================================
-- 5. Bills: privat ODER Haushalt
-- ===========================================================================
alter table public.bills alter column household_id drop not null;

drop policy if exists "bills household access" on public.bills;
drop policy if exists "bills select" on public.bills;
create policy "bills select" on public.bills for select using (
  (household_id is null and created_by = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "bills insert" on public.bills;
create policy "bills insert" on public.bills for insert with check (
  created_by = auth.uid()
  and ((household_id is null) or public.is_household_member(household_id))
);
drop policy if exists "bills update" on public.bills;
create policy "bills update" on public.bills for update using (
  (household_id is null and created_by = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  (household_id is null and created_by = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "bills delete" on public.bills;
create policy "bills delete" on public.bills for delete using (
  (household_id is null and created_by = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);

-- ===========================================================================
-- 6. Einkaufsliste: Kategorie + beide Mitglieder duerfen mutieren
-- ===========================================================================
alter table public.shopping_items add column if not exists category text not null default 'Sonstiges';

drop policy if exists "shopping items household access" on public.shopping_items;
drop policy if exists "shopping items select" on public.shopping_items;
create policy "shopping items select" on public.shopping_items
  for select using (public.is_household_member(household_id));
drop policy if exists "shopping items insert" on public.shopping_items;
create policy "shopping items insert" on public.shopping_items
  for insert with check (created_by = auth.uid() and public.is_household_member(household_id));
drop policy if exists "shopping items update" on public.shopping_items;
create policy "shopping items update" on public.shopping_items
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
drop policy if exists "shopping items delete" on public.shopping_items;
create policy "shopping items delete" on public.shopping_items
  for delete using (public.is_household_member(household_id));

-- ===========================================================================
-- 7. Termine: "Betrifft"-Label + geteilte von allen Mitgliedern mutierbar
-- ===========================================================================
alter table public.events add column if not exists for_label text;

drop policy if exists "events private or household access" on public.events;
drop policy if exists "events select" on public.events;
create policy "events select" on public.events for select using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "events insert" on public.events;
create policy "events insert" on public.events for insert with check (
  user_id = auth.uid() and ((household_id is null) or public.is_household_member(household_id))
);
drop policy if exists "events update" on public.events;
create policy "events update" on public.events for update using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "events delete" on public.events;
create policy "events delete" on public.events for delete using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);

-- ===========================================================================
-- 8. Tasks: geteilte von ALLEN Haushaltsmitgliedern editier-/loeschbar
-- ===========================================================================
drop policy if exists "tasks private or household select" on public.tasks;
drop policy if exists "tasks private or household mutate" on public.tasks;
drop policy if exists "tasks select" on public.tasks;
create policy "tasks select" on public.tasks for select using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "tasks insert" on public.tasks;
create policy "tasks insert" on public.tasks for insert with check (
  user_id = auth.uid() and ((household_id is null) or public.is_household_member(household_id))
);
drop policy if exists "tasks update" on public.tasks;
create policy "tasks update" on public.tasks for update using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "tasks delete" on public.tasks;
create policy "tasks delete" on public.tasks for delete using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);

-- ===========================================================================
-- 9. Notes: konsistent (geteilte von allen Mitgliedern mutierbar)
-- ===========================================================================
drop policy if exists "notes private or household access" on public.notes;
drop policy if exists "notes select" on public.notes;
create policy "notes select" on public.notes for select using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "notes insert" on public.notes;
create policy "notes insert" on public.notes for insert with check (
  user_id = auth.uid() and ((household_id is null) or public.is_household_member(household_id))
);
drop policy if exists "notes update" on public.notes;
create policy "notes update" on public.notes for update using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "notes delete" on public.notes;
create policy "notes delete" on public.notes for delete using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
