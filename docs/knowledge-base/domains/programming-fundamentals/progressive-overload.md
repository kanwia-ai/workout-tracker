---
id: progressive-overload
type: principle
domain: programming-fundamentals
title: "Progressive overload — something must increase over time"
confidence: high
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, glutes, aesthetics, general_fitness, fat_loss, athletic]
  training_age: any
  sex: any
  injuries: []
tags: [progressive-overload, progression, adaptation, load, reps, volume]
citations:
  - "Zatsiorsky VM, Kraemer WJ. Science and Practice of Strength Training, 3rd ed. Human Kinetics, 2020."
  - "NSCA. Essentials of Strength Training and Conditioning, 4th ed., 2016."
  - "Helms ER, Morgan A, Valdez A. The Muscle & Strength Pyramid: Training, 2nd ed. 2019."
  - "Plotkin D, Coleman M, Van Every D, et al. Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations. PeerJ. 2022;10:e14142. PMID: 36157070."
  - "Grgic J, Schoenfeld BJ. Are the Hypertrophic Adaptations to High and Low-Load Resistance Training Muscle Fiber Type Specific? Front Physiol. 2018;9:402."
related: [hypertrophy-rep-ranges, set-volume-landmarks, mesocycle-volume-progression, autoregulation-rir-novices-vs-trained]
contradicts: [myth-just-do-the-program, myth-overload-only-means-load]
---

# Progressive overload — something must increase over time

## Claim

For continued adaptation, **some training variable must progress over time**. The specific variable can be:

1. **Load** (most common, especially for novices and on compound lifts)
2. **Reps** (within a fixed load and rep range — the double-progression vehicle)
3. **Sets** (adding volume per muscle per week within a mesocycle, RP paradigm)
4. **Proximity to failure / RIR** (lowering RIR across the block — week 1 RIR 3 → week 4 RIR 0–1)
5. **ROM** (improving execution depth or quality)
6. **Exercise difficulty** (bodyweight progression: knee push-up → push-up → decline → archer → one-arm)
7. **Density / shorter rest** (when other variables are capped)

**At least one must move forward across sessions or weeks.** Without progression, stimulus plateaus and adaptation stalls. (Zatsiorsky & Kraemer; NSCA; Plotkin 2022 showed both load progression and rep progression produce similar hypertrophy as long as one or the other progresses.)

**Best variable to progress depends on training age:**
- **Novice**: progress load every session (linear progression). Add 2.5 kg/5 lb upper, 5 kg/10 lb lower. Sustainable for months until LP stalls.
- **Intermediate**: progress reps within range, then load (double progression). Or add sets across mesocycle. Or rotate via DUP (different rep range each session in the week).
- **Advanced**: progress within a block (volume week 1 → intensity week 3) and between blocks (small load PRs annually, new volume PRs across mesocycles).
- **Bodyweight / band-limited**: progress via harder variation, increased ROM, slower tempo, shorter rest.

## Nuance

- **Progression is *noticed*, not always *calculated*.** The trainer's lens (`docs/research/02-coaching-philosophy.md` §8): "*The moment you start asking yourself 'could I do more?' is probably when you should start pushing.*" The app's `easy / on it / cooked` feedback maps directly — `easy` is the signal that authorizes a bump.
- **You can't progress every variable at once.** Adding load AND reps AND sets simultaneously is a recipe for overshoot. Pick the progression vehicle per block; let other variables hold.
- **Progression slows with training age.** A novice can add 5 kg per session to squat for weeks. An advanced lifter is happy with 1–2% annual 1RM improvement on the same lift. Don't promise "PR every week" past the novice phase.
- **Stalls are signals, not failures.** Two consecutive missed attempts at the same load means the LP increment is too aggressive or recovery is insufficient — reset to ~90% and re-progress (Rippetoe). Doesn't mean the user is broken.
- **Progression on accessory work is reps-first.** Curls, lateral raises, calf raises: hit the top of the rep range on all sets → add the smallest increment available. Same with most isolation work.
- **The Plotkin 2022 finding matters**: progressing reps within a fixed load produced equivalent hypertrophy to progressing load within a fixed rep target. The user doesn't have to add weight to grow — they have to add *something*. This validates double progression as a hypertrophy vehicle.
- **Detraining inverts progression** — when returning from >2 weeks off, the first session(s) back are sub-progression (see `skipRecalibration.ts`). You step backward to step forward; don't try to "catch up."
- **The trainer's specific guidance**: don't auto-bump weight when the user hasn't reported the signal authorizing the bump. The system should propose, not impose.

## What this contradicts

- **"Just do the program."** Without a progression variable changing, "the program" is maintenance, not growth. (Myth: `myth-just-do-the-program`.)
- **"Progressive overload means adding weight."** It can be load, reps, sets, RIR, ROM, exercise variant — any one. (Myth: `myth-overload-only-means-load`.)
- **"More weight = more growth always."** False once form breaks down or volume drops to compensate. Reps and sets are equally valid drivers; pick what the user can actually execute well.

## Application in this app

- **HARD rule #1 in the master synthesis**: every exercise has a progression model (LP / double progression / DUP / block) and weeks 2–N of a block must specify what increases.
- **`autoProgress.ts`**: after each session, the engine inspects per-exercise rating + reps cleared + RIR (if logged) and decides bump / hold / drop. The audit (`docs/audits/2026-05-07-adaptive-logic-audit.md` §1) flags that:
  - Current implementation uses single-progression (rep floor as gate). Should be double-progression (rep ceiling as bump gate; floor as hold).
  - Increment is training-age agnostic. Should scale: <3mo novice gets +10 on lower compounds, while 36+mo gets +2.5.
  - `tough` + cleared top of rep range should award a half-bump rather than flat hold.
- **`buildMesocycle.ts`** applies a weekly load-seed bump (factor 1.025/wk). The audit (§4) flags a race with `autoProgress` — recommends dropping the weekly seed bump and letting `autoProgress` be the source of truth.
- **Block-level progression**: end-of-block re-plan (`replan.ts`) inspects all check-ins; if the user crushed the block, next block starts at slightly higher volume / load. If the user struggled, next block starts at the same or slightly lower volume. See `mesocycle-volume-progression`.
- **LLM nuance layer**: when explaining a bump, cite the user's rating signal AND the progression model — "you rated this set 'on it' and cleared the top of the rep range, so we're adding 2.5 lb next session" (double progression). When explaining a hold, frame as "we're letting the rep range fill before bumping" — Plotkin 2022 shows reps and load are equivalent growth drivers. When explaining a drop, frame as "two strikes at this weight means the increment got ahead of your recovery — we step back 10% and climb again." Do NOT claim the user is "regressing" or "weaker"; the load drop is mechanical, not characterological.
