---
id: deload-prescription
type: principle
domain: programming-fundamentals
title: "Deload prescription — cut volume OR raise RIR, not both"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, fat_loss, athletic]
  training_age: [early, intermediate, advanced]
  sex: any
  injuries: []
tags: [deload, recovery, fatigue-management, mesocycle, periodization]
citations:
  - "Coleman M, Bell L, Helms E, Burke R, Schoenfeld BJ. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. Sports Med. 2024. PMC10511399."
  - "Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D. Gaining more from doing less? The effects of a one-week deload period during supervised resistance training on muscular adaptations. Eur J Appl Physiol. 2023;123(11):2371-2381."
  - "Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D. Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey. Sports Med Open. 2022;8(1):103."
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization, 2017."
related: [mesocycle-volume-progression, set-volume-landmarks, proximity-to-failure-rir]
contradicts: [myth-deload-makes-you-weaker, myth-must-train-hard-every-week]
---

# Deload prescription — cut volume OR raise RIR, not both

## Claim

A **deload** is a planned reduction in training stress (typically 1 week) that clears accumulated fatigue while preserving training adaptations. The 2024 Delphi consensus (Coleman et al., 21 expert practitioners) and Bell 2023 RCT converge:

- **Hold session frequency** (same number of training days).
- **Cut weekly volume by ~40–50%** (drop sets per exercise, OR drop exercises, OR both).
- **OR raise RIR by 1–2** (lighter relative effort), keeping volume similar.
- **Do not necessarily do both.** Volume is the dominant deload lever; reducing both volume AND intensity simultaneously over-deloads and may cost some adaptation.
- **Duration: ~5–7 days.** Returning at full training stress in the following week is the default.

**Cadence by training age:**
- Novice: 8–12 weeks (rare; deload only when performance stalls).
- Intermediate: every 5–6 weeks.
- Advanced: every 4–5 weeks.
- Or earlier if any **readiness trigger** fires: RPE creep ≥1 pt across 2 sessions, bar speed drop >10% from baseline, soreness >72h, sleep disruption ≥3 nights, 6+ weeks since last deload.

## Nuance

- **Cutting both volume and intensity is over-deloading.** It works (the user is recovered), but the user loses more training stimulus than needed. For a beginner-friendly app, slight over-deload is defensible — better than under-deloading and risking a flare-up. For trained lifters, prefer "either-or."
- **The deload is not a "break."** It's *reduced* training, not zero training. Movement and pattern practice continue. Total session count is preserved.
- **Skipping deloads is a common mistake** for "consistency-prone" users — they feel guilty cutting volume, push through, and start the next block with accumulated fatigue → smaller progression → eventual stall or injury. Frame deloads as *part of the training*, not as a rest break.
- **Acute fatigue ≠ inability to train.** A user with RPE creep + lingering soreness can still train; they just need lighter stimuli that week. The deload is the planned intervention, not an emergency rest.
- **Bar speed > 1RM as a deload trigger** — bar speed drops detect fatigue 1–2 sessions before 1RM regression. The app doesn't measure bar speed, but per-set "tough" rating creep + missed reps proxy this signal.
- **Returning from deload: don't bump weight on first session back.** Match Week 5's working weight in Week 7 (the post-deload week), reps and RIR at the prescribed targets. Adaptation/recovery shows up in *quality of execution*, not in heavier loads on day 1.
- **Detraining (>2 weeks off) ≠ deload.** Detraining requires a re-ramp (see `skipRecalibration.ts` and `docs/audits/2026-05-07-adaptive-logic-audit.md` §2).

## What this contradicts

- **"Deloads make you weaker."** Empirically false — Bell 2023 RCT showed no significant strength or hypertrophy loss after 1-week deload; lifters returned bar speeds and rep quality improved. (Myth: `myth-deload-makes-you-weaker`.)
- **"Real lifters train at full intensity 52 weeks a year."** Few lifters can sustain MAV+ training that long without overtraining or injury. The Delphi consensus is essentially universal among expert coaches. (Myth: `myth-must-train-hard-every-week`.)
- **"Just skip a week."** Total layoff (zero training) for 1 week is closer to detraining than a deload — pattern practice and movement maintenance are lost. Deload = reduced, not zero.

## Application in this app

- **Engine inserts a deload week at the cadence specified per block** (`buildMesocycle.ts` — currently week 6 of a 6-week block). Cadence by training age: novice = 10wk block, intermediate = 5–6wk, advanced = 4–5wk.
- **Deload week prescription** — current implementation cuts sets to 60% AND raises RIR by 1 (over-deloads). Audit §4 recommends switching to **either** cut volume to 50% **or** raise RIR by 1, not both. The "trainer-friendly default" for newer users could stay at both, but flag as deliberate.
- **Reactive deloads**: if the user reports two consecutive `tough` or `failed` sessions on the same lift with similar weights, OR reports `overall_feel ≤ 2` for 3+ sessions, OR misses ≥2 sessions in a week unplanned — surface a "consider deloading early" suggestion to the LLM nuance layer. Engine doesn't force; surfaces.
- **Post-deload bump**: do NOT bump load on the first session back from deload. Match the last working-set weight pre-deload; let the system observe rating and rep quality before resuming progression.
- **LLM nuance layer**: when introducing deload week, cite Coleman 2024 (Delphi consensus) and Bell 2023 (one-week deload preserves adaptations). Frame for the user: "This week we cut sets ~40% and you should feel under-worked at the gym — that's by design. Next week, we'll start the next block from a fully recovered baseline and the bar will move better." Do NOT say "we're resting" — say "we're letting fatigue clear so we can push next week."
- **Tendon ramp framing for returning users**: see also `docs/audits/2026-05-07-adaptive-logic-audit.md` §2 — when the user returns after 4–14 days off, frame as "easing tendons back" rather than "you got weaker."
