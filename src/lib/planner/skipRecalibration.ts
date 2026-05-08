// skipRecalibration — adapt planner loads when the user misses training.
//
// Evidence base:
//   - Mujika & Padilla 2000 ("Detraining: loss of training-induced
//     physiological and performance adaptations", Sports Med) — strength is
//     broadly retained for up to ~4 weeks of inactivity in trained athletes.
//   - Halonen et al. 2024 (Scand J Med Sci Sports) — ~3-week breaks did not
//     significantly reduce strength or muscle thickness in adolescent
//     athletes vs. continuous training.
//   - Encarnação et al. 2023 (MDPI) — under 4 weeks detraining, strength
//     and size are typically well maintained; meaningful decrement >4 weeks.
//   - Beginners (<12 mo) detrain faster (Mujika & Padilla 2000).
//
// What we adjust here is neuromuscular readiness and tendon/connective-
// tissue ramp on the first session back — NOT a fictitious "strength loss".
// The reason to dial weight back after a layoff is to avoid a tweak on the
// first heavy squat home, not because the user got measurably weaker.
//
// Graded response (TRAINED — ≥12 months training age):
//   gap 0-3 d   → slide          1.0×, no week change
//   gap 4-7 d   → deload_mild    0.95×, same week
//   gap 8-14 d  → deload_mild    0.92×, same week     ← softened
//   gap 15-21 d → step_back_one  0.9×, week-1
//   gap 22-28 d → step_back_two  0.85×, week-2
//   gap 29+ d   → reset          0.75×, week 1
//
// Graded response (NOVICE — <12 months training age):
//   gap 0-3 d   → slide          1.0×, no week change
//   gap 4-7 d   → deload_mild    0.9×, same week
//   gap 8-14 d  → deload_mild    0.85×, same week
//   gap 15-21 d → step_back_one  0.85×, week-1
//   gap 22+ d   → reset          0.7×, week 1, rep override [8,12]
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
   * the mesocycle's prescribed scheme. Only populated on the `reset`
   * action — step-backs preserve the planned stimulus.
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
// Named constants rather than magic numbers so the rule table stays legible
// and is tunable from a single place.

const SLIDE_MAX_GAP = 3
const TIER_MILD_UPPER_GAP = 7         // upper bound of the "mild" tier
const TIER_EXTENDED_UPPER_GAP = 14    // upper bound of the still-no-week-change tier
const TIER_STEP_ONE_UPPER_GAP = 21    // upper bound of step-back-one tier
const TIER_STEP_TWO_UPPER_GAP = 28    // upper bound of step-back-two (trained only)
const TRAINING_AGE_NOVICE_MONTHS = 12 // <12 months ⇒ novice path

// Multipliers — TRAINED (≥12 mo). Softer because Mujika/Halonen/Encarnação
// show strength is broadly retained through ~4 weeks of layoff in trained
// lifters. We dial back to ramp tendons/CNS, not to compensate for a drop.
const TRAINED_MILD_MULT = 0.95
const TRAINED_EXTENDED_MULT = 0.92
const TRAINED_STEP_ONE_MULT = 0.9
const TRAINED_STEP_TWO_MULT = 0.85
const TRAINED_RESET_MULT = 0.75

// Multipliers — NOVICE (<12 mo). Held closer to the original ladder because
// novices detrain faster (Mujika & Padilla 2000) and have less movement
// retention.
const NOVICE_MILD_MULT = 0.9
const NOVICE_EXTENDED_MULT = 0.85
const NOVICE_STEP_ONE_MULT = 0.85
const NOVICE_RESET_MULT = 0.7

// Rep override applied only on a full `reset`. Step-backs preserve the
// planned rep scheme — only a reset is conservative enough to swap stimulus.
const RESET_REP_OVERRIDE: [number, number] = [8, 12]

// ─── Rule table ────────────────────────────────────────────────────────────

/**
 * Given the gap in days since the last completed session, the originally
 * scheduled mesocycle week for the session being resolved, and the user's
 * training age in months, return a recalibration recommendation.
 *
 * Guarantees:
 *   - effective_week_number is ALWAYS ≥ 1
 *   - load_multiplier is ALWAYS ≤ 1.0 (we only de-load, never supercompensate)
 *   - rep_scheme_override only fires on the `reset` action
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
  const trained = age >= TRAINING_AGE_NOVICE_MONTHS

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

  if (trained) {
    // 4-7 days — gentle nudge. Trained lifters hold strength easily over a
    // week. The drop here is purely a tendon/CNS ramp.
    if (gap <= TIER_MILD_UPPER_GAP) {
      return {
        action: 'deload_mild',
        load_multiplier: TRAINED_MILD_MULT,
        rep_scheme_override: null,
        rationale: `${gap} days off — easing back at 95% to let connective tissue ramp.`,
        effective_week_number: origWeek,
      }
    }

    // 8-14 days — still same-week, slightly more conservative load. Mujika
    // shows trained strength is preserved through 2 weeks; the cut is a
    // tendon ramp, not a strength comp.
    if (gap <= TIER_EXTENDED_UPPER_GAP) {
      return {
        action: 'deload_mild',
        load_multiplier: TRAINED_EXTENDED_MULT,
        rep_scheme_override: null,
        rationale: `${gap} days off — easing back at ~92% to let tendons ramp; strength is still there.`,
        effective_week_number: origWeek,
      }
    }

    // 15-21 days — first time we step back a microcycle. Encarnação 2023:
    // detraining decrement only becomes meaningful past ~4 weeks.
    if (gap <= TIER_STEP_ONE_UPPER_GAP) {
      return {
        action: 'step_back_one_week',
        load_multiplier: TRAINED_STEP_ONE_MULT,
        rep_scheme_override: null,
        rationale: `${gap} days off — stepping back a week at 90% load to avoid tendon irritation, not because you lost strength.`,
        effective_week_number: Math.max(1, origWeek - 1),
      }
    }

    // 22-28 days — step back two microcycles.
    if (gap <= TIER_STEP_TWO_UPPER_GAP) {
      return {
        action: 'step_back_two_weeks',
        load_multiplier: TRAINED_STEP_TWO_MULT,
        rep_scheme_override: null,
        rationale: `${gap} days off — stepping back two weeks at 85% to ramp safely back in.`,
        effective_week_number: Math.max(1, origWeek - 2),
      }
    }

    // 29+ days — fresh start. Past the ~4 week mark detraining starts to
    // show; reset is honest, and strength comes back fast.
    return {
      action: 'reset',
      load_multiplier: TRAINED_RESET_MULT,
      rep_scheme_override: RESET_REP_OVERRIDE,
      rationale: `${gap}+ days off — fresh start at 75%. Strength comes back fast; this is a ramp, not a reset.`,
      effective_week_number: 1,
    }
  }

  // ── Novice path (<12 months training age) ────────────────────────────
  // Novices detrain faster (Mujika & Padilla 2000) and have less movement
  // retention, so the ladder is slightly steeper but still framed as ramp.

  if (gap <= TIER_MILD_UPPER_GAP) {
    return {
      action: 'deload_mild',
      load_multiplier: NOVICE_MILD_MULT,
      rep_scheme_override: null,
      rationale: `${gap} days off — easing back at 90% to let connective tissue ramp.`,
      effective_week_number: origWeek,
    }
  }

  if (gap <= TIER_EXTENDED_UPPER_GAP) {
    return {
      action: 'deload_mild',
      load_multiplier: NOVICE_EXTENDED_MULT,
      rep_scheme_override: null,
      rationale: `${gap} days off — easing back at 85% to avoid soreness/tendon irritation while you find form again.`,
      effective_week_number: origWeek,
    }
  }

  if (gap <= TIER_STEP_ONE_UPPER_GAP) {
    return {
      action: 'step_back_one_week',
      load_multiplier: NOVICE_STEP_ONE_MULT,
      rep_scheme_override: null,
      rationale: `${gap} days off — stepping back a week at 85% load to ramp tendons and rebuild groove.`,
      effective_week_number: Math.max(1, origWeek - 1),
    }
  }

  // 22+ days as a newer lifter — full reset. Less retention, fewer reps in
  // the bank; safer to rebuild from base loads with a moderate-rep scheme.
  return {
    action: 'reset',
    load_multiplier: NOVICE_RESET_MULT,
    rep_scheme_override: RESET_REP_OVERRIDE,
    rationale: `${gap}+ days off as a newer lifter — fresh start at 70% with moderate reps to ramp safely.`,
    effective_week_number: 1,
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
