---
id: bodyweight-progression-paths
type: principle
domain: exercises
title: "Bodyweight progressions — how to progress when you can't add a plate"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [bodyweight, progression, pull-up, dip, push-up, pistol-squat, negatives, assisted, banded, partial-ROM, weighted, autoProgress]
citations:
  - "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-Analysis. J Strength Cond Res. 2017;31(12):3508-3523. (Low-load near-failure produces hypertrophy equivalent to high-load — relevant for bodyweight progressions.)"
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49."
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization, 2017. (Double-progression framework for bodyweight movements.)"
  - "Wackerhage H, Schoenfeld BJ, Hamilton DL, Lehti M, Hulmi JJ. Stimuli and sensors that initiate skeletal muscle hypertrophy following resistance exercise. J Appl Physiol. 2019;126(1):30-43. (Mechanical tension as primary hypertrophy driver — applicable across loading modalities.)"
  - "Mike J, Cole N, Herrera C, et al. The effects of eccentric contraction duration on muscle strength, power production, vertical jump, and soreness. J Strength Cond Res. 2017;31(3):773-786. (Eccentric / negative-only training.)"
related: [progressive-overload, lat-pulldown-cueing, machine-vs-free-weight-progression, double-progression]
contradicts: []
---

# Bodyweight progressions — how to progress when you can't add a plate

## Claim

Bodyweight exercises (pull-up, dip, push-up, pistol squat, inverted row, hanging leg raise) require a progression framework that does not depend on adding load. The canonical progression sequence — applied to any bodyweight movement — is:

1. **Negatives only** — jump or assist to the top, control the lowering phase as long as possible (3-5 seconds eccentric). Builds tendon strength + neural pattern without requiring the concentric.
2. **Assisted** — band, partner, or machine assistance to complete the concentric.
3. **Banded** — band looped under the lifter for partial-load offload. Less assistance than assisted-machine; load increases as band returns to neutral length (the variable-resistance feature of bands).
4. **Partial-ROM** — full bodyweight, but reduced range of motion (chin above bar in pull-up, half-depth dip). Builds strength at one end of the ROM.
5. **Full-ROM** — full bodyweight, full range of motion.
6. **Weighted** — add load via weight belt, vest, or dumbbell between feet.

This is encoded as the `autoProgress` bodyweight rep-target pathway in `src/lib/planner/autoProgress.ts` (see "Application in this app" below).

## The path, exercise-by-exercise

### Pull-up

| Stage | Exercise / Variant | Trigger to advance |
|---|---|---|
| 1 | Negative-only pull-up (jump to top, 3-5s eccentric × 3-5 reps) | Can hold 5s at top × 3 reps cleanly |
| 2 | Lat pulldown machine at ≥75% bodyweight | 3 sets × 8-10 reps with `mind_muscle_felt='felt'` |
| 3 | Banded / assisted neutral-grip pull-up (`neutral_grip_pullup_assisted`) | 3 sets × 8 reps with light band |
| 4 | Banded pull-up, lower-resistance band | 3 sets × 8 reps |
| 5 | Bodyweight neutral-grip pull-up (`pullup_full` with neutral grip) | 3 sets × 5 reps clean |
| 6 | Bodyweight pronated pull-up (`pullup_full`) | 3 sets × 8 reps clean |
| 7 | Weighted pull-up | 3 sets × 8 reps bodyweight, then add 5 lbs |

This is the path documented in [lat-pulldown-cueing](lat-pulldown-cueing.md). The mind-muscle signal gates progression — don't move forward until the lats are firing.

### Dip

| Stage | Exercise | Trigger to advance |
|---|---|---|
| 1 | Bench dip / tricep dip with feet on floor (`ex-tricep-dip`) | 3 sets × 12 reps |
| 2 | Bench dip with feet elevated | 3 sets × 12 reps |
| 3 | Assisted parallel-bar dip (band or machine) | 3 sets × 8 reps |
| 4 | Banded parallel-bar dip (lighter band) | 3 sets × 8 reps |
| 5 | Bodyweight parallel-bar dip | 3 sets × 5 reps |
| 6 | Bodyweight parallel-bar dip | 3 sets × 10 reps |
| 7 | Weighted dip | 3 sets × 10 bodyweight, then add 5-10 lbs |

### Push-up

| Stage | Exercise | Trigger to advance |
|---|---|---|
| 1 | Wall push-up | 3 sets × 12 reps |
| 2 | Incline push-up (hands on bench) | 3 sets × 12 reps |
| 3 | Knee push-up | 3 sets × 12 reps |
| 4 | Full push-up (`ex-pushup`) — paused at bottom | 3 sets × 8 reps |
| 5 | Full push-up | 3 sets × 12 reps |
| 6 | Decline push-up (feet elevated) | 3 sets × 12 reps |
| 7 | Weighted push-up (vest, plate on back) OR one-arm progressions | 3 sets × 12 bodyweight |

### Pistol squat (single-leg squat)

| Stage | Exercise | Trigger to advance |
|---|---|---|
| 1 | Bodyweight squat full ROM | 3 sets × 12 reps |
| 2 | Split squat or Bulgarian split squat bodyweight | 3 sets × 12 reps each side |
| 3 | Box-supported pistol (lower onto a box, then stand) | 3 sets × 6 reps each side |
| 4 | Counterweighted pistol (hold a 5-15 lb weight as counterweight) | 3 sets × 5 reps each side |
| 5 | Assisted pistol (TRX / band / pole grip) | 3 sets × 6 reps each side |
| 6 | Full pistol squat | 3 sets × 5 reps each side |
| 7 | Weighted pistol (light DB) | 3 sets × 5 with bodyweight, then add load |

Note: pistol squat is **not knee-friendly** for users with patellofemoral pain or meniscus issues. Don't push this progression on users with knee flags — use Bulgarian split squat or loaded reverse lunge instead.

### Inverted row (bodyweight pulling, when no pull-up bar)

| Stage | Exercise | Trigger to advance |
|---|---|---|
| 1 | Inverted row, bar at hip height (more vertical body angle) | 3 sets × 12 reps |
| 2 | Inverted row, bar lower (body more horizontal) | 3 sets × 12 reps |
| 3 | Feet-elevated inverted row | 3 sets × 12 reps |
| 4 | One-arm inverted row | 3 sets × 6 reps each side |

### Hanging leg raise (core)

| Stage | Exercise | Trigger to advance |
|---|---|---|
| 1 | Lying leg raise (`ex-leg-raise`) | 3 sets × 15 reps |
| 2 | Hanging knee raise (`ex-hanging-knee-raise`) | 3 sets × 12 reps |
| 3 | Hanging straight-leg raise | 3 sets × 8 reps |
| 4 | Toes-to-bar | 3 sets × 5 reps |

## The autoProgress bodyweight pathway (engine logic)

The engine's `computeBodyweightRepTarget()` function in `src/lib/planner/autoProgress.ts` handles within-stage rep progression. The logic mirrors the weighted progression but moves the rep TARGET instead of the weight:

- **'easy' or 'solid' + ceiling reps cleared** → `add-rep`, target = ceiling + 1
- **'tough' + ceiling cleared OR 'easy'/'solid' + only floor cleared** → `hold`, target = ceiling (keep trying)
- **'failed' OR target not met** → `hold`, target = ceiling
- **Two consecutive misses (two-strike rule)** → `drop`, target = floor (reset)

This means: a user prescribed `pull_up: 3 sets of 6-10 reps` who hits 10 / 10 / 10 with a 'solid' rating will see the next session prescribed as 3 sets of 6-11 reps (target=11). They graduate to the next stage (Stage 5 → 6 in the pull-up table) when they consistently hit the stage's required rep count.

`weight: 0` is the bodyweight sentinel — there's no load to prescribe. `rep_target` carries the recommendation.

**Stage progression** (Stage 3 → Stage 4, etc.) is NOT automatic in the engine yet — currently the variant assignment is per-session and stage advancement is implicit in the planner's exercise pool. Engineering follow-up: encode the per-exercise stage as state on the user profile + an `advanceStage()` trigger when the trigger criteria above are met.

## Nuance

- **Bodyweight progressions are SLOWER than weighted progressions.** A user adding 2.5 lbs to their squat each week sees linear progress; a user moving from "assisted pull-up" to "bodyweight pull-up" might take 6-12 weeks. The engine should set expectations: "pull-ups take time. We're building toward it."
- **The eccentric (negative) phase is the highest-stimulus portion** of any bodyweight exercise (Mike 2017 confirmed eccentric-only training produces strength + hypertrophy at lower volumes). Stage 1 (negatives only) is real training, not just a placeholder.
- **Adding reps does NOT equal "low-load training" forever.** Schoenfeld 2017 confirmed that low-load near-failure produces hypertrophy equivalent to high-load. But there's a practical ceiling — 30+ reps per set is enormously time-consuming and the local fatigue dominates the systemic stimulus. When a user can do 3 sets of 20+ push-ups, the appropriate move is to harder variants (Stage 6 → 7), not 3 sets of 30.
- **Band assistance has a variable-resistance curve.** A band stretched at the bottom of a pull-up provides MORE assistance at the bottom and LESS at the top. This is actually pedagogically nice — the user gets the most help where they're weakest (dead-hang). Weight-stack assistance (lat pulldown machine, Gravitron) is *constant* through the ROM, which is mechanically different.
- **Pull-up grip variants matter.** Neutral-grip pull-up is easier than pronated and engages biceps more; chin-up (supinated) is easier than pronated and engages biceps most. The progression often goes neutral → pronated → wide-grip pronated. This is encoded in the lat-pulldown-cueing entry.

## Application in this app

- **`computeBodyweightRepTarget()`** handles within-stage rep target progression. The engine treats `weight: 0` as the bodyweight sentinel and progresses `rep_target` instead of load.
- **Stage progression** (variant assignment) is currently planner-driven. The engine selects from the variant pool based on user profile. Engineering follow-up: encode `stage_progression` state per-exercise per-user, with auto-advancement when trigger criteria are met for 3+ consecutive sessions.
- **Mind-muscle gate for pull-ups specifically:** the lat pulldown stage should not advance until the user logs `mind_muscle_felt='felt'` 3 times. Otherwise, the user is using arms-and-back-shrug to do pull-ups, which builds the wrong pattern.
- **LLM nuance copy:**
  - "Pull-ups take time to build. We're at the assisted-band stage now — you'll graduate to bodyweight when you're hitting 8 clean reps with the light band."
  - "Push-ups: the slow lowering (the eccentric) is doing most of the work. 3 seconds down, 1 second pause at the bottom — that's how this stage builds strength."
  - Do NOT say: "do as many push-ups as you can — quantity is the goal" (false; quality + progression is the goal). Do NOT skip stages because the user is impatient — partial-ROM pull-ups built on poor strength foundations become chronic-overuse patterns.
- **For users without a pull-up bar OR rings OR machine:** the inverted row progression substitutes for the pull-up progression. Stimulus profile differs (horizontal pull instead of vertical) but back stimulus is preserved.
