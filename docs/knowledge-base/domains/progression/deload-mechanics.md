---
id: deload-mechanics
type: principle
domain: progression
title: "Deload mechanics — cut volume OR intensity, not both"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: [early, intermediate, advanced]
  sex: any
  injuries: []
tags: [deload, recovery, volume, intensity, mesocycle, delphi-consensus]
citations:
  - "Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D. Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey. Sports Med Open. 2022;8(1):103. PMC ID: PMC10511399. (Confidence: HIGH — exact paper.)"
  - "Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. Eur J Appl Physiol. 2023;123(11):2371-2381. (Confidence: HIGH — RCT cited in audit.)"
  - "Coleman M / Bell L et al. Delphi consensus paper on deloading. Sports Med. 2024. Cited as 'Delphi consensus 2024' in the engine audit (`docs/audits/2026-05-07-adaptive-logic-audit.md` §1 TL;DR + §4 deload section) AND in engine code (`buildMesocycle.ts:617`, `buildMesocycle.test.ts:287`). Confidence: LOW on exact citation metadata — referenced consistently but specific DOI/PMID not verified in this entry. The CLAIM the paper supports (cut volume OR intensity, not both) IS the consensus position in the broader deload literature (Bell 2022 survey, Bell 2023 RCT)."
  - "Pelland JC, Robinson ZP, Remmert JF, Cerminaro RM, Benitez B, John TA, Helms ER, Zourdos MC. Methods for Controlling and Reporting Resistance Training Proximity to Failure: Current Issues and Future Directions. Sports Med. 2022;52(7):1461-1472. PMID: 35262869."
related: [deload-triggers, block-progression-arc, bump-vs-hold-vs-drop-rules, detraining-after-layoff, skip-recalibration-tiers]
contradicts: [myth-deload-week-off, myth-deload-always-both-volume-and-intensity]
---

# Deload mechanics — cut volume OR intensity, not both

## Claim

A **deload** is a scheduled, short-duration (typically 5–7 days, sometimes 4–10) reduction in training stress designed to dissipate accumulated fatigue while preserving fitness. It is **not** a week off training (that's an unplanned layoff — see `detraining-after-layoff`).

The Bell et al. coaching-practice survey (2022 Sports Med Open) and the 2024 Delphi consensus on deloading identified three principal mechanisms of deloading that coaches actually use:

1. **Volume reduction** — most common. Drop weekly hard sets by ~30–50% while keeping load roughly the same. Example: 4 sets at the working weight becomes 2 sets at the same weight.
2. **Intensity reduction** — drop load by ~10–20% (or raise RIR by 1–2) while keeping sets the same. Example: 4×8 at 200 lb at RIR 1 becomes 4×8 at 170 lb at RIR 3.
3. **Combined volume + intensity reduction** — used less often by surveyed coaches; can over-cut stimulus to the point where adaptation regresses.

The **Delphi consensus position** (Delphi consensus 2024 — as cited in the audit and engine code): **volume OR intensity, not both**. Volume is the more commonly chosen lever because it dissipates fatigue faster and the strength-preserving effect of maintained load helps the lifter return to normal training without a separate "re-ramp" phase.

Concretely, three valid deload structures:

- **Volume cut (preferred for hypertrophy blocks):** -50% sets at same load. e.g., 4×8 → 2×8.
- **Intensity cut (preferred for strength blocks):** same sets at -20% load. e.g., 4×8 at 200 lb → 4×8 at 160 lb.
- **RIR raise (cleanest neuromuscular reset):** same sets and load, but +2 RIR. e.g., 4×8 at 200 lb at RIR 1 → 4×6 at 200 lb at RIR 3. Same external load, less proximity to failure.

The Bell et al. 2023 one-week deload RCT (Eur J Appl Physiol) found no decrement in muscle adaptations and reduced markers of fatigue in supervised lifters — confirming that a well-designed deload is "free" (no loss of progress) while accumulating recovery.

## Nuance

- **Why not both?** Cutting volume *and* intensity simultaneously drops training stimulus far below maintenance threshold for a week. For hypertrophy, the minimal effective dose to maintain muscle is ~3–6 hard sets/muscle/week at ≥70% 1RM (Spiering 2021). A 50% volume cut + 20% load cut can push below that. The Bell 2023 RCT specifically isolates volume reduction; deeper cuts are unstudied and risk net regression.
- **Deload duration.** 5–7 days is the modal coach prescription (Bell 2023 survey). Shorter (3 days) can work for less-fatigued lifters; longer (>10 days) crosses into detraining territory and tendons start to lose conditioning (see `detraining-after-layoff`).
- **Frequency and timing within block.** Deload is the *last week* of a training block, by design. In a 6-week mesocycle, week 6 is deload. In a 4-week mesocycle, week 4 is. Triggering an ad-hoc deload mid-block requires specific signals — see `deload-triggers`.
- **The engine's current implementation is "both."** `buildMesocycle.ts:462-468` cuts sets to ~60% AND raises RIR by 1. Per the audit, this is over-cutting relative to Delphi consensus. The current setting is fine for a beginner-friendly app (errs on the side of recovery) but worth knowing — and the audit's recommendation #6 is to pick one lever, not both.
- **Deload ≠ recovery week ≠ vacation.** A deload is *training* — the user still goes to the gym, still does sets, still rates effort. The reduction is in the dose, not the structure. Skipping the gym is detraining.

## What this contradicts

- **"Deload week is the week you take off training."** No — that's a layoff. Deload week is training at reduced dose.
- **"Cut everything in half for the deload."** Bell 2023 supports volume cut alone; combined cuts are unstudied and unnecessary. Pick one lever per Delphi consensus.
- **"You need to deload every 4 weeks no matter what."** Trigger is fatigue-driven, not calendar-driven (see `deload-triggers`). Some lifters can run 6+ weeks of accumulation before needing a reduction; advanced strength lifters often need a reset at 4–5 weeks.
- **"Deload is for advanced lifters; novices don't need them."** Novices accumulate less fatigue per week but still benefit from a fatigue dump — the 10-week cadence in the master synthesis architecture table for novices reflects this.

## Application in this app

- The engine's mesocycle deload is at `src/lib/planner/buildMesocycle.ts:617-651` (week 6 of a 6-week block). The `applyDeload` function (lines 462-468) currently does `sets = ceil(sets * 0.6); rir = min(5, rir+1)` — a combined cut. Per the audit (item §6 in the prioritized recommendations table), this should be either-or, not both:
  - **Recommended:** cut volume to 0.5× (sets) and leave RIR alone. This matches the Delphi consensus volume-first approach and Bell 2023's tested protocol.
  - Alternative: keep sets at 0.7× and raise RIR by 1 (a milder version of the current).
- The deload `rationale` copy shown to the user should be honest about the mechanism: "this week we cut volume so your tissue can recover — same loads, half the sets" rather than vague "easy week."
- The LLM nuance layer is permitted to describe deload as a recovery-and-preparation phase ("this dumps fatigue so you come back stronger"), citing Bell 2023, but should NOT prescribe a custom deload structure overriding the engine — deload week shape is deterministic, the LLM narrates it.
- Code comment at `buildMesocycle.ts:617` already cites the Delphi consensus (PMC10511399) — the implementation choice was deliberate, deemed beginner-friendly even though it over-cuts. Audit recommendation #6 is a refinement, not a contradiction.
- The deload IS NOT a license to skip the gym. The UI copy and the LLM should both treat deload week as training — just lighter.
