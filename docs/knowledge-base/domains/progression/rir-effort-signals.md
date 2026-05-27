---
id: rir-effort-signals
type: principle
domain: progression
title: "Per-set effort rating is more informative than load alone"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [rir, rpe, autoregulation, effort, per-set-rating, feedback-loop]
citations:
  - "Zourdos MC, Klemp A, Dolan C, Quiles JM, Schau KA, Jo E, Helms E, Esgro B, Duncan S, Garcia Merino S, Blanco R. Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve. J Strength Cond Res. 2016;30(1):267-275. PMID: 26049792."
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49. DOI: 10.1519/SSC.0000000000000218."
  - "Larsen S et al. Autoregulation methods for resistance training: a systematic review/meta-analysis. PeerJ ~2021 / PMC12336695 (cited in audit §1 as 'autoregulated resistance training: 2025 systematic review and network meta-analysis'). Confidence: MEDIUM on exact citation metadata; the CLAIM (autoregulation matches/beats percentage-based prescription for strength outcomes) is well-supported across multiple reviews."
  - "Halperin I et al. Accuracy in predicting repetitions to task failure in resistance exercise: a scoping review and exploratory meta-analysis. Sports Med. 2022. (Confidence: HIGH on existence and CLAIM — novices systematically underestimate proximity to failure; MEDIUM on exact PMID/DOI.)"
  - "Stronger by Science. Reps in Reserve — overshooting and undershooting. https://www.strongerbyscience.com/reps-in-reserve/ (accessed 2026-05)."
related: [progressive-overload-variables, double-progression, bump-vs-hold-vs-drop-rules, when-to-bump-judgment]
contradicts: [myth-load-alone-tracks-progress, myth-novices-can-estimate-rir-accurately]
---

# Per-set effort rating is more informative than load alone

## Claim

The triad of **(load, reps completed, effort)** is more informative for progression decisions than any one variable in isolation. Load alone tells the engine what the bar weighed; reps alone tell it how many were completed; effort tells it **how close to failure the user actually was** — which is the real driver of adaptation (Helms 2016; Zourdos 2016).

A standardized **RIR (reps-in-reserve)** scale anchors effort to a concrete count: "RIR 0" = couldn't have done one more, "RIR 3" = could have done three more. The Zourdos 2016 scale is the resistance-training-specific RPE measure most validated in the literature.

For practical app use, a **3- or 4-bucket subjective scale** (`easy / on it / cooked` per set, or `easy / solid / tough / failed` per exercise) is a reasonable compromise:

- Larsen 2021 systematic review: autoregulation methods (RIR/RPE-driven prescription) consistently match or beat percentage-based prescription for strength outcomes.
- Halperin 2022 meta: novices systematically *underestimate* proximity to failure (they think they have more reps in reserve than they do). Trained lifters are reasonably accurate within ±1 rep at RIR 0–3.
- A 3-tap scale is low enough cognitive cost to capture per-set without breaking flow — the coaching philosophy explicit goal ("the user's body is the source of truth, not the spreadsheet"; "every static prescription needs a feedback loop").

A per-set tap captures within-exercise drift (e.g., set 1 `easy`, set 4 `cooked` — a productive working set; vs. set 1 `cooked`, set 4 `cooked` — load too heavy from the start). A single end-of-exercise rating loses that gradient.

## Nuance

- **Novices are bad at RIR.** Halperin 2022: in untrained lifters, the gap between perceived RIR and actual RIR can be 3–5 reps — they stop "at RIR 2" when they had 5 more reps in the tank. Implication: a 4-bucket subjective scale (`easy/solid/tough/failed`) is more honest for novices than asking them to estimate "RIR = 1.5". Accuracy improves with training age and deliberate practice (Halperin 2022; Stronger by Science).
- **The scale ceiling matters.** "Tough" is the *target* for hypertrophy work (~RIR 1–3); "cooked" is the *target* for AMRAP sets and final isolation sets (RIR 0–1). Reading "tough" as bad and prescribing a deload is a mis-read. See `deload-triggers`.
- **A single bad rating doesn't mean stop.** Within a session, a "cooked" rating on set 3 of 4 followed by completing set 4 at target reps is normal and good — the working sets EARNED the prescribed stimulus. The pattern that triggers caution is **session-to-session degradation** at the same load (last week tough → this week failed).
- **Effort signals are personal.** One user's `tough` is another's `easy` for the same RIR. The signal is most informative *over time for the same user* — relative to their own baseline — not absolutely across users.
- **Effort + reps + load together close the loop.** A set rated `easy` that hit 10 of 10 reps at 100 lb earns a full bump. The same `easy` rating with only 7 of 10 reps means the user paced for completion at a load that was too heavy — closer to a hold than a bump.

## What this contradicts

- **"Just look at the bar — if the weight is going up, you're progressing."** Load-only progress tracking misses stalled effort (lifter grinding at RIR 0 every week and not adding load, when they should be backing off) and missed bumps (lifter cleared an exercise at RIR 3 and the engine didn't know to push). Effort closes the loop.
- **"Novices should track RIR like everyone else."** They can't accurately; the scale must be coarser (a 3-bucket subjective tap, not numeric RIR) and the engine must rely more on rep-completion as the harder signal.

## Application in this app

- The engine captures per-set effort via the `set_ratings` field on `ExerciseCheckin` (`src/types/checkin.ts:23-24, 42`) — a 3-state taxonomy `easy | on it | cooked`. This maps to the 4-state session-end `ExerciseRating` (`easy | solid | tough | failed`) via `aggregateSetRatings()` in `src/types/checkin.ts:98-108`.
- `autoProgress.ts:47-53` prefers the aggregated per-set rating over the session-end chip when present — "the in-flow taps are the source of truth per the coaching philosophy" (code comment). This is correct: per-set taps capture the user's real-time face-reading; the end-of-session chip is a summary that loses gradient.
- The 3-tap scale **does not include `failed`** — that's captured implicitly when the user fails to check a set off (no rep completion). The 4-tap scale at session end DOES include `failed` because by then the user is reflecting on whether they hit reps.
- The LLM nuance layer should treat `easy/solid/tough/failed` as ordinal effort signals, not as commands. `tough` at RIR 1–3 is the *target* for hypertrophy — DO NOT auto-suggest a deload off a single `tough` rating. See `deload-triggers`.
- The UI's per-set rating tap is a `condition-based-waiting` style affordance: it captures the coach's eye-test ("you look cooked / you look easy") that the engine otherwise can't see. Without this, the engine is guessing from load and rep completion only.
- When per-set ratings are absent (user didn't tap inline), the engine falls back to the session-end chip — which is still better than nothing. Both paths exist in production.
- The LLM should never quote a numeric RIR to a user whose `training_age_months < 12` — substitute the bucket vocabulary ("tough / on it / easy") because Halperin 2022 shows novices can't ground the RIR number.
