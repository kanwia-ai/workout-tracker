# Personalization Pipeline v2 — Implementation Plan

**Date:** 2026-04-17
**Goal:** Replace the current single-pass Gemini prompt (`supabase/functions/generate/prompts/generatePlan.ts`) + the thin `UserProgramProfileSchema` with a research-backed, multi-pass, deeply personalized pipeline grounded in `docs/research/00-MASTER-SYNTHESIS.md`.
**Latency budget:** 2–3 min total generation (user explicitly approved this tradeoff in favor of quality over speed).
**Model:** Gemini 2.5 Flash (already wired; `VITE_GEMINI_API_KEY` already configured). One call per pass; all passes share a request ID for tracing.

---

## Architecture (6 passes, 2 of them deterministic / no-LLM)

```
Profile ─┐
         ├─► Pass 1: Coach reasoning (LLM, ~25s)
         │     ─► rationale.json
         │
         ├─► Pass 2: Architecture lookup (deterministic, <50ms)
         │     ─► architecture.json (split, volume targets, intensity, progression, deload)
         │
         ├─► Pass 3: Exercise pool filter (deterministic, <500ms)
         │     ─► pool.json (~300–500 entries)
         │
         └─► Pass 4: Session generation (LLM, ~60–90s)
               ─► sessions.json (populated mesocycle)
                     │
                     └─► Pass 5: Validation + auto-fix (deterministic lint → LLM if needed, ~20s)
                           ─► sessions.corrected.json
                                 │
                                 └─► Pass 6: Personalized session rationales (either baked into Pass 4 or cheap Flash call, ~10s)
                                       ─► final mesocycle
```

Only Passes 1, 4, (5 if fix needed), and optionally 6 hit Gemini. Target total latency in the 2–3 min range with retry budget.

### Pass 1: Coach reasoning (~25s, Gemini)

**Input:**
- Full user profile (expanded schema, see "Onboarding redesign" below).
- An excerpt from `00-MASTER-SYNTHESIS.md` containing only the sections relevant to this user — built deterministically by a helper `pickResearchExcerpt(profile)` that selects: the goal's architecture row, the injury rows that match profile flags, the volume landmarks for prioritized muscles, and the warmup/rest blocks. Excerpt is capped at ~4k tokens.

**Output shape (JSON, schema-enforced):**
```ts
{
  rationale: {
    split_choice: string,               // e.g., "Upper/Lower 4x/week"
    split_reason: string,                // cites principle numbers
    volume_bias: {                       // per prioritized muscle
      muscle: string,
      target_sets_per_week: number,
      justification: string
    }[],
    injury_accommodations: {             // one per injury flag
      injury: string,
      severity: string,
      programming_response: string,      // how the plan respects this
      citation: string                   // e.g. "R4 P4, P15"
    }[],
    progression_model: 'LP' | 'DP' | 'DUP' | 'BLK',
    progression_reason: string,
    deload_cadence_weeks: number,
    intensity_zone_primary: string,      // e.g., "6-12 reps, RIR 1-2"
    warnings: string[]                   // any flags validation should watch for
  }
}
```

**Prompt template:**
```
You are a strength and rehab coach. You write the reasoning BEHIND a plan — not the plan itself.

Read the user's profile and the research excerpt. Produce a structured rationale that a second
pass will use to generate the actual sessions.

Constraints:
- Every decision must cite a principle (e.g., "R1 P5" or "R4 P4"). If you can't cite, don't claim it.
- You do NOT output exercises here.
- Injury flags are non-negotiable. If profile has knee.modify, your injury_accommodations must
  include the knee row with the programming response from the research excerpt.
- volume_bias only names muscles the user flagged as priority OR that the goal row upweights.
  For a general/beginner user, you may return an empty volume_bias and that's fine.

PROFILE:
{profile json}

RESEARCH EXCERPT (curated for this user's goal + injury flags):
{excerpt}

Output JSON matching the rationale schema. No prose outside the JSON.
```

### Pass 2: Architecture lookup (deterministic, no LLM)

**Input:** profile.goal, profile.training_age_months, profile.sessions_per_week.

**Output:**
```ts
{
  split_type: 'FB' | 'UL' | 'PPL' | 'ULUL' | 'BRO',
  volume_targets_per_muscle: Record<MuscleGroup, { min: number; target: number; max: number }>,
  intensity_primary: string,           // rep range
  progression_model: 'LP' | 'DP' | 'DUP' | 'BLK',
  deload_cadence_weeks: number,
  sessions_per_week: number,
  session_skeleton: Array<{ day_slot: number; focus: string[]; estimated_duration_min: number }>
}
```

**Lives in:** `src/lib/programArchitecture.ts`. Pure function. 100% covered by unit tests (one test per cell in the master table). If Pass 1 disagrees with Pass 2, Pass 2 wins (architecture table is the source of truth; coach reasoning is for *within-cell* personalization).

### Pass 3: Exercise pool filter (deterministic, no LLM)

**Input:** profile.equipment, profile.injuries, architecture.volume_targets_per_muscle, muscle_priorities, free-exercise-db bundle.

**Steps:**
1. Load the bundled free-exercise-db (port from `project_workout_tracker_direction.md` decision — bundle at build time).
2. Filter by `equipment` — drop any exercise whose required equipment isn't in the user's list.
3. For each injury in profile.injuries where severity ∈ {`modify`, `avoid`, `chronic`}: consult `src/lib/injuryRules.ts` and drop any exercise matching that injury's `ban` list.
4. Tag remaining exercises with a `role` (compound | accessory | isolation | rehab_primer) for rest-timer and warmup logic.
5. Weight by muscle priority: upweight exercises whose `primaryMuscles` overlap `volume_bias` muscles; downweight exercises in the user's `dislikes` list.
6. Return top ~300–500 entries (enough coverage for variety, small enough for Gemini's context).

**Lives in:** `src/lib/exercisePoolFilter.ts`.

### Pass 4: Session generation (~60–90s, Gemini)

**Input:** rationale (Pass 1) + architecture (Pass 2) + pool (Pass 3).

**Output:** full mesocycle matching the existing `mesocycleSchema` (reuse; don't reinvent). Additive fields: per-session `rationale` (already in schema) + per-exercise `warmup_sets`, `rest_seconds`, `rir_target`.

**Prompt template:**
```
You are a strength coach. Build a {weeks}-week mesocycle for this user.

You are given:
1. COACH RATIONALE — the "why" decisions (split, volume bias, injury accommodations, progression).
   Honor every decision in this rationale.
2. ARCHITECTURE — deterministic split, per-muscle volume targets (MEV/MAV/MRV), intensity zones,
   progression model, deload cadence. Volume_targets_per_muscle is HARD — each muscle's weekly
   hard-set count must be >= target.min and <= target.max across every week except the deload.
3. EXERCISE POOL — the ONLY exercises you may use. Reference by exact id and name.

HARD RULES (validation will reject plans that break these):
- Only use exercises from the pool. Reference by exact id in library_id and verbatim name.
- Week N of {weeks} is a deload: cut sets ~40-50% vs previous week, keep intensity/RIR, same exercises.
- Every session begins with a warmup block. For each main compound, emit warmup_sets as an array of
  {load_percent, reps} scaling with the working load:
    working < 60kg → 2 sets (bar × 8, 60% × 5)
    60-100kg → 3 sets (40% × 8, 60% × 5, 80% × 3)
    > 100kg → 4-5 sets (bar × 8, 40% × 5, 60% × 3, 75% × 2, 88% × 1)
  Never to failure on warmup sets.
- Rest seconds by role: compound 180, accessory 120, isolation 75, rehab_primer 30-45.
- RIR targets by training_age: novice 2-3, intermediate 1-3 (tightening across block), advanced 0-2.
- For each muscle group, weekly hard-set count in work sets (exclude warmups) must land within
  the architecture's volume_targets band.
- Hit each muscle >=2x per week whenever sessions_per_week >= 3.
- Never schedule the same major muscle on consecutive days; 48h recovery between hard sessions for
  the same muscle; 72h between heavy compound days for squat or deadlift pattern.
- Day-of-week assignment rules from the current prompt (preserved).
- Each session gets a rationale field (<=280 chars): mention the user by name, state the session's
  goal, and note injury accommodations if any.
- status = "upcoming" for every session.
- length_weeks = {weeks} exactly.

COACH RATIONALE:
{rationale json}

ARCHITECTURE:
{architecture json}

EXERCISE POOL ({n} entries; each has id, name, primaryMuscles, equipment, role):
{pool json}

USER PROFILE (for naming, session rationale phrasing, and sanity):
{profile json summary}

Return JSON matching the mesocycle schema. No prose outside the JSON.
```

### Pass 5: Validation + auto-fix (~20s when fix needed)

Deterministic lint first. If any violations found, feed them to Gemini with a "fix these issues" prompt. Else pass through.

**Lint rules (run in `src/lib/validateMesocycle.ts`):**
1. Every muscle group hits >= architecture.volume_targets[muscle].min in weeks 1 through N-1 (deload exempt).
2. No banned exercises for any injury flag (double-check against `injuryRules.ts`).
3. Every compound lift in a session has a warmup_sets array matching the scaling rule.
4. Every exercise has a rest_seconds matching its role tag.
5. No two sessions on the same day-of-week.
6. 48h muscle recovery honored; 72h for squat/deadlift pattern.
7. Week N is a valid deload (sets cut 40–50% vs week N-1, intensity preserved).
8. Every session has a rationale <=280 chars.
9. library_id references exist in the pool; names match verbatim.
10. RIR targets progress correctly across the block for the given training_age.

**Auto-fix prompt (only invoked if lint finds violations):**
```
You are a strength coach fixing a plan. The user's profile and coach rationale are below.
The plan you wrote has these violations:

VIOLATIONS:
{bullet list of lint errors, each referencing session index + exercise index}

Fix ONLY these violations. Do not change anything else. Preserve all IDs, day-of-week assignments,
exercise selection where not violated, and session structure.

Return the full corrected mesocycle JSON.

ORIGINAL PLAN:
{mesocycle json}
```

Max 1 retry; if second attempt still fails lint, throw a user-facing error with diagnostics + offer a retry button.

### Pass 6: Personalized session rationales

Cheapest path: bake into Pass 4's prompt (it already asks for rationale with user's name). Only run a separate call if user tier permits and rationales come back generic (detectable via lint: rationale must include profile.firstName OR profile.goal OR an injury note).

**Prompt (if invoked separately):**
```
Rewrite each session's rationale to be specific to this user. Each rationale must:
- mention the user's name ("{firstName}")
- state the session's primary goal
- if the user has an injury flag, reference how this session accommodates it
- be <=280 characters
- feel like a coach, not marketing copy

PROFILE SUMMARY:
{name, goal, injuries}

SESSIONS:
{array of {id, focus, exercises}}

Return {sessions: [{id, rationale}]}. No other changes.
```

---

## Onboarding redesign

### Hard questions (cannot skip — safety/feasibility)

| Field | Schema | Why required |
|-------|--------|--------------|
| `sessions_per_week` | int 1–7 | Architecture table needs it |
| `equipment` | array of Equipment enum, min 1 | Pool filter blocks without this |
| `time_budget_min` | int 15–180 | Session length cap |
| `injuries` | array of InjurySchema (may be empty), but user must see the question | Safety-critical |
| `age` | int 13–99 | Volume calibration + older-adult overlay (R1 P20) |
| `sex` | enum | Load-increment defaults |
| `weight_kg` | number | For %1RM estimates + load prescription |

### Optional questions (defaulted if skipped)

| Field | Schema | Default |
|-------|--------|---------|
| `goal` | Goal enum (7 options: build_muscle, get_strong, lean_and_strong, fat_loss, mobility, athletic, general) | `general` |
| `muscle_priorities` | array of MuscleGroup | `[]` (balanced) |
| `aesthetic_preference` | free text <= 200 chars | `""` |
| `specific_target_text` | free text <= 500 chars, e.g., "run a 5K in 22 min" | `""` |
| `exercise_dislikes` | array of ExerciseId | `[]` |
| `training_age_months` | int 0–600 | `0` (novice) |
| `posture_notes` | free text <= 500 chars | `""` |
| `lbp_direction_preference` | enum: extension / flexion / neither / unknown | `unknown` — triggers in-app quiz if LBP flagged |
| `overhead_press_cleared` | bool | `true` unless shoulder.modify/avoid |
| `deep_knee_flex_cleared` | bool | `true` unless knee.modify/avoid |
| `cardio_goal` | bool | `false` |

### Progressive disclosure

- **Fast path (~90s):** hard questions only. Goal defaults to `general`. Training age defaults to novice. All sub-questions hidden. Pipeline runs with defaults — output is still safe and architecture-correct, just less bespoke.
- **Full path (~4 min):** hard questions + "want to personalize more?" toggle reveals optional section with smart gating:
  - Injury section with severity asked each → if knee.modify, ask "any swelling this week?" and "can you fully straighten?" (R4 P9 gates).
  - LBP flagged → directional preference quiz (R5 P6).
  - Shoulder flagged → overhead-clearance mini-screen (R6 P9).
- Same pipeline regardless of path. Fast-path users get a banner: "You can add more details in Settings to sharpen future plans."

---

## Settings screen

New route `/settings`. Sections:

1. **Profile** — edit any onboarding input. Editing a *major* field (goal, sessions_per_week, injury severity) surfaces "Regenerate plan" CTA. Editing a *minor* field (muscle priorities, dislikes, aesthetic notes) surfaces "Apply to next session" CTA (soft-adjust path).
2. **Appearance** — theme toggle: dark / light / system (default system). Reuse Lumo theme tokens from `project_workout_lumo_adoption.md`.
3. **Voice** — cheekiness level 0 / 1 / 2 (controls how cheeky the session rationales + copy are). Ties to the Lumo voice work.
4. **Demo video preference** — show / hide auto-playing demo videos on exercise cards.
5. **Data** — export (Dexie → JSON download) + import.
6. **Reset** — wipe plan + history; keep profile.
7. **About** — version, build hash, link to research docs, link to changelog.

---

## Profile amendment UX

- **Inline amend icons** on session cards: pencil icon opens a sheet with "Change session goal" / "Swap exercise" / "Skip this exercise this week." Swaps trigger a mini Pass 4 call (single session regen) with the rest of the plan frozen.
- **Regenerate plan banner** surfaces at the top of the Plan view whenever `profile.updated_at > plan.generated_at` AND the change was flagged as major. Banner dismissible but not silenceable.
- **Soft-adjust path** (for minor changes): persist the change, re-run Pass 4 *only for future sessions* (sessions with `status='upcoming'` and `intended_date > today`). Past and today's session untouched.
- **Full regen** (for major changes): Pass 1 → Pass 4 end-to-end. Old plan archived, new plan replaces it.

---

## Code surfaces to create / modify / delete

### New files
- `src/lib/programArchitecture.ts` — architecture lookup table + pure function. ~250 lines.
- `src/lib/injuryRules.ts` — injury matrix. ~300 lines.
- `src/lib/exercisePoolFilter.ts` — Pass 3 implementation. ~200 lines.
- `src/lib/validateMesocycle.ts` — Pass 5 lint rules. ~400 lines.
- `src/lib/pickResearchExcerpt.ts` — builds the Pass 1 excerpt. ~150 lines.
- `supabase/functions/generate/prompts/coachRationale.ts` — Pass 1 prompt builder. ~80 lines.
- `supabase/functions/generate/prompts/sessionGeneration.ts` — Pass 4 prompt builder (replaces current). ~150 lines.
- `supabase/functions/generate/prompts/fixViolations.ts` — Pass 5 fix prompt. ~50 lines.
- `supabase/functions/generate/prompts/rationaleRewrite.ts` — Pass 6 prompt. ~40 lines.
- `supabase/functions/generate/pipeline.ts` — orchestrator that runs all passes. ~300 lines.
- `src/components/onboarding/InjurySection.tsx` — injury flow with severity + mini-screens. ~250 lines.
- `src/components/onboarding/DirectionalPreferenceQuiz.tsx` — R5 P6 mini-quiz. ~120 lines.
- `src/components/onboarding/OverheadClearanceQuiz.tsx` — R6 P9 mini-screen. ~100 lines.
- `src/components/settings/SettingsScreen.tsx` — the new settings page. ~300 lines.
- `src/components/settings/RegeneratePlanBanner.tsx` — profile-diff-driven banner. ~80 lines.
- `src/data/freeExerciseDb.json` — bundled exercise DB (build-time import). ~3MB.
- `src/types/researchExcerpt.ts` — types for Pass 1 input. ~50 lines.
- `tests/programArchitecture.test.ts` — one test per cell. ~400 lines.
- `tests/injuryRules.test.ts` — ban/modify/favor rules. ~300 lines.
- `tests/validateMesocycle.test.ts` — lint rules. ~400 lines.
- `tests/pipeline.integration.test.ts` — golden-path end-to-end on fixture profiles. ~250 lines.

### Edited files
- `src/types/profile.ts` — extend `UserProgramProfileSchema` (new fields; see below). ~60 lines changed.
- `supabase/functions/generate/prompts/generatePlan.ts` — either replaced by `pipeline.ts` or left as a thin adapter. ~-70 / +20 lines.
- `supabase/functions/generate/index.ts` — invoke `pipeline.ts` instead of the old single prompt. ~30 lines changed.
- `src/components/onboarding/OnboardingFlow.tsx` — add new steps + progressive disclosure. ~200 lines changed.
- `src/state/profileStore.ts` — track `updated_at`, distinguish major vs minor field edits. ~80 lines changed.
- `src/components/plan/PlanView.tsx` — surface `<RegeneratePlanBanner>` + inline amend icons. ~120 lines changed.
- `src/lib/mesocycleSchema.ts` — add `warmup_sets`, `rest_seconds`, `rir_target` to exercise entries. ~40 lines changed.

### Deleted files
- None. Old `generatePlan.ts` kept as fallback until new pipeline is validated in staging for 2 weeks.

---

## Tasks (ordered, with dependencies)

Each task has: what | why | files | acceptance criteria. Execute top-to-bottom.

### Phase A — Foundation (no LLM work yet)

**Task 1. Port MASTER-SYNTHESIS architecture table into `programArchitecture.ts`.**
- *Why:* This is the deterministic backbone everything else depends on.
- *Files:* new `src/lib/programArchitecture.ts`.
- *Acceptance:* Pure function `lookupArchitecture({goal, training_age_months, sessions_per_week}) → ArchitectureSpec`. One unit test per non-trivial cell in the master table. Fallback behavior: if goal is unknown → `general`. If sessions_per_week is out of range → clamp to 2/6. If training_age_months is negative → treat as novice.

**Task 2. Port injury matrix into `injuryRules.ts`.**
- *Why:* Seeds both the pool filter and the prompt.
- *Files:* new `src/lib/injuryRules.ts`.
- *Acceptance:* `getInjuryRules(injury: Injury) → { ban: string[]; modify: Rule[]; favor: string[] }`. Tests cover every combination in the master table's injury matrix (knee/modify, knee/avoid, knee/chronic, lower_back/modify/avoid/chronic, shoulder/*, right_trap/modify, hip_flexor/modify, ankle/modify, neck/modify). `ban` entries use exercise-ID patterns that match free-exercise-db entries.

**Task 3. Bundle free-exercise-db at build time.**
- *Why:* Decision from `project_workout_tracker_direction.md` — ship offline-capable exercise library.
- *Files:* new `src/data/freeExerciseDb.json`, vite config updates.
- *Acceptance:* `import exercises from '@/data/freeExerciseDb.json'` yields typed array. Bundle size delta <4 MB gzipped.

**Task 4. Implement `exercisePoolFilter.ts`.**
- *Why:* Pass 3 of the pipeline.
- *Files:* new `src/lib/exercisePoolFilter.ts`.
- *Acceptance:* `filterPool(profile, architecture) → PoolEntry[]` returns 300–500 entries; zero banned exercises from user's injury flags; tagged with `role` (compound / accessory / isolation / rehab_primer); sorted by muscle-priority weight. Fixture tests for 5 sample profiles covering no-injury, knee.modify, LBP.chronic, shoulder.modify + knee.modify, bands-only.

**Task 5. Extend `UserProgramProfileSchema` with new fields.**
- *Why:* Onboarding redesign + pipeline need these fields.
- *Files:* `src/types/profile.ts` (edit).
- *Acceptance:* New fields: `age`, `weight_kg`, `muscle_priorities`, `aesthetic_preference`, `specific_target_text`, `exercise_dislikes`, `lbp_direction_preference`, `overhead_press_cleared`, `deep_knee_flex_cleared`, `cardio_goal`, `first_name`, `updated_at`. Zod validation + migration function `migrateProfileV1toV2(old) → new` that fills defaults. Existing stored profiles load without error.

### Phase B — Prompts & orchestrator

**Task 6. Write `pickResearchExcerpt.ts`.**
- *Why:* Pass 1 input — keeps excerpt under 4k tokens by picking only relevant sections.
- *Files:* new `src/lib/pickResearchExcerpt.ts`, copy of `00-MASTER-SYNTHESIS.md` as a structured YAML at `src/data/research-index.yaml` (or parsed at build time).
- *Acceptance:* Given a profile, returns a string with: (a) the user's architecture row, (b) the injury rows for every flagged injury, (c) volume landmarks for prioritized muscles, (d) warmup + rest blocks. Length <4000 tokens for any realistic profile. Snapshot tests on 5 fixture profiles.

**Task 7. Write `coachRationale.ts` prompt builder.**
- *Why:* Pass 1 prompt.
- *Files:* new `supabase/functions/generate/prompts/coachRationale.ts`.
- *Acceptance:* Function `buildCoachRationalePrompt(profile, excerpt) → string`. Prompt text exactly as specified above. Snapshot test matches fixtures.

**Task 8. Write `sessionGeneration.ts` prompt builder.**
- *Why:* Pass 4 prompt (replaces current).
- *Files:* new `supabase/functions/generate/prompts/sessionGeneration.ts`.
- *Acceptance:* Function `buildSessionGenerationPrompt(profile, rationale, architecture, pool, weeks) → string`. Covers HARD RULES from the template above. Snapshot tests for 3 profile variants.

**Task 9. Write `validateMesocycle.ts` (lint only, no LLM).**
- *Why:* Pass 5 determinism.
- *Files:* new `src/lib/validateMesocycle.ts`.
- *Acceptance:* `validateMesocycle(plan, architecture, pool, rules) → { ok: bool; violations: Violation[] }`. All 10 lint rules implemented. Unit tests feed intentionally-broken plans; each rule triggers exactly the right violation.

**Task 10. Write `fixViolations.ts` prompt builder.**
- *Why:* Pass 5 auto-fix invocation.
- *Files:* new `supabase/functions/generate/prompts/fixViolations.ts`.
- *Acceptance:* `buildFixPrompt(plan, violations) → string`. Cap prompt at 32k tokens (truncate pool references if needed).

**Task 11. Write `rationaleRewrite.ts` prompt builder (Pass 6 fallback).**
- *Why:* Generic-rationale fallback.
- *Files:* new `supabase/functions/generate/prompts/rationaleRewrite.ts`.
- *Acceptance:* Deterministically detects generic rationales (missing firstName, missing goal, missing injury reference when injury present) and only invokes LLM if needed.

**Task 12. Write `pipeline.ts` orchestrator.**
- *Why:* End-to-end execution.
- *Files:* new `supabase/functions/generate/pipeline.ts`.
- *Acceptance:* `runPipeline(profile, weeks) → Mesocycle`. Runs Pass 1 → 2 → 3 → 4 → 5 (+ fix if needed) → 6 (if generic). Emits structured telemetry per pass (timing, tokens, retries). Total latency under 180s on staging (p95). One retry max per LLM pass.

**Task 13. Rewire `supabase/functions/generate/index.ts` to use `pipeline.ts`.**
- *Why:* Activate the new pipeline.
- *Files:* `supabase/functions/generate/index.ts` (edit).
- *Acceptance:* Existing API signature preserved. Feature flag `use_pipeline_v2` on profile controls rollout. Flag defaults to true for new users, false for pre-existing users until they opt in.

### Phase C — Onboarding UI

**Task 14. Build `InjurySection.tsx` with severity + gated mini-screens.**
- *Files:* new `src/components/onboarding/InjurySection.tsx`, `DirectionalPreferenceQuiz.tsx`, `OverheadClearanceQuiz.tsx`.
- *Acceptance:* Adding an injury surfaces severity radio (ok/modify/avoid/chronic). Selecting a knee injury surfaces deep-flex-cleared + swelling questions. Selecting LBP surfaces directional-preference quiz. Selecting shoulder surfaces overhead-clearance quiz. All answers stored on profile. Tested with react-testing-library.

**Task 15. Update `OnboardingFlow.tsx` for progressive disclosure.**
- *Files:* `src/components/onboarding/OnboardingFlow.tsx` (edit).
- *Acceptance:* Fast path asks 7 hard questions, takes <90s median on staging. Full path extends with optional section, takes <4 min. Both paths pass Zod validation before submission. Analytics event `onboarding_completed` includes `{ path: 'fast'|'full', duration_ms }`.

### Phase D — Settings & amendment UX

**Task 16. Build `SettingsScreen.tsx` with sections.**
- *Files:* new `src/components/settings/SettingsScreen.tsx`, new routes.
- *Acceptance:* All 7 sections render. Edits persist to profileStore. Theme toggle works immediately (no refresh). Export downloads a valid JSON of full Dexie state.

**Task 17. Implement `RegeneratePlanBanner.tsx` and major-vs-minor diff logic.**
- *Files:* new `src/components/settings/RegeneratePlanBanner.tsx`, `src/state/profileStore.ts` (edit).
- *Acceptance:* profileStore emits diff events tagged `major` or `minor`. Banner shows on major diff. Clicking banner kicks off full regen via `pipeline.ts`. Minor diffs silently trigger a soft-adjust (Pass 4 only, upcoming sessions only).

**Task 18. Inline amend icons on session cards.**
- *Files:* `src/components/plan/PlanView.tsx` (edit), new `src/components/plan/SessionAmendSheet.tsx`.
- *Acceptance:* Pencil icon on each upcoming session. Sheet offers "Change session goal" / "Swap exercise" / "Skip this exercise this week." Swaps invoke single-session regen (Pass 4 constrained to that session). Past sessions hide the icon.

### Phase E — Testing & rollout

**Task 19. Write integration test `pipeline.integration.test.ts`.**
- *Files:* new `tests/pipeline.integration.test.ts`.
- *Acceptance:* 5 fixture profiles (novice-no-injury, intermediate-knee-modify, advanced-strength, LBP-chronic-+-shoulder-modify, bands-only-general). Each runs the full pipeline against the real Gemini API (staging key) and the resulting plan passes validation. Golden-file diffs allowed to vary in exercise selection but rest times / set counts / injury exclusions are locked.

**Task 20. Write migration for existing users.**
- *Files:* new `src/lib/profileMigration.ts`.
- *Acceptance:* On app boot, if a v1 profile is detected, run `migrateProfileV1toV2`. Default `age` to 30 if missing (marked `inferred=true` so Settings prompts user to confirm). Default `training_age_months` from old `training_age_months` field if present, else 0. Existing mesocycle is preserved; next regen uses v2 pipeline.

**Task 21. Add telemetry dashboard.**
- *Files:* new Supabase edge function logging, a simple `/admin/telemetry` page.
- *Acceptance:* Per-generation timing for each of the 6 passes, retry counts, lint violation frequencies, and user-facing error rate. Queryable by profile.goal and profile.injuries flags so we can see whether knee.modify users have higher fix-pass retry rates.

**Task 22. Staging rollout with feature flag.**
- *Acceptance:* 2-week staging test: all new signups → pipeline v2. Existing users opt in. Monitor telemetry daily. Success criteria: (a) p95 latency <200s, (b) validation fail rate <5% after 1 auto-fix, (c) no spike in user-reported "plan doesn't match my profile" tickets.

**Task 23. Production rollout + deprecate old prompt.**
- *Acceptance:* Flip default to v2 for 100% of users. Keep `generatePlan.ts` as fallback path (not deleted) for 30 days. Then delete.

---

## Risks / open questions

1. **Latency.** 2–3 min is long. If a pass times out (Gemini occasionally stalls), the whole generation fails. Mitigation: each pass has a per-call timeout; pipeline.ts catches and retries once; surfaces a "This is taking longer than usual — keep waiting or try again?" modal at 180s. Still, this is the biggest UX risk.

2. **Architecture table drift vs. Pass 1 coach reasoning.** If the coach rationale conflicts with the deterministic architecture (e.g., rationale recommends FB split but architecture cell says UL for this user), which wins? *Decision:* architecture wins. Pass 4 prompt explicitly says to honor architecture. Rationale is for *within-cell* personalization (volume bias, exercise preferences, injury accommodations).

3. **Pool size for bands-only / bodyweight-only users.** After filtering, pool may be <100 entries, limiting variety. Mitigation: loosen weighting step (step 5) when pool is small; never go below 80 entries.

4. **Injury combinations we haven't modeled.** The injury matrix covers single-flag combinations. Some users will have 3+ flags (Kyra: knee + LBP + right trap + hip flexors). Pool filter should intersect all `ban` lists cumulatively, but there's no explicit test that the resulting pool is still usable. Add a "pool too small" lint check in Pass 3: if pool <80 entries, fall back to a curated "minimal safe" seed list.

5. **Free-exercise-db coverage.** It's ~800 exercises but may miss some rehab-specific items the injury matrix references (e.g., Spanish squat, TKE band, Copenhagen side plank). Mitigation: audit the matrix against the DB in Task 4 acceptance; add a small curated JSON (~50 entries) of rehab-specific exercises at `src/data/rehabExerciseSupplement.json` that gets merged into the pool.

6. **Pass 1 hallucinating principle citations.** If the coach cites "R7 P3" (doesn't exist) we'll accept it. Mitigation: add a lint step after Pass 1 that regex-validates citations against known principle IDs; re-prompt if any citation is invalid.

7. **Session-level rationale quality.** Pass 6 is a backstop for generic rationales, but it won't fix rationales that are specific-but-wrong. No clean mitigation; rely on telemetry + user feedback.

8. **Migration of existing users.** Some fields (age, weight) we're newly requiring. If we backfill with defaults, the next plan will be slightly wrong for those users until they visit Settings. Decision: show a non-dismissible banner on their next app open: "We improved how plans are built. Confirm a few details so we can tailor your next plan." Banner goes away once `inferred=false` on all fields.

9. **Cost.** 4 Gemini Flash calls per generation × user base. Flash is cheap (~$0.075/1M input tokens) but needs monitoring. Rough estimate: <$0.02 per plan generation. Acceptable.

10. **Research-doc excerpt staleness.** If `00-MASTER-SYNTHESIS.md` changes, `pickResearchExcerpt.ts` must track it. Decision: parse the master synthesis at build time into `src/data/research-index.json`; fail build if schema doesn't match expected structure. Single source of truth (the .md) stays human-editable.

---

*End of implementation plan.*
