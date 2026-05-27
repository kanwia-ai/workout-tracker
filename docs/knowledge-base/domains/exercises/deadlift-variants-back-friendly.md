---
id: deadlift-variants-back-friendly
type: exercise
domain: exercises
title: "Deadlift variants — when each is preferred (back stress, hinge patterning, ROM)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: [lower_back, sciatica, hip]
tags: [deadlift-variants, RDL, romanian-deadlift, trap-bar, hex-bar, sumo, smith-machine-RDL, hip-hinge, back-friendly, lower-back-stress]
citations:
  - "Camara KD, Coburn JW, Dunnick DD, Brown LE, Galpin AJ, Costa PB. An Examination of Muscle Activation and Power Characteristics While Performing the Deadlift Exercise With Straight and Hexagonal Barbells. J Strength Cond Res. 2016;30(5):1183-1188. PMID: 26840440. (Hex-bar = less spinal load, more knee involvement, similar power output.)"
  - "Escamilla RF, Francisco AC, Kayes AV, Speer KP, Moorman CT 3rd. An electromyographic analysis of sumo and conventional style deadlifts. Med Sci Sports Exerc. 2002;34(4):682-688. PMID: 11932579."
  - "Cholewicki J, McGill SM, Norman RW. Lumbar spine loads during the lifting of extremely heavy weights. Med Sci Sports Exerc. 1991;23(10):1179-1186. PMID: 1758295. (Foundational spinal-loading data on deadlift.)"
  - "Lockie RG, Moreno MR, Lazar A, et al. The 1 repetition maximum mechanics of a high-handle hexagonal bar deadlift compared with a conventional deadlift as measured by a linear position transducer. J Strength Cond Res. 2018;32(1):150-161."
  - "Schellenberg F, Lindorfer J, List R, Taylor WR, Lorenzetti S. Kinetic and kinematic differences between deadlifts and goodmornings. BMC Sports Sci Med Rehabil. 2013;5(1):27. PMID: 24314348."
  - "McGill SM. Low Back Disorders: Evidence-Based Prevention and Rehabilitation, 3rd ed. Human Kinetics 2016. (McGill canon on spinal loading and the value of hip-hinge variants for back rehab.)"
related: [compound-vs-isolation-taxonomy, squat-variants-knee-friendly, substitution-equivalence-table, hip-thrust-glute-priority]
contradicts: []
---

# Deadlift variants — when each is preferred (back stress, hinge patterning, ROM)

## Claim

The hinge pattern is a movement *family*, not just "the deadlift." Variant selection depends on (a) lower-back stress tolerance, (b) hip-hinge motor skill, (c) hamstring vs glute emphasis, (d) shortened-ROM needs, and (e) equipment available. The variants below cover the spectrum from highest-load-on-the-spine (conventional deadlift) to lowest (Smith machine / cable RDL).

### Romanian deadlift (RDL)

- **Variant ids:** `romanian_deadlift_moderate`, `romanian_deadlift_light`. **Library id:** `ex-rdl`, `ex-kb-rdl`.
- **What it does:** hip hinge with minimal knee bend. Starts at the top; lowers under control with bar close to legs; emphasis is the *eccentric* of the hamstring + glute. Bar usually does not touch the floor (hence "Romanian" — the bar is set down at mid-shin).
- **Best for:** the default hinge pattern for build-muscle / glute / hamstring goals. Lower spinal compression than conventional deadlift because the load doesn't have to be initiated from the floor. Excellent hip-hinge pattern teacher.
- **Back impact:** **lower** than conventional deadlift at matched load because (a) the lifter sets the bar / dumbbell at the top, no initiation from a dead-stop position on the floor; (b) the descent is controlled and stops above the floor — no max-flexion bottom position; (c) lifter can stop at any ROM if back tightness signals trouble.
- **In this app's planner:** the **default main hinge** for most users. `romanian_deadlift_moderate` for full-gym; `kettlebell_hip_hinge` or `ex-kb-rdl` for home users.

### Trap-bar (hex-bar) deadlift

- **Variant ids:** `trap_bar_deadlift_moderate`, `trap_bar_deadlift_light`. **Library id:** `ex-trap-bar-deadlift`.
- **What it does:** lifter stands inside a hexagonal bar with handles at the sides. The load is centered on the lifter's center of mass instead of in front (as in a conventional deadlift). This reduces forward lean and shifts demand from the spinal erectors / lower back to the quads.
- **Best for:** beginners learning to hinge under load; users with lower-back limits; athletes wanting deadlift-like power output without max spinal load.
- **Back impact:** **substantially lower** than conventional deadlift. Camara 2016 found peak spinal load was lower with the hex bar despite equivalent or higher power output (the load-line is closer to the hips, reducing the moment arm on the lumbar spine).
- **In this app's planner:** the **main hinge for lower-back-flagged users** when equipment is available. `trap_bar_deadlift_moderate` is the variant.

### Sumo vs conventional deadlift

- **Variant id:** `conventional_deadlift_moderate`. **Library id:** `ex-sumo-deadlift`, `ex-trap-bar-deadlift`.
- **What it does:** conventional = narrow stance, arms outside the legs. Sumo = wide stance, arms inside the legs. Sumo shortens the bar's travel distance (lifter starts more upright) and shifts demand from lower back to hips + glutes.
- **Best for:**
  - **Conventional** — taller users with long arms; strength-priority lifters chasing 1RM; users with no back limits.
  - **Sumo** — shorter users; users with limited hip-hinge ROM; lifters with mild lower-back limits who want to keep deadlifting.
- **Back impact:** Escamilla 2002 found sumo had **lower** spinal extensor demand and **lower** L4-L5 shear forces than conventional at matched loads. For lower-back-conscious lifters, sumo is the preferred conventional-deadlift variant.
- **In this app's planner:** `conventional_deadlift_moderate` is available for advanced lifters. Sumo isn't currently a separate variant — **engineering flag** to add `sumo_deadlift_moderate` as a back-friendlier alternative to conventional.

### Smith machine RDL

- **Library id:** none currently. Would be `ex-smith-rdl` or substitute via the existing `ex-rdl`.
- **What it does:** RDL pattern on a Smith machine with the bar on a fixed vertical path. Eliminates the front/back balance variable; the lifter focuses entirely on the hinge.
- **Best for:** users with very limited hinge experience; users in rehab from back injury who need controlled hinge practice; users with balance limitations.
- **Back impact:** **lowest of any deadlift variant** — fixed bar path means no anterior loading deviation, lifter can focus on form without weight management. Limitation: doesn't transfer to free-weight deadlift.
- **In this app's planner:** not currently a variant. Engineering follow-up for rehab and detraining return contexts.

### Cable pull-through

- **Library id:** `ex-cable-pull-through`.
- **What it does:** cable rope attachment held between the legs, lifter hinges back and forward. Constant tension on the glutes throughout the ROM. Light load, hinge skill teacher.
- **Best for:** **the hinge-pattern primer** for beginners or users in early rehab. Cable creates posterior load (not anterior like a barbell) — the lifter has to lean *forward* against the cable, which is the opposite of normal life. This teaches the hip-hinge motor pattern with minimal spinal load.
- **Back impact:** **minimal**. The cable pulls horizontally; spinal compression is low.
- **In this app's planner:** prescribed as a warm-up / accessory hinge for novices or users in subacute back rehab.

### Single-leg RDL

- **Library id:** `ex-single-leg-rdl`.
- **What it does:** unilateral hinge with a dumbbell or kettlebell, opposite leg extended behind. Trains hip-hinge skill + balance + glute eccentric.
- **Best for:** addressing left/right asymmetry; intermediate-plus glute / hamstring accessory; balance practice.
- **Back impact:** low (light load by necessity), but balance challenge is high.
- **In this app's planner:** as accessory after the main hinge.

### Good morning

- **Library id:** `ex-good-morning`.
- **What it does:** barbell on shoulders, hinge forward. Pure hip hinge with very long lever arm on the spine.
- **Back impact:** **HIGHEST** of all hinge variants at matched relative load. Schellenberg 2013 — good morning produces higher lumbar moment than the equivalent deadlift. Use sparingly, and only when the lifter has well-grooved hinge mechanics.
- **In this app's planner:** advanced accessory only; not for users with any back flag.

### Back extension (45° / glute-ham raise)

- **Library id:** `ex-back-extension`.
- **What it does:** apparatus-supported hip hinge with minimal spinal load (hips supported by pad). Trains spinal erectors + glutes + hamstrings.
- **Best for:** post-rehab spinal-erector strengthening; lower-back accessory work.
- **Back impact:** controlled. The hip pad supports the trunk; the loading vector is hip extension, not spinal compression.
- **In this app's planner:** as accessory for posterior-chain volume.

## Decision tree (engine logic)

```
Goal: hinge-pattern compound for this session.

Has lower_back injury flag?
  Acute (back_phase == 'acute'):
    → cable_pull_through (hinge primer only)
    or skip hinge pattern entirely; do hip thrust + glute bridge instead
  Subacute (back_phase == 'subacute'):
    → trap_bar_deadlift_light or kettlebell_hip_hinge
    → romanian_deadlift_light (with explicit "back tightness check" affordance)
  Chronic / managed:
    → trap_bar_deadlift_moderate OR romanian_deadlift_moderate
    Avoid: conventional_deadlift, good_morning

Goal is hamstring / glute emphasis, no back flags?
  → romanian_deadlift_moderate (default)
  → conventional_deadlift_moderate for strength-priority advanced lifters

Goal is general / no flags?
  → romanian_deadlift_moderate or trap_bar_deadlift_moderate (both fine)
  → conventional_deadlift_moderate for users explicitly chasing 1RM
```

## Nuance

- **"Deadlifts are bad for your back" is a myth at the population level.** Properly programmed and progressed deadlifts (any variant) build lower-back capacity. The injury risk comes from (a) excessive load too soon, (b) form failure under fatigue, (c) ignoring pain signals. McGill 2016 (the canon on lumbar disorders) explicitly recommends *some* hinge work in nearly every back-rehab population — the variant is what changes.
- **The trap-bar deadlift is the underrated default.** For 80%+ of recreational lifters, the trap-bar deadlift produces the deadlift's stimulus (posterior chain + grip + core) at lower spinal cost than the conventional deadlift. The only reason not to default to it is equipment availability or strength-sport specificity.
- **The Smith machine RDL is real strength training, not "cheating."** For users with back limits or early in their hinge-skill journey, fixed-path hinging is the bridge from cable pull-through to free-weight RDL. Don't apologize for it.
- **"You should always pull conventional" is gym-bro doctrine.** Sumo is biomechanically valid, often safer, and counted equally in any sport that allows it. For our app's users (hypertrophy / general fitness), sumo's lower back demand is a feature not a flaw.
- **The good morning is the most spinally-demanding hinge.** Even though it looks like a "lighter" version of the deadlift, the long lever arm on a loaded spine makes it the highest-risk variant. Programmed sparingly, never as a main lift for users with any back flag.

## Application in this app

- **Variant pool** in `src/lib/planner/variants.ts`:
  - Already has: `trap_bar_deadlift_light`, `trap_bar_deadlift_moderate`, `kettlebell_hip_hinge`, `romanian_deadlift_light`, `romanian_deadlift_moderate`, `conventional_deadlift_moderate`.
  - Missing: `sumo_deadlift_moderate`, `smith_machine_rdl` — engineering follow-up.
- **Engine substitution logic for back flags:**
  - On a chronic back flag, the engine defaults to trap-bar over conventional.
  - On a subacute flag, the engine drops to RDL (light or moderate) AND adds a back-tightness check after the warmup. If the user reports tightness, the session auto-swaps to cable pull-through + glute bridge for the day.
  - On an acute flag, the hinge pattern is dropped for that session; the user gets hip thrust + glute bridge instead.
- **LLM nuance copy:**
  - For trap-bar prescriptions: "trap bar is the back-friendlier deadlift — load is centered on you instead of in front, so the spine takes less shear."
  - For RDL prescriptions: "RDL is the hamstring + glute lift; we stop above the floor so the lower back isn't initiating the lift from a dead stop."
  - For sumo (when added): "sumo deadlift puts you more upright — shorter bar travel, less back shear, more glute + hip demand."
  - Do NOT say: "deadlifts are bad for your back" (myth) or "conventional deadlift is the only real deadlift" (gym-bro).
- **Sumo deadlift library entry** (`ex-sumo-deadlift`) is in the library. The description / cues should be reviewed against this entry's nuance — flag any "targets inner thighs more" myth-coded language (the spot-reduction myth already noted `ex-sumo-deadlift` for revision).
