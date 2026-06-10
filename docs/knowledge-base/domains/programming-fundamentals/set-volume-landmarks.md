---
id: set-volume-landmarks
type: principle
domain: programming-fundamentals
title: "Set volume landmarks (MV / MEV / MAV / MRV) per muscle per week"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, glutes, aesthetics, general_fitness, fat_loss]
  training_age: any
  sex: any
  injuries: []
tags: [volume, landmarks, MEV, MAV, MRV, mesocycle, per-muscle]
citations:
  - "Israetel M, Hoffmann J, Smith C. Scientific Principles of Hypertrophy Training. Renaissance Periodization, 2017."
  - "Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis. J Sports Sci. 2017;35(11):1073-1082. PMID: 27433992. DOI: 10.1080/02640414.2016.1210197."
  - "Pelland JC, Robinson ZP, Remmert JF, et al. The Resistance Training Dose Response: Meta-Regressions. Sports Med. 2025. DOI: 10.1007/s40279-025-02344-w. (67 studies, 2058 participants; posterior probability of positive volume effect = 100%; diminishing returns identified)."
  - "Schoenfeld BJ, Contreras B, Krieger J, et al. Resistance Training Volume Enhances Muscle Hypertrophy but Not Strength in Trained Men. Med Sci Sports Exerc. 2019;51(1):94-103. PMID: 30153194."
  - "Helms ER, Morgan A, Valdez A. The Muscle & Strength Pyramid: Training, 2nd ed. 2019."
related: [hypertrophy-rep-ranges, training-frequency, volume-quality-vs-quantity, mesocycle-volume-progression, proximity-to-failure-rir]
contradicts: [more-volume-always-better]
---

# Set volume landmarks (MV / MEV / MAV / MRV) per muscle per week

## Claim

Weekly hard-set volume per muscle drives hypertrophy in a graded but diminishing-returns dose-response (Schoenfeld 2017 meta; Pelland 2025 meta-regression, posterior probability of positive volume effect = 100%). To organize prescription, the Renaissance Periodization framework defines four landmarks **per muscle per week** at RIR 0–3:

- **MV (Maintenance Volume)** — minimum to preserve current muscle mass.
- **MEV (Minimum Effective Volume)** — minimum to produce any new growth.
- **MAV (Maximum Adaptive Volume)** — range producing near-maximal growth per unit fatigue.
- **MRV (Maximum Recoverable Volume)** — upper ceiling; beyond it, recovery breaks down and growth regresses.

The progression within a mesocycle: start at MEV, climb toward MAV / brush MRV, deload, repeat. **A "hard set" is one within 0–3 RIR**; sets further from failure don't count toward these landmarks.

Concrete starting numbers (hard sets/muscle/week, from Israetel/RP synthesizing Schoenfeld dose-response data):

| Muscle | MV | MEV | MAV | MRV |
|---|---|---|---|---|
| Chest | 4–6 | 8 | 12–16 | 20–22 |
| Back | 6–8 | 10 | 14–20 | 22–25 |
| Shoulders (side/rear delt) | 4–6 | 8 | 14–20 | 22–26 |
| Biceps | 4–6 | 8 | 14–20 | 20–26 |
| Triceps | 4–6 | 6–8 | 10–14 | 18–22 |
| Quads | 6–8 | 8–10 | 12–18 | 20 |
| Hamstrings | 4–6 | 6 | 10–14 | 16–20 |
| Glutes | 0–4 | 4–6 | 8–12 | 16+ |
| Calves | 6–8 | 8 | 12–16 | 20 |
| Core (anti-movement) | 0–4 | 4 | 8–12 | 15 |

## Nuance

- **Numeric landmarks are extrapolated**, not directly RCT-validated per muscle. The meta-analytic dose-response (Schoenfeld 2017, Pelland 2025) supports a *general* graded-with-diminishing-returns shape; the specific per-muscle numbers are the RP team's clinical synthesis. Treat them as **starting points**, not laws.
- **Training age shifts the personal MAV/MRV.** Novices get full stimulus near MEV — going to MRV produces only fatigue, not extra growth. Advanced lifters often need volumes near the top of the published MAV range to see further hypertrophy.
- **Age, sleep, stress, diet shift recovery capacity** — a fatigued, undersleeping, undereating user's personal MRV is lower than a recovered user's. The numbers above assume reasonable recovery.
- **Indirect work counts (partially).** Bench presses contribute to triceps; rows contribute to biceps. Pelland 2025 distinguished direct vs indirect sets and found indirect sets contribute partial volume. The engine should count indirect sets as ~0.5 toward the secondary muscle.
- **Single-muscle prioritization shifts the budget.** A "lagging chest" mesocycle pushes chest toward upper-MAV/MRV while holding back/legs at MEV–MAV. You can't push every muscle to MRV simultaneously — total systemic recovery doesn't allow it.
- **Injuries cap volume on the affected muscle at MEV** until cleared (see injury-matrix in `docs/research/00-MASTER-SYNTHESIS.md` and per-injury KB entries).
- **Fat-loss / calorie deficit reduces recovery capacity** — keep volume in the lower end of MAV, never push MRV. Use intensity (load) as the maintenance lever, not extra sets (R2 P9 in master synthesis).

## What this contradicts

- **"More volume is always better."** False above MRV; growth plateaus then regresses. (Myth: `myth-more-volume-always-better`.)
- **"3 sets of 10 is the universal prescription."** Static 9-set-per-muscle-per-week doesn't account for muscle-specific recovery (calves and back tolerate far more than triceps) or individual variation. (Myth: `myth-one-size-volume-fits-all`.)
- **"Junk volume" claims that <5 sets/muscle/wk does nothing.** False; even 2–4 sets at MV/MEV preserves and produces some growth — see also `volume-quality-vs-quantity` for the inverse misconception.

## Application in this app

- **Engine MUST track weekly hard-set volume per muscle group.** Indirect work counted at ~0.5x toward the secondary muscle.
- **Every generated week MUST hit MEV for each trained muscle group.** If sessions_per_week + time budget doesn't allow MEV for all muscles, the engine should drop muscles in priority order (priority muscles keep MEV; deprioritized muscles drop to MV) rather than under-dose everything.
- **Accumulation weeks** push toward MAV. Nothing exceeds MRV in any generated week.
- **Training-age caps**:
  - Novice: cap weekly volume at MEV + 2 sets per muscle (low end of landmarks).
  - Intermediate: start mesocycle at MEV → progress toward MAV by week 3–4 → deload.
  - Advanced: may briefly touch MRV in the last accumulation week before deload.
  - Age 55+: cap at intermediate MAV top.
  - Injury on affected muscle: cap at MEV.
- **Fat-loss overlay**: MAV cap; preserve intensity (load × RIR) rather than chase volume.
- **LLM nuance layer**: when explaining a set count to the user, refer to MEV / MAV without jargon — e.g., "your back is getting ~14 weekly hard sets; that's solidly in the productive range for an intermediate lifter, not so much that we'd compromise recovery on your other days." Cite Schoenfeld 2017 dose-response and Pelland 2025 for the underlying graded relationship. Do NOT promise specific size outcomes from specific set numbers — the meta-analytic effect is real but modest per-set.
