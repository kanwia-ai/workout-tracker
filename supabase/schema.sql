-- Workout Tracker Database Schema
-- Run this in your Supabase SQL Editor (supabase.com > Your Project > SQL Editor)

-- Enable Row Level Security on all tables
-- Each user can only see/modify their own data

-- ─── User Profiles ────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_emoji text default '💪',
  knee_flag boolean default false,
  streak int default 0,
  last_workout_date date,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Session Logs ─────────────────────────────────────────────────────────
create table if not exists session_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  workout_id text not null,
  workout_title text,
  date date not null default current_date,
  started_at timestamptz not null,
  ended_at timestamptz,
  phases jsonb default '[]',
  completed_sets int default 0,
  total_sets int default 0,
  notes text,
  created_at timestamptz default now()
);

alter table session_logs enable row level security;
create policy "Users can view own sessions" on session_logs for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on session_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on session_logs for update using (auth.uid() = user_id);

-- ─── Set Logs ─────────────────────────────────────────────────────────────
create table if not exists set_logs (
  id uuid default gen_random_uuid() primary key,
  session_log_id uuid references session_logs(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  exercise_id text not null,
  exercise_name text,
  set_number int not null,
  weight numeric,
  reps_completed int,
  logged_at timestamptz default now()
);

alter table set_logs enable row level security;
create policy "Users can view own set logs" on set_logs for select using (auth.uid() = user_id);
create policy "Users can insert own set logs" on set_logs for insert with check (auth.uid() = user_id);

-- ─── Cardio Logs ──────────────────────────────────────────────────────────
create table if not exists cardio_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  date date not null default current_date,
  type text not null,
  duration_minutes int not null,
  incline numeric,
  distance numeric,
  notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

alter table cardio_logs enable row level security;
create policy "Users can view own cardio" on cardio_logs for select using (auth.uid() = user_id);
create policy "Users can insert own cardio" on cardio_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own cardio" on cardio_logs for update using (auth.uid() = user_id);

-- ─── Personal Records ─────────────────────────────────────────────────────
create table if not exists personal_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  exercise_id text not null,
  exercise_name text not null,
  weight numeric not null,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, exercise_id)
);

alter table personal_records enable row level security;
create policy "Users can view own PRs" on personal_records for select using (auth.uid() = user_id);
create policy "Users can insert own PRs" on personal_records for insert with check (auth.uid() = user_id);
create policy "Users can update own PRs" on personal_records for update using (auth.uid() = user_id);

-- ─── Last Weights (per exercise) ──────────────────────────────────────────
create table if not exists last_weights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  exercise_id text not null,
  weight numeric not null,
  date date not null default current_date,
  unique(user_id, exercise_id)
);

alter table last_weights enable row level security;
create policy "Users can view own weights" on last_weights for select using (auth.uid() = user_id);
create policy "Users can upsert own weights" on last_weights for insert with check (auth.uid() = user_id);
create policy "Users can update own weights" on last_weights for update using (auth.uid() = user_id);

-- ─── User Goals ───────────────────────────────────────────────────────────
create table if not exists user_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  goal_type text not null,
  target_value numeric not null,
  current_value numeric default 0,
  unit text not null,
  created_at timestamptz default now()
);

alter table user_goals enable row level security;
create policy "Users can view own goals" on user_goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals" on user_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on user_goals for update using (auth.uid() = user_id);
