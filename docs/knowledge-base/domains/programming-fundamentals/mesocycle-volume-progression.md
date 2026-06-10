---
id: mesocycle-volume-progression
type: principle
domain: programming-fundamentals
title: "Mesocycle volume progression — MEV → MAV → deload"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics]
  training_age: [early, intermediate, advanced]
  sex: any
  injuries: []
tags: [mesocycle, volume-progression, deload, block-structure, periodization]
citations:
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization, 2017."
  - "Helms ER, Morgan A, Valdez A. The Muscle & Strength Pyramid: Training, 2nd ed. 2019."
  - "Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D. Effects of a one-week deload on muscular adaptations following supervised resistance training. Eur J Appl Physiol. 2023;123(11):2371-2381."
  - "Coleman M, Burke R, Augustin F, et al. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. Eur J Appl Physiol. 2023."
  - "Coleman M, Bell L, Helms E, Burke R, Schoenfeld BJ. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. Sports Med. 2024. PMC10511399."
  - "Renaissance Periodization. Training Volume Landmarks for Muscle Growth. https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth"
related: [set-volume-landmarks, proximity-to-failure-rir, deload-prescription, autoregulation-rir-novices-vs-trained]
contradicts: []
---

# Mesocycle volume progression — MEV → MAV → deload

## Claim

A productive **mesocycle** (training block, typically 4–6 weeks) climbs from MEV (minimum effective volume) toward MAV (maximum adaptive volume) per muscle per week, then ends with a deload. The progression vehicle is *added sets* — typically 1–2 sets per muscle per week — at sustained RIR 1–3 effort. When fatigue markers fire (persistent RPE creep, performance regression, sleep disruption), deload.

**Typical RP-style block structure:**
- **Week 1**: Start at MEV. Reasonable RIR (2–3). User feels under-worked. That's correct.
- **Week 2**: +1–2 sets/muscle. RIR 2.
- **Week 3**: +1–2 more sets/muscle. RIR 1–2. Approaching MAV.
- **Week 4**: +1 set if recovery holds; otherwise hold sets. RIR 1. Approaching personal MRV.
- **Week 5** (in 5–6 week blocks): may hold or push to MRV briefly. RIR 0–1.
- **Final week**: deload — cut volume ~40–50% OR raise RIR by ~2, but not both (Delphi consensus 2024).

After deload, the next block can start at MEV again (or slightly higher if the previous block went well) and climb again.

## Nuance

- **This is one paradigm, not the only one.** "Add load, fixed sets" (StrongLifts, 5/3/1, the current build of this app) is also valid — see Liftosaur, NSCA — and is preferable for novice strength. RP/MEV→MAV is the dominant *hypertrophy* paradigm for intermediates/advanced. Both produce growth.
- **The numeric landmarks are starting points** (`set-volume-landmarks`); personal MAV/MRV varies. Use rating signals to detect when the user has hit their ceiling early — RPE creep, missed reps, persistent soreness — rather than blindly following the +sets schedule.
- **Block length is goal-driven**:
  - `size` / `mixed` goals → 5–6 weeks works well
  - `strength_power` → 4–5 weeks (heavier blocks accumulate fatigue faster)
  - `work_capacity` → 4 weeks
  - Novices → 8–12 weeks before a deload is even necessary (low absolute fatigue)
- **Within-block load progression** is decoupled from volume progression in this paradigm — RP runs constant or near-constant load, climbing reps within the rep range and adding sets. Other paradigms (block periodization) climb load instead. This app currently runs a hybrid: weekly load nudges (suggested-seed × 1.025/wk) plus autoProgress from check-ins.
- **The seed-vs-autoProgress race** flagged in `docs/audits/2026-05-07-adaptive-logic-audit.md` §4 is a real bug — the planner bumps suggested weight monotonically while check-ins independently drive working weight. Either drop the weekly seed bump (simpler) or wire seed to respect autoProgress signals.
- **Skip / detraining** disrupts the progression: 8–14 days off → step back one week; 14+ days off → re-ramp (see `skipRecalibration.ts` and the audit). Don't try to "catch up" on volume — start a fresh climb.
- **The "1–2 sets per week" climb is a guideline.** Some users tolerate 3 sets/wk increases; others top out at +0 by week 2. Per-user recoverability is the truth.

## What this contradicts

- **"Add weight every session forever."** Works for novices (months); doesn't work for intermediates (stalls); fails for advanced (overtraining). Different progression model needed at each stage. (Myth: `myth-add-weight-forever`.)
- **"Deload makes you weaker."** Detraining literature shows ≤4 weeks of *full* layoff doesn't meaningfully reduce strength in trained lifters; a 1-week reduced-volume deload retains all adaptations and improves bar speed / quality afterward. (Myth: `myth-deload-makes-you-weaker`.)
- **"You should feel destroyed every week."** No — week 1 of a fresh block at MEV should feel *easy*. That's by design — it lets the climb begin from a recovered baseline.

## Application in this app

- **Engine builds 6-week mesocycles by default** (`buildMesocycle.ts`), with week 6 as deload. Length is goal-driven (5 weeks for `strength_power`, 6 for `size`/`mixed`).
- **Within-block progression** — current implementation:
  - Suggested-weight seed: `factor = 1 + 0.025*(week-1)`, week 1 and deload week static.
  - AutoProgress overrides per-exercise weight from check-in rating + reps cleared.
  - Set count is fixed across weeks 1–5 in current build. (Future: shift to RP-paradigm "+1 set/wk" for `size` goal — flagged in audit §4 as Phase 4 work.)
- **End-of-block re-plan** (`replan.ts`) reads check-ins; the LLM should reason about MEV→MAV landmarks when adjusting set counts for next block. The replan prompt (`replanMesocycle.ts`) needs the MEV/MAV/MRV scaffolding added — see audit §3.
- **Deload prescription**: see `deload-prescription`. Default = cut sets 40–50%, hold load+RIR. (Current build cuts both volume *and* raises RIR — over-deloads per Delphi consensus; should be either-or.)
- **LLM nuance layer**: when explaining "we're cutting sets for this week" or "we're adding a set to your back this week," cite Israetel/RP volume landmarks (Schoenfeld 2017 dose-response is the underlying meta) and frame as "this is the climb / this is the recovery." Do NOT use "muscle confusion" or "shock the muscle." Do NOT claim the deload makes the user weaker — frame it as "letting accumulated fatigue clear so the next block starts strong."
