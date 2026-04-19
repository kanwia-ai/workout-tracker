# Master Synthesis — Strength & Rehab Research

Cross-cutting distillation of R1–R6 (the six curated research docs in this folder). This file is the single source of truth the Gemini pipeline reads from; the program-architecture table, injury matrix, warmup/rest rules, and "do-not-codify" list here are all meant to be translated 1:1 into `src/lib/` modules or into the Gemini prompt.

Source doc shorthand used below:
- **R1** = `01-strength-hypertrophy.md` (20 principles)
- **R2** = `02-periodization-detraining.md` (15 principles)
- **R3** = `03-warmup-elite-technique.md` (18 principles)
- **R4** = `04-rehab-knee.md` (15 principles)
- **R5** = `05-rehab-spine.md` (15 principles)
- **R6** = `06-rehab-upper-lower.md` (18 principles)

Total input: 101 source principles. Below is what survived curation.

---

## The 7 non-negotiables (evidence-strong, codify as HARD rules)

These are the principles with (a) strongest convergent evidence across docs and (b) highest leverage on plan quality. Every generated plan MUST satisfy all seven or be rejected at the validation pass.

| # | Rule | Sources | Programming consequence |
|---|------|---------|-------------------------|
| 1 | **Progressive overload is non-negotiable — a variable must increase over time** | R1 P18, R1 P7–8, R2 P1, R2 P10 | Each exercise has a progression model (LP / double / DUP). Weeks 2–N of a block must specify what increases (load, reps, sets, or RIR). No "maintain" weeks mid-block except the deload. |
| 2 | **Volume drives hypertrophy within MEV→MRV landmarks (per muscle, per week)** | R1 P1, R1 P2, R3 P14 | Every generated week must hit MEV for each trained muscle group; accumulation weeks push toward MAV; nothing exceeds MRV. See landmarks table below. |
| 3 | **Hit each muscle 2x/week when feasible (≥3 sessions/week)** | R1 P5, R3 P14, R2 P2 | Weekly scheduler enforces 2× frequency whenever sessions_per_week ≥ 3. 1× frequency only allowed when weekly volume for that muscle <10 sets. |
| 4 | **Rest intervals scale by exercise role: compound 180s / accessory 120s / isolation 75s** | R3 P4 (Schoenfeld 2016), R1 P12 | Exercise library tags every entry with a role; the session renderer sets rest timer from the tag. No more legacy "60s for hypertrophy." |
| 5 | **Active warm-up before every session — RAMP structure, ramp sets on the main compound** | R3 P1, R3 P3, R3 P5 | Every session emits a warmup block (6–10 min: Raise + pattern-specific Mobilize + ramp sets). Ramp-set count scales with working weight (2/3/4–5 sets). Never zero. |
| 6 | **Take sets close to failure (0–3 RIR) but don't default to failure** | R1 P4, R2 P10, R1 P6 | Prescribe (load-target, RIR-target) pairs. Compounds 1–3 RIR; isolations 0–2 RIR. Novices prescribed via reps+load; intermediates+ get explicit RIR. |
| 7 | **Injury flags hard-gate exercise selection — filter the pool, don't just warn** | R4 all, R5 all, R6 all | The exercise pool sent to Gemini is pre-filtered by the injury matrix. Excluded exercises are simply not present in the pool, so Gemini cannot emit them. Severity-gated substitutions are deterministic, not LLM-discretionary. |

---

## Program architecture by goal × training_age × sessions_per_week

Deterministic lookup. This becomes `src/lib/programArchitecture.ts`. Goal mapping from the current `Goal` enum:

- `strength` → **get_strong**
- `glutes`, `aesthetics` → **build_muscle** (with muscle-priority overlay)
- `longevity`, `general_fitness` → **general**
- `rehab` → handled separately (rehab mode overrides this table; see R4/R5/R6)

Training-age buckets (from R1/R2):
- **novice** = 0–6 months consistent lifting
- **intermediate** = 6–24 months
- **advanced** = 24+ months

Cells use this shorthand:
- **Split**: FB = full-body, UL = upper/lower, PPL = push/pull/legs, ULUL = upper/lower 2×, BRO = body-part split
- **Volume** = hard sets/muscle/week (see landmarks section for per-muscle limits)
- **Intensity** = primary rep range
- **Progression**: LP = linear, DP = double progression, DUP = daily undulating, BLK = block
- **Deload cadence** = weeks between deloads (reactive if readiness triggers earlier — R2 P5)

### build_muscle (hypertrophy-first)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| novice | FB, 8–10 sets, 8–12 reps, LP, deload 10wk | FB, 10 sets, 8–12 reps, LP, deload 10wk | UL, 10–12 sets, 8–12, LP, deload 8wk | UL + arms, 12 sets, 8–12, LP→DP, deload 8wk | PPL, 12 sets, 8–12, DP, deload 6wk |
| intermediate | UL, 10 sets, 6–12 reps, DP, deload 6wk | FB or UL, 12 sets, 6–12, DP, deload 6wk | UL, 14–16 sets, 6–12, DP, deload 5wk | ULUL or PPL, 16–18 sets, 6–12, DP/DUP, deload 5wk | PPL or ULUL, 18–20 sets, 6–12, DUP, deload 5wk |
| advanced | UL, 12 sets, 6–12, DUP, deload 5wk | UL, 14 sets, 6–12, DUP, deload 5wk | UL, 16–18 sets, 6–12, DUP, deload 4wk | ULUL, 18–22 sets, 6–12 with 3–6 heavy day, DUP/BLK, deload 4wk | PPL or BRO, 20–25 sets, mixed rep ranges, BLK or DUP, deload 4wk |

### get_strong (strength-first)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| novice | FB, 8 sets, 3×5 main lifts, LP, deload 10wk | FB, 10 sets, 3×5 main + accessories, LP, deload 10wk | UL, 10 sets, 5×5 main + acc, LP, deload 8wk | UL, 12 sets, 5×5 + acc, LP, deload 8wk | not recommended for novice strength |
| intermediate | UL, 8–10 sets, 3–6 rep main / 6–10 acc, DP, deload 6wk | FB or UL, 10–12 sets, DUP (heavy/mod/vol day), deload 5wk | UL, 12–14 sets, DUP, deload 5wk | ULUL, 14–16 sets, DUP, deload 5wk | ULUL or PPL, 16–18 sets, DUP/BLK, deload 5wk |
| advanced | UL, 8 sets, 3–5 rep priority lifts, BLK, deload 4wk | UL, 10 sets, BLK, deload 4wk | UL + peaking, 12 sets, BLK, deload 4wk | ULUL, 14–16 sets, BLK or conjugate-lite, deload 4wk | ULUL, 16–20 sets, BLK, deload 4wk |

### lean_and_strong (hybrid; mapped from aesthetics + strength interest)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| novice | FB, 8 sets, 5–10 reps, LP, deload 10wk | FB, 10 sets, 5–10, LP, deload 10wk | UL, 12 sets, 5–12, LP→DP, deload 8wk | UL, 14 sets, 5–12, DP, deload 8wk | PPL, 14 sets, 5–12, DP, deload 6wk |
| intermediate | UL, 10 sets, 5–12 mixed, DP, deload 6wk | UL, 12 sets, DUP weekly, deload 6wk | UL, 14–16 sets, DUP, deload 5wk | ULUL, 16–18 sets, DUP, deload 5wk | PPL, 18 sets, DUP, deload 5wk |
| advanced | UL, 12 sets, DUP, deload 5wk | UL, 14 sets, DUP, deload 4wk | UL, 16 sets, DUP, deload 4wk | ULUL, 18–20 sets, DUP/BLK, deload 4wk | PPL/ULUL, 20–22 sets, BLK, deload 4wk |

### fat_loss (calorie-deficit training; protect strength, add density)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| novice | FB, 8 sets, 8–12, LP, deload 10wk | FB, 10 sets, 8–12 + finisher, LP, deload 8wk | UL, 10–12 sets, 8–12 + finisher, LP, deload 8wk | UL + cardio day, 12 sets, 8–12, LP, deload 8wk | PPL + 1 cardio, 12 sets, 8–12, LP→DP, deload 6wk |
| intermediate | UL, 10 sets, 6–12, DP, maintenance-biased, deload 6wk | UL, 12 sets, 6–12, DP + supersets, deload 6wk | UL, 12–14 sets, DP, deload 5wk | ULUL, 14–16 sets, DP, deload 5wk | PPL, 16 sets, DP, deload 5wk |
| advanced | UL, 10–12 sets, 6–12, maintenance intensity-preserved (R2 P9), deload 5wk | UL, 12 sets, DP, deload 5wk | UL, 14 sets, DUP, deload 5wk | ULUL, 16 sets, DUP, deload 4wk | PPL, 18 sets, DUP, deload 4wk |

Fat-loss rule (R2 P9): intensity stays, volume can drop 30–50% on busy weeks — intensity is the maintenance lever.

### mobility (rehab/desk-worker biased; low-load high-frequency)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| any | FB with rehab primer, 6–8 sets, 10–15 reps, DP, deload 8wk | FB + mobility day, 8–10 sets, 10–15, DP, deload 8wk | UL + 1 mobility day, 10 sets, 10–15, DP, deload 6wk | UL + 2 mobility, 10–12 sets, 8–15, DP, deload 6wk | UL + daily micro-mob, 12 sets, 8–15, DP, deload 6wk |

### athletic (power/sport-adjacent; requires intermediate+)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| novice | fall back to get_strong novice row | fall back to get_strong novice row | fall back to get_strong novice row | n/a | n/a |
| intermediate | UL, 10 sets, strength + plyo, DUP, deload 5wk | UL + plyo day, 12 sets, DUP, deload 5wk | UL + plyo, 14 sets, BLK (accum→intens→real), deload 5wk | ULUL + plyo, 16 sets, BLK, deload 4wk | ULUL + plyo, 18 sets, BLK, deload 4wk |
| advanced | UL, 10 sets, DUP+plyo, deload 4wk | UL, 12 sets, BLK, deload 4wk | UL + sport, 14 sets, BLK, deload 4wk | ULUL + sport, 16 sets, BLK or conjugate, deload 4wk | full BLK/conjugate, deload 4wk |

### general (longevity/general_fitness default when goal unspecified)

| Training age | 2/wk | 3/wk | 4/wk | 5/wk | 6/wk |
|--------------|------|------|------|------|------|
| novice | FB, 8 sets, 8–12, LP, deload 10wk | FB, 10 sets, 8–12, LP, deload 10wk | UL, 10 sets, 8–12, LP, deload 8wk | UL, 12 sets, 8–12, LP→DP, deload 8wk | PPL, 12 sets, 8–12, DP, deload 6wk |
| intermediate | UL, 10 sets, 6–12, DP, deload 6wk | UL, 12 sets, 6–12, DP, deload 6wk | UL, 12–14 sets, DP, deload 5wk | ULUL, 14 sets, DP, deload 5wk | PPL, 16 sets, DP, deload 5wk |
| advanced | UL, 10 sets, 6–12, DUP, deload 5wk | UL, 12 sets, DUP, deload 5wk | UL, 14 sets, DUP, deload 4wk | ULUL, 16 sets, DUP, deload 4wk | PPL, 18 sets, DUP/BLK, deload 4wk |

Sources: R1 P2, P5, P7, P8, P9, P10, P20; R2 P1, P2, P3, P4, P5, P15; R3 P14.

---

## Volume landmarks per muscle per week (from R1 P2, Israetel/Schoenfeld)

Hard sets/muscle/week at RIR 0–3. MV = maintenance, MEV = minimum effective, MAV = maximum adaptive, MRV = maximum recoverable.

| Muscle | MV | MEV | MAV | MRV |
|--------|----|----|------|------|
| Chest | 4–6 | 8 | 12–16 | 20–22 |
| Back | 6–8 | 10 | 14–20 | 22–25 |
| Shoulders (side/rear delt) | 4–6 | 8 | 14–20 | 22–26 |
| Biceps | 4–6 | 8 | 14–20 | 20–26 |
| Triceps | 4–6 | 6–8 | 10–14 | 18–22 |
| Quads | 6–8 | 8–10 | 12–18 | 20 |
| Hamstrings | 4–6 | 6 | 10–14 | 16–20 |
| Glutes | 0–4 | 4–6 | 8–12 | 16+ |
| Calves | 6–8 | 8 | 12–16 | 20 |
| Core (anti-movement) | 0–4 | 4 | 8–12 | 15 |

**Per-training-age cap/floor applied on top of landmarks:**
- Novice: cap weekly volume at MEV + 2 sets per muscle (landmarks' low end).
- Intermediate: target MEV at start of mesocycle → progress to MAV by week 3–4 → deload.
- Advanced: may touch MRV briefly in the last accumulation week before deload.
- Age 55+ (older adult overlay, R1 P20): cap at intermediate MAV top; increase recovery days.
- Injury on affected muscle: cap at MEV until cleared (see injury matrix).

Fat-loss overlay (R2 P9): maintenance floor is 1 set/muscle/session × 2 sessions/week at ≥70% 1RM / RIR ≤2 — preserves mass for ~15 weeks when dieting or traveling.

---

## Injury modification matrix

Becomes `src/lib/injuryRules.ts` and seeds both the exercise-pool filter (Pass 3) and the Gemini prompt's HARD RULES block.

Severity vocabulary (from current `Severity` enum + R4/R5/R6): `ok` / `modify` / `avoid` / `chronic`. Where the enum lacks granularity (e.g., acute flare vs chronic stable), the `note` field + severity combination is used.

### Knee / meniscus (R4)

| Severity | Ban (do not include in pool) | Modify (include but substitute or cap) | Favor (weight up in pool) |
|----------|------------------------------|----------------------------------------|---------------------------|
| ok | — | — | normal |
| modify | jump squat, box jump, depth jump, burpee, jump lunge, pivoting agility, deep loaded lunge, pistol squat, full-ATG back squat, heavy deficit deadlift | cap squat/lunge/leg press ≤90° flexion; prefer reverse lunge over forward; use box for squat depth; TKE band instead of full-ROM leg extension at load | TKE, Spanish squat, wall-sit, low-box step-up, hip thrust, glute bridge, RDL, clamshell, leg press 0–60°, single-leg RDL |
| avoid | ALL loaded knee work, running, jumping | — | isometric quad set, glute bridge, supine hip abduction, ankle pumps, gentle ROM only |
| chronic (stable OA / degenerative meniscus) | high-impact jumping, repetitive deep-load max intensity | moderate load full-depth work; emphasize low-load daily volume | full squat moderate load, step-ups, heavy hip thrust, NEMEX balance, cycling |

Additional rules (R4 P2, P3, P6, P8, P10, P13, P15):
- Every plan with a knee flag MUST include: ≥1 direct quad-loading exercise/week, ≥2 posterolateral-hip exercises/week (hip thrust, clamshell, side plank w/ abduction, single-leg RDL, monster walk).
- "Daily bucket" vs "heavy bucket" split: low-load rehab items (TKE, quad set, clamshell, glute bridge, standing hip abduction) can appear every session; heavy knee work capped at 3/week with ≥48h gap.
- PFP sub-rule: CKC 0–45° + OKC 45–90° only; swap forward lunge → reverse lunge, step-down → lateral step-up.
- Analgesic primer: if user self-reports knee pain ≥4/10 that day, Pass 5 validation injects Spanish squat 5×30–45s or wall-sit 5×30–45s as session's first exercise.
- Rehab is WOVEN into sessions (R4 P15): no standalone "rehab day" — primers at session start on lower-body days, rest-fillers on upper days.

### Lower back (R5)

| Severity | Ban | Modify | Favor |
|----------|-----|--------|-------|
| ok | — | — | include Big 3 as 5-min movement hygiene 2–3×/wk |
| modify (history, asymptomatic) | conventional deadlift at load, Jefferson curl, weighted sit-up, loaded rounded good-morning, heavy rack pull w/ flexion, weighted Russian twist | sub conventional DL → trap bar; sub back squat → front/goblet/box squat when technique suspect; RDL with dowel cue | trap bar DL, hip thrust, KB deadlift, RDL, glute bridge, dead bug, side plank, Pallof press, bird dog, farmer carry, walking |
| avoid (acute flare <6wk) | ALL loaded hinge, loaded squat, running, jumping | — | McGill Big 3 at low dose, directional-preference drill (McKenzie extension / flexion per preference), walks 3×10min/day |
| chronic (ongoing stable) | loaded flexion, all ballistic spinal movement | cap compound RPE ≤7; gate loaded hinge behind P11 criteria (Biering-Sørensen ≥60s, pain ≤3/10 at rest) | KB DL + hip thrust as primary hinge; daily Big 3; walking 3×10min; directional preference revisit weekly |

Additional rules (R5 P3, P6, P9, P10, P12, P13):
- Hip hinge dowel drill in warmup on any day with loaded hinge.
- Core work = anti-flexion/anti-rotation/anti-lateral-flexion only. Never crunches / sit-ups / Russian twists for any severity except `ok`.
- Hip-flexor work = activation + length-strengthening (banded march, eccentric split squat) FIRST, static stretch SECOND.
- Glute work 2×/wk mandatory for any non-`ok` severity.
- Directional-preference onboarding question: "Does bending forward help or hurt? Does lying on stomach propped on elbows feel better or worse?" → extension-preference vs flexion-preference routing.

### Shoulder (R6 P1–10, P18)

| Severity | Ban | Modify | Favor |
|----------|-----|--------|-------|
| ok | — | — | normal; include prone Y + face pull as staple |
| modify (irritable / RC tendinopathy / mild impingement) | barbell OHP, upright row, behind-neck press, dips to full depth, heavy bench with flared elbows | sub OHP → half-kneel landmine press → neutral-grip DB → seated DB → standing DB → barbell (criterion-gated); load ≤ pain 3/10 | side-lying ER, prone Y, prone T, serratus wall slide, face pull, mid-row, thoracic extension mob, pec minor stretch at 30° flex |
| avoid (acute / post-op restricted) | all pressing, all pulling with loaded shoulder, all lateral raise | — | isometric push-into-wall (pain-free), scapular setting drills, PROM within protocol |
| chronic (stable, e.g., managed RC tear) | barbell OHP unless criterion-gated; behind-neck work | neutral-grip substitutions; cap load at RPE ≤7 on pressing | landmine press, neutral-grip DB press, face pull, prone Y/T weekly, thoracic mob daily |

Return-to-overhead-pressing criteria (R6 P9): full pain-free passive + active overhead elevation, pain-free horizontal abd/add, ER/IR strength ratio ≥ 66%, scapular dyskinesis resolved. Gate held in profile as `overhead_press_cleared: bool`.

### Right trap / upper-trap tension (R6 P2, P3, P4)

| Severity | Ban | Modify | Favor |
|----------|-----|--------|-------|
| modify (desk worker trap pattern) | barbell shrugs, upright rows, heavy farmer carry w/ straps, high-pull variants | prefer MT/LT rows over high-pull; replace shrug progressions entirely | side-lying ER daily, prone Y 2–3×/wk, prone T, serratus wall slide, face pull, band pull-apart, pec minor stretch at 30° flex + scap retract, mid-row |

70/30 rule: 70% strengthen MT/LT + serratus, 30% mobilize UT/levator/pec minor. Messaging: "desk-day tightness pattern," NOT "postural correction."

### Hip flexors (R5 P12, R6 P11)

| Severity | Ban | Modify | Favor |
|----------|-----|--------|-------|
| modify (tight + desk worker) | prescribing passive stretch alone as "treatment" | default protocol = activate + eccentric strengthen, stretch as adjunct | banded supine march, RFE split squat w/ 3s eccentric, reverse lunge w/ posterior-pelvic-tilt cue, dead bug, 90/90 transitions, standing hip-flexion march; optional half-kneel couch stretch post-workout |

### Ankle (R6 P13)

| Severity | Ban | Modify | Favor |
|----------|-----|--------|-------|
| modify (limited DF, heels lift at parallel) | heavy full-depth barbell back squat until DF ≥25° | temporary 5mm heel lift for squats; sub full-depth → box squat | half-kneel ankle mob with dowel daily, banded DF mob, goblet squat pry (3×5 deep holds) pre-squat day |

### Neck / forward-head (R6 P5, P14)

| Severity | Ban | Modify | Favor |
|----------|-----|--------|-------|
| modify (desk worker, neck pain frequency >1×/wk) | stretching-only intervention | pair any chin-tuck work with scapular strengthening | supine craniocervical flexion 5s × 10, 2×/day; strengthening 3×/wk ≥20min (band pull-apart, face pull, prone Y/T, neck isometrics) |

---

## Warmup prescription by exercise role

From R3 P1, P3, P5. Every session starts with this block. Budget 6–10 min.

| Exercise role in session | Warmup |
|--------------------------|--------|
| Compound main lift (squat/DL/bench/OHP/row, working load as primary) | RAMP: 2–4 min Raise (bike / jumping jacks) → 2–3 min pattern-specific Mobilize (e.g., squat day = ATG split squat + 90/90 + goblet-squat hold; bench day = T-spine open book + band dislocates + push-up to downward dog) → ramp sets: working load <60kg → 2 sets (empty × 8, 60% × 5); 60–100kg → 3 sets (40% × 8, 60% × 5, 80% × 3); >100kg → 4–5 sets (bar × 8, 40 × 5, 60 × 3, 75 × 2, 88 × 1). Never to failure on ramps; 2+ reps in reserve. |
| Compound accessory (split squat, RDL, incline DB, chest-supported row) | 1 lighter warmup set at ~50–60% working load × 6–8 reps after the Raise+Mobilize block from the main lift. |
| Isolation (curls, lateral raises, leg extensions, calves) | Optional 1 warmup set at 50% working load × 10; otherwise skip. |
| Mobility / rehab primer item (TKE, clamshell, bird dog) | No warmup — these ARE the warmup for the session on lower-body days (R4 P15). |
| Power/plyo (when programmed) | Extra 2 min skipping/pogos before first plyo set; never skip. |

Injury overlays (R3 P5 personalization, R4 P15):
- Knee flag → add TKE + clamshell + glute bridge to Mobilize phase on any lower-body day.
- Lower back flag → add cat-camel + hip-hinge dowel drill + dead bug to Mobilize phase on any day with loaded hinge.
- Right trap flag → add band pull-apart × 15 + face pull × 10 to Mobilize on any upper-body day.
- Ankle flag → add half-kneel DF mob + goblet-squat pry on any squat day.
- Cold ambient / early-morning session → add 1 extra ramp set.

No long static stretches of the prime mover pre-lift (R3 P2). Static stretching is allowed in cooldown only.

---

## Rest interval prescription by exercise role

From R3 P4 (Schoenfeld 2016) + R1 P12. Tagged at pool level; renderer drives the timer.

| Role | Default rest |
|------|--------------|
| Compound (squat, DL, bench, OHP, row, weighted pull-up at <12 reps) | **180s** |
| Accessory compound (split squat, RDL, incline DB press, row variants, chin-up at 8–12 reps) | **120s** |
| Isolation / pump (curl, lateral raise, leg extension, calf, cable crossover, 10–20 rep range) | **75s** |
| Rehab primer (TKE, clamshell, bird dog, dead bug) | 30–45s |
| Superset / antagonist pair | timer = movement A's recovery need (180s compound wins) |

Novice override: allow 60–90s across the board if session would otherwise exceed time budget. Strength day override: compounds can push to 240s.

---

## Progression rules

From R1 P7, P8, P9, P18; R2 P1, P2, P10, P11, P13.

### Novice → intermediate → advanced transition triggers

| From → To | Trigger |
|-----------|---------|
| Novice → Intermediate | Two consecutive failed LP attempts at the same load on a main lift within one month. OR training_age_months ≥ 6 with consistent practice. |
| Intermediate → Advanced | training_age_months ≥ 24 AND user has run through ≥2 mesocycles with documented progression stalls that needed DUP/block scheduling. |

### Progression models

| Model | Used for | Rule |
|-------|----------|------|
| **LP (Linear Progression)** | Novices, early intermediates on accessories | Add 2.5 kg upper / 5 kg lower per session on main compounds. Hold RIR 2–3. On two consecutive missed reps at a load → reset to 90% and re-climb. |
| **DP (Double Progression)** | Intermediates on most lifts; novices on accessories | Pick rep range (e.g., 6–10). Add reps session-to-session at fixed load until all sets hit top of range → bump load by minimum increment → return to bottom of range. |
| **DUP (Daily Undulating)** | Intermediates/advanced on main lifts | Rotate rep/intensity across the week on the same lift: e.g., Mon 5×5 @ RIR 2, Wed 4×8 @ RIR 2, Fri 6×3 @ RIR 1. |
| **BLK (Block)** | Advanced, athletic goal, or user with competition date within 16 weeks | 4 weeks accumulation (RIR 3, 8–12 reps) → 3 weeks intensification (RIR 1–2, 3–6 reps) → 1 week realization/deload. |

### Detraining ceiling / re-ramp table (R2 P6, P13)

Max days between sessions hitting a given muscle without plan adjustment: **7 days**. Beyond that, adjust loads:

| Days since last session (this muscle) | Action |
|---------------------------------------|--------|
| ≤ 7 | normal week, no adjustment |
| 8–21 | reduce loads 5–10% on first session back, keep sets |
| 22–56 | cut loads 15–25%, cut top-set volume 30%; expect full return in 2–3 weeks |
| 57+ | treat as returning intermediate: 2–3 week reintro block (week 1: 60–70% loads, 50% volume, RIR 3–4; week 2: 75–80%, 70% volume, RIR 2–3; week 3: normal) |

### Deload prescription

Hold frequency, cut sets ~40–50%, cut load 10–20% (or raise RIR by 2). Duration 5–7 days. Cadence from architecture table; earlier if any readiness trigger fires (R2 P5): RPE creep ≥1 point across 2 sessions, bar speed drop >10% from baseline, soreness >72h or sleep disruption ≥3 nights, 6+ weeks since last deload.

---

## What NOT to codify (flagged lore — do not accidentally re-introduce)

Each item is explicitly FLAGGED in one or more source docs as weak evidence, superseded, or tradition-only. Do not bake these into prompts, defaults, or onboarding.

| Do NOT codify | Why (source) |
|---------------|--------------|
| Numeric tempo prescriptions (e.g., "3-1-1-0") as default | R1 P17 null finding; R3 P6. Use only for technique correction or tendon rehab. Default cue: "controlled eccentric, intentional concentric." |
| Mike Boyle's "bilateral is dysfunctional" framing | R3 P15. Liao et al. meta — bilateral and unilateral each transfer to their own test. Include both; do not replace bilateral wholesale. |
| Cal Dietz triphasic as a default mesocycle | R2 P14; R3 P16. Only 1 thesis-level study, no vertical-jump benefit. Lock behind advanced + power-sport flag. |
| Full block periodization for non-competitive hobbyists | R2 P3; R3 P17. Use DUP-flavored 4–6 week mini-blocks instead. BLK only when `event_date_within_16_weeks = true`. |
| FMS as a gate/lockout on training | R6 P17. Poor predictive validity. Use self-screen results as inputs, never as pass/fail. |
| Janda lower-crossed / upper-crossed syndrome as diagnosis | R5 P15; R6 P16. Reciprocal-inhibition claim not supported by EMG/imaging. Program the constituent interventions, don't label. |
| Static stretching tight muscles as primary treatment for "tight" hip flexors or upper traps | R5 P12; R6 P4, P11. These are usually lengthened-weak or overactive, not short. Activate + eccentric-strengthen first. |
| Crunches, sit-ups, weighted Russian twists for any severity except `lower_back: ok` | R5 P5, P9. Loaded flexion-rotation is the worst-case disc mechanic. |
| Jefferson curls as a staple for desk-worker / LBP history user | R5 P5; R6 P12. Default OFF. Only for advanced, pain-free, elective progression. |
| Chin-tuck drills prescribed in isolation as posture fix | R6 P5, P16. Modest evidence; must pair with scapular strengthening. |
| Loaded rack pulls for LBP-history user | R5 P10. Can exceed conventional deadlift lumbar load depending on pin height. |
| Kibler scapular dyskinesis precise typing (I/II/III) in app | R6 P10. κ 0.31–0.42 inter-rater — unreliable. Use binary yes/no instead. |
| PAP (post-activation potentiation) auto-prescribed | R3 P10. Small, inconsistent, needs coach timing. Advanced-only optional module. |
| "Muscle confusion" / randomly rotating exercises weekly | R1 "what was omitted." Not evidence-based. Keep exercises stable across a block; vary within a week via DUP. |
| "Metabolic stress" / "pump training" as an independent mechanism | R1 "what was omitted." Volume/load/proximity-to-failure subsumes it. |
| Activation drills (glute bridges, clams, band pull-aparts) marketed as "performance boost" | R3 P12; R6 P13. EMG yes, performance-transfer split. Frame as "patterning," budget ≤90s, don't overclaim. |
| Time-under-tension as a primary programming variable | R1 P17. Evidence null within 0.5–8s/rep range. |
| "Fear-avoidance" messaging for deep squats on chronic-knee user | R4 P5. Not depth that's dangerous — load × depth mismatch. Frame as "protecting tissue while it settles," not "deep squats are bad." |

---

## Primary sources cited (deduplicated across R1–R6)

**Strength & hypertrophy meta-analyses / textbooks**
- Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and muscle mass. *J Sports Sci* 2017; 35(11).
- Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and hypertrophy adaptations between low- vs high-load resistance training: meta-analysis. *JSCR* 2017; 31(12).
- Schoenfeld BJ, Grgic J, Krieger JW. Loading recommendations for strength, hypertrophy, and local endurance. *Sports* 2021; 9(2).
- Schoenfeld BJ, Pope ZK, Benik FM, Hester GM, et al. Longer inter-set rest enhances strength and hypertrophy. *JSCR* 2016; 30(7):1805–1812.
- Schoenfeld BJ, Grgic J, Krieger JW. How many times per week should a muscle be trained? *J Sports Sci* 2019; 37(11).
- Schoenfeld BJ, Ogborn D, Krieger JW. Effect of repetition duration on hypertrophy. *Sports Med* 2015; 45.
- Grgic J, Schoenfeld BJ, Orazem J, Sabol F. Proximity-to-failure meta-analysis. *J Sport Health Sci* 2022.
- Robinson ZP et al. Proximity-to-failure meta-analysis. *Sports Med* 2023.
- Helms ER, Cronin J, Storey A, Zourdos MC. RPE/RIR application. *SCJ* 2016; 38(4).
- Helms ER, Morgan A, Valdez A. *The Muscle & Strength Pyramid: Training* 2nd ed. 2019.
- Pelland JC et al. Resistance training dose-response meta-regression. *Sports Med* 2025.
- Zourdos MC et al. Novel resistance-training-specific RPE scale measuring RIR. *JSCR* 2016; 30(1).
- Israetel M, Hoffmann J, Smith C. *Scientific Principles of Hypertrophy Training*. Renaissance Periodization 2017.
- NSCA (Haff GG, Triplett NT, eds). *Essentials of Strength Training and Conditioning* 4th ed. 2016.
- Zatsiorsky VM, Kraemer WJ. *Science and Practice of Strength Training* 3rd ed. 2020.
- Rippetoe M, Kilgore L. *Practical Programming for Strength Training* 2/3e.
- Haugen ME et al. Free-weight vs machine meta-analysis. *BMC Sports Sci Med Rehabil* 2023.
- Zhang et al. Unilateral vs bilateral meta-analysis. *Sports Med* 2025.
- Schoenfeld BJ, Grgic J. ROM systematic review. *SAGE Open Med* 2020; 8.
- Wolf M et al. ROM hypertrophy meta. *JSCR* 2023.
- Coleman M et al. Drop sets meta-analysis. *Sports Med Open* 2023.
- Fragala MS et al. Resistance training for older adults position statement. *JSCR* 2019; 33(8).

**Periodization & detraining**
- Grgic J et al. Periodization effects on strength & hypertrophy meta-analysis (35 studies). *Sports Med* 2022.
- Williams TD et al. LP vs DUP hypertrophy meta-analysis. *PeerJ* 2017.
- Harries SK, Lubans DR, Callister R. Periodized strength meta. *JSCR* 2015.
- Issurin VB. Block periodization reviews. *Sports Med* 2008, 2010, 2016.
- Bompa T, Buzzichelli C. *Periodization: Theory and Methodology of Training* 6th ed.
- Mujika I, Padilla S. Detraining Parts I & II. *Sports Med* 2000.
- Bosquet L et al. Detraining meta-analyses 2013, 2022.
- Andersen LL et al. Neuromuscular adaptations to detraining. *Eur J Appl Physiol* 2005.
- Spiering BA et al. Minimal dose for maintenance. *Sports Med* 2021.
- Androulakis-Korakakis P et al. Minimum effective training dose for 1RM. *Sports Med* 2020.
- Bickel CS et al. Maintenance dosing. *MSSE* 2011.
- Bell L et al. Deload cross-sectional + Delphi consensus. *Sports Med Open* 2023; *Sports Med* 2024.
- Coleman M et al. Deload RCT. *Eur J Appl Physiol* 2023.
- Bruusgaard JC et al. Myonuclei and overload. *PNAS* 2010.
- Psilander N et al. Training/detraining/retraining myonuclei. *J Appl Physiol* 2019.
- Pareja-Blanco F et al. Velocity-loss dose-response series 2017–2020.
- Weakley J et al. VBT from theory to application. *SCJ* 2021.

**Warmup & technique**
- Fradkin AJ, Zazryn TR, Smoliga JM. Warm-up effects meta-analysis. *JSCR* 2010; 24(1):140–148.
- McGowan CJ et al. Warm-up strategies review. *Sports Med* 2015; 45:1523–1546.
- Behm DG, Chaouachi A. Static stretching review. *Eur J Appl Physiol* 2011; 111:2633–2651.
- Behm DG et al. Acute stretching meta-analysis. *Appl Physiol Nutr Metab* 2016; 41(1):1–11.
- Jeffreys I. The Warm-Up (RAMP). Human Kinetics 2019.
- Seitz LB, Haff GG. PAP meta-analysis. *Sports Med* 2016; 46(2):231–240.
- Wiewelhove T et al. Foam rolling meta-analysis. *Front Physiol* 2019; 10:376.
- Simão R et al. Exercise order meta. *Sports Med* 2012.
- NSCA Position Statement: Weightlifting for Sports Performance 2022.

**Knee rehab**
- Kise NJ et al. OMEX trial: exercise vs arthroscopy for degenerative meniscus. *BMJ* 2016; 354:i3740.
- OMEX 10-year follow-up 2024.
- van de Graaf VA et al. ESCAPE 5-year. *JAMA Netw Open* 2022.
- Moksnes H et al. 12-week degenerative meniscus protocol. *JOSPT* 2012; 42(7):597–608.
- Willy RW et al. APTA PFP CPG. *JOSPT* 2019; 49(9):CPG1–CPG95.
- Powers CM. Hip mechanics and knee injury. *JOSPT* 2010; 40(2):42–51.
- Nascimento LR et al. Hip + knee vs knee-only for PFP. *JOSPT* 2018.
- Bannuru RR et al. OARSI guidelines. *Osteoarthritis Cartilage* 2019; 27(11):1578–1589.
- Calanna F et al. Meniscal repair rehab protocol. *J Exp Orthop* 2022; 9:80.
- ESSKA-AOSSM-AASPT Meniscus Rehab Consensus Parts I & II. *JOSPT Open* 2024/2025.
- Rio E et al. Isometric analgesia in patellar tendinopathy. *Br J Sports Med* 2015; 49(19):1277–1283.
- Escamilla RF. Biomechanics of closed vs open kinetic chain. *MSSE* 1998.
- Riemann BL et al. PFJ forces in step-up/down. *JOSPT* 2011; 41(6):391–398.
- Bricca A et al. Exercise and cartilage in knee OA. *Br J Sports Med* 2019; 53(15):940–947.
- Ageberg E, Roos EM. NEMEX / GLA:D. *Exerc Sport Sci Rev* 2015.
- Segal NA et al. Quadriceps strength and knee function. *Arthritis Care Res* 2010.

**Spine / lower back**
- Foster NE et al. Lancet LBP series: prevention & treatment. 2018 (PMID 29573872).
- Hartvigsen J et al. Lancet LBP series: what LBP is. 2018 (PMID 29573870).
- George SZ, Fritz JM et al. APTA LBP CPG Revision. *JOSPT* 2021; 51(11).
- McGill SM. *Low Back Disorders* 3rd ed. Human Kinetics 2016; *Back Mechanic* 2015.
- Callaghan JP, McGill SM. Porcine disc herniation model. *Clin Biomech* 2001.
- McGill SM, Childs A, Liebenson C. Core endurance norms. *Arch Phys Med Rehabil* 1999.
- Long A, Donelson R, Fung T. Directional preference RCT. *Spine* 2004.
- Lam OT et al. McKenzie SR/MA. *JOSPT* 2018.
- Berglund L et al. Who benefits from deadlift for LBP. *JSCR* 2015.
- Welch N et al. Progressive deadlift in chronic LBP. *J Sport Rehabil* 2021.
- Swinton PA et al. Trap bar vs conventional biomechanics. *JSCR* 2011.
- Jensen MC et al. MRI of asymptomatic spines. *NEJM* 1994.
- Brinjikji W et al. Imaging findings and age. AJNR 2015.
- Areeudomwong P et al. McGill stabilization RCT. *J Phys Ther Sci* 2018.
- Owen PJ et al. Exercise type for chronic LBP network meta-analysis. *Br J Sports Med* 2020.
- Johanson M et al. Passive vs active hip flexor stretch. *Phys Ther* 2004.

**Shoulder / upper / posture / ankle**
- Lancet CSAW trial + Paavola 5-yr follow-up (subacromial decompression vs exercise). 2017/2020.
- JOSPT 2022 CPG: Managing RC Disorders.
- JOSPT 2025 CPG: RC Tendinopathy.
- Cools AM et al. Scapular muscle balance. *Am J Sports Med* 2007.
- Cools AM. Scapular ratios. *JOSPT* 2013.
- Reinold MM et al. GH and scapulothoracic EMG. *JOSPT* 2009 / 2004.
- Ekstrom RA et al. Scapular muscle EMG. *JOSPT* 2003.
- Kibler WB, McClure PW. Scapular dyskinesis reliability. 2013.
- Bern Consensus Statement: overhead athlete / return to sport. *JOSPT* 2022.
- Naunton J et al. FITT meta for RC shoulder pain. *JOSPT* 2024.
- Mintken PE et al. Cervicothoracic manipulation + exercise. *JOSPT* 2016.
- Rosa DP et al. Pec minor stretching + scapular kinematics. *J Shoulder Elbow Surg*.
- Hemmerich A et al. Ankle DF ROM for deep squat. 2006.
- Dorrel BS et al. FMS predictive validity meta. 2015.
- Sahrmann SA. *Diagnosis and Treatment of Movement Impairment Syndromes*. Mosby 2002.
- Page P, Frank C, Lardner R. *Assessment and Treatment of Muscle Imbalance (Janda)* 2010. (used as historical reference only; see "what not to codify")

---

*End of master synthesis. Next step: `2026-04-17-personalization-pipeline.md` operationalizes everything above.*
