-- Yawm Feature-Erweiterung
-- Ergaenzt das initiale Schema um: Haushalts-Beitrittscode, Quran-Sessions,
-- gemeinsame Einkaufsliste und einen sicheren Beitritts-RPC.
-- Idempotent: kann gefahrlos mehrfach ausgefuehrt werden.

-- ---------------------------------------------------------------------------
-- 1. Haushalts-Beitrittscode (damit die Frau dem Haushalt beitreten kann)
-- ---------------------------------------------------------------------------
alter table public.households
  add column if not exists join_code text;

update public.households
  set join_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6))
  where join_code is null;

alter table public.households
  alter column join_code set not null;

alter table public.households
  alter column join_code set default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));

do $$
begin
  alter table public.households add constraint households_join_code_key unique (join_code);
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;

-- Sicherer Beitritt per Code: laeuft als SECURITY DEFINER, damit ein noch
-- nicht zugehoeriger Nutzer den Haushalt ueber den Code finden darf, ohne die
-- households-RLS aufzuweichen.
create or replace function public.join_household_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select id into target_id
  from public.households
  where join_code = upper(trim(code))
  limit 1;

  if target_id is null then
    raise exception 'Kein Haushalt mit diesem Code gefunden.';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  return target_id;
end;
$$;

grant execute on function public.join_household_by_code(text) to authenticated;

-- Haushaltsmitglieder duerfen die Profile (Anzeigenamen) der jeweils anderen
-- lesen, damit Avatare/Initialen bei geteilten Inhalten korrekt erscheinen.
create or replace function public.shares_household_with(other uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid()
      and b.user_id = other
  );
$$;

grant execute on function public.shares_household_with(uuid) to authenticated;

drop policy if exists "profiles co-member select" on public.profiles;
create policy "profiles co-member select" on public.profiles
  for select using (id = auth.uid() or public.shares_household_with(id));

-- ---------------------------------------------------------------------------
-- 2. Quran-Lerntracking (privat, hart)
-- ---------------------------------------------------------------------------
create table if not exists public.quran_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  minutes integer not null default 0 check (minutes >= 0),
  surah text,
  ayah_from integer,
  ayah_to integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists quran_sessions_user_date_idx
  on public.quran_sessions(user_id, date desc);

alter table public.quran_sessions enable row level security;

drop policy if exists "quran sessions private hard" on public.quran_sessions;
create policy "quran sessions private hard" on public.quran_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Gemeinsame Einkaufsliste (geteilt im Haushalt)
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  quantity text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_items_household_idx
  on public.shopping_items(household_id, done, created_at desc);

drop trigger if exists set_shopping_items_updated_at on public.shopping_items;
create trigger set_shopping_items_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

alter table public.shopping_items enable row level security;

drop policy if exists "shopping items household access" on public.shopping_items;
create policy "shopping items household access" on public.shopping_items
  for all using (
    public.is_household_member(household_id)
  ) with check (
    created_by = auth.uid() and public.is_household_member(household_id)
  );

-- ---------------------------------------------------------------------------
-- 4. Komfort: notification_preferences automatisch pro neuem Profil anlegen
-- ---------------------------------------------------------------------------
create or replace function public.ensure_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_notification_preferences on public.profiles;
create trigger create_notification_preferences
  after insert on public.profiles
  for each row execute function public.ensure_notification_preferences();
