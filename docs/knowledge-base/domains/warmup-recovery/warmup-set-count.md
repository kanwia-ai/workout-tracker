---
id: warmup-set-count
type: heuristic
domain: warmup-recovery
title: "How many warmup sets a lifter needs (judgment, not formula)"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, get_strong, lean_and_strong, fat_loss, general, athletic]
  training_age: any
  sex: any
  injuries: []
tags: [warmup, ramp-sets, individual-variability, judgment, hard-to-feel]
citations:
  - "Trainer conversation 2026-05-26 — coaching philosophy doc (docs/research/02-coaching-philosophy.md §2): 'I can't tell you what that count is. For some people it's one set, they're ready. For me on barbell rows sometimes 2, sometimes 3, sometimes 4.'"
  - "Jeffreys I. The Warm-Up: Maximize Performance and Improve Long-Term Athletic Development. Human Kinetics 2019 (Potentiate phase scaling guidance)."
  - "Haff GG, Triplett NT (eds). NSCA Essentials of Strength Training and Conditioning, 4th ed. Human Kinetics 2016."
  - "Rippetoe M, Kilgore L. Practical Programming for Strength Training, 3rd ed. (warmup-set scaling on heavy compounds)."
related: [warmup-set-purpose, ramp-method, exercises-hard-to-feel, warmup-cardio-integration]
contradicts: []
---

# How many warmup sets a lifter needs (judgment, not formula)

## Claim
**The number of warmup sets needed for a given exercise is not a fixed number.** It is a function of four variables, evaluated in roughly this order of weight:

1. **Exercise complexity + working load.** Heavy compounds at >100kg need more pattern rehearsal than light isolations. Standard scaling table for the main compound (R3 P5, master synthesis):
   - working load **<60 kg** → ~2 warmup sets (e.g., empty bar × 8, 60% × 5)
   - working load **60-100 kg** → ~3 warmup sets (40% × 8, 60% × 5, 80% × 3)
   - working load **>100 kg** → 4-5 warmup sets (bar × 8, 40 × 5, 60 × 3, 75 × 2, 88 × 1)
2. **Training age.** A novice on barbell back squat needs more pattern rehearsal than an advanced lifter who's grooved the pattern over years. Conversely, a novice using a light load may need only 1-2 sets because the working load itself is light.
3. **Whether prior exercises already warmed the same muscle/pattern.** First compound of the day on a fresh muscle: more warmup. Second compound on the same muscle (e.g., split squat after squat): fewer warmup sets — usually 1, sometimes 0. Isolation work after a compound on the same muscle: 0-1.
4. **Whether the user can already "feel" the target muscle.** The mind-muscle signal (philosophy doc §7). If on warmup set 1 the lifter reports the muscle felt, they're ready. If after 2 sets they still can't find it, add a third — that's exactly what the trainer described doing on his own barbell rows.

**Default starting points (engine prescription, before user feedback overrides):**

| Position in session | Warmup sets (default) |
|---------------------|------------------------|
| First compound, heavy main lift (>60kg working load) | 2-3 |
| First compound, light/moderate working load | 2 |
| Subsequent compound on the same muscle | 1-2 |
| Accessory compound, different muscle | 1-2 |
| Isolation on a fresh muscle | 1 |
| Isolation after a compound on the same muscle | 0-1 |
| Rehab primer / mobility / activation | 0 (these ARE warmup) |

The defaults are starting points. The mind-muscle feedback loop (`warmupCountDeltaFromHistory()`) and the user's per-session "didn't feel it" tap adjust from there.

## Nuance
- **This is not contradicted by science — it's underspecified by science.** There is no RCT identifying the optimal warmup-set count, because the optimum is individual. The trainer's framing is the right one: "it depends."
- "Working load" for warmup-scaling purposes is **the top set of the planned working sets**, not the average. A 5×5 with a top set at 100kg gets warmed up as if it's a 100kg lift, not an 80kg lift.
- **Cold-environment / early-morning sessions** add 1 extra ramp set across the board (R3 master synthesis). Worth surfacing if the user logs ambient temp or session time-of-day.
- **First session back from a >7-day layoff:** add 1 extra ramp set on each main compound. The pattern needs more rehearsal when it hasn't fired in a week. (See detraining table in master synthesis.)
- **Hard-to-feel exercises (lat pulldown, hip thrust, lateral raise, hamstring curl, clamshell):** treat the per-exercise baseline as +1 compared to the table above. Lat pulldown as a first pulling movement → default 3 warmup sets, not 2. This is what `exercises-hard-to-feel` encodes.
- **Don't go beyond +1 from the user's "didn't feel it" feedback.** The trainer's range was 2-4 sets on his own rows, not 7. If the user repeatedly cannot find the muscle even at +1, the answer is probably an exercise swap (machine version, different angle, different cue) — not piling on more warmup sets.
- **A "warmup set" is always 2+ reps in reserve.** If a ramp set feels close to working effort, the lifter has miscalibrated the ramp — the answer is fewer reps, not more sets.

## What this contradicts (optional)
- Fixed rules like "always do 3 warmup sets" or "novices always do 5 warmup sets."
- Auto-bumping warmup-set count purely on load without considering the user's history with the lift, the exercise position in the session, or the mind-muscle signal.
- The opposite — refusing to ever go above 3 warmup sets even when the user reports they can't find the target. The trainer literally goes to 4 on his own barbell rows.

## Application in this app
- The engine prescribes a default warmup-set count per exercise using the table above, evaluating:
  - exercise role tag (compound main / accessory / isolation)
  - position in session (first vs subsequent on same muscle)
  - working load bracket
  - exercise classification (is it on the hard-to-feel list?)
- `warmupCountDeltaFromHistory()` adds +1 to the default when the previous session's `mind_muscle_felt` signal was `'missed'`, capped at +1. Two consecutive `'felt'` signals return delta to 0.
- The LLM nuance layer is allowed to **explain** the count to the user ("3 warmup sets on barbell row today because last session you couldn't quite feel the lats"). It may NOT override the count up or down — that decision is engine-deterministic.
- If the user manually adds or removes a warmup set in the UI, log it. After 3+ sessions of the user adding +1 warmup set on the same exercise, the engine should adopt that as the new default for that exercise for that user. (Not yet implemented; flag as future personalization.)
- For session-time / temperature adjustments: if the user has these signals in profile or daily readiness, the engine may apply +1 on a per-session basis. If not signaled, default behavior applies.
