create extension if not exists pgcrypto;

do $$
begin
  create type member_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type item_status as enum ('open', 'done', 'postponed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type bill_status as enum ('open', 'paid');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'Europe/Vienna',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invite_email text not null,
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status item_status not null default 'open',
  priority text not null default 'normal',
  repeat_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_scope_check check (
    (household_id is null and user_id is not null)
    or household_id is not null
  )
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'EUR',
  due_date date not null,
  status bill_status not null default 'open',
  paid_by uuid references auth.users(id) on delete set null,
  category text,
  repeat_rule text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit text not null default 'count',
  target_value numeric(10,2) not null default 1,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_type_id uuid not null references public.habit_types(id) on delete cascade,
  date date not null,
  value numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_type_id, date)
);

create table if not exists public.sobriety_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  substance text,
  clean_start_date date,
  goal_note text,
  longest_streak_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sobriety_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  clean boolean not null default true,
  craving_level integer check (craving_level between 1 and 10),
  trigger_note text,
  reflection text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood integer check (mood between 1 and 10),
  energy integer check (energy between 1 and 10),
  focus integer check (focus between 1 and 10),
  stress integer check (stress between 1 and 10),
  gratitude text,
  main_goal text,
  reflection text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.prayer_times (
  id uuid primary key default gen_random_uuid(),
  city text not null default 'Wien',
  date date not null,
  fajr time not null,
  sunrise time,
  dhuhr time not null,
  asr time not null,
  maghrib time not null,
  isha time not null,
  source text not null default 'IZW XLSX',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, date)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  failure_count integer not null default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  prayer_fajr_enabled boolean not null default true,
  prayer_dhuhr_enabled boolean not null default true,
  prayer_asr_enabled boolean not null default true,
  prayer_maghrib_enabled boolean not null default true,
  prayer_isha_enabled boolean not null default true,
  minutes_before_prayer integer not null default 0,
  daily_checkin_enabled boolean not null default false,
  bill_reminders_enabled boolean not null default true,
  event_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  ref_date date not null,
  ref_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, type, ref_date, ref_key)
);

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  scheduled_for timestamptz not null,
  payload jsonb not null default '{}',
  status text not null default 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists household_members_user_idx on public.household_members(user_id);
create index if not exists tasks_user_due_idx on public.tasks(user_id, due_at);
create index if not exists tasks_household_due_idx on public.tasks(household_id, due_at);
create index if not exists events_user_start_idx on public.events(user_id, start_at);
create index if not exists events_household_start_idx on public.events(household_id, start_at);
create index if not exists bills_household_due_idx on public.bills(household_id, due_date, status);
create index if not exists prayer_times_city_date_idx on public.prayer_times(city, date);
create index if not exists notification_jobs_due_idx on public.notification_jobs(status, scheduled_for);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_households_updated_at on public.households;
create trigger set_households_updated_at before update on public.households for each row execute function public.set_updated_at();
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
drop trigger if exists set_bills_updated_at on public.bills;
create trigger set_bills_updated_at before update on public.bills for each row execute function public.set_updated_at();
drop trigger if exists set_habit_types_updated_at on public.habit_types;
create trigger set_habit_types_updated_at before update on public.habit_types for each row execute function public.set_updated_at();
drop trigger if exists set_sobriety_settings_updated_at on public.sobriety_settings;
create trigger set_sobriety_settings_updated_at before update on public.sobriety_settings for each row execute function public.set_updated_at();
drop trigger if exists set_prayer_times_updated_at on public.prayer_times;
create trigger set_prayer_times_updated_at before update on public.prayer_times for each row execute function public.set_updated_at();
drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();
drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.notes enable row level security;
alter table public.bills enable row level security;
alter table public.habit_types enable row level security;
alter table public.habit_logs enable row level security;
alter table public.sobriety_settings enable row level security;
alter table public.sobriety_logs enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.prayer_times enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_log enable row level security;
alter table public.notification_jobs enable row level security;

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "households member select" on public.households;
create policy "households member select" on public.households for select using (public.is_household_member(id));
drop policy if exists "households authenticated insert" on public.households;
create policy "households authenticated insert" on public.households for insert to authenticated with check (true);
drop policy if exists "households member update" on public.households;
create policy "households member update" on public.households for update using (public.is_household_member(id)) with check (public.is_household_member(id));

drop policy if exists "household members visible to members" on public.household_members;
create policy "household members visible to members" on public.household_members for select using (
  user_id = auth.uid() or public.is_household_member(household_id)
);
drop policy if exists "household members insert self or member" on public.household_members;
create policy "household members insert self or member" on public.household_members for insert with check (
  user_id = auth.uid() or public.is_household_member(household_id)
);
drop policy if exists "household members update by member" on public.household_members;
create policy "household members update by member" on public.household_members for update using (public.is_household_member(household_id));

drop policy if exists "household invites member access" on public.household_invites;
create policy "household invites member access" on public.household_invites for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

drop policy if exists "tasks private or household select" on public.tasks;
create policy "tasks private or household select" on public.tasks for select using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
);
drop policy if exists "tasks private or household mutate" on public.tasks;
create policy "tasks private or household mutate" on public.tasks for all using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  user_id = auth.uid()
  and ((household_id is null) or public.is_household_member(household_id))
);

drop policy if exists "events private or household access" on public.events;
create policy "events private or household access" on public.events for all using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  user_id = auth.uid()
  and ((household_id is null) or public.is_household_member(household_id))
);

drop policy if exists "notes private or household access" on public.notes;
create policy "notes private or household access" on public.notes for all using (
  (household_id is null and user_id = auth.uid())
  or (household_id is not null and public.is_household_member(household_id))
) with check (
  user_id = auth.uid()
  and ((household_id is null) or public.is_household_member(household_id))
);

drop policy if exists "bills household access" on public.bills;
create policy "bills household access" on public.bills for all using (
  public.is_household_member(household_id)
) with check (
  created_by = auth.uid() and public.is_household_member(household_id)
);

drop policy if exists "habit types private hard" on public.habit_types;
create policy "habit types private hard" on public.habit_types for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "habit logs private hard" on public.habit_logs;
create policy "habit logs private hard" on public.habit_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sobriety settings private hard" on public.sobriety_settings;
create policy "sobriety settings private hard" on public.sobriety_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "sobriety logs private hard" on public.sobriety_logs;
create policy "sobriety logs private hard" on public.sobriety_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "daily checkins private hard" on public.daily_checkins;
create policy "daily checkins private hard" on public.daily_checkins for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "prayer times authenticated read" on public.prayer_times;
create policy "prayer times authenticated read" on public.prayer_times for select to authenticated using (true);

drop policy if exists "push subscriptions private" on public.push_subscriptions;
create policy "push subscriptions private" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notification preferences private" on public.notification_preferences;
create policy "notification preferences private" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notification log private read" on public.notification_log;
create policy "notification log private read" on public.notification_log for select using (user_id = auth.uid());
drop policy if exists "notification jobs private read" on public.notification_jobs;
create policy "notification jobs private read" on public.notification_jobs for select using (user_id = auth.uid());
