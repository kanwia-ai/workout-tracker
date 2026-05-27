// Within-block auto-progression. Reads prior session check-ins and produces
// a recommended starting weight for the same lift in the next session.
//
// The mesocycle builder seeds every weighted exercise with a static
// `suggested_weight_lbs` (rule-based + weekly +2.5% bumps). That suggestion
// is fine for the very first session, but ignores what actually happened on
// the floor — if the user crushed all sets last time, the next session
// should start heavier; if they stalled, it should hold or back off.
//
// This module computes a *replacement* for that seed. It returns null when
// there's no usable history (first time we've seen the lift) so callers
// fall back to the planner's static suggestion.
//
// Scope (v1):
//   - Pure rule logic. No LLM. Predictable, reversible bumps.
//   - Reads `db.sessionCheckins` for the user; matches by `library_id`.
//   - Skips bodyweight / accessory roles where load doesn't really apply
//     (core, rehab, mobility): planner suggestion or "—" wins.
//   - One-strike "hold" on a missed-rep / failed-rated session, two-strike
//     drop on consecutive failures. Conservative on purpose — under-bumping
//     once is recoverable, runaway over-bumping isn't.
//   - Double-progression rep-ceiling gate (audit §1, recs 1+3): only reward
//     a *full* bump when the user cleared the TOP of the rep range; floor-
//     only clearance gets a half bump. "tough" + ceiling met still earns
//     the half bump (they nailed the top of the range despite it being hard).
//   - Bump magnitude is training-age-aware (audit rec 2): novices absorb
//     bigger jumps, advanced lifters need finer increments.
import { db } from '../db'
import {
  SessionCheckinSchema,
  aggregateSetRatings,
  type ExerciseCheckin,
  type ExerciseRating,
} from '../../types/checkin'
import type { PlannedExercise } from '../../types/plan'
import { loadProfileLocal } from '../profileRepo'
import { warmupCountDeltaFromHistory } from './generateWarmup'
import { isHardToFeel } from './constants'

/**
 * The "effective" rating for a check-in entry — prefers the per-set tap
 * aggregate when set_ratings are present (the in-flow taps are the
 * source of truth per the coaching philosophy: "the user's body is the
 * source of truth, not the spreadsheet"). Falls back to the session-end
 * rating chip otherwise. Pure.
 */
function effectiveRating(c: ExerciseCheckin): ExerciseRating {
  if (c.set_ratings && c.set_ratings.length > 0) {
    const agg = aggregateSetRatings(c.set_ratings)
    if (agg !== undefined) return agg
  }
  return c.rating
}

// Roles that should never auto-progress by load. Bodyweight / time-based /
// rehab work either has no load or is calibrated by feel, not 5-lb jumps.
const NON_PROGRESSING_ROLES = new Set(['core', 'rehab', 'mobility'])

// How far back to scan for a same-load prior miss when deciding two-strike
// drops (weighted) or two-strike rep-target resets (bodyweight). 4 entries
// is ~4 weeks of once-per-week main-lift cadence — physiologically
// meaningful, not so long that an ancient stall keeps biting. If the user
// ever moves to a 2x/week-per-main-lift split, revisit this.
const TWO_STRIKE_LOOKBACK = 4

// "8-12" → 8. "10" → 10. Used as the floor for "did they hit reps?".
function minRepsOf(repsString: string): number {
  const m = repsString.match(/\d+/)
  return m ? Number.parseInt(m[0]!, 10) : 8
}

// "8-12" → 12. "10" → 10. Used as the ceiling for double-progression.
// When prescribed reps is a single number, ceiling == floor (a "10" target
// means hit 10 — clearing 10 is full credit).
function maxRepsOf(repsString: string): number {
  const matches = repsString.match(/\d+/g)
  if (!matches || matches.length === 0) return 12
  // Last number in the string is the ceiling: "8-12" → 12, "10" → 10.
  return Number.parseInt(matches[matches.length - 1]!, 10)
}

// True when the user logged enough sets and every logged set met the
// rep floor. Missing reps_done (e.g. user only rated, didn't enter reps)
// is treated as "complete" so we don't punish exercises where the user
// just doesn't bother typing per-set reps — the rating still gates bumps.
function metRepTarget(checkin: ExerciseCheckin, plannedSets: number, repsString: string): boolean {
  if (!checkin.reps_done || checkin.reps_done.length === 0) return true
  if (checkin.reps_done.length < plannedSets) return false
  const floor = minRepsOf(repsString)
  return checkin.reps_done.every((r) => r >= floor)
}

// True when EVERY logged set hit the rep ceiling AND the count of logged
// sets matches the prescribed sets. This is the "earned a full bump" gate
// for double progression — clearing the top of the prescribed range.
// Same lenient policy as `metRepTarget`: empty/undefined reps_done → treat
// as ceiling-met so the user's rating drives.
function metRepCeiling(checkin: ExerciseCheckin, plannedSets: number, repsString: string): boolean {
  if (!checkin.reps_done || checkin.reps_done.length === 0) return true
  // Use < (not !==) so a prior session that logged MORE sets than the
  // current plannedSets (e.g. post-deload: prior was 4 sets, current is 2)
  // still counts as ceiling-met when every set hit the ceiling. Mirrors
  // metRepTarget's < check above.
  if (checkin.reps_done.length < plannedSets) return false
  const ceiling = maxRepsOf(repsString)
  return checkin.reps_done.every((r) => r >= ceiling)
}

// Compound main lifts get bigger jumps; smaller lifts move 2.5 lb at a time.
// Increment scales with training age — a 1-month lifter can absorb +10 on
// squat per session; an advanced lifter needs +2.5 to keep progressing.
// Unknown / undefined training age falls into the 12–36 mo column (today's
// long-standing default — preserves backward compat for callers that pass
// no profile).
function bumpFor(role: string, trainingAgeMonths?: number): number {
  const age = trainingAgeMonths
  const tier: 'novice' | 'early' | 'intermediate' | 'advanced' =
    age === undefined ? 'intermediate'
    : age < 3 ? 'novice'
    : age < 12 ? 'early'
    : age < 36 ? 'intermediate'
    : 'advanced'

  if (role === 'main lift') {
    if (tier === 'novice') return 10
    if (tier === 'early' || tier === 'intermediate') return 5
    return 2.5
  }
  if (role === 'secondary') {
    if (tier === 'novice' || tier === 'early') return 5
    return 2.5
  }
  // accessory / isolation / everything else weighted
  if (tier === 'novice') return 5
  return 2.5
}

// Half-bump for "rewarded but not full credit" cases (e.g. tough + ceiling
// met, or easy/solid + only floor met). Floor at 2.5 — never go below the
// realistic plate increment of an adjustable DB.
function halfBumpFor(bump: number): number {
  return Math.max(2.5, Math.round((bump / 2) / 2.5) * 2.5)
}

// Round to a realistic plate increment based on bump granularity.
function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment
}

export type ProgressionAction = 'bump' | 'hold' | 'drop' | 'first-time' | 'add-rep'

/**
 * Outcome of one exercise's auto-progression decision.
 *
 * Two modes:
 *   - Weighted (the original): `weight` is the recommended starting load in
 *     pounds. `action` is 'bump' | 'hold' | 'drop' | 'first-time'.
 *     `rep_target` is undefined.
 *   - Bodyweight (rep-target progression): `weight` is 0 (sentinel — no
 *     load to recommend), `rep_target` is the recommended reps-per-set
 *     target. `action` can additionally be 'add-rep'. Used when the
 *     planner emitted no `suggested_weight_lbs` (true bodyweight movement).
 */
export interface ProgressionResult {
  weight: number
  action: ProgressionAction
  reason: string
  rep_target?: number
}

interface ComputeArgs {
  exercise: PlannedExercise
  // Most recent check-ins that mention this library_id, NEWEST first.
  history: ExerciseCheckin[]
  // Optional — when omitted, falls back to the "intermediate" bump column
  // (today's behavior) so callers without a profile keep working.
  trainingAgeMonths?: number
}

/**
 * Bodyweight rep-target progression. Mirrors the weighted decision tree
 * but moves the rep TARGET instead of the weight:
 *   - easy/solid + ceiling met → +1 rep target (double-progression past
 *     the prescribed range — let it grow)
 *   - tough/floor-only / failed one-strike → hold at the prescribed ceiling
 *   - two-strike (fails at the same target inside lookback) → reset target
 *     to the prescribed floor
 *
 * `weight: 0` is the bodyweight sentinel (there's no load to prescribe).
 * `rep_target` carries the actual recommendation.
 */
function computeBodyweightRepTarget(
  exercise: PlannedExercise,
  history: ExerciseCheckin[],
): ProgressionResult | null {
  const last = history[0]!
  const lastRating = effectiveRating(last)
  const ceiling = maxRepsOf(exercise.reps)
  const floor = minRepsOf(exercise.reps)
  const lastMetReps = metRepTarget(last, exercise.sets, exercise.reps)
  const lastMetCeiling = metRepCeiling(last, exercise.sets, exercise.reps)

  // Two-strike: two failures within the lookback window resets the target
  // back to the prescribed floor. Same window as the weighted branch.
  if (lastRating === 'failed' || !lastMetReps) {
    const isMiss = (c: ExerciseCheckin): boolean =>
      effectiveRating(c) === 'failed' || !metRepTarget(c, exercise.sets, exercise.reps)
    const priorMiss = history.slice(1, 1 + TWO_STRIKE_LOOKBACK).find(isMiss)
    if (priorMiss !== undefined) {
      return {
        weight: 0,
        rep_target: floor,
        action: 'drop',
        reason: `two sessions stalled — resetting target back to ${floor} reps to rebuild`,
      }
    }
    return {
      weight: 0,
      rep_target: ceiling,
      action: 'hold',
      reason: 'last session missed reps — holding target to consolidate',
    }
  }

  if (lastRating === 'tough') {
    return {
      weight: 0,
      rep_target: ceiling,
      action: 'hold',
      reason: 'last session felt tough — holding target',
    }
  }

  // Rating is 'easy' or 'solid' AND reps were hit.
  if (lastMetCeiling) {
    const next = ceiling + 1
    return {
      weight: 0,
      rep_target: next,
      action: 'add-rep',
      reason: `cleared all sets at ${ceiling} reps — aiming for ${next} next session`,
    }
  }
  // Floor only: hold at ceiling so user keeps trying to crack it.
  return {
    weight: 0,
    rep_target: ceiling,
    action: 'hold',
    reason: `cleared the floor but not all sets at ${ceiling} — holding target`,
  }
}

/**
 * Decide the next-session weight for one exercise given its check-in
 * history. Returns null when:
 *   - the exercise role doesn't take a load (core/rehab/mobility)
 *   - history is empty (caller falls back to planner suggestion)
 *   - the most recent check-in has no `used_weight_lb` (we have nothing
 *     to bump *from*)
 */
export function computeNextWeight({ exercise, history, trainingAgeMonths }: ComputeArgs): ProgressionResult | null {
  if (NON_PROGRESSING_ROLES.has(exercise.role)) return null
  if (history.length === 0) return null

  const last = history[0]!

  // Bodyweight branch: pull-ups, dips, BW push-ups in main-lift role.
  // Detected by BOTH the planner emitting no `suggested_weight_lbs` AND the
  // user not logging a weight. (If only one is true, treat as a weighted
  // exercise the user just didn't log → preserve null behavior so we don't
  // silently turn a weighted lift into rep-progression.)
  if (last.used_weight_lb === undefined && exercise.suggested_weight_lbs === undefined) {
    return computeBodyweightRepTarget(exercise, history)
  }

  if (last.used_weight_lb === undefined || last.used_weight_lb <= 0) return null

  const lastWeight = last.used_weight_lb
  const lastRating = effectiveRating(last)
  const bump = bumpFor(exercise.role, trainingAgeMonths)
  const half = halfBumpFor(bump)
  const lastMetReps = metRepTarget(last, exercise.sets, exercise.reps)
  const lastMetCeiling = metRepCeiling(last, exercise.sets, exercise.reps)

  // Rating-driven branches. The rating field already encodes the user's
  // own assessment of effort; we let it dominate, then layer rep-completion
  // as a guardrail on top. Per-set taps (set_ratings) override the session-
  // end chip when present — see effectiveRating().
  if (lastRating === 'failed' || !lastMetReps) {
    // One miss → hold. Two misses at the same load → drop ~10%.
    //
    // Why scan a window instead of just history[1]:
    //   On a 4-day split each main lift hits weekly. A user who fails at X,
    //   drops to Y < X, succeeds at Y, climbs back to X, fails again has TWO
    //   strikes at X — but they're separated in history by the recovery
    //   session at Y. history[1] alone misses this, so DROP never fired in
    //   realistic split-day patterns.
    //
    // Window of 4 entries (~4 weeks for a once-per-week main lift) keeps
    // the lookback physiologically meaningful — older fails are stale signal.
    //
    // Same-load guard (audit rec 11) preserved: only counts prior misses
    // within ±1 bump of the current load. A miss at a different weight is
    // a different problem.
    //
    // Earliness rule: if the most recent prior attempt at the *same load*
    // succeeded, that overrides any older fail at that load — the user has
    // since proven the load works, today is a one-time stumble, not a stall.
    // "Near same load" — within ±1 bump. Used for the miss-match so that
    // e.g. failed@200 + failed@195 still counts as a stall (one bump apart).
    const nearSameLoadAt = (c: ExerciseCheckin): boolean =>
      c.used_weight_lb !== undefined && Math.abs(c.used_weight_lb - lastWeight) <= bump
    // "Exactly same load" — used for the success-override. A success at a
    // *lower* recovery load doesn't overrule a fail at the current heavier
    // load. Only a success at this exact load proves "today is a stumble,
    // not a stall."
    const exactSameLoadAt = (c: ExerciseCheckin): boolean =>
      c.used_weight_lb !== undefined && c.used_weight_lb === lastWeight
    const isMiss = (c: ExerciseCheckin): boolean =>
      effectiveRating(c) === 'failed' || !metRepTarget(c, exercise.sets, exercise.reps)

    let priorSameLoadMiss: ExerciseCheckin | undefined
    for (const candidate of history.slice(1, 1 + TWO_STRIKE_LOOKBACK)) {
      if (exactSameLoadAt(candidate) && !isMiss(candidate)) {
        // Most recent attempt at this exact load succeeded → today is a
        // one-time stumble at a known-good weight. Stop scanning; this
        // overrides any older fail at the same load.
        priorSameLoadMiss = undefined
        break
      }
      if (nearSameLoadAt(candidate) && isMiss(candidate)) {
        priorSameLoadMiss = candidate
        break
      }
    }

    if (priorSameLoadMiss !== undefined) {
      const dropped = lastWeight * 0.9
      const rounded = roundToIncrement(dropped, bump)
      const safeDrop = Math.min(rounded, lastWeight - bump)
      return {
        weight: Math.max(safeDrop, bump),
        action: 'drop',
        reason: 'two sessions stalled at this load — backing off ~10% to rebuild',
      }
    }
    return {
      weight: lastWeight,
      action: 'hold',
      reason: 'last session missed reps — holding weight to consolidate',
    }
  }

  if (lastRating === 'tough') {
    // Tough + cleared the top of the range → reward with a half bump.
    // They earned forward motion, just not at the full novice-style step.
    if (lastMetCeiling) {
      return {
        weight: lastWeight + half,
        action: 'bump',
        reason: `cleared the top of ${exercise.reps} at ${lastWeight} lb — tough but earned a half bump to ${lastWeight + half}`,
      }
    }
    return {
      weight: lastWeight,
      action: 'hold',
      reason: 'last session felt tough and stayed inside the rep range — holding to lock the load in',
    }
  }

  // Rating is 'easy' or 'solid' AND reps were hit. Double-progression gate:
  // ceiling met → full bump; floor only → half bump (they progressed inside
  // the range, but didn't earn the full step yet).
  if (lastMetCeiling) {
    const next = lastWeight + bump
    return {
      weight: next,
      action: 'bump',
      reason:
        lastRating === 'easy'
          ? `cleared all reps at the top of ${exercise.reps} and felt easy at ${lastWeight} lb — bumping +${bump}`
          : `cleared all reps at the top of ${exercise.reps} at ${lastWeight} lb — bumping +${bump}`,
    }
  }
  return {
    weight: lastWeight + half,
    action: 'bump',
    reason: `cleared floor at ${lastWeight} lb but not the top of ${exercise.reps} — half bump to ${lastWeight + half}`,
  }
}

/**
 * Build a `library_id → recommended weight` map for one upcoming session.
 * Wire-in point: `WorkoutView` calls this when seeding the weight pill,
 * and prefers the result over the planner's static `suggested_weight_lbs`
 * whenever a recommendation comes back.
 *
 * `excludeSessionId` lets the caller drop the current session's own
 * check-in (if it exists from a re-open) so a finished session doesn't
 * use its own results to "progress" itself.
 */
export async function computeAutoProgressionForSession(
  userId: string,
  excludeSessionId: string | null,
  exercises: PlannedExercise[],
): Promise<Record<string, ProgressionResult>> {
  if (!userId || exercises.length === 0) return {}
  // Pull training age from the local profile so bump magnitude scales with
  // experience. Treated as best-effort: a missing/throwing profile read
  // falls back to the "intermediate" bump column (today's behavior).
  let trainingAgeMonths: number | undefined
  try {
    const profile = await loadProfileLocal(userId)
    trainingAgeMonths = profile?.training_age_months
  } catch {
    trainingAgeMonths = undefined
  }
  const rows = await db.sessionCheckins.where('user_id').equals(userId).toArray()
  const checkins = rows.flatMap((r) => {
    if (excludeSessionId && r.session_id === excludeSessionId) return []
    const result = SessionCheckinSchema.safeParse(JSON.parse(r.checkin_json))
    return result.success ? [result.data] : []
  })
  checkins.sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))

  const byLib: Record<string, ExerciseCheckin[]> = {}
  for (const checkin of checkins) {
    for (const ex of checkin.exercises) {
      if (!byLib[ex.library_id]) byLib[ex.library_id] = []
      byLib[ex.library_id]!.push(ex)
    }
  }

  const out: Record<string, ProgressionResult> = {}
  for (const ex of exercises) {
    const result = computeNextWeight({
      exercise: ex,
      history: byLib[ex.library_id] ?? [],
      trainingAgeMonths,
    })
    if (result) out[ex.library_id] = result
  }
  return out
}

/**
 * Build a `library_id → warmup-count delta` map for the upcoming session,
 * derived from the user's mind_muscle_felt history on hard-to-feel
 * exercises. Returns 0 entries for exercises with no history or no signal;
 * +1 when the most recent signal was 'missed'.
 *
 * Pure on inputs (reads Dexie once). Caller (WorkoutView) augments the
 * rendered warmup-set list inline — the stored PlannedExercise.warmup_sets
 * is never mutated.
 *
 * Wired through autoProgress (not generateWarmup) because the source data
 * lives in sessionCheckins, which generateWarmup doesn't touch — keeps
 * generateWarmup pure-on-input the way the tests expect.
 */
export async function computeWarmupDeltasForSession(
  userId: string,
  excludeSessionId: string | null,
  exercises: PlannedExercise[],
): Promise<Record<string, number>> {
  if (!userId || exercises.length === 0) return {}
  // Filter to just hard-to-feel exercises up front — no point reading
  // history for lifts that don't take the delta.
  const candidates = exercises.filter((ex) => isHardToFeel(ex.library_id, ex.name))
  if (candidates.length === 0) return {}

  const rows = await db.sessionCheckins.where('user_id').equals(userId).toArray()
  const checkins = rows.flatMap((r) => {
    if (excludeSessionId && r.session_id === excludeSessionId) return []
    const result = SessionCheckinSchema.safeParse(JSON.parse(r.checkin_json))
    return result.success ? [result.data] : []
  })
  checkins.sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))

  const byLib: Record<string, Array<'felt' | 'missed' | null | undefined>> = {}
  for (const checkin of checkins) {
    for (const ex of checkin.exercises) {
      if (!byLib[ex.library_id]) byLib[ex.library_id] = []
      byLib[ex.library_id]!.push(ex.mind_muscle_felt)
    }
  }

  const out: Record<string, number> = {}
  for (const ex of candidates) {
    const delta = warmupCountDeltaFromHistory(byLib[ex.library_id] ?? [])
    if (delta > 0) out[ex.library_id] = delta
  }
  return out
}
