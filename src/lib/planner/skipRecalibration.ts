// skipRecalibration — adapt planner loads when the user misses training.
//
// Evidence base: Mujika & Padilla 2000 — "Detraining: loss of
// training-induced physiological and performance adaptations" (Sports Med).
// Strength-trained athletes retain most strength through ~2 weeks of zero
// training; power and sport-specific qualities decay faster. What we adjust
// here is neuromuscular readiness on the first session back — a short
// deload prevents the tendon/joint-preparedness gap from turning into a
// tweak on the first big squat home.
//
// Graded response:
//   gap 0-3 d  → slide (no load change)
//   gap 4-7 d  → deload mild (~10% off working weight)
//   gap 8-14 d → step back one microcycle (re-do previous week's loads)
//   gap 14+ d  → training-age dependent:
//                <12 months  → full reset (novice — plan needs reassessment)
//                ≥12 months  → step back two microcycles
//
// Pure TS — zero network, zero IndexedDB at the rule layer. The selector
// that consumes this (getSessionForDateWithRecalibration in planSelectors)
// reads sessionLogs from Dexie.

import { z } from 'zod'

// ─── Result shape ──────────────────────────────────────────────────────────
// Zod-validated (pattern-consistent with src/types/plan.ts) so callers can
// parse recalibrations read from storage in the future if we ever persist
// them. Also gives us a single source of truth for the action enum.

export const RecalibrationActionSchema = z.enum([
  'slide',
  'deload_mild',
  'step_back_one_week',
  'step_back_two_weeks',
  'reset',
])
export type RecalibrationAction = z.infer<typeof RecalibrationActionSchema>

export const RecalibrationResultSchema = z.object({
  action: RecalibrationActionSchema,
  /**
   * Multiplier applied to the user's suggested working weight on the next
   * session back. 1.0 = unchanged. 0.9 = 10% lighter. Down-weighting only —
   * we never prescribe a multiplier above 1.0 here.
   */
  load_multiplier: z.number().min(0).max(1),
  /**
   * Optional rep-scheme override the UI should swap in. Null means keep
   * the mesocycle's prescribed scheme. Only populated when the action
   * clearly changes the stimulus (e.g. a deload week wants higher reps
   * at lower intensity).
   */
  rep_scheme_override: z.tuple([z.number().int(), z.number().int()]).nullable().optional(),
  /** User-facing short rationale shown on the session banner. */
  rationale: z.string().max(240),
  /**
   * Week number the planner should use when resolving variants / load
   * progressions for this session. Clamped to ≥1.
   */
  effective_week_number: z.number().int().min(1),
})
export type RecalibrationResult = z.infer<typeof RecalibrationResultSchema>

// ─── Thresholds ────────────────────────────────────────────────────────────
// Named constants rather than magic numbers so the rule table stays legible.
const SLIDE_MAX_GAP = 3
const DELOAD_MAX_GAP = 7
const STEP_BACK_ONE_MAX_GAP = 14
const TRAINING_AGE_NOVICE_MONTHS = 12

// ─── Rule table ────────────────────────────────────────────────────────────

/**
 * Given the gap in days since the last completed session, the originally
 * scheduled mesocycle week for the session being resolved, and the user's
 * training age in months, return a recalibration recommendation.
 *
 * Guarantees:
 *   - effective_week_number is ALWAYS ≥ 1
 *   - load_multiplier is ALWAYS ≤ 1.0 (we only de-load, never supercompensate)
 *   - rationale is a short user-facing string (no emoji, no protocol keys)
 */
export function computeRecalibration(
  gapDays: number,
  originalWeekNumber: number,
  trainingAgeMonths: number,
): RecalibrationResult {
  // Defensive clamps. Negative gaps (clock skew, test fixtures) act like
  // zero; non-integer weeks get coerced to a sane floor.
  const gap = Math.max(0, Math.floor(gapDays))
  const origWeek = Math.max(1, Math.floor(originalWeekNumber))
  const age = Math.max(0, trainingAgeMonths)

  // 0-3 days — slide. Normal session, no rationale banner needed upstream
  // but we still surface it so integration tests can assert "returns null
  // when gap < 4" in the selector wrapper.
  if (gap <= SLIDE_MAX_GAP) {
    return {
      action: 'slide',
      load_multiplier: 1.0,
      rep_scheme_override: null,
      rationale: 'back on schedule — no adjustment.',
      effective_week_number: origWeek,
    }
  }

  // 4-7 days — mild deload. First session back at ~90%, same rep scheme.
  // Gives tendons/CNS a ramp back to prior load without disturbing weekly
  // progression.
  if (gap <= DELOAD_MAX_GAP) {
    return {
      action: 'deload_mild',
      load_multiplier: 0.9,
      rep_scheme_override: null,
      rationale: `coming back from ${gap} days off — first session at ~90% load.`,
      effective_week_number: origWeek,
    }
  }

  // 8-14 days — step back one microcycle. Pull loads from the previous
  // week's progression (effective_week = origWeek - 1, floored at 1) and
  // also cut ~15% on the first session back to absorb detraining.
  if (gap <= STEP_BACK_ONE_MAX_GAP) {
    return {
      action: 'step_back_one_week',
      load_multiplier: 0.85,
      rep_scheme_override: null,
      rationale: `${gap} days off — repeating last week's loads to rebuild.`,
      effective_week_number: Math.max(1, origWeek - 1),
    }
  }

  // 14+ days — training-age dependent.
  if (age < TRAINING_AGE_NOVICE_MONTHS) {
    // Novice (<12 months) detrains faster and has less movement retention.
    // Full reset is safer than guessing how much capacity remains; the UI
    // layer decides whether to re-run onboarding or re-issue week 1 loads.
    // A light rep scheme (8-12) keeps the first sessions honest.
    return {
      action: 'reset',
      load_multiplier: 0.7,
      rep_scheme_override: [8, 12],
      rationale: `${gap} days off as a newer lifter — resetting to base loads for a safe rebuild.`,
      effective_week_number: 1,
    }
  }

  // Trained lifter (≥12 months) retains most strength through 2+ weeks.
  // Step back two microcycles and hit first session at 80%.
  return {
    action: 'step_back_two_weeks',
    load_multiplier: 0.8,
    rep_scheme_override: null,
    rationale: `${gap} days off — stepping back two weeks to ease back in.`,
    effective_week_number: Math.max(1, origWeek - 2),
  }
}

// ─── Gap computation ───────────────────────────────────────────────────────

/**
 * Whole-day gap between two Dates (UTC-ignorant — uses local-day math so
 * "I worked out yesterday evening" registers as 1 day, not 0).
 */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.floor((b - a) / msPerDay)
}

/**
 * Shape of a completed session entry that the selector needs. Matches
 * LocalSessionLog's relevant subset — keeping a narrow interface here so
 * tests don't need to construct full Dexie rows.
 */
export interface CompletedSessionRef {
  user_id: string
  date?: string            // YYYY-MM-DD (local)
  ended_at?: string        // ISO datetime
  started_at?: string      // ISO datetime
}

/**
 * Pick the most recent completed session for `userId` and return the gap in
 * days against `asOf`. Returns null when nothing has been completed — the
 * selector treats that as "no recalibration needed, this is session one".
 */
export function computeGapFromLogs(
  logs: CompletedSessionRef[],
  userId: string,
  asOf: Date,
): number | null {
  const mine = logs.filter((l) => l.user_id === userId)
  if (mine.length === 0) return null

  let latest: Date | null = null
  for (const l of mine) {
    // Prefer ended_at (ISO datetime — a real moment). Fall back to date
    // (YYYY-MM-DD, which is LOCAL-day by convention in our schema — not
    // UTC midnight), then started_at. The YYYY-MM-DD parse uses Y/M/D
    // constructor directly so a client in UTC-7 doesn't retreat by a day.
    let d: Date | null = null
    if (l.ended_at) {
      const parsed = new Date(l.ended_at)
      if (!Number.isNaN(parsed.getTime())) d = parsed
    }
    if (!d && l.date) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(l.date)
      if (m) {
        d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      } else {
        const parsed = new Date(l.date)
        if (!Number.isNaN(parsed.getTime())) d = parsed
      }
    }
    if (!d && l.started_at) {
      const parsed = new Date(l.started_at)
      if (!Number.isNaN(parsed.getTime())) d = parsed
    }
    if (!d) continue
    if (!latest || d > latest) latest = d
  }
  if (!latest) return null
  return daysBetween(latest, asOf)
}
