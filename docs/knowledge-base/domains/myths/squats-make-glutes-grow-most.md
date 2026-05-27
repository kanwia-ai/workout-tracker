---
id: squats-make-glutes-grow-most
type: myth
domain: myths
title: "Myth: Squats are the best exercise for glute growth"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, aesthetics]
  training_age: any
  sex: any
  injuries: []
tags: [glutes, hip-thrust, squat, exercise-selection, hypertrophy]
citations:
  - "Plotkin DL, Rodas MA, Vigotsky AD, et al. Hip thrust and back squat training elicit similar gluteus muscle hypertrophy and transfer similarly to the deadlift. bioRxiv 2023 (also see Plotkin et al. 2024 published version)."
  - "Contreras B, Vigotsky AD, Schoenfeld BJ, et al. A comparison of gluteus maximus, biceps femoris, and vastus lateralis EMG activity in the back squat and barbell hip thrust exercises. J Appl Biomech 2015; 31(6):452-458."
  - "Neto WK, Soares EG, Vieira TL, et al. Gluteus maximus activation during common strength and hypertrophy exercises: a systematic review. J Sports Sci Med 2020; 19(1):195-203."
related: [spot-reduction, activation-exercises-recruit-muscles]
contradicts: []
---

# Myth: Squats are the best exercise for glute growth

## The myth (verbatim)
"Squat for booty." "If you want glutes, you have to squat." "Squats are the king of all glute builders."

## Why the myth persists
- Squats DO recruit the glutes, especially below parallel and out of the bottom. They're a legitimate glute exercise, just not the *best* one.
- Strength culture has historically positioned squats as the most important lift, period — which generalizes to "best for everything," including glutes.
- The first wave of glute-specific training (Contreras' hip thrust work) is relatively recent (~2010s); older training doctrine didn't have the same emphasis on hip-extension-specific work.

## What the research actually says
1. **Plotkin / Contreras 2023-2024** (bioRxiv preprint, peer-reviewed publication): 9 weeks of squat vs hip thrust training, volume-equated, in untrained adults. Glute hypertrophy was SIMILAR between groups. Squat produced more thigh (quad) hypertrophy; hip thrust was more glute-specific (less non-glute leg growth). Strength was task-specific (squat strength favored squat group; hip thrust strength favored hip thrust group).
2. **Contreras et al. 2015** (J Appl Biomech): hip thrusts produced significantly higher gluteus maximus EMG activity than back squats, particularly at peak contraction in the top position.
3. **Neto 2020** systematic review of glute max activation: hip thrust and step-up variations produced among the highest gluteus maximus activation; squats were moderate.
4. **Practical implication**: hip thrusts produce equivalent or greater glute hypertrophy than squats while sparing the rest of the lower body for additional work / recovery. Squats are *good* for glutes — hip thrusts are *better*, especially for glute specificity.

## The corrected understanding
- Squats are a legitimate compound that develops the entire lower body, including glutes.
- For *glute-specific* hypertrophy, the evidence favors hip thrusts (and hip thrust variants — single-leg hip thrust, B-stance hip thrust) at least as much as squats.
- A well-designed glute-priority program includes BOTH heavy hip-hinge work (RDL, deadlift, hip thrust) AND squat-pattern work AND some abduction (hip abduction, lateral band walks for glute medius).
- "Best exercise" framing is itself often misleading — the right *combination* of exercises drives results, not any single movement.

## Application in this app
- Engine: when `muscle_priority` includes `'glutes'`, the program should include hip thrust as a main compound + RDL or deadlift + squat variant + some abduction work. Not just "more squats."
- Exercise descriptions must NOT call hip thrust "an isolation" or treat it as less-important than squats. It's a primary hip-extension compound.
- LLM nuance layer: if user says "squat more for booty," reframe — "for glute-specific growth, hip thrusts beat squats in the head-to-head studies. Best combo: hip thrust + RDL + squat + abduction."

## App surfaces where this myth used to appear
- `src/data/exercises.ts:11` — `ex-hip-thrust-barbell` description called it "the gold standard for glute max activation" (flagged for "gold standard" overclaim per myth_sweep_workout_ui.md M1, but the underlying claim is accurate; soften the superlative).
- General audit-pass needed: any "squats for booty" copy in onboarding / generated rationale should be revised.
