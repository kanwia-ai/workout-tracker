# Clinical Planner Architecture

**Author:** Claude + Kyra | **Date:** 2026-04-22
**Status:** Design — not built yet. Review before implementation.

---

## Problem

Current plan-gen is one giant Opus prompt doing everything: filtering by injury, scheduling, progression, session integration, warmup writing. That's expensive, fragile, and opaque. It also doesn't actually produce the kind of plan we want — plans that **progress you toward full loaded ROM**, not ones that just avoid an injury forever.

**Key insight driving this refactor:**
- Avoidance ≠ recovery. A meniscus plan needs to use heel-elevated goblets in wk1 and build toward back squats by wk6.
- The plan is **holistic** (4 days/week full program), not every-day rehab. Injury awareness is **session-scoped** — meniscus nuance matters on leg day, barely touches push day.
- Most of the "intelligence" here is clinical programming knowledge that can be encoded. The LLM's job is narrow translation, not from-scratch design.

## Architecture overview

```
┌─────────────────────────┐
│ 1. Profile Intake       │
│    (user free-text +    │
│    structured onboarding)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. Interpretation Pass  │  ← narrow LLM call, ONE TIME at onboarding/regen
│    Profile → Directives │    Outputs structured clinical flags
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 3. Rule-Based Planner   │  ← pure TypeScript, fully testable
│    Directives + Library │    No API calls. Deterministic.
│    → 6-week plan        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 4. Per-Session Warmup   │  ← narrow LLM call PER SESSION (cached)
│    Session + Injuries   │    Only fires when user starts a session
│    → 10-min targeted    │
└─────────────────────────┘
```

**Cost profile:**
- Step 2: one call per profile creation/major regen (~3k tokens in, ~1k out)
- Step 3: zero API cost
- Step 4: one call per session start, cached for re-entry (~500 tokens in, ~300 out)

On Llama via Groq: ~$0.01 for intake + ~$0.002 per session warmup. On Sonnet if quality needed: ~$0.05 intake + ~$0.01 per warmup.

---

## Component 1: Profile Interpretation Pass

**Role:** One LLM call that reads the full profile (onboarding answers + free-text notes) and outputs structured clinical directives. This is the only place clinical reasoning lives.

**Input:** `UserProgramProfile` + training-age-aware context
**Output:** `ProgrammingDirectives` (consumed by the rule planner)

### Output schema

```typescript
interface ProgrammingDirectives {
  // Goal-level interpretation
  goal: {
    aesthetic: 'athletic' | 'hypertrophy' | 'endurance' | 'general'
    primary_adaptation: 'strength_power' | 'size' | 'work_capacity' | 'mixed'
    rep_scheme_bias: {
      main_compounds: [number, number]   // e.g. [3, 6] for athletic
      accessories: [number, number]      // e.g. [6, 10]
      finishers: [number, number]        // e.g. [10, 15]
    }
    intensity_bias: string               // "heavy compounds + explosive accessories"
    cardio_policy: 'minimal' | 'separated' | 'integrated' | 'aggressive'
    // "separated" = never same day as legs; "minimal" = only finishers
  }

  // Session distribution for the week (ties to goal + days available)
  week_shape: {
    sessions_per_week: number
    template: SessionType[]             // e.g. ['lower_squat', 'upper_push', 'lower_hinge', 'upper_pull']
    session_spacing: 'alternating' | 'ppl' | 'upper_lower' | 'custom'
    cardio_days: ('standalone' | 'post_upper' | 'rest_day')[]
  }

  // Injury directives — session-scoped, not global
  injury_directives: InjuryDirective[]

  // Root-cause flags from notes/posture (LLM interprets chronic complaints)
  root_causes: RootCauseFlag[]

  // Weekly progression plan — how constraints loosen over the block
  progression: WeeklyProgression
}

interface InjuryDirective {
  source: string                        // "meniscus_medial_left"
  severity: 'acute' | 'rehab' | 'chronic'
  stage_weeks: number                   // weeks into rehab at plan start
  rationale: string                     // "user reports ongoing meniscus rehab"

  // Global — applies regardless of session type
  global_avoid: string[]                // ["pivoting_under_load_ballistic"]

  // Session-scoped modifications
  per_session_type: Partial<Record<SessionType, SessionDirective>>

  // How this constraint relaxes over the mesocycle
  progression_arc: Array<{
    week_range: [number, number]        // [1, 2]
    allowed_variants: string[]          // ["heel_elevated_goblet", "box_squat_high"]
    target_at_end: string               // "back_squat_body_weight"
  }>

  // End state
  recovery_target: string               // "full loaded ROM on back squat by week 6"
}

interface SessionDirective {
  priority_work: string[]               // ["hamstring_isolation_pre_squat"]
  modifications: string[]               // ["use_heel_elevated_squat_not_back_squat"]
  warmup_focus: string[]                // ["knee_ankle_hip_mobility", "reverse_treadmill_incline_10"]
  pair_with: string[]                   // ["spinal_decompression_after_axial"]
  avoid_on_this_session: string[]       // ["unilateral_pivoting", "ballistic_lunges"]
}

interface RootCauseFlag {
  observation: string                   // "chronic lower back pain reported"
  likely_cause: string                  // "quad dominance + weak glute med + hip flexor tightness"
  priority_work: string[]               // ["glute_med_activation", "hip_hinge_pattern"]
  avoid_under_load: string[]            // ["lumbar_flexion_with_load"]
  // Crucially: DON'T avoid the pattern entirely — address root cause
  do_not_ban: string[]                  // ["squat", "deadlift"]
  why_not_banned: string                // "back pain from weak glutes — strengthening cures it"
}
```

### Example: Kyra's profile

**Input (compact):**
```
{
  goal: "athletic body, strength + look lean",
  injuries: ["meniscus_medial_left_rehab_wk3", "chronic_lower_back", "chronic_right_trap", "hip_flexor_tightness"],
  posture_notes: "desk worker, tight hip flexors, knee clicks going deep",
  sessions_per_week: 4,
  active_minutes: 60,
  training_age_months: 24,
  equipment: ["full_gym"]
}
```

**Expected LLM output:**
```json
{
  "goal": {
    "aesthetic": "athletic",
    "primary_adaptation": "strength_power",
    "rep_scheme_bias": {
      "main_compounds": [3, 6],
      "accessories": [6, 10],
      "finishers": [10, 15]
    },
    "intensity_bias": "heavy compounds + explosive accessories, moderate volume",
    "cardio_policy": "separated"
  },
  "week_shape": {
    "sessions_per_week": 4,
    "template": ["lower_squat_focus", "upper_push", "lower_hinge_focus", "upper_pull"],
    "session_spacing": "upper_lower",
    "cardio_days": ["rest_day"]
  },
  "injury_directives": [
    {
      "source": "meniscus_medial_left_rehab_wk3",
      "severity": "rehab",
      "stage_weeks": 3,
      "rationale": "user reports active meniscus rehab, 3 weeks in. progressing to loaded variants.",
      "global_avoid": ["pivoting_under_load", "ballistic_lunges", "deep_jumping"],
      "per_session_type": {
        "lower_squat_focus": {
          "priority_work": ["hamstring_isolation_pre_squat", "glute_med_activation"],
          "modifications": ["heel_elevated_goblet_wk1_2", "front_squat_wk3_4", "back_squat_wk5_6"],
          "warmup_focus": [
            "reverse_incline_walking_5min_speed_1_incline_10",
            "knee_ankle_hip_mobility_10min",
            "terminal_knee_extensions_banded"
          ],
          "pair_with": ["lying_leg_pullover_spinal_decompression_after_squat"],
          "avoid_on_this_session": ["unilateral_pivoting", "plyometric_bounds"]
        },
        "lower_hinge_focus": {
          "priority_work": ["glute_activation", "hamstring_eccentrics"],
          "modifications": ["trap_bar_dl_before_barbell_dl"],
          "warmup_focus": ["hip_hinge_pattern", "glute_bridge_march"],
          "pair_with": [],
          "avoid_on_this_session": ["heavy_cleans", "snatches"]
        }
      },
      "progression_arc": [
        { "week_range": [1, 2], "allowed_variants": ["heel_elevated_goblet", "box_squat_high"], "target_at_end": "goblet_squat_full_depth_BW*0.5" },
        { "week_range": [3, 4], "allowed_variants": ["front_squat_moderate", "heel_elevated_barbell"], "target_at_end": "front_squat_BW*0.6" },
        { "week_range": [5, 6], "allowed_variants": ["back_squat"], "target_at_end": "back_squat_BW*0.8_pain_free" }
      ],
      "recovery_target": "pain-free back squat at BW*0.8 by end of block"
    },
    {
      "source": "chronic_lower_back",
      "severity": "chronic",
      "stage_weeks": 52,
      "rationale": "chronic LBP tied to desk posture + tight hip flexors. address root cause.",
      "global_avoid": ["lumbar_flexion_under_load", "jefferson_curl_untrained"],
      "per_session_type": { ... }
    }
  ],
  "root_causes": [
    {
      "observation": "chronic lower back pain + desk job + tight hip flexors",
      "likely_cause": "quad/hip-flexor dominance + underactive glute med + poor hip hinge pattern",
      "priority_work": ["glute_med_isolation", "hip_hinge_patterning_light", "couch_stretch_daily"],
      "avoid_under_load": ["spinal_flexion_compressed"],
      "do_not_ban": ["deadlift", "squat", "RDL"],
      "why_not_banned": "back pain driven by weak glutes + tight hips; strengthening via hinge + abduction is the fix"
    }
  ],
  "progression": {
    "wk1_2": "accumulation, conservative loads, rehab-forward",
    "wk3_4": "intensification, introduce full-ROM variants",
    "wk5": "peak intensity, strength PR attempts on safe lifts",
    "wk6": "deload + reassess"
  }
}
```

### Prompt design

System prompt for the interpretation pass:

> You are a strength & conditioning coach with 20 years of rehab + hybrid-athlete programming experience. You are **not** designing the plan — you are translating a user's profile into structured clinical directives that a downstream rule engine will use to build the plan.
>
> Core principles you must apply:
> 1. **Avoidance ≠ recovery.** If the user has an injury, design a progression that builds toward full loaded ROM by end of block. Never permanently ban a pattern unless injury is actively acute.
> 2. **Root-cause first.** Chronic lower back pain is often weak glutes + tight hip flexors, not a spine problem. Interpret complaints at that level. Do NOT ban the lift; prescribe the corrective.
> 3. **Session-scoped, not global.** Meniscus nuance matters on leg day; don't hamstring the whole plan.
> 4. **Goal-aware.** "Athletic" ≠ "toned". Athletic = strength-power (3–6 reps main, low-moderate volume, explosive accessories). Toned = hypertrophy (8–12 reps). Don't conflate.
> 5. **Ground your injury progressions in published rehab protocols** (Mujika for return-to-training, knee rehab ACL/meniscus timelines, McGill for lumbar, Cook for shoulder).
>
> Output only valid JSON matching the `ProgrammingDirectives` schema. No prose.

User prompt template:
```
Profile:
{profile_json}

Return the directives JSON.
```

### Testing

This pass is THE critical point. Build a test corpus of **5–10 realistic profiles** with known-good expected outputs:
1. Kyra's actual profile (meniscus rehab + LBP + athletic)
2. Pure hypertrophy, no injuries, 5 days
3. Post-ACL 6 months, strength goal
4. Desk worker, chronic LBP, beginner, "get toned"
5. Powerlifting, cranky shoulder, strength goal
6. Running hybrid, knee clicky, endurance-lean goal

For each, hand-write the expected directives. Run the LLM. Diff the output. Score on semantic match, not string match.

This lets us iterate on the prompt **without touching plan generation at all**. Cheap loop.

---

## Component 2: Injury Progression Templates (data, not code)

Purpose: curated progression chains that the planner uses to pick the right variant per week per injury.

**Format:** YAML files under `src/data/rehab-protocols/`.

Example (`src/data/rehab-protocols/meniscus_medial.yaml`):
```yaml
name: Meniscus medial tear (post-acute, rehab phase)
citations:
  - Logerstedt 2010 JOSPT — knee rehab clinical practice guideline
  - Paterno 2014 — criteria-based progression for meniscus

# Progression gates — user advances when they meet the criteria, not on a fixed calendar
stages:
  - id: wk1_2_reintegration
    target_weeks: [1, 2]
    gate_criteria:
      - pain_under_3_of_10_during_session
      - full_active_ROM_unloaded
    allowed_main_lift_variants:
      - heel_elevated_goblet_squat
      - box_squat_high
      - split_squat_rear_foot_elevated_bodyweight
    banned:
      - back_squat
      - lunge_walking_loaded
      - jumping_landing
    warmup_protocol:
      - reverse_incline_walking: { speed: 1, incline: 10, duration_min: 5 }
      - terminal_knee_extensions_banded: { sets: 2, reps: 15 }
      - hip_ankle_mobility: { duration_min: 5 }
    rep_scheme_override: [8, 12]   # higher reps, lower load at this stage

  - id: wk3_4_loading
    target_weeks: [3, 4]
    gate_criteria:
      - pain_under_2_of_10
      - heel_elevated_goblet_BW*0.5_pain_free
    allowed_main_lift_variants:
      - front_squat_moderate
      - heel_elevated_barbell_back_squat
      - bulgarian_split_squat_light
    rep_scheme_override: [5, 8]

  - id: wk5_6_peak_return
    target_weeks: [5, 6]
    allowed_main_lift_variants:
      - back_squat_moderate_load
      - front_squat
      - lunge_loaded_forward
    rep_scheme_override: null     # follow goal's default

# Session-type specific accessory priorities
per_session_accessories:
  lower_squat_focus:
    priority:
      - hamstring_isolation_seated_leg_curl: "before main squat — antagonist activation"
      - glute_med: ["hip_abduction_machine", "banded_clamshell"]
    decompression_pair:
      - lying_leg_pullover: "after axial-load main lift"
  lower_hinge_focus:
    priority:
      - glute_med
      - hamstring_eccentric
```

**Why data, not code:** progression protocols come from clinical literature; they're stable knowledge. Curators (with LLM assistance for drafting) produce them once, they're versioned, reviewable, auditable. Code doesn't need to change when the meniscus protocol updates — just the YAML.

**Full protocol set (matches every onboarding option):**

Priority P0 — build first (highest prevalence + covers Kyra's profile):
1. Lower back (chronic non-specific LBP) — McGill, Nourbakhsh 2002, NASS guidelines
2. Left / right meniscus — Logerstedt 2010 JOSPT, Paterno 2014
3. Left / right shoulder (impingement, rotator cuff) — Cook 2013, Kibler 2006

Priority P1 — common gym presentations:
4. Left / right knee (patellofemoral pain, general anterior knee) — Crossley 2016
5. Hip flexors (desk-worker tightness pattern) — Sahrmann, Janda
6. Upper back (thoracic mobility, rhomboid / mid-trap weakness) — Sahrmann

Priority P2 — moderately common in lifters:
7. Left / right trap (scap dyskinesis, postural) — Kibler 2013
8. Elbow (medial / lateral epicondylitis) — Waseem 2013
9. Wrist (loaded push-up, bench pain) — general sports-med protocol

Priority P3 — less gym-critical but promised by onboarding:
10. Ankle (limited dorsiflexion, important for squat depth) — Kim 2015
11. Neck (postural / text-neck pattern) — Kim, Hanney

Priority P4 — handled differently:
12. "Other" → free-text LLM interpretation at profile-intake time. If the
    LLM can map the user's free-text to any P0–P3 protocol, use it.
    Otherwise, flag `matched_protocol: null`, surface in UI with "noted,
    being conservative, admin notified."

**Severity axis.** Each protocol handles all four onboarding severities
(avoid / modify / chronic / ok) without needing separate files:
- `avoid`: hard constraint — skip any exercise loading this part
- `modify`: use the protocol's week-by-week variant progression
- `chronic`: priority work = address root cause (antagonists, weak links)
- `ok`: sensible watch-outs, no aggressive plan changes

**Bilateral handling.** Left/right variants share a single protocol file
with unilateral flags in the directives (e.g. `left_meniscus` sets
`unilateral_side: "left"` so single-leg work adapts accordingly).

**Total scope:** 11 distinct protocol files + LLM fallback for "other."
Estimated ~2–3 days of clinical research + drafting at 2–3 hours per
protocol (source-reading, drafting, self-review).

---

## Component 3: Rule-Based Planner

Pure TypeScript. No API calls. Consumes `ProgrammingDirectives` + exercise library + progression protocols → produces a full 6-week `Mesocycle`.

**Module outline:**
```
src/lib/planner/
  index.ts              # entry: buildMesocycle(directives, library) → Mesocycle
  sessionShaper.ts      # picks session types per week based on directives.week_shape
  exerciseSelector.ts   # per-session: pick compound + accessories from library respecting directives
  progressionEngine.ts  # week-over-week load + variant progression
  integrationRules.ts   # cross-session: cardio placement, CNS load, recovery windows
  volumeBudgeter.ts     # per-muscle-group weekly set allocation by training age + goal
```

**Testing:** unit tests with fixed directives → expected plan structure. No LLM in the test loop. This means we can iterate on the planner for free — push, run `vitest`, done.

---

## Component 4: Per-Session Rehab Warmup

Fires when user starts a session. Narrow LLM call. Inputs: today's session focus + active injury directives + weekly progression stage. Output: a 5-10 min structured warmup (exercises + durations + cues).

**Cache key:** `${session_id}:warmup` — re-entering a session reuses the same warmup.

```typescript
async function generateSessionWarmup(
  session: PlannedSession,
  directives: ProgrammingDirectives,
  progressionState: { week: number, stage_id: string }
): Promise<StructuredWarmup> { ... }
```

System prompt snippet:
> Write a warmup for this session. Follow the injury directives for today's session type strictly — use the `warmup_focus` items. NOT stretching (that's post-workout). Emphasize mobility for the joints this session will load. 5–10 minutes max. Output structured JSON.

---

## Golden test case

**Kyra's friend's workout** (given verbatim, 2026-04-22) is the acceptance test. If the refactored system, given Kyra's real profile, produces something structurally like:

- Warmup with reverse-incline walking + targeted mobility (not generic stretching)
- Hamstring opener (leg curl) before squats
- Heel-elevated squats (not bans, modifies)
- Post-compound decompression exercise
- RDL same-load working sets (motor pattern)
- Hip abduction for glute-med

...then the system works. If it gives generic "goblet squat, lunge, leg press" with a generic cardio warmup, it doesn't.

This test stays in `tests/golden/kyra-leg-day.test.ts` and runs in CI.

---

## Implementation phases

**Phase 1: Interpretation pass (1–2 days)**
- Define `ProgrammingDirectives` types in `src/types/directives.ts`
- Build test corpus of 5–10 profiles with expected outputs in `tests/fixtures/directives/`
- Write the interpretation prompt
- Build `interpretProfile()` function that calls Groq/Llama (or Sonnet for initial dev)
- Iterate prompt until test corpus passes
- **Goal:** given any profile, get good directives back. No plans yet.

**Phase 2: Progression protocols (1 day)**
- Draft 6 YAML files for common injury protocols (cite sources)
- Schema + loader
- Test: fixtures pass validation, loadProtocol() returns well-formed data

**Phase 3: Rule-based planner (2–3 days)**
- Build the planner modules in `src/lib/planner/`
- Unit tests per module
- Integration test: directives + library → plan that hits golden test structure

**Phase 4: Session warmup (half day)**
- `generateSessionWarmup()` + caching + schema
- Golden test: Kyra's leg day → warmup includes reverse-incline walking + knee/ankle mobility

**Phase 5: Wire into edge function (half day)**
- Replace current monolithic prompt with orchestrator that runs: interpret → plan → cache
- Preserve old prompt as fallback flag

**Phase 6: Model migration (half day, optional)**
- Swap Anthropic SDK for Groq + Llama for narrow calls
- Keep Opus available as a fallback via env flag

Total: ~1 week of focused work. Each phase ends with passing tests and commit. **No plan generation runs against the LLM until Phase 5.**

---

## Open questions for Kyra

1. **Clinical review.** Who validates the progression protocols? You? A PT you trust? Or initial LLM-drafted + your review?
2. **Gate vs. calendar.** Real rehab progresses on criteria (pain level, ROM), not weeks. For MVP, do we use calendar weeks with a user-facing "I'm not ready to advance" toggle?
3. **Scope of injuries for v1.** 6 protocols feels right. Anything you specifically want in? (I have meniscus/ACL/LBP/shoulder/knee/desk-posture drafted above.)
4. **What to do with existing plans.** Users with a generated plan — do we re-run interpretation on their profile and re-plan, or leave old plans alone and apply only to new ones?
5. **Cost guardrail.** Put a per-user per-day rate limit on interpretation + plan regen (e.g. 3 regens/day). Agree?

---

## What this is NOT

- Not a replacement for clinical judgment. If you have an acute injury, see a PT.
- Not a guarantee of injury-free training. It's a well-reasoned default.
- Not over-engineered — each component is independently testable and rollbackable.
