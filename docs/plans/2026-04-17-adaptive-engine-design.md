# Adaptive Programming Engine — Design Doc

**Status:** Design (pre-implementation)
**Author:** Kyra + Claude
**Date:** 2026-04-17
**Replaces:** `src/data/program.ts` (PERIOD_CYCLE, fixed PROGRAM map), `src/data/schedule.ts` (fixed day-of-week → workout map)
**Consumed by:** the later implementation agent. This doc is the single source of truth; no other spec should be written before implementation.

---

## 1. Why we're replacing the current system

The v1 program is a fixed weekly schedule (`schedule.ts`) layered on top of a fixed 7-week periodization (`program.ts`). It works for a single persona (Kyra, 5 days/wk, glute-focused, knee-cautious) but fails four ways the user surfaced in brainstorming:

1. **Calendar-bound, not progress-bound.** `getToday()` is implicitly `new Date().getDay()` → if the user skips Monday, Monday's workout is gone; Tuesday shows Tuesday's workout. Missed work silently disappears.
2. **No recovery math.** The schedule puts Heavy Legs on Thursday regardless of whether glutes-legs-back was moved to Wednesday. Back-to-back leg days are possible whenever a user shifts things.
3. **No profile.** Every user gets Kyra's program. There is no way to say "I want 3 days/week, no barbell, rehab emphasis" and have the system respond.
4. **Override is a dead-end.** If Kyra doesn't feel like glutes today, there's no graceful "give me rehab instead" — she either does it or skips. The skip isn't reasoned about.

The adaptive engine fixes all four by treating the plan as **derived state** from a profile + a history of completed sessions, not a hard-coded table.

---

## 2. Profile schema

The profile is the input to every plan generation. It lives in Supabase (`profiles` table, extended) and is mirrored to Dexie for offline generation.

### 2.1 TypeScript interface

```ts
// src/types/profile.ts

export type Goal =
  | 'glutes'        // hypertrophy skewed to glute/hamstring volume
  | 'strength'      // lower-rep, compound-heavy, full body
  | 'longevity'     // moderate volume, joint-friendly, mobility emphasis
  | 'aesthetics'    // balanced hypertrophy, upper + lower symmetry
  | 'rehab'         // reduced intensity, protocol-forward, modified ROM

export type EquipmentAvailability =
  | 'full_gym'              // barbell, cables, machines, dumbbells
  | 'dumbbell_only'         // DBs + bench
  | 'kettlebell_only'       // KBs + floor
  | 'bodyweight_only'       // nothing
  | 'home_mixed'            // DBs + KBs + bands, no barbell

export type BodyPart =
  | 'left_knee' | 'right_knee'
  | 'left_shoulder' | 'right_shoulder'
  | 'lower_back' | 'neck'
  | 'left_hip' | 'right_hip'
  | 'left_wrist' | 'right_wrist'
  | 'left_ankle' | 'right_ankle'

export type InjurySeverity =
  | 'avoid'    // never load this pattern (e.g. torn meniscus → no deep squat)
  | 'modify'   // program substitutions (partial ROM, reduced load)
  | 'ok'       // user wants it tracked but not acted on yet

export interface Injury {
  part: BodyPart
  severity: InjurySeverity
  note?: string                // free text, shown on relevant workouts
  specific?: string            // e.g. 'torn_meniscus', 'rotator_cuff'
}

export type Sex = 'female' | 'male' | 'other' | 'prefer_not_to_say'

export interface UserProgramProfile {
  user_id: string              // FK → profiles.id
  goal: Goal
  sessions_per_week: 2 | 3 | 4 | 5 | 6
  training_age_months: number  // 0 = true beginner, 24+ = intermediate
  equipment: EquipmentAvailability
  injuries: Injury[]
  time_budget_min: 30 | 45 | 60 | 75 | 90
  sex: Sex                     // drives *defaults* only (volume skew, equipment preference), never gates
  cycle_tracking_opt_in: boolean  // UI-only flag — engine does NOT auto-adapt to cycle phase
  preferred_rest_days?: number[] // optional soft hint: [0,6] = prefer Sun/Sat rest. NOT a hard constraint.
  updated_at: string
}
```

### 2.2 Supabase table

```sql
-- add to supabase/schema.sql
create table if not exists user_program_profiles (
  user_id uuid references profiles(id) on delete cascade primary key,
  goal text not null,
  sessions_per_week int not null check (sessions_per_week between 2 and 6),
  training_age_months int not null default 0,
  equipment text not null,
  injuries jsonb default '[]'::jsonb,
  time_budget_min int not null default 60,
  sex text,
  cycle_tracking_opt_in boolean default false,
  preferred_rest_days jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table user_program_profiles enable row level security;
create policy "Users see own program profile" on user_program_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 2.3 Dexie mirror

Add to `src/lib/db.ts`:

```ts
interface LocalProgramProfile extends UserProgramProfile { synced: boolean }

db.version(2).stores({
  // ...existing
  programProfiles: 'user_id, synced',
  plans: 'id, user_id, active, generated_at',
  plannedSessions: 'id, plan_id, status, intended_order',
})
```

Dexie is the source of truth while offline; writes flip `synced=false` and sync on reconnect via `src/lib/persistence.ts`.

---

## 3. Onboarding flow

Six screens. Modeled on MyFit's "narrow funnel" pattern — one decision per screen, big buttons, `Back` always present, `Skip` only on optional screens. First-run is triggered when `user_program_profiles` row is missing for the logged-in user.

**Screen 1 — Goal.** "What are you training for?" Five cards: Glutes / Strength / Longevity / Aesthetics / Rehab. One selection. Default: null (must pick).

**Screen 2 — Frequency.** "How many days per week can you train?" 2 / 3 / 4 / 5 / 6 chip selector. Copy below: "Be honest. We'd rather you nail 3 than skip 4 of 5." Default: 4.

**Screen 3 — Experience.** "How long have you been lifting?" Options: New (0-3 mo) / Getting into it (3-12 mo) / A year or two (12-24 mo) / Been lifting a while (24+ mo). Maps to `training_age_months` = 1 / 6 / 18 / 36.

**Screen 4 — Equipment.** "Where do you train?" Five cards with icons: Full gym / Dumbbells only / Kettlebells only / Bodyweight / Home (mixed). Default: full_gym.

**Screen 5 — Injuries & flags.** "Anything we should work around?" List of checkboxes: Left knee, Right knee, Left shoulder, Right shoulder, Lower back, Neck, Hips, Wrists, Ankles, None. Each checked item expands into a sub-chooser: `Avoid loading` / `Modify only` / `Just tracking`. Free-text note optional. This is the single most important screen for the meniscus case — `left_knee: avoid` + `specific: 'torn_meniscus'` is the trigger for all knee-safe substitution rules.

**Screen 6 — Time & sex.** Two compact questions on one screen. "How long per session?" 30 / 45 / 60 / 75 / 90 min chips. "Sex?" (used for volume/equipment defaults, shown with that explanation). "Optional: track menstrual cycle?" toggle (only shown if sex=female). Default: 60 min, prefer_not_to_say, cycle off.

**Confirm screen.** Summary: "Here's your plan. 4 days/week, glute-focused hypertrophy, full gym, working around left knee. We'll build you a mesocycle now." CTA: `Build my plan`. This calls the engine and lands the user on their first `PlannedSession`.

**Edit anytime.** Profile screen in settings re-opens any of the above. Changes trigger `regeneratePlan()` (warns: "This will rebuild your upcoming week. Past sessions are kept.").

---

## 4. Plan data model

A plan is a **mesocycle** (4-8 weeks), built once and mutated as the user progresses. Structure is Dexie-friendly (flat IDs, no deep trees in IndexedDB keys).

```ts
// src/types/plan.ts

export type PlanStatus = 'draft' | 'active' | 'archived'
export type SessionStatus = 'upcoming' | 'completed' | 'skipped' | 'in_progress'
export type SessionFocus =
  | 'lower_glute_dominant'
  | 'lower_quad_dominant'
  | 'upper_push'
  | 'upper_pull'
  | 'upper_full'
  | 'full_body'
  | 'rehab'
  | 'mobility_rest'

export interface Mesocycle {
  id: string
  user_id: string
  profile_snapshot: UserProgramProfile   // profile at generation time
  weeks_planned: number                  // 4, 6, or 8
  current_week: number                   // 1-indexed; advances when a week is fully resolved
  phase_per_week: PeriodPhase[]          // length = weeks_planned
  status: PlanStatus
  generated_at: string
  last_rebalanced_at: string
}

export interface PlannedSession {
  id: string
  plan_id: string
  week_number: number                    // 1..weeks_planned
  intended_order: number                 // 0..(sessions_per_week-1) within the week
  focus: SessionFocus
  muscle_groups: MuscleGroup[]           // from workout-focus.ts taxonomy
  intended_date?: string                 // ISO date — soft hint only, NOT source of truth
  status: SessionStatus
  completed_at?: string
  skipped_at?: string
  exercises: PlannedExercise[]
  warmup_block_id?: string               // points into warmups.ts
  notes?: string                         // engine-generated, e.g. "Substituted squat → TKE (meniscus)"
}

export interface PlannedExercise {
  exercise_id: string                    // FK to EXERCISE_LIBRARY
  role: string                           // e.g. 'Glute Compound', 'Knee-Safe Quad'
  sets: number
  rep_range: [number, number]            // e.g. [8, 12]
  rir_target: number                     // reps in reserve; 2-3 for beginners, 1-3 intermediate
  rest_seconds: number
  is_main: boolean
  substitution_reason?: string           // 'meniscus_avoid' | 'equipment' | 'user_swap'
  original_exercise_id?: string          // what this replaced, if any
}

// Periodization lives inside the mesocycle, not as a separate module
export type PeriodPhase = 'accumulation' | 'intensification' | 'realization' | 'deload'
```

Key design decisions:
- `intended_date` is a **hint**, not a key. The "today" algorithm walks `status === 'upcoming'`, ordered by `(week_number, intended_order)`. Dates drift; progress doesn't.
- Exercises are **denormalized** onto the session at generation time. If the user edits their profile later, *upcoming* sessions regenerate — past sessions stay frozen.
- The mesocycle carries a `profile_snapshot` so we can look back at "what was I training for in March" even after the profile changes.

---

## 5. Engine rules

Pseudocode, TypeScript-flavored. Each rule is self-contained so the implementation agent can translate one at a time. All rules operate on `(profile, history, currentPlan)` and emit either a fresh `Mesocycle` (generation) or mutations to upcoming sessions (rebalance).

### 5.1 Split selection

```ts
function chooseSplit(profile: UserProgramProfile): SessionFocus[] {
  const { sessions_per_week, goal } = profile
  // Returns one SessionFocus per session in a week, in intended order.
  if (sessions_per_week === 2) return ['full_body', 'full_body']
  if (sessions_per_week === 3) return ['full_body', 'full_body', 'full_body']
  if (sessions_per_week === 4) {
    if (goal === 'glutes' || goal === 'aesthetics')
      return ['lower_glute_dominant', 'upper_full', 'lower_quad_dominant', 'upper_full']
    return ['lower_quad_dominant', 'upper_push', 'lower_glute_dominant', 'upper_pull']
  }
  if (sessions_per_week === 5) {
    if (goal === 'glutes')
      return ['lower_glute_dominant', 'upper_pull', 'lower_quad_dominant', 'upper_push', 'lower_glute_dominant']
    return ['lower_quad_dominant', 'upper_push', 'upper_pull', 'lower_glute_dominant', 'upper_full']
  }
  if (sessions_per_week === 6) return ['lower_glute', 'upper_push', 'lower_quad', 'upper_pull', 'full_body', 'mobility_rest']
}
```

### 5.2 Recovery window (48-72h)

```ts
// Rule: Do not schedule two sessions that hit >=60% overlap of MuscleGroup sets
// within 48h of each other. Legs are the sharp case.
function violatesRecovery(a: PlannedSession, b: PlannedSession, hoursBetween: number): boolean {
  const overlap = jaccard(a.muscle_groups, b.muscle_groups)
  if (overlap < 0.4) return false
  if (hoursBetween < 48) return true
  if (hoursBetween < 72 && a.focus.startsWith('lower') && b.focus.startsWith('lower')) return true
  return false
}
```

### 5.3 Ordering within a week

```ts
// Greedy: assign the chosen splits to day slots such that no two adjacent slots
// violateRecovery. If profile.preferred_rest_days exists, treat those as gaps.
function orderWeek(splits: SessionFocus[], profile): PlannedSession[] {
  // Try all valid permutations; score by (a) recovery compliance,
  // (b) closeness to preferred_rest_days, (c) glute-dominant sessions placed early in the week.
  // Return the best scoring permutation as intended_order 0..n-1.
}
```

### 5.4 Volume targets per muscle group per week

```ts
// Set targets driven by profile.goal and training_age_months.
// MEV = minimum effective, MAV = adaptive, MRV = max recoverable.
const VOLUME_LANDMARKS = {
  quads:     { MEV: 8, MAV: 15, MRV: 20 },
  glutes:    { MEV: 8, MAV: 14, MRV: 22 },
  hamstrings:{ MEV: 6, MAV: 12, MRV: 18 },
  chest:     { MEV: 8, MAV: 14, MRV: 20 },
  back:      { MEV: 10, MAV: 16, MRV: 22 },
  shoulders: { MEV: 6, MAV: 14, MRV: 20 },
  biceps:    { MEV: 6, MAV: 12, MRV: 18 },
  triceps:   { MEV: 6, MAV: 12, MRV: 18 },
}

function targetSetsForWeek(mg: MuscleGroup, profile, phase: PeriodPhase): number {
  const band = VOLUME_LANDMARKS[mg]
  const base = profile.training_age_months < 6 ? band.MEV
              : profile.training_age_months < 24 ? band.MAV - 2
              : band.MAV
  const goalBoost = (profile.goal === 'glutes' && (mg === 'glutes' || mg === 'hamstrings')) ? 4 : 0
  const phaseMod  = phase === 'deload' ? -6 : phase === 'realization' ? -2 : 0
  return clamp(base + goalBoost + phaseMod, band.MEV, band.MRV)
}
```

### 5.5 Progression (double progression)

```ts
// Applied at session-start: decide whether to bump reps or load for each planned exercise.
function progressExercise(ex: PlannedExercise, history: SetLog[]): PlannedExercise {
  const lastSession = history.filter(s => s.exercise_id === ex.exercise_id).at(-1)
  if (!lastSession) return ex // first time, use profile default
  const [lo, hi] = ex.rep_range
  const hitTop = lastSession.reps_completed >= hi && lastSession.rir_observed >= 1
  if (hitTop) {
    // bump load by 2.5-5%, reset rep target to lo
    return { ...ex, suggested_weight: bumpWeight(lastSession.weight, 0.025), suggested_reps: lo }
  }
  // otherwise, try to add 1 rep at same load
  return { ...ex, suggested_weight: lastSession.weight, suggested_reps: lastSession.reps_completed + 1 }
}
```

### 5.6 Deload triggers

```ts
// Checked at week boundary. If any fires, next week.phase = 'deload'.
function shouldDeload(history: SessionLog[], currentWeek: number, mesoLen: number): boolean {
  const last3 = history.slice(-3)
  const stalled = last3.every(s => s.all_exercises_stalled === true)
  const highSoreness = last3.filter(s => s.user_reported_soreness >= 4).length >= 2
  const poorSleep = last3.filter(s => s.user_reported_sleep <= 2).length >= 2
  const scheduled = currentWeek === mesoLen // final week of meso = always deload
  return stalled || highSoreness || poorSleep || scheduled
}
```

### 5.7 Meniscus / knee-avoid substitution

```ts
// Triggered at exercise-pick time. Reads profile.injuries.
function resolveExerciseForSlot(slot, profile): PlannedExercise {
  const candidates = EXERCISE_LIBRARY.filter(e => e.role === slot.role && equipmentOK(e, profile))
  const kneeAvoid = profile.injuries.find(i =>
    (i.part === 'left_knee' || i.part === 'right_knee') && i.severity === 'avoid')
  if (kneeAvoid) {
    // Filter: knee_safety !== 'knee_avoid'.
    // Prefer knee_safety === 'knee_safe'. Soft-prefer partial ROM variants and hip-hinge over squat patterns.
    const safe = candidates.filter(e => e.knee_safety !== 'knee_avoid')
    const ranked = safe.sort(prefKneeSafe)
    return pack(ranked[0], slot, { substitution_reason: 'meniscus_avoid', original: slot.preferred })
  }
  return pack(candidates[0], slot)
}
```

### 5.8 Equipment gating

```ts
function equipmentOK(e: Exercise, profile): boolean {
  const avail = EQUIPMENT_SETS[profile.equipment]  // Set<Equipment>
  return e.equipment.every(eq => avail.has(eq))
}
```

### 5.9 Warm-up insertion

```ts
// Every session gets a warm-up block. Length depends on time_budget and focus.
function attachWarmup(session: PlannedSession, profile): PlannedSession {
  const minutes = profile.time_budget_min <= 30 ? 5 : profile.time_budget_min >= 75 ? 12 : 8
  const id = pickWarmupBlock(session.focus, profile.injuries, minutes) // from warmups.ts
  return { ...session, warmup_block_id: id }
}
```

### 5.10 Rehab override rule

```ts
// When user overrides a session to 'rehab' or 'mobility_rest', the rest of the week
// must be re-walked through 5.2 and 5.3 to preserve recovery.
function applyOverride(plan, sessionId, newFocus: SessionFocus): Mesocycle {
  const session = plan.sessions.find(s => s.id === sessionId)
  markSkipped(session)
  const inserted = generateSessionForFocus(newFocus, plan.profile_snapshot)
  inserted.intended_order = session.intended_order
  const upcoming = plan.sessions.filter(s => s.status === 'upcoming' && s.week_number === session.week_number)
  const rebalanced = orderWeek([inserted.focus, ...upcoming.map(u => u.focus)], plan.profile_snapshot)
  return persist(plan, rebalanced)
}
```

### 5.11 Cycle tracking (no-op for programming)

Per research: evidence that cycle-phase-based programming improves outcomes is weak and contradictory. If `cycle_tracking_opt_in=true`, the UI shows phase info and lets the user log symptoms; the engine **does not** modify sets, loads, or exercises based on cycle phase. This is an explicit product decision, documented here to prevent future drift.

---

## 6. Progress-based "today" algorithm

```ts
// src/lib/engine/getToday.ts
export function getToday(plan: Mesocycle, allSessions: PlannedSession[], history: SessionLog[]): PlannedSession {
  const upcoming = allSessions
    .filter(s => s.plan_id === plan.id && s.status === 'upcoming')
    .sort((a, b) => a.week_number - b.week_number || a.intended_order - b.intended_order)

  // Case A: nothing upcoming → generate next week (or next mesocycle if meso is done)
  if (upcoming.length === 0) {
    if (plan.current_week >= plan.weeks_planned) return startNextMesocycle(plan)
    return generateNextWeek(plan)[0]
  }

  const next = upcoming[0]

  // Case B: long gap → soft deload / rehab re-entry
  const lastCompleted = [...history].sort(byCompletedAtDesc)[0]
  const daysSince = lastCompleted ? daysBetween(lastCompleted.ended_at, now()) : 0
  if (daysSince >= 7) {
    return softenForReentry(next, daysSince)
    // softenForReentry: drop top set, cap RIR at 3, flag UI banner "Welcome back — this one's easier on purpose"
  }

  // Case C: repeated leg skips in this week → re-plan remainder
  const skippedThisWeek = allSessions.filter(s =>
    s.week_number === next.week_number && s.status === 'skipped' && s.focus.startsWith('lower'))
  if (skippedThisWeek.length >= 2) {
    const rebalanced = rebalanceWeek(plan, next.week_number)
    return rebalanced[0]
  }

  return next
}
```

No `Date.now()` comparison against `day_of_week` anywhere. `intended_date` is used only for display ("You had this pencilled for Tuesday") and for nudges/notifications, never for source-of-truth decisions.

---

## 7. Override mechanic

User story: mid-morning, user opens the app. Top of the "Today" card is a secondary button row: `Swap`. Tapping it opens a bottom sheet.

**Sheet options:** `Rehab session` / `Upper only` / `Lower only` / `Full rest` / `Pick different workout`.

**Flow:**
1. User picks "Rehab session."
2. Engine computes `applyOverride(plan, today.id, 'rehab')`.
3. Before persisting, shows a **diff preview**: "Here's what changes:"
   - Today: Heavy Legs → **Rehab (knee protocol + mobility)**
   - Thursday: stays Back Focus
   - Saturday: Shoulders & Arms → **Heavy Legs (moved)**
   - "Everything else stays the same."
4. `Confirm` persists. `Cancel` reverts.

**Constraints enforced in the preview:**
- No two lower sessions within 48h after the shift.
- If the insert can't be placed without violating recovery, the engine truncates the week (moves the bumped session to next week) rather than violating.
- Preview always names the reason for each shift: "Moved to maintain 48h between leg days."

**UX note:** the override is a **first-class verb**, not a "settings" detour. The engine treating it as a normal replanning event is what makes it feel like the app is reasoning, not just recording.

---

## 8. Migration path

### Reuse

- **`src/data/exercises.ts`** — EXERCISE_LIBRARY stays as the single source of exercise data. Engine picks from this. IDs are stable.
- **`src/data/workout-focus.ts`** — the `MuscleGroup` taxonomy is reused. Expand slightly: also tag each exercise with `MuscleGroup[]` on `Exercise` (already there as `primary_muscles` / `secondary_muscles`, so use those directly and delete `workout-focus.ts`'s coarse per-workout mapping — it's redundant once the engine picks exercises, not workouts).
- **`src/data/warmups.ts`, `src/data/cooldowns.ts`, `src/data/protocols.ts`** — reuse as content libraries that the engine indexes into.
- **`src/types/index.ts`** — `Exercise`, `MuscleGroup`, `Equipment`, `KneeSafety` enums all reused.

### Throw away

- **`src/data/program.ts`** — delete. The PROGRAM map of hand-curated slot pools is replaced by engine-time exercise selection. The `PERIOD_CYCLE` table is replaced by `PeriodPhase` at the mesocycle level (§4 + §5.4, §5.6).
- **`src/data/schedule.ts`** — delete. Day-of-week → workout mapping is no longer a concept; `intended_date` is a display hint, and users can set `preferred_rest_days` if they care.
- **`localStorage` keys** `program-week`, `lastMonday` — remove. All plan state is Dexie + Supabase.
- **`UserProfile.knee_flag` (boolean)** — deprecate. Superseded by `injuries[]`. Migration: if `knee_flag === true`, insert `{ part: 'left_knee', severity: 'avoid' }` into `injuries` at first load, then drop the column in a later migration.
- **`useAuth.updateStreak` hardcoded rest days (Wed=3, Sun=0)** — replace with "rest days = any day without a completed PlannedSession in the current plan."

### Is the 7-week PERIOD_CYCLE worth keeping?

No — but keep the **idea**. The old cycle baked periodization into a static table. The new engine folds it into the mesocycle: a `Mesocycle` has 4-8 weeks, each with a `PeriodPhase`. The default progression for an intermediate user is `[accumulation, accumulation, intensification, intensification, realization, deload]` (6-week meso). After a deload the engine auto-starts the next mesocycle with updated volume targets based on the previous cycle's stall patterns. Periodization is now a *behavior of the engine*, not a lookup table.

---

## 9. Scope boundary — NOT in Wave 2

Explicitly deferred:

- **Multi-user / auth overhaul.** Supabase auth as it exists today (magic link, single profile) is sufficient. No teams, no coach view, no shared plans.
- **wger or external mobility data.** Warm-ups and cool-downs keep using `warmups.ts` / `cooldowns.ts`. No external API calls in Wave 2.
- **Delight layer.** Mascot, sounds, encouragement copy, fun verbs — all captured in `project_workout_delight.md`, none ship with Wave 2. Ship the engine first; delight it afterward.
- **Cardio auto-programming.** `cardio.ts` stays as a manual-log library. The engine does NOT place cardio sessions or prescribe zone-2 minutes. Cardio stays user-initiated.
- **Cycle-phase-responsive programming.** Logging only. No auto-adjustment. (See §5.11.)
- **LLM-driven exercise selection.** Engine is deterministic rule-based. No Gemini/Claude calls in the hot path. (Gemini lives in `lib/gemini.ts` for separate features — keep it there.)
- **Notifications / calendar integration.** `intended_date` is computed but not pushed to iOS calendar or local notifications in Wave 2.
- **Plan export / share.** No "share my program" feature.

---

## 10. Open questions for Kyra

1. **Mesocycle length default — 4, 6, or 8 weeks?** 6 is the middle ground (matches research on deload timing for intermediates). 4 feels more responsive for beginners. Pick one for the default and let users change it in settings.
2. **"Rehab session" content — protocol library or AI-generated?** §7 assumes we pull from `protocols.ts`. Is that rich enough today, or do we need to seed 3-5 curated "rehab days" (knee, shoulder, lower back, general mobility, deload day) as part of Wave 2?
3. **Progression autopilot vs. prompt.** When §5.5 decides to bump load, should the app auto-fill next session's weight, or prompt ("Ready to go up 5 lbs on RDLs?"). Auto-fill is faster; prompt gives the user agency. I'd default to auto-fill-with-undo.
4. **Soreness/sleep input for deload triggers.** §5.6 references `user_reported_soreness` / `user_reported_sleep`. We don't collect these today. Options: (a) add a 2-tap "how did that feel?" prompt at session end, (b) skip subjective signals in Wave 2 and rely on stalled-load detection only. I'd ship (a) because it's cheap and unlocks §5.6 properly.
5. **Cycle tracking UI — Wave 2 or later?** Profile flag is defined (§2) but no views. We could ship the opt-in toggle without any views and build the tracker later, or we cut the toggle and add it with the tracker. I'd cut the toggle until the tracker ships so we don't promise something that isn't there.

---

**End of design doc.** Implementation agent: read §4 (data model), §5 (rules), §6 (today), §7 (override) in that order. Then §8 for what to delete. Open questions in §10 should be resolved with Kyra before any code lands.
