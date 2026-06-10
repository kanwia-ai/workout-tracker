---
id: autoprogress-by-training-age
type: principle
domain: progression
title: "Bump magnitude scales with training age — novices absorb bigger jumps"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [progression, training-age, novice, intermediate, advanced, bump-magnitude, increments]
citations:
  - "American College of Sports Medicine. Position Stand: Progression Models in Resistance Training for Healthy Adults. Med Sci Sports Exerc. 2009;41(3):687-708. PMID: 19204579."
  - "Rhea MR, Alvar BA, Burkett LN, Ball SD. A meta-analysis to determine the dose response for strength development. Med Sci Sports Exerc. 2003;35(3):456-464. PMID: 12618576."
  - "Helms ER, Morgan A, Valdez A. The Muscle and Strength Pyramid: Training. 2nd ed. 2019."
  - "Stronger by Science. How to Choose the Right Load Progression Strategy. https://www.strongerbyscience.com/weekly-load-progression/ (accessed 2026-05)."
  - "Rippetoe M, Kilgore L. Practical Programming for Strength Training. 3rd ed. The Aasgaard Company; 2014."
related: [progressive-overload-variables, double-progression, bump-vs-hold-vs-drop-rules, block-progression-arc]
contradicts: []
---

# Bump magnitude scales with training age — novices absorb bigger jumps

## Claim

The **per-session load increment** a lifter can sustainably absorb declines with training age. This is a basic dose-response: untrained tissue is far from its genetic ceiling and adapts rapidly; experienced tissue is closer to ceiling and needs more accumulated stress for each additional unit of progress (Rhea 2003; ACSM 2009; Helms 2019).

Recommended bump magnitudes by training age (for compound and accessory lifts, in pounds):

| Training age | Main compound lifts | Secondary compounds | Accessories / isolation |
|---|---|---|---|
| **Novice (<3 mo)** | +10 lb (lower body) / +5 lb (upper) | +5 lb | +5 lb |
| **Early (3–12 mo)** | +5 lb | +5 lb | +2.5 lb |
| **Intermediate (12–36 mo)** | +5 lb | +2.5 lb | +2.5 lb |
| **Advanced (36+ mo)** | +2.5 lb | +2.5 lb | +2.5 lb |

Conventional gym practice (Rippetoe / Starting Strength, Stronger by Science): novices on lower-body compounds (squat, deadlift) can absorb +5–10 lb every session for the first ~3 months. Upper body lifts (bench, OHP, row) progress at half the rate of lower body — +2.5–5 lb per session — because the absolute load is smaller and the relative jump matters more.

**Slower progression is NOT less effective progression.** An advanced lifter adding +2.5 lb every 1–3 weeks on a main lift is still gaining — the rate looks slower but represents the same fraction of their (much higher) baseline. The Rhea 2003 dose-response meta showed continued strength gains in trained populations at lower relative loading intensity, just at compressed rates.

## Nuance

- **Training age is calendar time of CONSISTENT lifting, not total years elapsed.** A user who lifted for 2 years, took 3 years off, and returned 2 months ago is a *returning lifter* — they regain strength fast (see `detraining-after-layoff`) but should not be coded as a 25-month-trained intermediate.
- **Female lifters at the same training age have the same bump magnitudes.** Absolute strength differs by sex, relative dose-response does not (Rhea 2003; Schoenfeld dose-response work). The bump table applies regardless of sex.
- **Lower body absorbs bigger jumps than upper body.** A novice can move +10 lb on squat (a 5% jump on a 200-lb squat) but +10 lb on bench (a 7% jump on a 140-lb bench) is rougher. The conventional split is "lower body progresses at 2× the rate of upper body." Codify upper-body main lifts at the same +5 lb as accessories for novices when the absolute load is small (<100 lb).
- **Adjustable-DB constraints.** A user with non-adjustable DBs going 15 → 20 → 25 has a 5-lb minimum increment regardless of training age. The engine cannot know the user's plate inventory at runtime — surface this in the half-bump fallback (rounded to 2.5-lb minimum at line 142 of `autoProgress.ts`).
- **Older adults (55+) often need slower bump cadence.** Not because dose-response is fundamentally different (Fragala 2019 NSCA position stand: older adults respond well to resistance training), but recovery time per session is longer. Treat 55+ as one bucket up on the training-age table (a 6-month-trained 60-year-old uses the intermediate column, not the early column) as a soft default.
- **Bump-by-rep, not just bump-by-load.** When the bump is half-credit (e.g., floor cleared but not ceiling), the engine returns a half-bump (`halfBumpFor` in `autoProgress.ts:141`). For exercises where load can't move (bodyweight movements before weighted progression), the same training-age principle applies to rep targets: novices add reps faster, advanced lifters add slower (`computeBodyweightRepTarget` in `autoProgress.ts:192`).

## What this contradicts

- **"Add 5 lb every session — that's the standard."** Only standard for early-stage upper-body lifts. Novice lower body absorbs +10 lb; advanced needs +2.5 lb or less per cycle.
- **"Advanced lifters can't gain anymore."** They gain slower in *rate*, not in *capability*. The diminishing returns are real but the curve doesn't flatten to zero (Helms 2019; Rhea 2003).
- **"Everyone progresses at the same rate."** False. The whole point of training-age branching is to acknowledge that a 1-month-old lifter and a 5-year-old lifter need different prescriptions.

## Application in this app

- The engine implements training-age-aware bumps in `src/lib/planner/autoProgress.ts:115-136` (`bumpFor` function). The buckets are: novice (<3 mo), early (3–12 mo), intermediate (12–36 mo), advanced (36+ mo). When `trainingAgeMonths` is undefined, the engine defaults to the intermediate column — backward-compatible for callers that don't pass a profile.
- `trainingAgeMonths` propagates from `loadProfileLocal(userId)` through `computeAutoProgressionForSession` (lines 402–417) into every `computeNextWeight` call. A missing profile (or thrown read) silently falls back to intermediate.
- The LLM nuance layer, when narrating bumps, should match the user's training-age vocabulary:
  - For novices: "your squat goes up +10 lb today — newer lifters absorb bigger jumps."
  - For advanced: "+2.5 lb on the main lift this week — small increments compound over a year."
- The engine does NOT automatically advance the user's training age over time. That's a separate concern (user-driven via profile or detected via session-history-derived rules). The bump table simply reads the current value.
- For `tough + ceiling met` half-bumps (line 357–362) and `easy/solid + floor only` half-bumps (line 385–389), the half is computed from the full bump for that training age: a novice's `+5 half` on accessories is 2.5; an advanced lifter's `+1.25 half` is floored to 2.5 (the realistic plate minimum at `halfBumpFor` line 142). This means advanced lifters effectively only have full vs. hold on accessories, which matches reality — DB increments don't go below 2.5 lb.
