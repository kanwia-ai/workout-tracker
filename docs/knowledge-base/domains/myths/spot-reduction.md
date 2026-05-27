---
id: spot-reduction
type: myth
domain: myths
title: "Myth: You can spot-reduce fat (crunches melt belly fat, inner-thigh exercises slim thighs)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, fat_loss, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [spot-reduction, fat-loss, abs, inner-thigh, body-composition]
citations:
  - "Vispute SS, Smith JD, LeCheminant JD, Hurley KS. The effect of abdominal exercise on abdominal fat. J Strength Cond Res 2011; 25(9):2559-2564."
  - "Ramirez-Campillo R, Andrade DC, Campos-Jara C, et al. Regional fat changes induced by localized muscle endurance resistance training. JSCR 2013; 27(8):2219-2224."
  - "Kostek MA, Pescatello LS, Seip RL, et al. Subcutaneous fat alterations resulting from an upper-body resistance training program. Med Sci Sports Exerc 2007; 39(7):1177-1185."
related: [cardio-burns-fat-directly, eat-clean-not-calories, the-fat-burning-zone]
contradicts: []
---

# Myth: You can spot-reduce fat

## The myth (verbatim)
"Crunches will melt belly fat." "Inner-thigh exercises slim my thighs." "Tricep dips get rid of arm jiggle." "Side bends shrink the love handles."

## Why the myth persists
The mechanism sounds intuitive: if I work the muscle here, surely the fat over it will be the fat my body draws from. Magazines, infomercials, and TikTok ab-routine videos sell exactly this premise. The visible muscle hypertrophy from training a body part can also create the *illusion* of fat loss in that area, reinforcing the false causal link.

## What the research actually says
1. **Vispute 2011 (JSCR):** 24 sedentary adults, 6 weeks of 7 abdominal exercises × 2×10 reps × 5 days/week. No change in abdominal subcutaneous fat, total body fat, or any body-composition measure compared to controls. Same diet across groups.
2. **Ramirez-Campillo 2013 (JSCR):** 12 weeks of leg-press training on one leg. Both legs lost similar amounts of fat. The trained leg did not preferentially lose subcutaneous fat over the untrained leg. (Some studies have found tiny localized effects but the magnitudes are clinically meaningless and not consistent.)
3. **Kostek 2007:** 12 weeks of unilateral arm resistance training. Subcutaneous fat changes did not differ between the trained and untrained arms.

The mechanism: fat is mobilized systemically via lipolysis driven by hormonal signals (epinephrine, growth hormone, etc.) and burned wherever the body's fat-loss order dictates (which is genetically determined, not exercise-determined). The contracting muscle doesn't have privileged access to the adipocytes sitting on top of it.

## The corrected understanding
- Fat loss is **systemic and driven by caloric balance**. The body decides where it pulls from based on genetics and hormonal context.
- Training a muscle group can grow the muscle underneath, which changes the *shape* of the area but doesn't preferentially burn the fat sitting on it.
- The fastest way to lose fat from a particular spot is to lose fat overall — via a calorie deficit — and accept that your body's pattern is its own.

## The corrected programming
- Want to lose belly fat? Create a calorie deficit. Crunches do not help and don't hurt (they're just core training).
- Want defined arms? Build the muscle (any of curls, presses, pull-ups) AND lower overall body fat enough for the muscle to show.
- Want shapelier glutes? Build the muscle (hip thrusts, RDLs, squats — see [squats-make-glutes-grow-most](squats-make-glutes-grow-most.md)) AND control overall body fat.

## Application in this app
- Engine: do NOT promise body-part-specific fat loss via exercise selection. `muscle_priority` is for hypertrophy targeting, not fat targeting.
- LLM nuance layer: when a user names a body-part appearance goal ("I want to lose belly fat / inner thighs / love handles"), reframe — "fat loss is systemic; we build the muscle there, and the deficit (mostly diet-driven) determines whether the fat covering it comes off."
- Copy: "tight bum" / "inner thighs" / "lower abs" language is banned from the in-app copy pool. See myth-removal log in `/tmp/myth_sweep_workout_ui.md`.

## App surfaces where this myth used to appear
- `src/data/exercises.ts:189-209` — `ex-hip-adduction` description "Targets inner thighs" (rewritten).
- `src/data/exercises.ts:1685-1706` — `ex-sumo-deadlift` "targets inner thighs and glutes more than conventional" (rewritten).
- `src/data/exercises.ts:1404-1418` — `ex-leg-raise` "Lower ab exercise" framing (rewritten — there is no separable lower ab muscle).
- `src/components/Onboarding/StepSpecificTarget.tsx:39` — placeholder "glutes by June" example (revised).
- `src/lib/copy.ts:1164` — "building the perfect plan for a tight bum" (removed).
