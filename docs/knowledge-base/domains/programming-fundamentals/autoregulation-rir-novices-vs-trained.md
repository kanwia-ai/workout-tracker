---
id: autoregulation-rir-novices-vs-trained
type: principle
domain: programming-fundamentals
title: "RIR-based autoregulation accuracy by training age"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness]
  training_age: any
  sex: any
  injuries: []
tags: [RIR, RPE, autoregulation, training-age, novice, intermediate, advanced]
citations:
  - "Zourdos MC, Klemp A, Dolan C, et al. Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. J Strength Cond Res. 2016;30(1):267-275. PMID: 26049792."
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49. DOI: 10.1519/SSC.0000000000000218."
  - "Helms ER, Storey A, Cross MR, et al. RPE and Velocity Relationships for the Back Squat, Bench Press, and Deadlift in Powerlifters. J Strength Cond Res. 2017;31(2):292-297. PMID: 27243918."
  - "Halperin I, Malleron T, Har-Nir I, et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-Analysis. Sports Med. 2022;52(2):377-390."
  - "Stronger by Science. Reps in Reserve: Overshooting and Undershooting. https://www.strongerbyscience.com/reps-in-reserve/"
  - "Helms ER, Byrnes RK, Cooke DM, et al. RPE vs. Percentage 1RM Loading in Periodized Programs Matched for Sets and Repetitions. Front Physiol. 2018;9:247."
related: [proximity-to-failure-rir, hypertrophy-rep-ranges, strength-rep-ranges, load-intensity-zones]
contradicts: [myth-everyone-can-feel-rir, myth-rir-objective-measurement]
---

# RIR-based autoregulation accuracy by training age

## Claim

The **Zourdos RIR-based RPE scale** (1–10, where RPE 10 = 0 RIR / true failure) correlates strongly with bar velocity and %1RM in experienced lifters. Accuracy in self-rating proximity-to-failure improves with training age.

**Novices systematically misestimate RIR**, almost always **under-estimating their reps left** — calling "RIR 2" when they actually have 5–6 reps in reserve (Halperin 2022 scoping meta-analysis; Stronger by Science RIR overshoot/undershoot analysis). The error narrows with ~1–2 years of consistent, near-failure training experience.

**Implication for prescription:**
- **Novice** (< 12 months consistent training): prescribe **sets × reps at fixed load**. Mention RIR informationally ("aim for ~2 reps left at the end of each set") but do NOT use novice-reported RIR as the primary autoregulation signal.
- **Intermediate** (12–24 months): prescribe RIR directly (e.g., "3×8 @ RPE 8 / 2 RIR"). Begin trusting the user's self-reports.
- **Advanced** (24+ months): full RIR-based daily autoregulation. The user's RIR estimate is reasonably accurate; daily adjustment is reliable.

## Nuance

- **Why novices under-estimate.** Two reasons: (1) they've rarely or never trained to true failure, so they don't know what RIR 0 actually feels like — their internal scale is anchored to "this feels uncomfortable" rather than "muscle cannot produce another concentric rep." (2) Effort tolerance has a learnable ceiling; novices stop sets earlier than physiologically necessary.
- **Helms 2018** (RPE vs %1RM loading in periodized programs, *Frontiers in Physiology*) found similar strength outcomes when both groups followed the same volume — i.e., for trained lifters, RIR-based autoregulation is at least equivalent to fixed %1RM. The advantage of RIR-based is daily adjustment to readiness.
- **Bar velocity is the objective ground truth** (Pareja-Blanco velocity-loss series 2017–2020). The app doesn't measure velocity — so the user's rating + reps cleared serves as a proxy. This is noisier than velocity but practical.
- **The 4-bucket subjective scale** (`easy / on it / cooked / failed`) used in this app's check-ins is a reasonable compromise — coarser than RIR 0–10, but more reliable for novices than asking them to nail RIR 2 vs RIR 3.
- **Per-set RIR vs whole-set rating** — the audit notes (`docs/audits/2026-05-07-adaptive-logic-audit.md` §5) that adding optional per-set RIR (1–4 numbers per set) would tighten fatigue tracking for intermediate+ users. Don't make required.
- **RIR estimation accuracy is context-dependent.** Even trained lifters misestimate when: (a) the load is at the extreme low end (<30% 1RM) — many more reps left than they think; (b) the exercise is unfamiliar; (c) fatigue is high (late session or late in a block).

## What this contradicts

- **"Anyone can learn to feel their RIR after a few weeks."** Possible but the Halperin 2022 meta shows accuracy is poor in novices and improves slowly with focused near-failure practice. (Myth: `myth-everyone-can-feel-rir`.)
- **"RIR is objective."** False — it's a self-report subject to all the usual self-report errors (effort tolerance, motivation, framing). Useful, but not measurement. (Myth: `myth-rir-objective-measurement`.)

## Application in this app

- **Onboarding** asks for `training_age_months` and routes accordingly.
- **Novice path** (`training_age_months < 12`): the per-set prescription shows reps and load explicitly; the RIR target is shown as guidance text ("aim for ~2 reps left"). Auto-progression uses the `easy/on it/cooked/failed` rating + reps cleared, NOT a self-reported RIR number.
- **Intermediate path** (12–24 months): per-set prescription shows reps + load + RIR target. Check-in includes the 4-bucket rating, optionally per-set RIR. Auto-progression weighs rating + reps + RIR.
- **Advanced path** (24+ months): per-set prescription is RIR-anchored ("4×6 @ RIR 1"); the load is suggested but the user adjusts daily to hit the prescribed RIR. The check-in primarily logs actual reps + RIR.
- **The novice → intermediate transition trigger** (per master synthesis): two consecutive failed LP attempts at the same load on a main lift within one month, OR `training_age_months ≥ 6` with consistent practice.
- **LLM nuance layer**: when explaining "why we're not using RIR" for a novice, cite Halperin 2022 and Zourdos 2016 — accuracy improves with experience. For an intermediate, cite Helms 2018 (RPE-based programs match %1RM-based programs in outcome). Frame for the novice: "We're keeping you on a specific weight and rep target for now — once you've felt what 'truly close to failure' feels like a few times, we'll switch you to a feel-based system that's more flexible day-to-day." Do NOT ask a novice for RIR numbers as the primary autoregulation signal.
