---
id: double-progression
type: principle
domain: progression
title: "Double progression — climb reps inside the range, then bump load"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, longevity]
  training_age: [early, intermediate, advanced]
  sex: any
  injuries: []
tags: [progression, double-progression, rep-range, load-progression, autoregulation]
citations:
  - "Plotkin D et al. Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. PeerJ. 2022. (Confidence: MEDIUM on exact citation metadata; the CLAIM — equivalent hypertrophy between load-progression and rep-progression at matched effort — is the documented finding referenced in the user brief and Stronger By Science writeups.)"
  - "Stronger by Science. How to Choose the Right Load Progression Strategy. https://www.strongerbyscience.com/weekly-load-progression/ (accessed 2026-05)."
  - "Helms ER, Morgan A, Valdez A. The Muscle and Strength Pyramid: Training. 2nd ed. 2019."
  - "American College of Sports Medicine. Position Stand: Progression Models in Resistance Training for Healthy Adults. Med Sci Sports Exerc. 2009;41(3):687-708. PMID: 19204579."
related: [progressive-overload-variables, bump-vs-hold-vs-drop-rules, autoprogress-by-training-age, rir-effort-signals]
contradicts: []
---

# Double progression — climb reps inside the range, then bump load

## Claim

**Double progression** is a two-variable progression scheme where the lifter is prescribed a **rep range** (e.g., 6–10) at a fixed load, and:

1. Each session, attempt to add reps at the current load while keeping form and target RIR.
2. When **every set** of the exercise reaches the **top of the rep range** (e.g., all 4 sets clear 10 reps), increase the load by the smallest practical increment.
3. After the load bump, reps will drop (back toward the floor of the range) and the cycle repeats.

If the user stalls at the **bottom** of the rep range (consistently can't hit the floor at the current load), **hold** the load and keep accumulating attempts, or **add a set** to grow weekly volume without raising load.

Double progression is one of several valid progression structures alongside Linear Progression (LP), Daily Undulating Periodization (DUP), and Block periodization. Each is correct for different training contexts:

- **LP** — best for true novices (≤6 mo training age) on main compounds, where +2.5/+5 lb every session is sustainable.
- **Double progression** — best for early-intermediate through intermediate (6–36 mo) on most exercises, especially accessories, and post-LP on main lifts when single-session load bumps stop being sustainable.
- **DUP** — best for intermediate-to-advanced on main lifts where same-load same-rep weekly progression has stalled.
- **Block** — best for advanced lifters with a competition / event date inside ~16 weeks.

Plotkin et al. 2022 demonstrated in a randomized trial of resistance-trained lifters that an 8-week protocol where one group progressed *load* (5RM-driven) and another progressed *reps* (load held, reps climbed) produced **statistically equivalent hypertrophy** in five of six muscle sites measured. Strength outcomes were biased toward the load-progression group on the specific test loads but lean-mass and muscle-thickness gains tracked together. This is the strongest direct RCT evidence that rep-progression — the core mechanism of double progression — is a legitimate primary driver of hypertrophy, not a fallback.

## Nuance

- **The "top of the range" gate is per-set, not average.** Hitting 10, 9, 9, 8 across four sets does NOT qualify for a load bump — only the first set hit the ceiling. The engine reflects this: `metRepCeiling` in `autoProgress.ts:98-107` checks that **every** logged set met the ceiling.
- **Rep ranges should be wide enough to make the climb feel earned but narrow enough to give a meaningful trigger.** 8–12, 6–10, 10–15 are typical. 5–20 is too wide — the lifter spends weeks at the bottom of the range without ever earning a load bump.
- **Form quality is the gate, not just rep count.** Reps that drift in form to clear the ceiling don't count — that's load over-reach producing fake reps. The user's effort rating (`cooked` at RIR 0 vs. `on it` at RIR 2) and any per-set form notes inform whether the ceiling-clearance is honest.
- **Half-bumps are a legitimate intermediate step.** When the user is between increments (cleared floor at `easy` but not ceiling, or cleared ceiling but rated `tough`), a half-bump preserves momentum without overshooting. The engine implements this at `autoProgress.ts:357-368, 374-389` with `halfBumpFor()`.
- **Double progression doesn't apply cleanly to bodyweight movements.** When load can't realistically change (push-ups, bodyweight dips, pull-ups for users without a weight belt), progression IS rep progression all the way down — the "load" axis is absent. The engine handles this via `computeBodyweightRepTarget` in `autoProgress.ts:192-251`, which moves the rep target itself rather than load.

## What this contradicts

- **"You have to add weight every session or you're not progressing."** Plotkin 2022 — adding reps at fixed load drives equivalent hypertrophy.
- **"Linear progression should work forever."** False for everyone past the first 6 months. The defining novice→intermediate transition is when single-session load bumps stop being sustainable; that's when double progression becomes the natural successor scheme.

## Application in this app

- The engine (`src/lib/planner/autoProgress.ts`) implements double progression via the rep-ceiling gate. The decision tree in `computeNextWeight` at lines 289–390:
  - `easy/solid` + ceiling met → **full bump**
  - `easy/solid` + floor only (didn't clear ceiling) → **half bump**
  - `tough` + ceiling met → **half bump** ("they earned forward motion, just not at the full novice-style step", per code comment at lines 354–362)
  - `tough` + floor only → **hold**
  - `failed` / missed reps → **hold** (one-strike) or **drop ~10%** (two-strike within lookback window)
- The LLM nuance layer should describe progressions in double-progression vocabulary: "you cleared 10 reps on every set last time — let's add 5 lb and we'll restart at 8 reps." Avoid LP-style language ("you'll add 5 lb every session") for users past 6 months training age.
- Prescribed rep ranges in `buildMesocycle.ts` should be wide enough (≥3 reps) for the cycle to function. A single-number target ("hit 10 reps") collapses into hold-or-bump and loses the climb dynamic.
- When the engine returns a `half bump` action, the UI should make this visually distinguishable from a `bump` — the user is mid-climb, not at the top of a wave. (Implementation detail; not a KB claim.)
