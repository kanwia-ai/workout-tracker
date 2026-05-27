# Myths Domain

Catalog of widely-believed fitness claims that research contradicts. Every entry pairs the myth with the citation(s) that debunk it, the corrected understanding, and the specific app surfaces where the myth used to appear (so we can prevent regressions).

The LLM nuance layer pulls from these entries to avoid regressing to gym-bro defaults that its training corpus is full of.

## Entry index

### Body composition / nutrition
- [high-reps-for-tone](high-reps-for-tone.md) — light weights + high reps do NOT produce a "toned" look
- [low-reps-make-women-bulky](low-reps-make-women-bulky.md) — women lifting heavy don't get bulky
- [toned-vs-bulky-rep-range](toned-vs-bulky-rep-range.md) — combined cross-ref of the two above
- [spot-reduction](spot-reduction.md) — crunches don't burn belly fat; fat loss is systemic
- [lifting-converts-fat-to-muscle](lifting-converts-fat-to-muscle.md) — fat and muscle are distinct tissues; you don't "convert" one to the other
- [cardio-burns-fat-directly](cardio-burns-fat-directly.md) — cardio creates a deficit; the deficit causes fat loss, not cardio per se
- [the-fat-burning-zone](the-fat-burning-zone.md) — low-intensity cardio doesn't burn more total fat
- [eat-clean-not-calories](eat-clean-not-calories.md) — energy balance drives weight change, not food source
- [the-toned-look-comes-from-cardio](the-toned-look-comes-from-cardio.md) — cardio alone produces "skinny", not "lean defined"
- [breakfast-is-the-most-important-meal](breakfast-is-the-most-important-meal.md) — meal timing has minor effects vs total daily intake
- [anabolic-window](anabolic-window.md) — protein window is hours, not 30 minutes

### Programming / training
- [soreness-is-progress](soreness-is-progress.md) — DOMS is not required for growth
- [lactic-acid-causes-soreness](lactic-acid-causes-soreness.md) — DOMS is micro-trauma, not lactic acid
- [more-volume-always-better](more-volume-always-better.md) — there's an MRV ceiling; more isn't always more
- [train-to-failure-every-set](train-to-failure-every-set.md) — RIR 1-3 produces equivalent hypertrophy with less fatigue
- [short-rest-burns-more-fat](short-rest-burns-more-fat.md) — short rest hurts volume-load without helping fat loss
- [tempo-prescriptions-drive-growth](tempo-prescriptions-drive-growth.md) — TUT 0.5-8s/rep is null for hypertrophy
- [muscle-confusion](muscle-confusion.md) — random exercise rotation isn't a stimulus
- [concurrent-training-blunts-gains](concurrent-training-blunts-gains.md) — moderate cardio + lifting is fine

### Warmup / recovery
- [static-stretching-prevents-injury](static-stretching-prevents-injury.md) — static stretching pre-lift impairs force output; not protective
- [foam-rolling-releases-fascia](foam-rolling-releases-fascia.md) — fascia can't be mechanically deformed by a foam roller

### Exercise selection
- [squats-make-glutes-grow-most](squats-make-glutes-grow-most.md) — hip thrusts at least equal squats for glute hypertrophy
- [activation-exercises-recruit-muscles](activation-exercises-recruit-muscles.md) — EMG yes; performance-transfer split
- [functional-training-is-better](functional-training-is-better.md) — "functional" is a marketing term, not a research category

### Special populations
- [older-adults-shouldnt-lift-heavy](older-adults-shouldnt-lift-heavy.md) — 60+ adults benefit from moderate-heavy loads
- [lifting-stunts-growth-in-teens](lifting-stunts-growth-in-teens.md) — youth resistance training is safe and beneficial

### Posture / "diagnoses"
- [postural-syndrome-diagnoses](postural-syndrome-diagnoses.md) — Janda's upper/lower crossed syndrome are observational patterns, not diagnostic categories

## How to add a myth entry

1. Use the schema in `docs/knowledge-base/README.md` (`type: myth`).
2. State the myth verbatim.
3. Cite real research (PMID/DOI/published journal). No fabricated citations.
4. Explain WHY the myth persists (the plausible-sounding mechanism).
5. State the corrected understanding.
6. List specific app surfaces (file:line) where the myth used to appear — this is the regression-prevention record.
7. Add cross-references in `related:` frontmatter.
8. Add to this index.

## Source documents

- `/tmp/myth_sweep_onboarding.md`
- `/tmp/myth_sweep_workout_ui.md`
- `/tmp/myth_sweep_settings.md`
- `/tmp/myth_sweep_planner.md`
- `docs/research/00-MASTER-SYNTHESIS.md` (especially the "what NOT to codify" table, lines 295-319)
- `docs/research/02-coaching-philosophy.md` (the "internet fitness content is engagement-bait" thesis)
