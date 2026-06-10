---
id: hypertrophy-rep-ranges
type: principle
domain: programming-fundamentals
title: "Rep ranges for hypertrophy"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, fat_loss, glutes, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [hypertrophy, rep-ranges, set-volume, load, intensity]
citations:
  - "Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-Analysis. J Strength Cond Res. 2017;31(12):3508-3523. PMID: 28834797. DOI: 10.1519/JSC.0000000000002200."
  - "Schoenfeld BJ, Grgic J, Van Every DW, Plotkin DL. Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum. Sports (Basel). 2021;9(2):32. PMID: 33671664. DOI: 10.3390/sports9020032."
  - "Lasevicius T, Ugrinowitsch C, Schoenfeld BJ, et al. Effects of different intensities of resistance training with equated volume load on muscle strength and hypertrophy. Eur J Sport Sci. 2018;18(6):772-780. PMID: 29564973."
related: [strength-rep-ranges, proximity-to-failure-rir, set-volume-landmarks, load-intensity-zones, volume-quality-vs-quantity]
contradicts: [high-reps-for-tone]
---

# Rep ranges for hypertrophy

## Claim

Hypertrophy occurs across a wide loading spectrum — approximately **5 to 30 reps per set** — when sets are taken close to muscular failure (within ~0–3 reps in reserve). When effort is equated, low-load (≈30–60% 1RM, 15–30 reps) and moderate-to-heavy load (≈60–85% 1RM, 6–15 reps) training produce statistically similar muscle growth in the trained muscle (Schoenfeld 2017, low- vs high-load meta-analysis; Lasevicius 2018).

**Practical default for hypertrophy programming: 6–12 reps as the backbone of working sets.** This range is the *efficient* zone — it produces full hypertrophy stimulus without the high systemic fatigue of heavy singles/doubles, and without the dyspnea / time cost of 25-rep sets that need to be taken to true failure to count.

## Nuance

- **The wide-range claim depends on proximity to failure.** A set of 25 reps stopped at RIR 5 will not match a set of 8 reps at RIR 1. The literature equates *effort*, not raw rep count. Low-load training only matches moderate-load when sets go genuinely close to failure, which is psychologically and ventilatorily harder than people realize.
- **Strength is loading-specific** — see `strength-rep-ranges`. If the user's goal is to *lift heavy things heavy*, 1–6 rep ranges dominate even if hypertrophy is equivalent in muscle CSA. Hypertrophy ≠ strength.
- **Higher reps for exercises that don't tolerate heavy load.** Lateral raises, cable curls, leg curls, calf raises: better stimulus-to-fatigue at 10–20 reps than 5 reps with heavy load. Compound lifts (squat, deadlift) carry more systemic cost so the cost/benefit of 25-rep sets is poor.
- **Individual preference and recoverability.** Some lifters tolerate high-rep work; others spike RPE prematurely. A user reporting "20-rep squats wreck me for 4 days" is signaling that 6–12 reps will produce more weekly volume for that lift.
- **Local endurance specificity.** If the user's goal is muscular endurance (>15 reps to failure), program high reps. If goal is hypertrophy + strength, default to 6–12.

## What this contradicts

- **"High reps tone, low reps bulk."** No mechanism. Same muscle, same fibers. (Myth: `myth-high-reps-tone`.)
- **"Only 6–12 reps build muscle."** Empirically false; the meta-analytic effect of rep range on hypertrophy is non-significant when effort is matched. (Myth: `myth-only-6-12-builds-muscle`.)
- **"You need light weight + high reps to 'shape' a muscle."** Muscle cannot change shape — only size. Shape is genetic + insertion-driven.

## Application in this app

- For **goal = build_muscle / glutes / aesthetics / lean_and_strong / fat_loss**: prescribe 6–12 reps as the default backbone of compound and accessory work. Allow a 15–20 rep tail on a third weekly session for variety and joint-friendliness.
- For **goal = strength**: see `strength-rep-ranges` — 3–6 reps dominate.
- The engine MUST NOT lock rep range to goal label rigidly. A "fat_loss" user still grows muscle in 6–12. A "strength" user still needs some hypertrophy work in 6–10 on accessories. Treat the backbone as default and the tails (heavy & light) as supplementary.
- The LLM nuance layer, when explaining a rep prescription, should cite Schoenfeld 2017 (low- vs high-load meta) for the wide-range claim and reference the efficiency argument for the 6–12 default. Do NOT assert "high reps are for definition" — that contradicts this entry.
- Hard rule: do not default below 5 reps on accessories or above 20 reps on compound lower-body lifts (squat, deadlift) — both extremes have unfavorable stimulus-to-fatigue.
