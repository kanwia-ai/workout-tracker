-- ─── Delete policies for "Start fresh" ─────────────────────────────────────
-- 2026-06-10. The Settings "Start fresh" wipe cleared local Dexie only; with
-- the backend alive, pullProfileFromCloud resurrected the profile on the
-- next sign-in and the wipe appeared to do nothing. A real wipe must be able
-- to delete the user's cloud rows. The sync-layer tables
-- (user_program_profiles, session_checkins, mesocycles) already carry
-- delete policies; these are the original schema.sql tables that never got
-- one. Same auth.uid() = user_id gate as their select/insert policies.
-- `profiles` is intentionally excluded — it's the account's display row,
-- recreated by the signup trigger; "start fresh" clears training data, not
-- the account.

drop policy if exists "Users can delete own sessions" on public.session_logs;
create policy "Users can delete own sessions"
  on public.session_logs for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own set logs" on public.set_logs;
create policy "Users can delete own set logs"
  on public.set_logs for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own cardio" on public.cardio_logs;
create policy "Users can delete own cardio"
  on public.cardio_logs for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own PRs" on public.personal_records;
create policy "Users can delete own PRs"
  on public.personal_records for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own weights" on public.last_weights;
create policy "Users can delete own weights"
  on public.last_weights for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.user_goals;
create policy "Users can delete own goals"
  on public.user_goals for delete
  using (auth.uid() = user_id);
