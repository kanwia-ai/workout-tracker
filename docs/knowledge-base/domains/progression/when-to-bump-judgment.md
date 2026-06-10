---
id: when-to-bump-judgment
type: heuristic
domain: progression
title: "When to bump — the user asks 'could I do more?' = the moment to push"
confidence: medium
last_reviewed: 2026-05-27
applicability:
  goals: [build_muscle, lean_and_strong, get_strong, fat_loss, glutes, aesthetics, general_fitness, longevity]
  training_age: any
  sex: any
  injuries: []
tags: [judgment, autoregulation, ux-affordance, user-signal, coach-philosophy, bump-decision]
citations:
  - "Trainer conversation 2026-05-26, archived in docs/research/02-coaching-philosophy.md §8 'Progressive overload is noticed, not calculated'."
  - "Halperin I et al. Accuracy in predicting repetitions to task failure in resistance exercise: a scoping review and exploratory meta-analysis. Sports Med. 2022. (Confidence: HIGH on CLAIM that novices undersell RIR; MEDIUM on exact PMID/DOI.)"
  - "Helms ER, Cronin J, Storey A, Zourdos MC. Application of the Repetitions in Reserve-Based Rating of Perceived Exertion Scale for Resistance Training. Strength Cond J. 2016;38(4):42-49. DOI: 10.1519/SSC.0000000000000218."
related: [rir-effort-signals, bump-vs-hold-vs-drop-rules, double-progression, autoprogress-by-training-age]
contradicts: []
---

# When to bump — the user asks "could I do more?" = the moment to push

## Claim

The trainer's specific coaching insight from the 2026-05-26 conversation (`docs/research/02-coaching-philosophy.md` §8):

> *"The moment you start asking yourself [could I do more?] is probably when you should start pushing."*

The trainer's framing of their in-gym coaching: *"I can tell you can do more — one more rep."* That signal — the user starting to question whether the prescribed dose is enough — is the cleanest behavioral indicator of readiness to add load or reps. It precedes any objective metric the engine could derive.

The app's role is to **surface this question without auto-bumping**:

- After a set rated `easy` with full reps cleared, the UI should make it trivially easy to indicate "more in the tank" — a single tap that says "push one" or "I could do more here."
- The engine still auto-bumps for next session based on the existing decision tree (`bump-vs-hold-vs-drop-rules`) — that handles the deterministic case. The judgment affordance is a SUPPLEMENTAL signal: this user, on this exercise, today, can take more weight or reps RIGHT NOW.
- The decision to push is the user's. The engine does not override a user who says "I have more" — but the engine also does not push a user who hasn't reported that signal.

This is the coaching-philosophy core (`docs/research/02-coaching-philosophy.md` §2 "The user's body is the source of truth, not the spreadsheet"). The engine sees load, reps, and effort ratings. The user feels recovery, residual fatigue from prior exercises, mind-muscle connection on this specific lift today. Those are signals the engine literally cannot infer — it has to be told.

The Halperin 2022 caveat reinforces this: novices systematically underestimate RIR (they think they have more reps in reserve than they do). So:

- For NOVICE users (<12 mo training age): the "could I do more?" question is unreliable in the upward direction. If they say "I have more," they probably do — Halperin says they underestimate proximity to failure, so an honest "I could do more" usually undersells the actual margin. Surface the affordance but cap the bump magnitude conservatively (use the half-bump rather than the full bump for in-session "more in tank" signals from novices).
- For TRAINED users (≥12 mo): the question is closer to accurate. A trained lifter who says "I could do 2 more" is usually within ±1 rep. Trust the signal at face value.

## Nuance

- **Surface this as a question, not a button labeled "PUSH HARDER."** The trainer's lens is permission-giving, not demand-making. UX copy: "more in the tank? push one." or "easy? wanna try heavier next set?" — never "you must add weight."
- **The signal applies most cleanly to one set, not the whole session.** A user who rates set 1 as `easy` may legitimately want to bump load for set 2, even if they'd never want a session-wide bump. The per-set `set_ratings` field (`src/types/checkin.ts:42`) is the natural carrier.
- **The auto-bump for next session is unchanged.** This affordance is about THIS set, RIGHT NOW. The deterministic decision tree (`bump-vs-hold-vs-drop-rules`) handles next session's prescription. When the user opts to push in-session, that signal naturally rolls forward via the set rating ("I bumped to 100 and rated it `solid`" → next session reads `solid + load = 100` and runs the standard branches).
- **Don't surface the affordance when the user is mid-stall or mid-deload.** If `autoProgress` is in `hold` or `drop` mode for this exercise (recently failed reps, two-strike pattern), the engine's signal is "consolidate, not push" — surfacing "push more?" contradicts the engine's read. Suppress the affordance in those branches.
- **Hard-to-feel exercises (e.g., lat pulldown, see `isHardToFeel` in `src/lib/planner/constants.ts`)** are NOT the right targets for the push-more affordance. The challenge there isn't load — it's mind-muscle connection. Surface a different affordance (the `mind_muscle_felt` tap) for those exercises.
- **The trainer's framing depends on the user paying attention to their internal state.** Some users — especially newer lifters — don't yet have the introspective vocabulary to know when they "could do more." This affordance gets sharper as the user builds training experience; for true novices, the engine's deterministic bumps will lead most of the progression.

## What this contradicts

- **"Auto-bump weight when the user rates `easy` and clears reps."** The engine already does this for the NEXT session (`autoProgress.ts:371-383`). But auto-bumping IN session — without user signal — violates the coaching-philosophy "user's body is the source of truth" principle. The app should not silently load more weight on the bar.
- **"The app should know what to do without asking."** No — the app should know what the engine can compute, and ask for what only the user can know. The coaching philosophy explicitly: "the system should adjust off those signals, not off the page."

## Application in this app

- The PUSH-MORE affordance lives in the per-set tap UI. When a set is rated `easy` (set_ratings: `'easy'`), the UI surfaces a quiet "more in the tank?" hint with a single-tap "push one" action. The action, when tapped, suggests a +1 rep target OR a +half-bump load for the NEXT set in the same exercise.
- This affordance is **suppressed** when:
  - The exercise is currently in `hold` or `drop` mode from `autoProgress` (engine is signaling consolidate, not push).
  - The exercise is in `isHardToFeel` set (mind-muscle is the bottleneck, not load).
  - The session has `overall_feel` self-reported as ≤2 (the user is having a bad day; pushing is over-correction).
- The LLM nuance layer is permitted to narrate the affordance in user-facing copy: "this set felt easy — you've got more if you want it. Want to push the next one?" The phrasing is permission-giving and reversible — never coercive.
- For TRAINED users (≥12 mo), trust their "I could do more" signal at face value; surface the full bump suggestion. For NOVICE users (<12 mo), Halperin 2022 says they undersell RIR — but in the UPWARD direction this is fine (an honest "I could do more" likely undersells the actual margin). Cap the in-session push at a half-bump for novices to avoid pushing too far past their actual safe ceiling.
- The post-session check-in's per-exercise rating + the rolling autoProgress decision tree handle the deterministic case for next session — this is a SUPPLEMENTAL affordance for in-session judgment, not a replacement for the engine.
- DO NOT surface the affordance as "you should add weight" — it's "more in the tank?" The framing matters. The user opts in.
