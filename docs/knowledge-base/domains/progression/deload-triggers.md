---
id: deload-triggers
type: principle
domain: progression
title: "Deload triggers — scheduled (end of block) vs. ad-hoc (real fatigue signal)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [deload, triggers, fatigue, autoregulation, rir, ad-hoc-deload, scheduled-deload]
citations:
  - "Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D. Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey. Sports Med Open. 2022;8(1):103. PMC ID: PMC10511399. (Confidence: HIGH — exact paper, cited in audit as the deload practitioner survey baseline.)"
  - "Delphi consensus 2024 on deload structure — cited as 'Delphi consensus 2024' in `docs/audits/2026-05-07-adaptive-logic-audit.md` and `src/lib/planner/buildMesocycle.ts:617`. Confidence: LOW on exact citation metadata; the consensus position (volume OR intensity, not both; trigger off failed/missed reps, not 'tough') is independently supported by Bell 2022 survey and Bell 2023 RCT."
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49. DOI: 10.1519/SSC.0000000000000218."
  - "Halperin I et al. Accuracy in predicting repetitions to task failure in resistance exercise: a scoping review and exploratory meta-analysis. Sports Med. 2022. (Confidence: HIGH on existence and CLAIM; MEDIUM on exact PMID/DOI.)"
  - "Bishop PA, Jones E, Woods AK. Recovery from training: a brief review. J Strength Cond Res. 2008;22(3):1015-1024. PMID: 18438210."
related: [deload-mechanics, rir-effort-signals, block-progression-arc, bump-vs-hold-vs-drop-rules, skip-recalibration-tiers]
contradicts: [myth-tough-means-deload, myth-deload-every-four-weeks-no-matter-what]
---

# Deload triggers — scheduled (end of block) vs. ad-hoc (real fatigue signal)

## Claim

A deload should fire for ONE of TWO distinct reasons. Confusing the two leads to over-deloading (unnecessary fatigue cuts that interrupt productive accumulation) or under-deloading (fatigue accumulates past the point where adaptation continues).

### Trigger A: Scheduled deload (planner-driven)

The mesocycle includes a deload week by design — typically the **last week of a 4–6 week block**. This is fatigue *prophylaxis*: cut the stimulus before the lifter feels broken so they enter the next block fresh. Block length is goal-driven:

- **Strength blocks** (heavy main lifts, RIR 0–1): 4–5 weeks accumulation + 1 deload week.
- **Hypertrophy blocks** (moderate loads, RIR 1–3, volume climbing): 5–6 weeks accumulation + 1 deload week.
- **Novice blocks** (LP-driven, modest accumulation): can run 8–10 weeks before scheduled deload.

Scheduled deloads do NOT need user signal. They happen because the planner says so. The engine implements this at `buildMesocycle.ts:617-651` for a 6-week default block.

### Trigger B: Ad-hoc deload (signal-driven, mid-block)

When sufficient fatigue accumulates *before* the scheduled deload, an additional unscheduled deload may be warranted. The signals — from the Bell coaching-survey + Delphi consensus 2024 and Helms 2016 RIR framework — are:

1. **Effort creep at the same load.** Same exercise + same load rated `tough` last week → rated `failed` (or reps missed) this week, AND same pattern across multiple exercises in the same session. NOT just one exercise — that's a local stall calling for the two-strike drop (`bump-vs-hold-vs-drop-rules`), not a whole-program deload.
2. **Multi-session effort degradation.** `overall_feel` (1–5) ≤ 2 across 2–3 consecutive sessions, particularly when paired with sleep / soreness self-reports trending negative.
3. **Per-set rating drift.** Across multiple exercises, set 1 starts rating `cooked` (RIR 0) instead of `easy/on it` (RIR 2–3) — the user is entering working sets already deep in fatigue.

**Critical distinction: `tough` is the TARGET, not a deload trigger.** The hypertrophy/strength productive zone is RIR 1–3, which subjectively feels `tough`. A user consistently rating exercises `tough` while clearing prescribed reps is *exactly where they should be* — that's the working stimulus dose. Triggering a deload off `tough` is mistaking on-target effort for over-target effort.

The trigger for ad-hoc deload is `failed` ratings (genuine miss, can't complete prescribed reps) clustering across multiple exercises in the same week, not `tough` ratings.

## Nuance

- **Halperin 2022 caveat on novice RIR estimation.** Novices underestimate proximity to failure — what they call `tough` may genuinely be `RIR 0`. For users with `training_age_months < 12`, weight rep-completion as a harder signal than effort-rating alone. A novice rating `tough` AND missing reps for 2 consecutive sessions across multiple exercises is the cleanest ad-hoc trigger; `tough` alone is unreliable.
- **Session-level vs. exercise-level signals.** Local stalls (one exercise) call for the two-strike drop. Whole-session stalls (multiple exercises stalling in the same session) call for ad-hoc deload. The engine doesn't currently auto-fire ad-hoc deloads — that decision is in the replan/LLM layer (see `replanMesocycle.ts`).
- **Don't deload off a single bad day.** Life events (poor sleep, stress, missed meals) produce one-off bad sessions. The Bishop 2008 review notes that resistance-trained adults recover well from acute fatigue within 48–72 hours; a single bad session rarely warrants a whole-program intervention. Wait for the second session before reaching for the deload lever.
- **Travel / illness / injury are not deload triggers.** They're layoff triggers — see `detraining-after-layoff` and the skip-recalibration tiers. The recalibration ladder handles missed-session ramps differently from accumulated-fatigue deloads.
- **The "scheduled" cadence is a starting point, not a contract.** A user crushing a block with `easy/solid` ratings across all weeks doesn't *need* the scheduled deload as urgently — but skipping it is risky because subjective fatigue lags objective fatigue (Bell coaching survey 2022 / Delphi 2024). Default: take the scheduled deload even when the user feels fine.

## What this contradicts

- **"`tough` means deload."** No — `tough` at on-target reps with completion is the productive working dose. Deload triggers off `failed` clusters, not `tough`.
- **"Deload every 4 weeks no matter what."** Calendar-driven deloading without considering accumulated fatigue or training context over-deloads some lifters and under-deloads others. Scheduled deloads should align with mesocycle structure, and ad-hoc deloads should fire off real signals.
- **"One bad session = deload."** No. Single sessions are noise; patterns are signal.
- **"If I feel tired I should deload."** Subjective tiredness and training fatigue overlap but aren't identical. Tired ≠ overreached. Persistent multi-session degradation in performance is the signal, not "I felt tired today."

## Application in this app

- The engine handles scheduled deloads deterministically — week 6 of every 6-week block (`buildMesocycle.ts:617-651`). The user sees a deload session card with reduced volume/intensity per `deload-mechanics`.
- Ad-hoc deloads are **NOT** currently fired by the engine. The replan flow (`src/lib/planner/replan.ts` calling `replanMesocycle.ts`) is the place where multi-session fatigue patterns are reviewed and the next block can start with a reduced opening week. This is the Opus-driven nuance pass, gated on ≥18 check-ins.
- The LLM nuance layer (replan prompt) is told to look for `failed 2+ weeks same exercise` (`replanMesocycle.ts:22-58`) — that's the per-exercise stall pattern. For ad-hoc *whole-program* deload, the prompt currently uses `overall_feel ≤ 2.5` averaged across the block as a soft signal to cut `target_lifting_minutes`. Per the audit (§3), this is too blunt — the recommendation is to add MEV/MAV/MRV scaffolding and per-muscle-group aggregation.
- **DO NOT** prescribe a deload off a single `tough` rating. The LLM should narrate `tough + reps cleared` as "you got the dose — that's a working set." Engine code at `autoProgress.ts:354-369` already enforces this (hold, not deload).
- For users with `training_age_months < 12`, the LLM should weight rep-completion over effort rating in deload-decision narration — Halperin 2022 says they can't accurately self-report RIR.
- If the user explicitly self-reports illness / travel / extreme stress in session notes, the LLM nuance layer can suggest "skip this session" or "take an unplanned light session" — but this is NOT a deload, it's adaptive scheduling. Use the skip-recalibration ladder when they return.
