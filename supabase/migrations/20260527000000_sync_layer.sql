-- ─── Sync layer: cloud tables for the local-first → cloud-first flip ──────
-- 2026-05-27. Up to now, the app treated Supabase as optional and Dexie as
-- source of truth. That broke for friends-on-different-devices and for
-- "Kyra wants to see her users in the dashboard." This migration adds the
-- cloud tables the sync layer writes to so Supabase becomes the actual
-- source of truth. Dexie remains a cache (for offline + speed).
--
-- Tables added:
--   - user_program_profiles : the onboarding output (matches profileRepo)
--   - session_checkins      : post-workout check-ins (matches checkins.ts)
--   - mesocycles            : generated training blocks (deferred sync —
--                             we add the table now so the schema is honest
--                             but the client still writes Dexie-only)
--
-- Every table is RLS-enabled with policies gating on auth.uid() = user_id
-- per the Supabase RLS pattern. No anon access. No service-role bypass —
-- the edge function uses the user's JWT to act on their row.

-- ─── user_program_profiles ────────────────────────────────────────────────
-- Profile-as-jsonb so the client-side UserProgramProfile shape can evolve
-- without a Postgres migration each time. We mirror updated_at at the top
-- level for the last-write-wins comparison in pullProfileFromCloud.
create table if not exists public.user_program_profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  profile    jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_program_profiles enable row level security;

drop policy if exists "Users can read own program profile" on public.user_program_profiles;
create policy "Users can read own program profile"
  on public.user_program_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own program profile" on public.user_program_profiles;
create policy "Users can insert own program profile"
  on public.user_program_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own program profile" on public.user_program_profiles;
create policy "Users can update own program profile"
  on public.user_program_profiles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own program profile" on public.user_program_profiles;
create policy "Users can delete own program profile"
  on public.user_program_profiles for delete
  using (auth.uid() = user_id);

-- ─── session_checkins ─────────────────────────────────────────────────────
-- One row per finished session. Primary key = session_id so re-saves
-- overwrite (matches the Dexie key). `checkin` holds the full
-- SessionCheckin JSON; indexed columns are mirrored at the top level so
-- the end-of-block re-planner can pull "just this block" cheaply.
create table if not exists public.session_checkins (
  session_id   text primary key,
  user_id      uuid not null references auth.users on delete cascade,
  completed_at timestamptz not null,
  week_number  int not null,
  checkin      jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists session_checkins_user_completed_idx
  on public.session_checkins (user_id, completed_at desc);

alter table public.session_checkins enable row level security;

drop policy if exists "Users can read own session checkins" on public.session_checkins;
create policy "Users can read own session checkins"
  on public.session_checkins for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own session checkins" on public.session_checkins;
create policy "Users can insert own session checkins"
  on public.session_checkins for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own session checkins" on public.session_checkins;
create policy "Users can update own session checkins"
  on public.session_checkins for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own session checkins" on public.session_checkins;
create policy "Users can delete own session checkins"
  on public.session_checkins for delete
  using (auth.uid() = user_id);

-- ─── mesocycles ───────────────────────────────────────────────────────────
-- Generated training blocks. Plan sync is DEFERRED — plans regenerate
-- periodically anyway, so client writes are Dexie-only for now. The table
-- exists so a later sync layer can flip on without another migration, and
-- so the Supabase dashboard at least shows the user has a plan structure.
create table if not exists public.mesocycles (
  id                    text primary key,
  user_id               uuid not null references auth.users on delete cascade,
  generated_at          timestamptz not null,
  length_weeks          int not null,
  sessions              jsonb not null,
  profile_snapshot      jsonb not null,
  created_at            timestamptz not null default now()
);

create index if not exists mesocycles_user_generated_idx
  on public.mesocycles (user_id, generated_at desc);

alter table public.mesocycles enable row level security;

drop policy if exists "Users can read own mesocycles" on public.mesocycles;
create policy "Users can read own mesocycles"
  on public.mesocycles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own mesocycles" on public.mesocycles;
create policy "Users can insert own mesocycles"
  on public.mesocycles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own mesocycles" on public.mesocycles;
create policy "Users can update own mesocycles"
  on public.mesocycles for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own mesocycles" on public.mesocycles;
create policy "Users can delete own mesocycles"
  on public.mesocycles for delete
  using (auth.uid() = user_id);

-- ─── Tighten existing tables ──────────────────────────────────────────────
-- The legacy schema.sql already enabled RLS + read/insert/update policies
-- for session_logs, set_logs, cardio_logs, personal_records, last_weights,
-- user_goals. We just (re)create them idempotently here so a single
-- migration run sets up the entire app surface cleanly.

-- session_logs
alter table if exists public.session_logs enable row level security;
drop policy if exists "Users can view own sessions" on public.session_logs;
create policy "Users can view own sessions"
  on public.session_logs for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own sessions" on public.session_logs;
create policy "Users can insert own sessions"
  on public.session_logs for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own sessions" on public.session_logs;
create policy "Users can update own sessions"
  on public.session_logs for update using (auth.uid() = user_id);

-- personal_records
alter table if exists public.personal_records enable row level security;
drop policy if exists "Users can view own PRs" on public.personal_records;
create policy "Users can view own PRs"
  on public.personal_records for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own PRs" on public.personal_records;
create policy "Users can insert own PRs"
  on public.personal_records for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own PRs" on public.personal_records;
create policy "Users can update own PRs"
  on public.personal_records for update using (auth.uid() = user_id);
