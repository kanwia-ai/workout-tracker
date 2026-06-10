---
id: bump-vs-hold-vs-drop-rules
type: pattern
domain: progression
title: "Bump vs. hold vs. drop — decision tree from prior-session signal"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [progression, decision-tree, autoprogress, bump, hold, drop, deload-vs-drop]
citations:
  - "Plotkin D et al. Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. PeerJ. 2022. (Confidence: MEDIUM on exact citation metadata.)"
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49. DOI: 10.1519/SSC.0000000000000218."
  - "American College of Sports Medicine. Position Stand: Progression Models in Resistance Training for Healthy Adults. Med Sci Sports Exerc. 2009;41(3):687-708. PMID: 19204579."
  - "Stronger by Science. How to Choose the Right Load Progression Strategy. https://www.strongerbyscience.com/weekly-load-progression/ (accessed 2026-05)."
related: [double-progression, rir-effort-signals, autoprogress-by-training-age, progressive-overload-variables, deload-mechanics]
contradicts: []
---

# Bump vs. hold vs. drop — decision tree from prior-session signal

## Claim

The honest decision for next-session load on a given exercise is a function of THREE prior-session signals:

1. **Effort rating** (per-set aggregate or session-end chip): `easy / solid / tough / failed`
2. **Rep completion**: did the user clear the FLOOR of the prescribed range, the CEILING (top of the range), or miss reps entirely?
3. **History of misses at this load**: is this the user's first stumble, or are we seeing a stall pattern across recent sessions?

Combining these yields the following decision table. Use these as the engine's deterministic defaults — the LLM nuance layer narrates the result rather than overriding it.

| Rating | Reps cleared | History | Action | Notes |
|---|---|---|---|---|
| `easy` | ceiling hit (top of range, all sets) | n/a | **full bump** | The bar was too light. Take the full increment for training age. |
| `easy` | floor only (didn't hit ceiling) | n/a | **half bump** | Forward motion warranted but not full credit — they're still climbing inside the range. |
| `solid` | ceiling hit | n/a | **full bump** | On-target effort + earned the top → load progresses. |
| `solid` | floor only | n/a | **half bump** OR hold + add 1 set | Half bump is the simpler default. Adding a set is a volume-side alternative when the engine wants to keep stimulus rising without raising load. |
| `tough` | ceiling hit | n/a | **half bump** | They earned forward motion — hitting the top of the range despite it being hard is a real signal. The half bump preserves progress without overshooting. |
| `tough` | floor only | n/a | **hold** | Target stimulus reached at this load — they got the working set they needed. Holding consolidates. Do NOT push or deload. |
| `cooked` (per-set scale) or `tough` + barely-cleared-floor | floor only, last set very close to failure | n/a | **hold** | Same as above — they got the dose. Don't break them. |
| `failed` OR missed rep target | n/a | first stumble at this load | **hold** | One miss is information, not a verdict. Repeat the load. |
| `failed` OR missed reps | n/a | second stumble at the same (or ±1 increment) load within the lookback window | **drop ~10%** | Two misses at the same load = real stall. Drop to ~90% rounded to the bump increment, rebuild from there. |

Two failed-rep sessions at *very different* loads do NOT count as a two-strike stall — they're different problems. The engine's same-load guard (`autoProgress.ts:311-335`) handles this correctly.

## Nuance

- **`tough` is the target, not a problem.** A user who consistently rates an exercise `tough` while clearing the prescribed reps is in the productive working zone (RIR 1–3 for hypertrophy, RIR 0–1 for AMRAP/isolations). The trainer's lens: "you wanna work to fatigue. That's the goal. You don't wanna just move weight." Holding on `tough + floor cleared` is the correct response — keep delivering that stimulus until the user adapts and rates the same load `solid` or `easy`, at which point the bump becomes legitimate.
- **Half-bumps are the unsung hero of intermediate progression.** They prevent the engine from oscillating between "+5 lb, miss, drop 10%, +5 lb, miss" cycles. The half-bump (rounded to the nearest realistic increment, floored at 2.5 lb) is implemented in `autoProgress.ts:141-143` (`halfBumpFor`).
- **Drop magnitude.** ~10% is the standard back-off — small enough to recover quickly, big enough to break a stall. Some programs (5/3/1) prescribe 10–15%. Going below ~10% rarely breaks the stall; going above 15% sets the lifter back unnecessarily. The engine's `dropped = lastWeight * 0.9` followed by `Math.min(rounded, lastWeight - bump)` (lines 338-340) guarantees at least one full bump step down even when rounding lands at the original load.
- **Drop ≠ deload.** A two-strike drop on ONE exercise is local backoff — the rest of the session proceeds at planned load. A deload is a SCHEDULED, whole-session/whole-week reduction (see `deload-mechanics`). Don't conflate them.
- **The lookback window matters.** History `[1]` alone misses stalls that span a recovery session (failed → drop → success → climb back → failed). The engine uses a 4-entry lookback (`TWO_STRIKE_LOOKBACK = 4` at `autoProgress.ts:64`) which approximates 4 weeks of once-per-week main-lift cadence. For 2x/week-per-lift splits, this becomes ~2 weeks — still physiologically meaningful.
- **The success-override rule.** If the most recent prior attempt at the *exact same load* succeeded, that overrides any older fail at the same load — today is a one-time stumble, not a stall. Implemented at `autoProgress.ts:324-330`.
- **Sets and reps cleared matter together.** A user who logged only 2 of 4 sets at the floor reps did NOT clear the floor of the range across the prescribed working sets — that's a missed-reps case, not a "floor cleared" case. The engine's `metRepTarget` at lines 86-91 enforces this.

## What this contradicts

- **"`tough` means I went too heavy — pull back."** No. `tough` at the floor of the range with full rep completion is a textbook working set. Pulling back is over-correction.
- **"`easy` always means add weight."** Only when the ceiling is met. Easy at the floor of the range means the load is in the right neighborhood but the user hasn't yet climbed the range — half bump or hold.
- **"Failure means deload the whole program."** Failure on ONE exercise across two sessions means drop THAT exercise ~10%. The rest of the program is fine. Whole-program deload has different triggers (see `deload-triggers`).
- **"One bad session = stall."** No. One miss is information. Two consecutive misses at the same load = stall.

## Application in this app

- The engine implements this decision tree in `src/lib/planner/autoProgress.ts`, function `computeNextWeight` (lines 261–390). The flow:
  - Branch on `failed | !metRepTarget` first → scan for two-strike → drop OR hold (lines 289–352).
  - Branch on `tough` → ceiling-met = half bump, floor-only = hold (lines 354–369).
  - Default branch `easy | solid` + reps met → ceiling-met = full bump, floor-only = half bump (lines 371–389).
- The LLM nuance layer should NOT override these defaults — it narrates them ("you cleared the floor but not the top — half bump to keep climbing"). Overrides happen only via deliberate user signal ("I want to push harder this week" → see `when-to-bump-judgment`).
- The drop action's `rationale` field is shown in the UI banner. Keep copy honest: "two sessions stalled at this load — backing off ~10% to rebuild" is the current and correct framing (line 344). Do not soften this to "let's switch it up" — the user benefits from understanding why.
- Holds are NOT regressions — the UI must avoid framing a hold as a setback. The trainer's framing: "consolidating the load." The engine's existing `reason` text at line 350 ("holding weight to consolidate") is correct.
- The two-strike drop applies per-exercise, not per-program. Other exercises in the same session proceed at their planned load.
