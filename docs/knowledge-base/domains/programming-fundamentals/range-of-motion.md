---
id: range-of-motion
type: principle
domain: programming-fundamentals
title: "Full range of motion is (mostly) superior for hypertrophy"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, glutes, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [range-of-motion, ROM, hypertrophy, long-length-partials, exercise-execution]
citations:
  - "Schoenfeld BJ, Grgic J. Effects of range of motion on muscle development during resistance training interventions: A systematic review. SAGE Open Med. 2020;8:2050312120901559. PMID: 32030125."
  - "Wolf M, Androulakis-Korakakis P, Fisher J, Schoenfeld BJ, Steele J. Partial vs full range of motion resistance training: A systematic review and meta-analysis. J Strength Cond Res. 2023. PMID: 37889928."
  - "Pedrosa GF, Lima FV, Schoenfeld BJ, et al. Partial range of motion training elicits favorable improvements in muscular adaptations when performed at long muscle lengths. Eur J Sport Sci. 2022;22(8):1250-1260. PMID: 33977835."
  - "Maeo S, Wu Y, Huang M, et al. Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead vs. neutral arm position. Eur J Sport Sci. 2023;23(7):1240-1250."
related: [hypertrophy-rep-ranges, exercise-selection, session-structure-ordering]
contradicts: [myth-partial-reps-cheating, myth-half-reps-build-mass-faster]
---

# Full range of motion is (mostly) superior for hypertrophy

## Claim

**Training through a full range of motion produces greater hypertrophy than short-ROM training**, particularly when the muscle is loaded at long muscle lengths (the bottom of a squat, the deep stretch of an RDL, the lengthened position of an overhead triceps extension).

When a partial ROM *is* used, **long-length partials** (the half of the ROM where the muscle is stretched) outperform short-length partials (the half where the muscle is contracted) for hypertrophy (Pedrosa 2022; Wolf 2023 meta).

**Practical default: full ROM on every lift, full ROM specifically including the bottom/stretched position.** Use long-length partials as a specialization technique, not a default.

## Nuance

- **Lower body has stronger ROM evidence than upper body.** Squat depth, RDL depth, leg press depth — meaningful hypertrophy advantages for full ROM. Upper body (bench, OHP) shows smaller and more mixed effects in the meta-analyses (Schoenfeld & Grgic 2020).
- **"Full ROM" means the user's pain-free full ROM.** A user with knee meniscus history may not be able to do a full ATG squat — that's fine; the "full ROM" target adjusts to what the joint tolerates today. See knee-injury entries.
- **Long-length emphasis matters.** Overhead triceps extensions (long head loaded long) > overhead pushdowns (short). Incline dumbbell curl (biceps long) > preacher curl bottom-half (biceps short). RDL bottom > top-half lockout. Bias exercise selection toward variants that load the muscle long.
- **Heavy partials have a strength-specific use case** — sticking-point training for advanced powerlifters (e.g., rack pulls, board presses, pin squats). Not a hypertrophy recommendation. Distinct application.
- **ROM restriction is sometimes correct.** Mobility limits, injury, or technique safety can mandate reduced ROM — but use the *most* ROM the user can safely achieve, not less.
- **Lengthened partials added at end of full ROM sets** are a legitimate hypertrophy intensifier for advanced lifters in late-mesocycle (e.g., "after 4×10 RDL, add 1 set of bottom-half RDL to failure"). Treat as a specialization, not a default.

## What this contradicts

- **"Half reps build mass faster because of higher loads."** False; the heavier load from partial ROM doesn't compensate for the reduced stimulus to the lengthened position. (Myth: `myth-half-reps-build-mass-faster`.)
- **"Partial reps are cheating."** Partials are a tool with specific uses. They're not cheating when they're prescribed, they're sub-optimal when they're a habit replacing full ROM. (Myth: `myth-partial-reps-cheating`.)
- **"Pin everything at 90 degrees because that's where the strongest position is."** Confuses strongest position (mid-range, high force) with growth-driving position (lengthened, high stretch). The latter produces more hypertrophy per set.

## Application in this app

- **Exercise library** tags each exercise with a default ROM (e.g., squat: hip below knee; bench: bar touches chest; RDL: dowel/bar mid-shin or below). The cue stored alongside the exercise references the lengthened position.
- **Injury filters** override default ROM:
  - Knee modify → cap squat/lunge/leg press at ≤90° flexion.
  - Lower back avoid → reduce hinge depth, use trap bar or KB to limit forward lean.
  - Shoulder modify → reduce overhead ROM until cleared.
  - Ankle DF <25° → temporary heel lift or box squat to a depth the ankle allows.
- **The LLM does not invent ROM modifications.** The injury filter is deterministic; the LLM only explains *why* the modification exists.
- **LLM nuance layer**: when explaining ROM, cite Schoenfeld & Grgic 2020 (ROM systematic review) and Wolf 2023 (partial vs full meta). When recommending exercise variants that load long (overhead triceps, deep RDL, deep squat), cite Pedrosa 2022 (long-length partials) and Maeo 2023 (overhead triceps hypertrophy). For users with injuries, frame ROM modifications as "we're loading the safe portion of the range; later, as the joint settles, we'll extend ROM" — not "we're avoiding the deep position because it's dangerous." Don't fear-monger depth.
