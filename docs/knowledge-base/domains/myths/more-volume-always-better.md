---
id: more-volume-always-better
type: myth
domain: myths
title: "Myth: More sets / more volume = more gains (no ceiling)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [volume, mev, mrv, dose-response, recovery, hypertrophy]
citations:
  - "Pelland JC, Robinson ZP, Remmert JF, et al. The resistance training dose response: meta-regressions exploring the effects of weekly volume and frequency on muscle hypertrophy and strength gains. Sports Med 2024 (preprint/2025 publication)."
  - "Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and muscle mass. J Sports Sci 2017; 35(11):1073-1082."
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization 2017. (MEV/MAV/MRV framework.)"
  - "Helms ER, Morgan A, Valdez A. The Muscle and Strength Pyramid: Training 2nd ed. 2019."
related: [train-to-failure-every-set, soreness-is-progress]
contradicts: []
---

# Myth: More sets / more volume = more gains, always

## The myth (verbatim)
"Bigger workout = more growth." "If 10 sets is good, 20 must be better." "I'll just do more — there's no such thing as too much training."

## Why the myth persists
- The dose-response relationship between volume and hypertrophy IS positive in the lower-to-middle ranges, so the heuristic "more = more" gets reinforced early in training.
- Influencers showing "leg day from hell" 30-set sessions imply this is how serious training looks.
- The negative consequences of overvolumeing (chronic fatigue, stalled progression, injury) take weeks to manifest — much longer than the "I did a huge workout" feedback loop.

## What the research actually says
1. **Volume drives hypertrophy** — to a point. Schoenfeld 2017 dose-response meta found increasing weekly sets correlated with greater hypertrophy across the studied range (up to ~10-20+ sets/muscle/week).
2. **Pelland 2024 meta-regression** (67 studies, 2,058 subjects): the dose-response curve has **diminishing returns**. Approximately +0.24% hypertrophy per additional set at the average weekly volume of ~12 fractional sets. Past a certain volume, additional sets yield negligible (and eventually negative) returns.
3. **Maximum Recoverable Volume (MRV)** framework (Israetel et al.; Helms et al.): for each muscle group, there's a weekly volume ceiling beyond which the lifter accumulates fatigue faster than they can recover. Cross that ceiling repeatedly and progress stalls or reverses.
4. **Approximate per-muscle weekly volume landmarks** (from master synthesis R1 P2):
   - Chest: MV 4-6, MEV 8, MAV 12-16, MRV 20-22
   - Back: MV 6-8, MEV 10, MAV 14-20, MRV 22-25
   - Quads: MV 6-8, MEV 8-10, MAV 12-18, MRV 20
   - These are starting points, individual variation is large.

## The corrected understanding
- Volume is a *bounded* variable, not an unlimited lever.
- Optimal volume is somewhere in MEV → MAV range for most accumulation work; touching MRV briefly is an advanced technique used immediately before a deload.
- Beyond MRV: you accumulate fatigue, lose recovery between sessions, get sloppier reps, and either plateau or get injured.
- More volume isn't even strictly "more growth" up to MRV — diminishing returns kick in earlier (Pelland 2024).
- The right amount depends on training age, individual recovery, and the muscle group.

## Application in this app
- Engine: every plan respects volume landmarks (MV / MEV / MAV / MRV per muscle per week). Novice cap = MEV + 2; intermediate target = MEV → MAV across mesocycle; advanced may touch MRV in the last accumulation week before deload.
- HomeScreen volume chip must not present a synthetic "total lb" number as if it's a meaningful metric (per myth_sweep_settings.md M1). If shown, must be "hard sets/week" against per-muscle landmarks.
- LLM nuance layer: when the user asks "can I add more sets?", check current volume against landmarks. If under MEV, yes. If at MAV, maybe but watch fatigue. If at MRV, the answer is "no — and probably back off."
- StreakBadge / "consecutive day" framing must not implicitly reward overvolumeing (per myth_sweep_settings.md S1).

## App surfaces where this myth used to appear
- `src/components/HomeScreen.tsx:258-259, 423-428` — synthetic `setsDone * 10` "volume" chip presented as `lb` (flagged for removal; should be hard sets/week vs landmarks).
- `src/components/HomeScreen.tsx:319, 462-486` — `StreakBadge` rewards consecutive-day sessions without volume/recovery context (flagged; should count sessions-in-plan, not raw days).
- `src/components/CardioGoals.tsx:447-462` — "Goal Complete!" celebration for cumulative minute targets imports the same myth into cardio (flagged for revision to consistency-based goals).
