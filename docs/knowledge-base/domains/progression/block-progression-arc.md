---
id: block-progression-arc
type: pattern
domain: progression
title: "Block progression arc — build volume, push intensity, attempt PR, deload"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness]
  training_age: [early, intermediate, advanced]
  sex: any
  injuries: []
tags: [block, mesocycle, periodization, volume, intensity, pr-attempt, deload, rp, helms]
citations:
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization; 2017."
  - "Helms ER, Morgan A, Valdez A. The Muscle and Strength Pyramid: Training. 2nd ed. 2019."
  - "Grgic J et al. Effects of linear and daily undulating periodized resistance training programs on hypertrophy: meta-analysis. PeerJ. 2017. (Confidence: HIGH on existence; MEDIUM on exact PMID/DOI.)"
  - "Williams TD et al. Comparison of periodized and non-periodized resistance training on maximal strength: a meta-analysis. Sports Med. 2017. (Cited in `docs/research/02-periodization-detraining.md` as 'Williams et al. 2017 PeerJ meta-analysis on hypertrophy' — journal may be PeerJ, not Sports Med; the CLAIM about periodized > non-periodized for strength is well-supported.)"
  - "Renaissance Periodization. Training Volume Landmarks for Muscle Growth. https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth (accessed 2026-05)."
  - "Delphi consensus 2024 on deload structure — cited consistently across audit (`docs/audits/2026-05-07-adaptive-logic-audit.md`) and engine code (`buildMesocycle.ts:617`). Confidence: LOW on exact citation metadata, MEDIUM on the CLAIM (deload week dissipates fatigue while preserving fitness)."
related: [deload-mechanics, deload-triggers, double-progression, autoprogress-by-training-age]
contradicts: []
---

# Block progression arc — build volume, push intensity, attempt PR, deload

## Claim

A standard 6-week training block follows an arc that climbs across the first 5 weeks, peaks late, then dissipates fatigue in week 6. The arc is grounded in Renaissance Periodization's MEV→MAV→MRV volume-landmarks framework (Israetel 2017) and Helms 2019 mesocycle templates, plus the Williams 2017 and Grgic 2017 meta-analyses showing periodized programs match or beat non-periodized for strength outcomes.

A representative 6-week arc for a hypertrophy-leaning block:

| Week | Volume (sets) | Intensity (load × RIR) | Stimulus emphasis | Subjective feel |
|---|---|---|---|---|
| **1** | Lower — at or near MEV | Submaximal — RIR 2–3 | Re-introduction; pattern repetition at moderate dose | Easy / on it |
| **2** | Climbing — MEV+1 to MAV-1 | RIR 2 | Volume build; rep-progress at the load | On it |
| **3** | Peak volume — at or near MAV | RIR 1–2 | Intensity rises within climbing volume | On it / tough |
| **4** | At MAV — sets stop climbing | RIR 1 (load + RIR push) | Intensity now leads — load climbs, sets hold | Tough |
| **5** | At MAV or down 1 set | RIR 0–1 on top sets (PR-attempt territory) | Realization — top set at RIR 1, maybe AMRAP last set | Tough / cooked |
| **6** | DELOAD — half sets at same load OR same sets at -20% load (NOT both) | RIR 3–4 | Fatigue dissipation, preserve fitness | Easy |

For strength-leaning blocks (`primary_adaptation = strength_power`), the arc compresses to 4–5 weeks with heavier loads and lower rep ranges throughout; the deload still occupies the last week. For novice blocks (LP-dominant), the arc can extend to 8–10 weeks before scheduled deload because fatigue accumulates more slowly.

The **key transitions**:

- **End of week 2 → start of week 3**: shift from "add volume" to "add intensity on top of accumulated volume." Sets may hold while reps climb (double-progression mechanic) or load climbs.
- **End of week 4 → start of week 5**: the "realization" inflection. Up until week 4, the lifter has been accumulating; week 5 is when they test it — top-set RIR 1, possibly AMRAP last set on a main lift to see what the accumulated stimulus produced.
- **End of week 5 → week 6**: scheduled deload. Volume cut OR intensity cut per `deload-mechanics`.

## Nuance

- **The arc is descriptive of how productive blocks look, not a hard prescription.** Some lifters peak earlier; some can extend volume climbs into week 4 without the intensity overlay. The engine's deterministic mesocycle is one valid implementation; other valid blocks (4-week DUP, 8-week LP) follow different shapes.
- **Volume landmarks are per-muscle, not whole-program.** A user might have quads at MAV by week 3 but biceps at MEV — the arc plays out independently per muscle group. The engine's current implementation does NOT track per-muscle volume landmarks; the replan layer (Opus call) is the appropriate place for this awareness (audit recommendation §3).
- **PR attempts are NOT mandatory in week 5.** A lifter mid-cut, returning from injury, or running a block for hypertrophy-only purposes may skip the top-set RIR 1 push. The arc tolerates this — week 5 simply becomes "highest sustainable intensity for the user this block."
- **Block length is goal-driven.** From master synthesis:
  - `strength_power`: 4–5 week blocks (heavier work accumulates fatigue faster).
  - `size`, `mixed`: 6 week blocks (standard).
  - `work_capacity`: 4 week blocks.
  - Novice: blocks can run 8–10 weeks before scheduled deload because absolute loads are low.
- **The Williams 2017 meta on periodization** showed only modest differences between LP and DUP for hypertrophy outcomes, and Grgic 2017 showed periodized > non-periodized for strength but with small effect sizes. The TAKEAWAY: structure matters less than consistency and effort. The arc is a useful organizing pattern, not a magic structure.
- **"Realization" terminology is borrowed from block periodization.** Don't confuse it with "1RM testing" — most users will never max-test; the realization week is just "the heaviest credible push of the block."

## What this contradicts

- **"Every session should be a PR attempt."** Burns out the lifter, accumulates injury risk, ignores the volume-building work that creates the substrate for the PR. The arc puts PRs at week 5 because that's when the accumulated stimulus is ready to be expressed.
- **"Flat volume, flat intensity blocks are equivalent."** Williams 2017 and Grgic 2017 show small but real benefits to periodized structures for strength; for hypertrophy the difference is smaller but the arc still helps with adherence and freshness.
- **"Deload weeks waste training time."** Coleman 2023 RCT — a one-week deload produced no decrement in muscle adaptations and reduced fatigue markers. The deload is part of the productive block, not a tax on it.

## Application in this app

- The engine implements the arc in `src/lib/planner/buildMesocycle.ts`. The current 6-week structure:
  - Weeks 1–5: progressive load via `applyWeeklyProgression` (lines 445–459), monotone load climb of +2.5%/week on the seed weight, then per-session bumps from `autoProgress` overlay.
  - Week 6: deload via `applyDeload` (lines 462–468), volume cut to ~60% AND RIR raised by 1 (audit notes: should be either-or per Delphi consensus).
- The audit (§4 prioritized recommendations table) flags two refinements: (1) resolve the seed-vs-autoProgress race so a stalled lifter doesn't see a week-5 seed higher than what they hit; (2) make block length goal-driven (4 weeks for strength_power, 6 for size/mixed, 5 for hybrid).
- The LLM nuance layer (replan prompt) should reason in volume-landmarks vocabulary when reviewing a completed block:
  - "Quad work was rated `easy/solid` through weeks 1–5 → user has high MRV for quads → next block starts +1–2 working sets per session."
  - "Push work trended `tough → failed` by week 5 → user hit MRV early → next block starts -1–2 working sets or wider rep range."
  - This is audit recommendation §1 (add MEV/MAV/MRV scaffolding to the replan prompt).
- The arc is most useful as a frame for explaining the user's session relative to where they are in the block: "you're in week 4 — this is when intensity leads, so loads climb while sets hold." This narration helps the user understand WHY a session at week 4 feels different from week 1.
- For users running a non-standard block length (e.g., a 4-week strength block), the arc compresses but the inflection structure persists: accumulate → push intensity → realize → deload.
- **Do NOT** auto-prescribe a "PR attempt" in week 5 if the user has self-reported any of: poor sleep cluster, illness in the past week, injury flag activation. Realization weeks are opt-in psychologically — the engine can suggest, the user decides.
