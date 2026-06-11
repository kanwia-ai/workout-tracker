---
status: resolved
trigger: "Start fresh wipe was resurrected by cloud sync after backend restore (FIXED: wipeCloudData + migration applied 2026-06-10). User asked to sweep for OTHER bugs of the same class: local-vs-cloud state interplay introduced by the backend coming back alive."
created: 2026-06-10T21:00:00Z
updated: 2026-06-10T23:50:00Z
---

## Resolution

root_cause: The 2026-06-09 backend restore reactivated sync paths whose dirty-row retry story was never wired: per-module backfill sweeps existed with zero callers, sign-out wiped dirty rows unflushed, every supabase auth re-emission restarted the full sign-in resolution, and the profile pull had no last-write-wins guard against an older cloud.
fix: New src/lib/syncBackfill.ts flushDirtyToCloud(userId) sweep (profile + check-ins + sessions/sets/PRs/weights/cardio), called on sign-in resolution and BEFORE auth.signOut() (plain-language confirm if rows still can't reach the cloud); onAuthStateChange now restarts resolution only when the user identity changes (lastAuthUserIdRef); pullProfileFromCloud keeps a strictly-newer synced local profile, flips it dirty, and repairs the cloud; dayOverrides comment de-lied (device-local, no cloud table); DEV_BYPASS guarded with !import.meta.env.TEST so the fake user can't leak into hook tests.
verification: 16 new/extended tests (syncBackfill.test.ts x5, useAuth.test.ts x8, profileRepo.test.ts rollback-guard x3); full suite 88 files / 1223 tests green; tsc -b green.
files_changed: src/lib/syncBackfill.ts (new), src/lib/syncBackfill.test.ts (new), src/hooks/useAuth.ts, src/hooks/useAuth.test.ts (new), src/lib/profileRepo.ts, src/lib/profileRepo.test.ts, src/lib/dayOverrides.ts

## Symptoms

expected: Local actions (wipe, edits, sign-out) and cloud sync compose predictably; wipe means wipe; fresh data never overwritten by stale data.
actual: (1) RESOLVED — wipe resurrection (commit 02704f8). (2) CONFIRMED — see Findings.
errors: none surfaced — silent sync side-effects
reproduction: per-defect narratives below
started: Only possible since 2026-06-09 backend restore; sync code written ~2026-05-27 (sync_layer migration) and 2026-06-10 (persistence local-first port).

## Findings (confirmed, code-level evidence)

### DEFECT 1 — Stranded dirty rows: backfill sweep is never called (CRITICAL, data loss)
- src/lib/persistence.ts:464 `syncDirtyPersistence` — doc says "Call when the backend comes back: sign-in, app foreground, or a manual retry." Grep: ZERO callers anywhere in src (only useAuth imports checkins' sync fns).
- src/lib/profileRepo.ts:161 `syncProfileUp` — only invoked fire-and-forget inside `saveProfileLocal` (line 137). `pullProfileFromCloud` (lines 183-189) sees a dirty local row and returns early WITHOUT pushing it.
- src/hooks/useAuth.ts:216-227 — sign-in resolution backfills ONLY check-ins (`pullCheckinsFromCloud` + `syncDirtyCheckins`).
- Repro narrative: backend paused for weeks → every workout logged in that window wrote sessionLogs/setLogs/PRs/weights/cardio rows `synced:false`; the one-shot background push failed silently (console.warn). Sessions are immutable — their push never re-fires. Backend restored 2026-06-09 → sign-in backfills check-ins only. Cloud history permanently missing weeks of training; a second device never sees it. Profile edits made during the pause never reach the cloud → next device/reinstall RESURRECTS the pre-pause stale profile (stale-clobber via resurrection — same class as the fixed wipe bug).

### DEFECT 2 — Sign-out destroys never-pushed data (CRITICAL, compounds Defect 1)
- src/hooks/useAuth.ts:273-297 `signOut` — calls `supabase.auth.signOut()` (line 277) THEN `wipeUserData()` (line 287) with no dirty-row flush. `wipeUserData` (src/lib/db.ts:417) clears ALL tables.
- Repro narrative: user finishes a workout offline (or any dirty rows pending per Defect 1), taps sign out → Dexie wiped → those workouts permanently destroyed; next sign-in pulls only what reached the cloud. With Defect 1 active, ALL data logged during the multi-week outage is one sign-out tap away from deletion.
- Note: flush must happen BEFORE `auth.signOut()` — RLS upserts need the live session.

### DEFECT 3 — Every auth event treated as a fresh sign-in (mid-flow race)
- src/hooks/useAuth.ts:133-151 — `onAuthStateChange` ignores `_event`; ANY event with a session (TOKEN_REFRESHED ~hourly, supabase-js v2 SIGNED_IN re-emission on tab refocus) triggers `setLoading(true)` + full profile/check-in re-pull.
- src/App.tsx:368 — `if (loading)` replaces the entire app with a spinner: OnboardingFlow unmounts (in-progress answers are component state → destroyed), Settings/WorkoutView unmount mid-flow.
- Repro narrative: sit mid-onboarding for ~55 min or background/foreground the PWA → app flashes to a spinner "without me doing anything", onboarding answers vanish. Matches the user's unverified symptom (2) verbatim.
- Also: initial mount double-resolves (getSession path + INITIAL_SESSION emission both fire resolveProgramProfile; gen token discards one but both pulls run).

### DEFECT 4 — pullProfileFromCloud has no LWW guard against an older cloud (latent stale-clobber)
- src/lib/profileRepo.ts:191-207 — when local row is `synced:true`, cloud overwrites local unconditionally, no `updated_at` comparison (TODO at line 180 acknowledges). If the cloud is older than local (backup-restore rollback — exactly the event class around pauses/restores), fresh local profile is replaced by stale cloud AND marked synced so it never re-pushes — permanent silent rollback.

## Documented, NOT fixed (rationale)

- dayOverrides (src/lib/dayOverrides.ts:36-48): rows marked `synced:false` "so the Supabase sync layer can pick it up later" — but NO day_overrides cloud table exists (verified: supabase/migrations). Rows are device-local, pruned at 14 days; amendment_json rides on them. Comment is misleading (fixed comment only); building the cloud table requires a migration push — out of session bounds. Behavior consistent with mesocycles being device-local.
- Mesocycles "deferred sync": intentional. Profile-without-plan on a new device routes to plan-less HomeScreen ("Rebuild my plan") — known odd state, by design.
- Dev-bypass 'dev-user': non-uuid pushes fail loudly and stay local; rows invisible to real users (queries keyed by user_id); wipe-on-sign-out clears them. No interplay defect.
- updateStreak (useAuth.ts:299): read-modify-write off in-memory profile → two-device streak clobber possible. Cosmetic; out of sweep scope.
- loadLastWeights LWW granularity is date-only (persistence.ts:187): same-day two-device edits ambiguous; benign.

## Fix plan

1. NEW src/lib/syncBackfill.ts — `flushDirtyToCloud(userId)`: best-effort push of dirty profile + check-ins + persistence rows; per-class isolation; returns ok flag.
2. useAuth.ts — (a) call flushDirtyToCloud during sign-in resolution (after pulls — pull guards already protect dirty rows); (b) signOut: flush BEFORE auth.signOut() for non-dev users; (c) onAuthStateChange: full re-resolution only when the session user id actually changes.
3. profileRepo.ts — pullProfileFromCloud LWW guard: local synced row strictly newer than cloud → keep local, flip dirty, background-push to repair cloud.
4. dayOverrides.ts — honest comment (device-local, no cloud table).
5. Tests: syncBackfill.test.ts (flush across tables, partial failure), profileRepo.test.ts (LWW pull cases), useAuth.test.ts (token-refresh does not re-trigger loading/pull; user switch does).

## Evidence

- timestamp: 2026-06-10T21:00:00Z — Wipe-resurrection root-caused and fixed (commit 02704f8): onResetApp cleared local only; localStorage.clear() removed the sb auth token (surprise sign-out); cloud rows survived; pullProfileFromCloud restored profile on next sign-in. Fix: wipeCloudData(userId) across 9 tables, cloud-first with honest abort; migration 20260610090000 added missing delete RLS policies (applied to live project).
- timestamp: 2026-06-10T22:30:00Z — Sweep complete. Grep proof: syncDirtyPersistence/syncProfileUp have zero sign-in/foreground callers. wipeUserData clears all tables with no flush. onAuthStateChange ignores event type. pullProfileFromCloud overwrites synced local without updated_at compare. No day_overrides cloud table in migrations.

## Eliminated

- checkins pull merge (checkins.ts:116-140): dirty-guard + LWW by completed_at both correct on inspection.
- loadPRs merge (persistence.ts:205): max-wins semantics correct even when overwriting a dirty lower local row (cloud already holds the higher value).
- loadSessionHistory merge (persistence.ts:279): id-match skip is sound — sessions immutable.
- wipeCloud.ts coverage: all 9 synced cloud tables included; day_overrides correctly absent (no cloud table).
- onResetApp (App.tsx:584): cloud-first wipe with honest abort — correct post-02704f8.
