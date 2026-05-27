---
id: proximity-to-failure-rir
type: principle
domain: programming-fundamentals
title: "Proximity to failure (RIR 0–3)"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, athletic]
  training_age: any
  sex: any
  injuries: []
tags: [RIR, RPE, proximity-to-failure, effort, autoregulation, fatigue]
citations:
  - "Grgic J, Schoenfeld BJ, Orazem J, Sabol F. Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: A systematic review and meta-analysis. J Sport Health Sci. 2022;11(2):202-211. PMID: 33497853. DOI: 10.1016/j.jshs.2021.01.007."
  - "Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis. Sports Med. 2023;53(3):649-665. PMID: 36334240. DOI: 10.1007/s40279-022-01784-y."
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49. DOI: 10.1519/SSC.0000000000000218."
  - "Zourdos MC, Klemp A, Dolan C, et al. Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. J Strength Cond Res. 2016;30(1):267-275. PMID: 26049792."
  - "Stronger by Science. Reps in Reserve: Overshooting and Undershooting. https://www.strongerbyscience.com/reps-in-reserve/"
related: [hypertrophy-rep-ranges, strength-rep-ranges, set-volume-landmarks, autoregulation-rir-novices-vs-trained, volume-quality-vs-quantity]
contradicts: [myth-every-set-to-failure, myth-failure-required-for-growth, myth-no-pain-no-gain]
---

# Proximity to failure (RIR 0–3)

## Claim

Sets must be taken **reasonably close to failure** to produce maximal hypertrophy, but training to absolute failure on every set is **not required and is often counterproductive**. Stopping ~0–3 reps shy of failure (RIR 0–3) produces statistically equivalent hypertrophy to training to failure, with substantially less fatigue and better session-to-session recovery (Grgic 2022 meta; Refalo 2023 meta).

**Practical default:**
- **Compound lifts** (squat, deadlift, bench, OHP, row, weighted pull-up): **1–3 RIR.** Save failure for the final set of isolation work only.
- **Isolation lifts** (curls, lateral raises, leg extensions, calves): **0–2 RIR**, the last set of a movement can go to true failure.
- **Lower-load training (<50% 1RM)**: push closer to failure (0–1 RIR); the stimulus only "lands" when fibers are recruited.
- **Heavy strength work (>80% 1RM)**: stay further from failure (2–4 RIR) to manage CNS fatigue and preserve next-session quality.

## Nuance

- **"Hard set" definition.** Volume landmarks (MEV/MAV/MRV) are counted in *hard sets* — RIR 0–3. A set stopped at RIR 5 doesn't count for growth purposes; it counts as warmup/practice volume.
- **Novices systematically misestimate RIR.** They tend to *underestimate* proximity to failure — i.e., they call "RIR 2" when they actually have 5–6 left in the tank ([Stronger by Science RIR overshoot/undershoot](https://www.strongerbyscience.com/reps-in-reserve/)). For novices, prefer load × reps prescription (e.g., "3×8 @ this weight") and use RIR informationally, not as the primary intensity dial. Accuracy improves with ~1–2 years of training history.
- **Failure has a place — sparingly.** Last set of an isolation movement, AMRAP testing, late-mesocycle intensity weeks. Defaulting every set to failure burns out recovery and produces no extra growth (Grgic 2022).
- **Effort matters more for hypertrophy than reps or load.** The meta-analyses converge: rep range can be wide (5–30); load can be moderate to heavy; what doesn't move is the requirement that the working sets be hard. A "junk set" (RIR 5+) is a warmup, not a working set.
- **Different muscles tolerate proximity to failure differently.** Heavy bilateral lower-body work (back squat, deadlift) close to failure carries large CNS cost. Small isolation work (lateral raises, curls) costs almost nothing per failure set. This is why advanced techniques (drop sets, rest-pause) live on isolations, not compounds.
- **Strength prefers further from failure.** Heavy 3RM at RIR 3 is *more strength-specific* than a 3RM grinder at RIR 0 — bar speed and execution quality matter for 1RM transfer. Hypertrophy is the opposite: closer to failure (within the safe band) gives slightly better signal.

## What this contradicts

- **"Every set to failure or you're leaving gains on the table."** Empirically false (Grgic 2022 meta — no significant hypertrophy benefit; significant favor to non-failure on strength). (Myth: `myth-every-set-to-failure`.)
- **"No pain no gain."** Pain is a signal of pushing limits, but absolute failure isn't required for adaptation. (Myth: `myth-no-pain-no-gain`.)
- **"If you're not failing, you're not growing."** False; RIR 1–3 grows muscle as well as RIR 0. (Myth: `myth-failure-required-for-growth`.)

## Application in this app

- **Engine**: every prescribed work set carries a `(load, reps, RIR)` triple — RIR populated from this table:
  - Compound main lifts (squat/DL/bench/OHP/row): RIR 1–3.
  - Compound accessory (split squat, RDL, incline DB, chest-supported row): RIR 1–2.
  - Isolation: RIR 0–2; last set of the movement can be RIR 0 / "to failure."
  - Heavy strength singles/doubles (>85% 1RM): RIR 2–3.
- **Hard-set counting**: only sets with RIR ≤ 3 are counted toward weekly volume landmarks. The engine's volume tracker must respect this.
- **Novice override** (training_age ≤ 6 months): prescribe via fixed reps × load (e.g., "3×8 at this weight"). Show RIR informationally ("aim for ~2 reps left at the end of each set"). Do not autoregulate off novice-reported RIR.
- **Intermediate** (6–24 months): prescribe RIR directly. Cross-block progression: Week 1 @ RIR 3 → Week 2 @ RIR 2 → Week 3 @ RIR 1 → Week 4 @ RIR 0–1 → deload.
- **Advanced** (24+ months): full RIR-based autoregulation; daily adjustment is acceptable.
- **LLM nuance layer**: when the user asks "should I go to failure?" cite Grgic 2022 and Refalo 2023 — equivalent hypertrophy, less fatigue, faster recovery at RIR 1–3. Encourage saving failure for the last set of isolations. Do NOT tell a novice to gauge RIR — instead frame in load/reps language.
- **Per-exercise rating UX**: the `easy / on it / cooked` after-set tap maps to inferred RIR (`easy` ≈ RIR 4+, `on it` ≈ RIR 1–3, `cooked` ≈ RIR 0 or true failure). Used by `autoProgress` to decide bump/hold/drop — see `docs/audits/2026-05-07-adaptive-logic-audit.md` §1.
