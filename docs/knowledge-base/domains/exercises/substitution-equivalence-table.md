---
id: substitution-equivalence-table
type: pattern
domain: exercises
title: "Exercise substitutions — what's equivalent for the same stimulus"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, fat_loss]
  training_age: any
  sex: any
  injuries: [knee, lower_back, shoulder, hip, meniscus]
tags: [substitution, swap, equipment-flex, injury-modification, stimulus-equivalence, replan]
citations:
  - "Haugen ME, et al. Effect of free-weight vs. machine-based strength training on maximal strength, hypertrophy and jump performance: a systematic review and meta-analysis. BMC Sports Sci Med Rehabil. 2023;15(1):103."
  - "Schoenfeld BJ, et al. Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men. Med Sci Sports Exerc. 2019;51(1):94-103."
  - "Pelland JC, Robinson ZP, Remmert JF, et al. Quantification of inter-set indirect work and effective set volume in muscle hypertrophy. Sports Med 2025 (volume-counting indirect work)."
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization, 2017 (stimulus-to-fatigue ratio framework)."
related: [compound-vs-isolation-taxonomy, machine-vs-free-weight-progression, squat-variants-knee-friendly, deadlift-variants-back-friendly, hip-thrust-glute-priority]
contradicts: []
---

# Exercise substitutions — what's equivalent for the same stimulus

## Claim

When the engine substitutes an exercise (because of injury, missing equipment, user dislike, or repeated mind-muscle misses), the substitute should produce **equivalent stimulus for the intended target muscle / pattern**. This table catalogues the canonical substitutions used by the replan logic.

**Core principle:** substitution preserves the *primary stimulus* (which muscle is doing the work) and the *primary stimulus profile* (heavy compound vs accessory vs isolation) at the cost of secondary characteristics (specific bar path, exact ROM, modality). If a substitute can't preserve those two dimensions, it's not equivalent — it's a different exercise, and the engine should re-plan rather than swap.

## Substitution table

### Squat pattern

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Back squat (`back_squat`) | Heel-elevated back squat (`heel_elevated_barbell_back_squat`) | Ankle ROM limit; same quad + glute stimulus |
| Back squat | Goblet squat (`goblet_squat_light`) | No rack / no barbell available; lighter quad stimulus, full hip-hinge teaching value preserved |
| Back squat | Leg press (`leg_press_narrow_rom` or `ex-leg-press`) | Knee or back flag; quad stimulus preserved, glute stimulus reduced |
| Back squat | Hack squat (when added) | Back flag; quad emphasis preserved, lower back removed |
| Back squat | Bulgarian split squat (`bulgarian_split_squat_loaded`) | No rack available; quad + glute preserved, unilateral, **NOT knee-friendlier** for patellofemoral patients (caveat) |
| Bulgarian split squat | Reverse lunge (`reverse_lunge_loaded`) | If front-knee discomfort; lateral/sagittal movement preserved |

### Hinge pattern

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Conventional deadlift | Trap-bar deadlift (`trap_bar_deadlift_moderate`) | Lower back stress reduction; posterior chain + grip preserved, slight quad bias added |
| Conventional deadlift | Romanian deadlift (`romanian_deadlift_moderate`) | Back flag (less spinal initiation); hamstring + glute emphasis preserved, lower-back demand reduced |
| Conventional deadlift | Sumo deadlift (when added) | Back flag (shorter ROM, more upright); posterior chain preserved with reduced shear |
| Romanian deadlift | Kettlebell hip hinge (`kettlebell_hip_hinge`) | Home gym / no barbell; hip-hinge pattern preserved, load reduced |
| Romanian deadlift | Cable pull-through (`ex-cable-pull-through`) | Early rehab; pattern preserved, spinal load minimal |
| Romanian deadlift | Back extension (`ex-back-extension`) | Acute back flag; posterior chain + glute preserved, spinal compression eliminated |

### Horizontal push (chest)

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Barbell bench press (`bench_press_moderate`) | Dumbbell bench press (`ex-dumbbell-bench-press`) | Shoulder flag (each arm independent); chest + tri preserved, load lighter per arm |
| Barbell bench press | Push-up + load (weighted vest or band) | No gym / home only; chest + tri + serratus preserved, load capped by bodyweight |
| Barbell bench press | Floor press (`ex-floor-press`) | Shoulder flag (limited ROM at bottom); chest + tri preserved, ROM reduced to protect shoulder |
| Barbell bench press | Machine chest press (`ex-chest-press-machine`) | Returning lifter / older lifter / shoulder flag; chest + tri preserved, stabilization removed |
| Bench press | Incline dumbbell press (`incline_dumbbell_press_neutral_grip`) | Shoulder flag (neutral grip is shoulder-friendlier); upper chest + delt emphasis, lower chest reduced |

### Vertical push (shoulders)

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Barbell overhead press (`overhead_barbell_press_moderate`) | Dumbbell shoulder press (`overhead_dumbbell_press`) | No barbell / shoulder flag; delt + tri preserved, easier on shoulder rotation |
| Barbell OHP | Neutral-grip DB shoulder press (`dumbbell_shoulder_press_neutral_grip`) | Shoulder flag (impingement risk); delt preserved with neutral grip |
| Barbell OHP | Landmine press (`landmine_press`) | Shoulder flag (oblique press angle); delt + tri preserved, less overhead ROM demand |
| Barbell OHP | Seated machine shoulder press (`ex-shoulder-press`) | Stability removal; delt preserved fully |

### Horizontal pull (back)

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Barbell bent-over row | Chest-supported row (`chest_supported_row`) | Lower back flag; mid-back + lat preserved, lumbar load removed — NOT a session main lift, see [chest-supported-not-compound](chest-supported-not-compound.md) |
| Barbell bent-over row | Single-arm DB row (`ex-dumbbell-row`) | No barbell / asymmetry work; lat + mid-back preserved unilaterally |
| Barbell bent-over row | Seated cable row (`seated_cable_row`) | Home / lower-back flag; mid-back preserved, hinge demand removed |
| Cable / machine row | Inverted row (bodyweight) | No machine; mid-back + lat preserved at bodyweight load |

### Vertical pull (lats)

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Pull-up (`pullup_full`) | Assisted neutral-grip pull-up (`neutral_grip_pullup_assisted`) | Bodyweight too heavy; lat + bicep preserved at reduced load |
| Pull-up | Lat pulldown (`ex-lat-pulldown`) | No pull-up bar / strength building toward pull-up; lat + bicep preserved at adjustable load |
| Pull-up | Lat pulldown neutral grip | `'missed'` mind-muscle signal on pronated grip; lat preserved with better connection (see [lat-pulldown-cueing](lat-pulldown-cueing.md)) |

### Glute work

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Barbell hip thrust (`ex-hip-thrust`) | Hip thrust machine (`ex-hip-thrust-machine`) | Setup-friction reduction; same glute max stimulus, easier load |
| Barbell hip thrust | Glute bridge bodyweight (`ex-glute-bridge-bodyweight`) | Early stage / no equipment; pattern preserved, load reduced — not equivalent at advanced loads |
| Barbell hip thrust | Single-leg hip thrust (`ex-single-leg-hip-thrust`) | Asymmetry; glute stimulus preserved unilaterally |
| Hip abduction machine | Banded clamshell (`banded_clamshell`) + lateral walk | No machine; glute med stimulus preserved at lower load, requires more form vigilance (see [hard-to-feel-exercises-catalog](hard-to-feel-exercises-catalog.md)) |

### Hamstrings

| Original | Substitute (with reason) | Equivalent for |
|---|---|---|
| Seated leg curl (`seated_leg_curl`) | Lying leg curl (`ex-leg-curl`) | Machine availability; hamstring preserved, slight emphasis shift |
| Seated leg curl | Nordic hamstring curl assisted (`nordic_hamstring_curl`) | No machine; eccentric hamstring emphasis preserved, harder skill |
| Leg curl | Single-leg RDL (`ex-single-leg-rdl`) | No leg curl machine; hamstring eccentric + glute preserved with hinge bias |

### Patterns that should NOT be substituted (re-plan instead)

- **Compound for an isolation** of the same muscle (e.g., "no bench? do tricep pushdown" — different stimulus profile, not equivalent).
- **Lower body for upper body** or vice versa.
- **Heavy compound for cardio** (e.g., "knee pain? walk instead of squat" — different stimulus, not a swap; it's a session-level decision).
- **Multi-joint hinge for multi-joint squat** (e.g., RDL for back squat — both lower body but completely different patterns).

When the user requests a swap that crosses these lines, the engine should ask before doing — and the LLM nuance copy should explain why ("RDL isn't a squat substitute; if your knee can't squat today, we can sub in leg press or do an extra hinge / glute day instead").

## Nuance

- **"Equivalent" is a stimulus claim, not a 1:1 claim.** Trap-bar deadlift is equivalent to conventional deadlift *as posterior-chain compound stimulus*, but not equivalent *as a 1RM strength test*. The substitution is appropriate when the user's goal is hypertrophy / general strength; less appropriate when the user is peaking for a powerlifting test.
- **Load doesn't always transfer.** When swapping a barbell row for a chest-supported row, the absolute load will likely be lower on the supported version (no trunk stabilization → arms are the bottleneck). The engine should reset load on substitution, not carry the prior weight forward.
- **Mind-muscle preservation matters.** If the user has finally found the lat on the lat pulldown after 4 sessions, swapping to the pull-up resets the connection. The mind-muscle signal should *gate* substitution — don't move them off a working exercise.
- **The Pelland 2025 indirect-work quantification matters here.** When substituting a compound for a different compound, both train multiple muscles indirectly. The volume accounting should track which muscles are getting how much indirect work in the new exercise vs the old.

## Application in this app

- **Replan logic** when the engine swaps an exercise:
  1. Identify the source exercise's role tag (`main lift` / `accessory` / `isolation` / `rehab` / etc).
  2. Identify the source exercise's primary muscle group.
  3. Filter the variant pool to candidates matching both role + primary muscle that the user's equipment + injury profile permits.
  4. Among candidates, prefer the one that preserves modality (machine → machine when possible; free-weight → free-weight when possible) UNLESS the user's mind-muscle history suggests a modality change is needed.
  5. Reset the suggested load on the new exercise (drop one notch from the user's history with anything in the same family, or use `first-time` if no history).
- **LLM nuance copy** when explaining a substitution:
  - "We swapped barbell squat for leg press because your knee flag is acute — leg press loads the quads without the deep flexion that's bothering the meniscus."
  - "Switching the pronated lat pulldown to neutral grip — you flagged 'didn't feel it' twice in a row. Neutral grip is often easier to connect to the lats."
  - Do NOT say: "do RDL instead of squats" (cross-pattern); "machines are easier, so we're scaling down" (modality framing).
- **Substitution audit log:** every swap should be loggable with the reason (engine signal: injury / equipment / mind-muscle / user-request). The LLM should NOT silently swap without a reason that can be explained back to the user.
