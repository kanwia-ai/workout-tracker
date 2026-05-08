# Adaptive Programming Logic — Research Audit

**Date:** 2026-05-07
**Scope:** `src/lib/planner/{autoProgress,skipRecalibration,replan,buildMesocycle,startingWeights}.ts` and `src/types/checkin.ts`, plus the `replanMesocycle` Opus prompt at `supabase/functions/generate/prompts/replanMesocycle.ts`.
**Posture:** This is a small, single-user app. Recommendations respect that — no enterprise telemetry, no force plates, no daily HRV.

---

## TL;DR

- **Within-block progression is conservative-correct for an intermediate lifter, but a touch too rigid for newer lifters and too sticky on accessories.** The +5 / +2.5 lb increments map to mainstream practice (see [Stronger by Science](https://www.strongerbyscience.com/weekly-load-progression/)) but a "tough but completed all reps" set should still get a small reward, not a flat hold. Beginners should also progress faster than +5/wk on lower body.
- **Skip recalibration is *more aggressive than the literature warrants* for trained lifters.** Mujika & Padilla and follow-up reviews show strength is broadly preserved through 2–4 weeks of layoff for trained athletes ([PubMed](https://pubmed.ncbi.nlm.nih.gov/10999420/), [MDPI 2023](https://www.mdpi.com/2813-0413/1/1/1)). Pulling 15–20% off after 8–14 days for someone with a year of training is over-correcting. The novice path is reasonable.
- **End-of-block re-plan is a vibe-prompt with no MEV/MAV/MRV scaffolding.** The system prompt at `supabase/functions/generate/prompts/replanMesocycle.ts` reasons in qualitative tags ("easy / solid / tough / failed") and never tells Opus the volume landmarks framework. RP-style adjust-volume-up-when-easy / down-when-tough is implicit at best. Aggregation is decent but the model has too much latitude.
- **The base mesocycle has a structural conflict.** `buildMesocycle.ts:445-459` pushes the *suggested seed* up +2.5%/wk, while `autoProgress.ts:128-135` independently bumps lb-by-lb session-to-session from check-ins. The two systems can race, and the seed bump is monotone-only (`Math.max`), so a stalled lifter still sees a higher seed than what they hit.
- **Deload (week 6: 60% sets + RIR+1) is roughly aligned but slightly over-cuts.** The Delphi consensus ([PMC10511399](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)) says reduce **volume OR intensity, not necessarily both**, with volume being the lever. The current setup cuts both, which is fine for a beginner-friendly app but worth being explicit about.

---

## 1. Within-block progression — `autoProgress.ts`

### What the code does

- `bumpFor(role)` (`autoProgress.ts:49-51`) → main lift = +5 lb, everything else = +2.5 lb.
- Branches (`autoProgress.ts:94-135`):
  - `failed` *or* missed rep target → **hold**. Two-strike → **drop 10%** rounded to bump granularity, with `Math.min(rounded, lastWeight - bump)` so we always at least step down by one increment (`autoProgress.ts:103-109`).
  - `tough` rating → **hold** unconditionally (`autoProgress.ts:118-124`).
  - `easy` or `solid` AND reps hit → **bump by `bumpFor(role)`** (`autoProgress.ts:128-135`).
- Inputs: `rating`, `used_weight_lb`, `reps_done`. Pulls from `db.sessionCheckins` for the user and matches by `library_id` (`autoProgress.ts:148-179`).
- Roles `core`, `rehab`, `mobility` are excluded from auto-progression entirely (`autoProgress.ts:28, 81`).

### What research says

- **Increments.** Common-practice ranges for intermediate lifters: +2.5–5 lb per session on upper-body lifts, +5–10 lb per session on lower-body lifts ([Stronger by Science](https://www.strongerbyscience.com/weekly-load-progression/), [Legion](https://legionathletics.com/double-progression/)). The ACSM Position Stand recommends 2–10% load increases when the prescribed reps become "easy". Novices can progress faster (every session); intermediates every 1–3 sessions; advanced every 1–3 weeks.
- **Double progression is the most-cited scheme for intermediates.** Hit the top of the rep range across all sets → add weight. Below the top → keep the weight, push reps ([Hevy](https://hevycoach.com/glossary/double-progression/), [Legion](https://legionathletics.com/double-progression/)). The current system is closer to **single-progression-with-rating-gate**: it ignores how many reps the user did inside the prescribed range and only checks if they cleared the *floor*.
- **RIR/RPE-based autoregulation outperforms percentage-based progression** in a 2025 network meta-analysis ([PMC12336695](https://pmc.ncbi.nlm.nih.gov/articles/PMC12336695/)). But novice lifters are demonstrably *bad* at estimating RIR — they underestimate proximity to failure ([Stronger by Science](https://www.strongerbyscience.com/reps-in-reserve/)). So a 4-bucket subjective scale (`easy/solid/tough/failed`) is actually a reasonable compromise for a single-user app aimed at any training age.
- **Two-strike deload is non-standard but defensible.** 5/3/1 deloads after a *failed AMRAP cycle* (i.e., a whole 4-week wave). GZCLP cycles set/rep schemes (5×3 → 6×2 → 10×1) before deloading. RP-style mesocycle deloads are calendar-scheduled, not stall-triggered. The two-strike "drop 10%" is more conservative than 5/3/1's "reduce 1RM 10–15% and rebuild" but applies it per-exercise, which is finer-grained — fine for a single-user app.

### Gap analysis

| Issue | Severity | Notes |
|---|---|---|
| `tough` always holds, even on a perfectly executed set | **Medium** | If the user hit 4×5 and rated "tough", that's exactly the working-weight target. Holding is fine, but the user gets bored (no progression) and the system treats "tough but completed" and "tough and missed reps" identically. Compare double progression: top-of-range → +weight. |
| Increments are training-age agnostic | **Medium** | A 3-month-old lifter can absorb +10/wk on squat. An advanced lifter can't. The seed multiplier in `startingWeights.ts:263-268` knows training age — `bumpFor` doesn't. |
| No reps-in-range awareness | **Medium** | The code checks rep *floor* (`autoProgress.ts:31-34, 40-45`) — it never rewards going *above* the prescribed range. A user who hit 12 reps when prescribed 8-12 should bump; one who hit 8 should hold. That's the entire premise of double progression. |
| Two-strike drop is "drop 10%" but only against the most recent two sessions | **Low** | If the lifter is alternating "failed, hold, failed, hold," they may never trigger the drop branch — the look-back is `history[1]`, not "last 2 attempts at this weight". |
| Accessory increment of 2.5 lb is too coarse for small DBs | **Low** | A user pressing 15-lb DBs can't realistically jump to 17.5 — most DB sets step in 5-lb increments. But pressing 50s → 52.5 is fine on adjustable DBs. The code doesn't know which the user has. |
| No use of `overall_feel` (1–5) at the per-exercise level | **Low** | Whole-session feel exists in `SessionCheckinSchema` (`checkin.ts:27`) but `computeNextWeight` only reads per-exercise rating. A "session-wide bad day" doesn't damp bumps. |

### Recommended changes

1. **Reward "tough but cleared top of rep range" with a half-bump.** Today (`autoProgress.ts:118-124`):
   ```
   if (last.rating === 'tough') return { weight: lastWeight, action: 'hold', ... }
   ```
   Change to: if `tough` AND every logged set hit the **top** of the rep range → `bump * 0.5` (rounded down to bump granularity, so 5 → 2.5 main; 2.5 → still 2.5 accessory). Otherwise hold. Concretely: extract a `metRepCeiling(checkin, repsString)` helper alongside `metRepTarget`, and switch on it inside the `tough` branch.

2. **Make increments training-age aware.** Today `bumpFor(role)` returns a constant. Plumb `trainingAgeMonths` from the user profile into `computeAutoProgressionForSession` (it already loads via `loadProfileLocal` elsewhere). Suggested table:

   | Role | <3 mo | 3–12 mo | 12–36 mo | 36+ mo |
   |---|---|---|---|---|
   | main lift | +10 | +5 | +5 | +2.5 |
   | secondary | +5 | +5 | +2.5 | +2.5 |
   | accessory/isolation | +5 | +2.5 | +2.5 | +2.5 |

   Add a unit test asserting a 1-month-old lifter gets +10 on `back_squat` from "easy".

3. **Use top-of-rep-range as a bump gate (cheap double-progression).** When `rating == 'easy' || 'solid'` AND `metRepCeiling`, give the *full* bump. When `rating == 'easy' || 'solid'` AND only `metRepTarget` (cleared floor, didn't hit ceiling), give a *half* bump or hold. This is the most evidence-aligned single change. ([Hevy](https://hevycoach.com/glossary/double-progression/))

4. **Tighten the two-strike window.** Look back through the last 2 sessions *at this exercise*, not literally the last two ordinal entries — already correct since `history` is filtered to `library_id`. But: also require both attempts to be at *similar* weight (`±1 bump`). Today, two failures at very different weights both count, which can falsely trigger a drop after a successful bump cycle.

5. **(Optional, low-priority)** Damp the bump when `overall_feel <= 2` on the parent session. Pull `overall_feel` from the same checkin row used to derive the per-exercise rating.

---

## 2. Skip recalibration — `skipRecalibration.ts`

### What the code does

- `computeRecalibration(gapDays, originalWeekNumber, trainingAgeMonths)` returns `{action, load_multiplier, rep_scheme_override, rationale, effective_week_number}` (`skipRecalibration.ts:83-157`).
- Thresholds:
  - 0–3d → `slide`, 1.0×, no week change (`skipRecalibration.ts:97-105`)
  - 4–7d → `deload_mild`, **0.9×**, same week (`skipRecalibration.ts:110-118`)
  - 8–14d → `step_back_one_week`, **0.85×**, week−1 (`skipRecalibration.ts:123-131`)
  - 14+d & novice (<12 mo) → `reset`, **0.7×**, week 1, rep override [8,12] (`skipRecalibration.ts:134-146`)
  - 14+d & trained (≥12 mo) → `step_back_two_weeks`, **0.8×**, week−2 (`skipRecalibration.ts:148-156`)

### What research says

- Mujika & Padilla 2000 (the cited source) found strength is "readily retained for up to 4 weeks of inactivity" in trained athletes ([PubMed](https://pubmed.ncbi.nlm.nih.gov/10999420/)). The 10% number that floats around (Olympic lifter, 4 wks) is one case study — the systematic review picture is more conservative.
- A 2024 Halonen study comparing continuous vs. periodic resistance training found ~3-week breaks did **not significantly reduce** muscle thickness, strength, or sport performance in adolescent athletes ([Wiley](https://onlinelibrary.wiley.com/doi/10.1111/sms.14739)).
- A 2023 systematic review concluded that under 4 weeks of detraining, muscle strength and size are **typically well maintained**; meaningful decrements emerge >4 weeks ([MDPI 2023](https://www.mdpi.com/2813-0413/1/1/1)).
- Beginners *do* lose adaptations faster ([PubMed](https://pubmed.ncbi.nlm.nih.gov/10999420/)) — so the training-age branch is correct in direction.
- The clinical concern after 1–2 weeks off is **NOT muscle / strength loss but tendon / connective-tissue readiness and rust on motor patterns.** A small first-session reduction (e.g., 5–10%) is reasonable not because the user got weaker, but to avoid tweaking a tendon on the first heavy squat.

### Gap analysis

| Issue | Severity | Notes |
|---|---|---|
| 8–14 day cut to 0.85× is too aggressive for trained lifters | **Medium** | Research says ≤4 weeks ≈ no real strength loss for trained. 15% off + week-back for 9 days off is over-correcting. Untrained → fine. |
| 14+ day "reset to week 1, 0.7×" for a trained ≥12-mo lifter… isn't actually wired in for trained, but the **0.8× / week−2** combo for trained is also probably too steep at 15 days off | **Low-Medium** | A 15-day-off intermediate is realistically at ~95% of pre-break strength. 80% load + repeating 2 weeks is closer to a 4-week hiatus prescription. |
| Novice path (<12 mo, 14+d → reset week 1, 0.7×) is fine | **OK** | This matches the literature on faster detraining for newer lifters. Keep. |
| Single threshold ladder ignores **why** they were off | **Low** | A user who was sick vs. on vacation vs. injured all get the same recalibration. Out of scope for a small app — flagging only. |
| `trainingAgeMonths` is only used at the 14+d branch | **Medium** | The 4–7d and 8–14d branches treat a 2-month-old novice and a 5-year vet identically. The novice probably should drop to 0.85× at 4–7d, the vet probably needs nothing more than a one-set warm-up tweak. |

### Recommended changes

1. **Pull back the 8–14d cut for trained lifters.** Today (`skipRecalibration.ts:123-131`) all users get 0.85× and week−1. Make it training-age branched:
   - <12 mo: keep current (0.85×, week−1).
   - ≥12 mo: 0.92×, **same week** (just a load nudge). Rationale: literature says strength is broadly retained through 2 weeks for trained.

2. **Pull back the 14+d (≥12 mo trained) cut.** Today: 0.8×, week−2. Change to **0.9×, week−1** for ≥12 mo. The current setting effectively treats a 15-day break like a deload-and-rebuild — that's a 4–6 week prescription.

3. **Make the 4–7d branch training-age aware too.** A novice at 6 days off probably benefits from week−0.5 (which we don't really have); cleanest: novice → 0.85×, trained → 0.92×.

4. **Reframe the rationale copy as "tendon ramp" not "strength loss"** — it's both more honest and reduces the "but I didn't really get weaker, why is the bar lighter?" objection. Example for `deload_mild` (`skipRecalibration.ts:115`):
   ```
   `coming back from ${gap} days off — easing tendons back at ~92% before pushing.`
   ```
   This is a copy change, not a logic change.

5. **(Optional) Add a 28+d branch** that flags "this is a long break — re-run interpretation" rather than guessing. Today the ladder caps at "14+ days" with the same rules whether 15 or 90 days. Out of scope for this audit but worth a follow-up.

---

## 3. End-of-block re-plan — `replan.ts` + `replanMesocycle.ts` prompt

### What the code does

- `replanNextBlock(userId, completedMesocycleId)` (`replan.ts:104-168`): loads completed meso, profile, all check-ins for the block; gates on ≥18 check-ins (`replan.ts:43, 129-131`); reconstructs previous directives via `interpretProfile` (`replan.ts:138`); calls Opus via `callEdge('replan_mesocycle', payload, ReplanResultSchema)` (`replan.ts:147`); persists to `replanHistory`.
- The Opus prompt (`replanMesocycle.ts:22-58`) is rule-driven prose:
  - Preserve clinical constraints unless user explicitly notes recovery.
  - Use rating signals: `easy` everywhere → bump intensity / shrink rep range; `solid` → leave alone; `tough 2+ wks same exercise` → check rep flatness, possibly cut a set; `failed 2+ wks` → propose substitution.
  - `overall_feel` average ≤2.5 → cut `target_lifting_minutes` by 5–10 min.
  - Don't swap proven-good exercises.
  - Conservative when <12 check-ins.
- Aggregation helper `summarizeCheckins` (`replanMesocycle.ts:98-154`) feeds the model a per-exercise rating histogram + notes.

### What research says

- **Renaissance Periodization volume landmarks** are the dominant evidence-aligned framework for intra-block volume manipulation: MV → MEV → MAV → MRV ([RP](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)). The whole point is "do the least amount of work you can do to grow, then add a little more each week until you can't recover — then deload and repeat." Applied to a re-plan, this maps directly to:
  - Sessions felt *easy* across the block → next block starts with **more sets at MEV**, climbs higher.
  - Sessions felt *tough/failed* late in the block → user hit MRV; next block should start with **fewer sets** or shorter rep ranges.
- **Schoenfeld 2017** ([PubMed](https://pubmed.ncbi.nlm.nih.gov/28834797/)) shows hypertrophy is rep-range-agnostic when sets go to (or near) failure, but strength prefers heavy loads. So the re-plan should adjust rep ranges based on the user's *goal* (which is in `directives.goal.primary_adaptation`), not just on rating signals.
- **Mesocycle length ~4–6 weeks** is the common range. RP often runs 4–6; some 5/3/1 variants 4 weeks. 6 weeks is at the long end but acceptable. ([RP](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth), [JTS](https://www.jtsstrength.com/mesocycle-design-for-hypertrophy/))

### Gap analysis

| Issue | Severity | Notes |
|---|---|---|
| Prompt has zero MEV/MAV/MRV scaffolding | **High** | The model is asked to "bump intensity" or "cut a set" but never told the volume landmarks framework. Adding 1 sentence of scaffolding turns a vibe-prompt into evidence-aligned reasoning. |
| Set-count manipulation across the WHOLE block, not per-muscle-group | **Medium** | RP's whole insight is that biceps MRV ≠ quad MRV. Today's prompt says "cut one set" without specifying which muscle group. The aggregation in `summarizeCheckins` is per-exercise, not per-muscle — opportunity left on the floor. |
| Goal-aware rep-range bias is set in `interpretProfile` but the replan prompt doesn't surface it explicitly | **Medium** | The prompt mentions "shrink the rep range 1-2 reps at the low end" without checking the user's goal. A "size" lifter and a "strength_power" lifter should drift in different directions. |
| `target_lifting_minutes` is the only volume knob | **Medium** | Cutting 10 minutes is a blunt instrument. The directives schema supports per-muscle-group volume hints (root_causes etc.), but the prompt doesn't ask for set/rep adjustments per session_type. |
| `overall_feel` averaging is a single threshold (≤2.5 → cut, ≥4 → keep) | **Low** | A linear interpolation would be cleaner, but for one Opus call every 6 weeks, threshold logic is fine. |
| 18 check-in gate is reasonable | **OK** | 75% of a 6×4 block. Keep. |
| Reconstructing previous directives via `interpretProfile(profile)` instead of persisting | **Low (correct comment in code)** | Deterministic interpreter → re-derivation is sound. Keep. |

### Recommended changes

1. **Add a volume-landmarks paragraph to the system prompt.** Insert into `REPLAN_SYSTEM_PROMPT` (`replanMesocycle.ts:22-58`) just above HARD RULES:
   ```
   FRAMEWORK. Use Renaissance Periodization volume landmarks (MEV/MAV/MRV) when adjusting set counts. If a muscle group's exercises were rated 'easy' through weeks 4-6, the user has high MRV for that group — start the next block with +1-2 working sets per session and let the planner climb. If a muscle group's exercises trended 'tough'→'failed' late in the block, the user hit MRV — start the next block with -1-2 working sets and a wider rep range.
   ```

2. **Surface the user's goal explicitly in the prompt body.** In `buildReplanPrompt` (`replanMesocycle.ts:60-93`), add a line like:
   ```
   ## Goal context
   primary_adaptation = ${profile.goal.primary_adaptation}
   ```
   and add to the system prompt: "When primary_adaptation is 'strength_power', drift main-lift rep ranges DOWN (e.g., 5-8 → 3-6). When 'size', drift accessories UP (e.g., 8-12 → 10-15). When 'mixed', leave ranges alone unless data forces a change."

3. **Aggregate ratings by primary muscle group, not just by exercise.** Extend `summarizeCheckins` to roll up to muscle groups (the variant pool already has `primary_muscles` — `buildMesocycle.ts:300`). Pass both the per-exercise and per-muscle aggregates so the model can spot "all quad work was tough by week 5" without scanning every row. Effort: ~1hr.

4. **Stop using `target_lifting_minutes` as the volume knob.** Add explicit `set_count_adjustments` field to the replan output schema: an array of `{session_type, muscle_group, delta}`. Concrete example: `[{session_type: 'lower_squat_focus', muscle_group: 'quads', delta: -1}]`. The downstream planner already accepts a directives input so this is mostly schema work + planner wiring.

5. **(Optional)** Drop the 18-check-in gate to 12 if the user has a partial block. Today an injury that cuts a block short blocks any re-plan; might be worth degraded-mode reasoning. Out of scope.

---

## 4. Mesocycle base structure — `buildMesocycle.ts`

### What the code does

- 6-week block, week 6 is the deload (`buildMesocycle.ts:617-651`). Length is parameterized but defaults to 6.
- Rep-scheme bias is goal-driven (`buildMesocycle.ts:311-336`): main lifts pull from `directives.goal.rep_scheme_bias.main_compounds`; accessories from `.accessories`; finishers from `.finishers`. RIR defaults to 2 for accessories, 1 or 2 on main lifts depending on `primary_adaptation`.
- Weekly progression on **the suggested-weight seed only** (`buildMesocycle.ts:445-459`):
  - Weeks 2–5: `factor = 1 + 0.025*(week-1)`, rounded to 5 lb, taken as `Math.max(prev, rounded)` — monotone-only.
  - Week 1 and Week 6: no progression.
- Deload (`buildMesocycle.ts:462-468`): sets ← `ceil(sets * 0.6)` floored at 1, RIR ← `min(5, RIR+1)`.
- Day spread: deterministic table (`buildMesocycle.ts:605-614`), Mon/Tue/Thu/Fri for 4 sessions, etc. Not CNS-aware.

### What research says

- **4–6 week mesocycles** are mainstream. RP runs 4–6; JTS describes 4-week intensification + deload; Israetel's 5-week template is widely cited ([Lift Vault](https://liftvault.com/programs/bodybuilding/mike-israetel-5-week-hypertrophy-workout-routine-spreadsheet/)). 6 weeks is the longest end of acceptable; some users will fatigue out before week 6.
- **Deload week prescriptions** ([PMC10511399 Delphi consensus](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)):
  - Weekly sets reduced by **~40%** (some practitioners 40–60%).
  - Intensity reduced to **50–70% 1RM** (or RPE+1 to +2).
  - **Volume OR intensity, not always both.** Volume is the dominant lever in the literature.
- **Within-block weekly progression of +2.5%/wk** is on the conservative end; RP-style mesocycles often progress sets-per-week (e.g., MEV→MAV climb) rather than load. Liftosaur's 5/3/1 templates progress load by week-of-cycle (e.g., week 1: 5×5 @ 65%, week 2: 5×3 @ 75%, week 3: 5×1+ @ 85%). Both work.

### Gap analysis

| Issue | Severity | Notes |
|---|---|---|
| Suggested-weight seed and `autoProgress` race | **High** | `applyWeeklyProgression` sets a static seed of `prev_seed * 1.025^(wk-1)`. `computeAutoProgressionForSession` then *overrides* the seed with check-in-driven weight. They're independent. A lifter who stalled at week 3 sees a week-4 seed that's *higher* than what they hit — the override fixes it, but the static seed is just noise at that point. Either remove the weekly-progression-on-seed (rely on autoProgress) or have autoProgress respect the planned trajectory. |
| `Math.max(prev, rounded)` makes the seed monotone | **Medium** | A user who deloads, drops weight, comes back will see a week-5 seed *higher* than what they're actually pressing. The `Math.max` was probably added to avoid weight going *down* visually, but it papers over a real signal. |
| Deload halves both volume AND raises RIR | **Low-Medium** | 60% sets + RIR+1 = ~50% volume + ~30% effort cut. Delphi consensus says volume OR intensity, not always both. The current setup is over-deloaded for someone who didn't accumulate much fatigue. Fine for a beginner-friendly app — call it out as deliberate. |
| Week 1 has no progression but Week 1 ≠ MEV | **Low** | Conventional RP mesocycles start at MEV (lower volume) and climb. Today's planner builds a flat-by-volume block and just bumps load. That's fine — it's a different paradigm — but worth knowing it's not RP. |
| Day-of-week spread doesn't respect CNS demand | **Low** | Mon/Tue back-to-back is squat-focus then push, which is reasonable, but no protection against e.g. lower_squat_focus on Mon and lower_hinge_focus on Tue (heavy CNS demand twice). Out of scope. |
| `buildMesocycle.ts:319, 322` hardcodes RIR=2 for accessories, RIR=1 for finishers | **Low** | Fine defaults. Worth surfacing as goal-tunable in a future pass. |
| 6-week length is at the long end | **Low** | Not wrong but consider shortening to 5 weeks for `primary_adaptation == 'strength_power'` (heavier blocks accumulate fatigue faster). |

### Recommended changes

1. **Resolve the seed-vs-autoProgress race.** Pick one:
   - *Option A (preferred for simplicity):* Stop bumping the seed weekly. Keep `applyWeeklyProgression` only for week 1's seed-from-startingWeights. After that, `computeAutoProgressionForSession` is the source of truth. Remove `applyWeeklyProgression` invocation at `buildMesocycle.ts:544`.
   - *Option B:* Keep weekly seed bumps but drop the `Math.max` floor (`buildMesocycle.ts:456`) so seeds can move down when a stall is detected upstream. This needs propagation of stall info into `buildMesocycle`, which is more work.

2. **Reduce deload aggressiveness, or make it goal-aware.** Today (`buildMesocycle.ts:462-468`):
   ```
   sets: Math.max(1, Math.ceil(ex.sets * 0.6)),
   rir: Math.min(5, ex.rir + 1),
   ```
   Suggested: cut volume to **0.5×** and **leave RIR alone**, OR keep volume at 0.7× and bump RIR by 1. Don't do both. This aligns with the Delphi consensus ([PMC10511399](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)).

3. **Make mesocycle length goal-driven.** `buildMesocycle(directives, lengthWeeks=6, profile?)` (`buildMesocycle.ts:617`) accepts a length. Wire callers to pass:
   - `strength_power` → 5 weeks (deload at 5)
   - `size`, `mixed` → 6 weeks
   - `work_capacity` → 4 weeks
   This is a 1-line caller change + propagation.

4. **(Optional, larger)** Move from "fixed sets every week, climb load" to "fixed load range, climb sets" for `primary_adaptation == 'size'`. This is the RP paradigm and aligns with the volume-landmarks framework. Substantial planner-level rewrite — leave for a Phase 4.

---

## 5. Cross-cutting issues

1. **`trainingAgeMonths` is propagated unevenly.**
   - Used: `startingWeights.ts:263-268` (multiplier), `skipRecalibration.ts:134, 148` (14+d branch).
   - Not used: `autoProgress.ts:bumpFor` (constant), the replan prompt, the deload aggressiveness in `buildMesocycle.applyDeload`.
   - Fix: pass `trainingAgeMonths` through `computeAutoProgressionForSession` and into `applyDeload`. Beginners deload less aggressively; advanced lifters need a deeper deload because they accumulate more fatigue.

2. **Inputs the system never collects.** Today's `ExerciseCheckin` (`checkin.ts:13-20`) has rating + reps_done + used_weight + notes. Missing:
   - **Per-set RIR/RPE.** The replan prompt assumes the model can infer fatigue from rating + rep flatness — that's noisier than RIR. **Recommendation: add optional `rir: number[]` to `ExerciseCheckinSchema`.** Don't make it required (novices can't estimate RIR ([Stronger by Science](https://www.strongerbyscience.com/reps-in-reserve/))). Capture and use when present.
   - **Sleep / soreness / readiness.** Out of scope for a small app — flagging only. A single `pre_session_readiness: 1-5` would be the minimum-viable readiness signal and damp bumps when low.
   - **Per-muscle-group soreness post-session.** Would feed RP-style volume landmarks. Out of scope, flagging.

3. **Two parallel "rating" semantics that drift.**
   - Per-exercise: `easy/solid/tough/failed` (`checkin.ts:10`) — used by `autoProgress`.
   - Whole-session: `overall_feel: 1-5` (`checkin.ts:27`) — used by replan prompt only.
   `autoProgress` doesn't read `overall_feel`; the replan prompt averages `overall_feel` and threshold-cuts. Either harmonize (use one scale), or document the split. Today they're independent and inconsistently consumed.

4. **The replan loop persists `replanHistory` but no module reads it.** `replan.ts:154-162` writes to `db.replanHistory`. Nothing in the planner reads back to detect "the user made the same adjustment 3 blocks in a row" — which would be a strong signal to push a more aggressive change. Forward-looking. Flagging.

5. **No telemetry on whether the system is *correct*.** The system has no closed-loop validation: did the user actually progress over the past 3 blocks? Did stalled exercises eventually resume? A dashboard of "% of bumps that stuck on the next session" would be a single high-signal metric for tuning increment magnitudes. Out of scope, flagging.

---

## 6. Prioritized recommendations

Ranked by **(impact on training quality) × (research alignment lift)** ÷ **(estimated effort in hours)**.

| # | Change | Impact | Effort | Where |
|---|---|---|---|---|
| 1 | Add MEV/MAV/MRV scaffolding to the replan system prompt + surface goal context | **High** — turns the most expensive call ($0.37/replan) into evidence-aligned reasoning | ~1 hr (prompt edit + 1 prompt-snapshot test) | `replanMesocycle.ts:22-58, 60-93` |
| 2 | Resolve seed-vs-autoProgress race (preferred: drop weekly seed bumps once autoProgress is live) | **High** — removes a real source of confusing weight suggestions | ~30 min | `buildMesocycle.ts:445-459, 544` |
| 3 | Add top-of-rep-range double-progression gate to autoProgress (`tough` + ceiling → half bump; `easy/solid` + ceiling → full bump; floor-only → half) | **High** — single most evidence-aligned change for within-block | ~2 hr (incl. tests) | `autoProgress.ts:118-135` + helper |
| 4 | Make `bumpFor` training-age-aware | **Medium-High** — fixes "+5/wk for a 1-month lifter" under-bumping | ~1 hr | `autoProgress.ts:49-51, 80-135` |
| 5 | Soften skip recalibration for trained lifters (8–14d → 0.92×/same week; 14+d → 0.9×/week−1) | **Medium** — pulls back unwarranted aggression for the largest user segment by tenure | ~30 min | `skipRecalibration.ts:123-156` |
| 6 | Make deload either-or, not both: cut volume **OR** raise RIR | **Medium** | ~15 min | `buildMesocycle.ts:462-468` |
| 7 | Aggregate replan ratings per muscle group, not just per exercise | **Medium** — meaningful improvement to replan prompt signal density | ~1 hr | `replanMesocycle.ts:98-154` |
| 8 | Add optional per-set `rir: number[]` to `ExerciseCheckinSchema`; use in autoProgress when present | **Medium-Long-term** | ~3 hr (schema + UI capture) | `checkin.ts:13-20`, `autoProgress.ts` |
| 9 | Make mesocycle length goal-driven (4 / 5 / 6 weeks) | **Low-Medium** | ~30 min | `buildMesocycle.ts:617`, callers |
| 10 | Reframe recalibration copy as "tendon ramp" not "strength loss" | **Low** (UX) | ~15 min | `skipRecalibration.ts:115, 128, 143, 154` |
| 11 | Tighten autoProgress two-strike window (require similar weights across the two attempts) | **Low** | ~30 min | `autoProgress.ts:96-110` |

---

## Sources

- Schoenfeld, B. J., et al. (2017). Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis. *J Strength Cond Res*. [PubMed](https://pubmed.ncbi.nlm.nih.gov/28834797/)
- Mujika, I., & Padilla, S. (2000). Detraining: loss of training-induced physiological and performance adaptations, Parts I & II. *Sports Medicine*. [PubMed I](https://pubmed.ncbi.nlm.nih.gov/10966148/), [PubMed II](https://pubmed.ncbi.nlm.nih.gov/10999420/)
- Renaissance Periodization. Training Volume Landmarks for Muscle Growth. [RP Strength](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)
- Coleman, M., et al. (2024). Practical Approach to Deloading: Recommendations and Considerations for Strength and Physique Sports (Delphi consensus). [PMC10511399](https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/)
- Stronger by Science: How to Choose the Right Load Progression Strategy. [strongerbyscience.com/weekly-load-progression](https://www.strongerbyscience.com/weekly-load-progression/)
- Stronger by Science: Reps in Reserve — overshooting and undershooting. [strongerbyscience.com/reps-in-reserve](https://www.strongerbyscience.com/reps-in-reserve/)
- Hevy. Double Progression: Definition and Examples. [hevycoach.com/glossary/double-progression](https://hevycoach.com/glossary/double-progression/)
- Legion. How to Use Double Progression to Gain Muscle and Strength. [legionathletics.com/double-progression](https://legionathletics.com/double-progression/)
- ACSM (2009). Position Stand on Progression Models in Resistance Training.
- Halonen, et al. (2024). Does Taking a Break Matter — Adaptations in Muscle Strength and Size Between Continuous and Periodic Resistance Training. *Scand J Med Sci Sports*. [Wiley](https://onlinelibrary.wiley.com/doi/10.1111/sms.14739)
- Encarnação, et al. (2023). Effects of Detraining on Muscle Strength and Hypertrophy: A Systematic Review. *MDPI*. [MDPI](https://www.mdpi.com/2813-0413/1/1/1)
- Liftosaur. Documentation on progression types + 5/3/1 deload rules. [liftosaur.com/docs](https://www.liftosaur.com/docs/docs)
- Israetel, M. 5-Week Hypertrophy Workout. [Lift Vault](https://liftvault.com/programs/bodybuilding/mike-israetel-5-week-hypertrophy-workout-routine-spreadsheet/)
- Autoregulated resistance training: 2025 systematic review and network meta-analysis. [PMC12336695](https://pmc.ncbi.nlm.nih.gov/articles/PMC12336695/)
