// Post-workout check-in schema. Captures per-exercise ratings + overall
// feel after a session ends, feeding the adaptive-feedback loop (next-session
// warmup tweaks + end-of-block re-planning).
//
// IMPORTANT: Field names and enum values are load-bearing — a sibling agent
// is building the consumer that reads this shape. Don't rename without
// coordinating.
import { z } from 'zod'

export const ExerciseRating = z.enum(['easy', 'solid', 'tough', 'failed'])
export type ExerciseRating = z.infer<typeof ExerciseRating>

// Per-set micro-feedback signal captured inline during the session via the
// 3-tap pill row under each set circle. The 3-state user-facing taxonomy
// (`'easy' | 'on it' | 'cooked'`) is intentionally simpler than the
// 4-state ExerciseRating used at session end — the in-flow tap has to be
// near-zero cognitive cost, so we don't surface "failed" as a tap (the
// user would naturally use 'cooked' for that case, and an actual failed
// rep gets logged via the absence of a set check). When per-set signals
// are present, autoProgress derives the effective per-exercise rating
// from the mean of these taps; the session-end Sheet rating is the
// fallback for sessions where the user didn't tap inline.
export const SetRating = z.enum(['easy', 'on it', 'cooked'])
export type SetRating = z.infer<typeof SetRating>

export const ExerciseCheckinSchema = z.object({
  library_id: z.string(),
  name: z.string(),               // denormalized for offline display
  rating: ExerciseRating,
  used_weight_lb: z.number().optional(),
  reps_done: z.array(z.number().int()).optional(),  // per-set
  notes: z.string().max(200).optional(),
  // ─── Per-set micro-feedback (additive, optional) ─────────────────────
  // All three fields are INPUTS to the existing autoProgress / warmup
  // logic, not triggers in their own right. Skipping them is valid —
  // null entries mean "no signal captured", not "signal == zero". See
  // docs/research/02-coaching-philosophy.md §How the coach thinks.
  //
  // set_ratings — one entry per set, parallel to reps_done. When
  // populated, autoProgress prefers the averaged signal over the
  // session-level `rating` above.
  set_ratings: z.array(z.union([SetRating, z.null()])).optional(),
  // rest_needed_seconds — actual seconds elapsed when the user tapped
  // "ready already?" on the rest banner. Parallel to set_ratings: one
  // entry per set; null = user let the timer run (no signal).
  rest_needed_seconds: z.array(z.union([z.number().int(), z.null()])).optional(),
  // mind_muscle_felt — single value per exercise. Only populated for
  // hard-to-feel exercises (see lib/planner/constants.ts). 'felt' or
  // 'missed' once per session.
  mind_muscle_felt: z.union([z.literal('felt'), z.literal('missed')]).optional(),
})

export const SessionCheckinSchema = z.object({
  session_id: z.string(),
  user_id: z.string(),
  completed_at: z.string(),       // ISO timestamp
  week_number: z.number().int().min(1),
  overall_feel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  overall_notes: z.string().max(500).optional(),
  exercises: z.array(ExerciseCheckinSchema),
  synced: z.boolean().default(false),
})

export type ExerciseCheckin = z.infer<typeof ExerciseCheckinSchema>
export type SessionCheckin = z.infer<typeof SessionCheckinSchema>

// ─── SetRating ↔ ExerciseRating bridge ─────────────────────────────────
// The 3-tap pill row uses a simpler taxonomy than the session-end check-in
// chips (no 'failed' option). When deriving an effective per-exercise
// rating from set-level taps, map them into the 4-state space, then
// pick the nearest bucket from the mean.
//
// Map: easy → easy, on it → solid, cooked → tough. 'failed' is never
// emitted from per-set taps — the user marks failure by NOT checking
// the set off, which the rep-completion guard catches independently.

const SET_RATING_TO_SCALAR: Record<SetRating, number> = {
  easy: 1,
  'on it': 2,
  cooked: 3,
}

const SCALAR_TO_EXERCISE_RATING = (n: number): ExerciseRating => {
  // Round to nearest bucket. Boundaries chosen so a single 'on it' among
  // 'easy's tips toward 'easy', and a single 'cooked' among 'on it's
  // tips toward 'tough' — matches how a coach reads a face: one outlier
  // doesn't override the dominant feel, but a 50/50 mix does.
  if (n < 1.5) return 'easy'
  if (n < 2.5) return 'solid'
  return 'tough'
}

/**
 * Aggregate a list of per-set taps (some may be null = unrated) into a
 * single ExerciseRating, or return undefined if none of the sets carried
 * a tap (caller should fall back to the session-level rating). Pure.
 */
export function aggregateSetRatings(taps: ReadonlyArray<SetRating | null | undefined>): ExerciseRating | undefined {
  const present: SetRating[] = []
  for (const t of taps) {
    if (t == null) continue
    present.push(t)
  }
  if (present.length === 0) return undefined
  let sum = 0
  for (const p of present) sum += SET_RATING_TO_SCALAR[p]
  return SCALAR_TO_EXERCISE_RATING(sum / present.length)
}
