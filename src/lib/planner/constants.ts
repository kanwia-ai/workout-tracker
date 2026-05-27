// Planner constants — shared identifiers and lookups that the planner,
// warmup generator, and per-set affordances need to agree on.
//
// Keep this file free of runtime side effects so it stays cheap to import
// from both UI components (WorkoutView, HomeScreen) and pure planner
// modules (autoProgress, generateWarmup).

/**
 * Exercises that are notoriously hard to "feel" — the bar moves but the
 * target muscle isn't necessarily the one doing the work. Per the
 * coaching philosophy (docs/research/02-coaching-philosophy.md §7):
 * "Some exercises are notorious for being hard to feel correctly (lat
 * pulldown lives at the top of this list)."
 *
 * Membership is matched against `PlannedExercise.library_id` exactly,
 * AND against a fallback substring match on the exercise name (so
 * library entries we haven't enumerated still surface the affordance
 * when the name screams "lat pulldown"). Both forms are deliberate:
 *
 *   - The id list gives us audit-grade precision for the curated
 *     variants pool — owner can read this list and know exactly which
 *     planner-emitted exercises trigger the mind-muscle tap.
 *   - The name regex catches free-exercise-db ids (`fedb:...`) and any
 *     LLM-emitted exercises whose ids we don't enumerate.
 *
 * Audit this list with the owner — add when a new variant lands in
 * variants.ts that belongs in the "hard to feel" bucket.
 */
export const HARD_TO_FEEL_EXERCISE_IDS: ReadonlySet<string> = new Set([
  // Pulling — lats are the canonical "can't feel them" muscle
  'variant:cable_row_neutral',
  'variant:chest_supported_row',
  'variant:seated_cable_row',
  // Glute medius isolation (clamshells, abduction work)
  'variant:banded_clamshell',
  'variant:hip_abduction_machine',
  // Hamstring curls — hamstrings are hard to recruit when seated/lying
  'variant:seated_leg_curl',
  'variant:nordic_hamstring_curl',
  // Mid-trap / rear delt work
  'variant:face_pull',
  'variant:prone_y_raise',
])

/**
 * Name-based substring patterns. Case-insensitive. Anything matching
 * one of these is treated as hard-to-feel even when the library_id
 * isn't in the curated set above. Lets the affordance work for
 * Gemini-emitted exercises and free-exercise-db ids without enumerating
 * every possible synonym.
 *
 * Each pattern is matched against `exercise.name.toLowerCase()` via
 * `.includes(pattern)`.
 */
export const HARD_TO_FEEL_NAME_PATTERNS: ReadonlyArray<string> = [
  'lat pulldown',
  'pulldown',          // catches "Cable Pulldown", "Wide-Grip Pulldown", etc.
  'clamshell',
  'hip abduction',
  'leg curl',          // seated / lying curl
  'hamstring curl',
  'face pull',
  'rear delt',
  'reverse fly',       // rear delt fly variants
  'reverse flye',
  'y raise',
  'prone y',
]

/**
 * Predicate: does this exercise belong in the hard-to-feel bucket?
 *
 * Used by WorkoutView to decide whether to show the mind-muscle tap
 * after the first working set is logged, and by generateWarmup to
 * decide whether the +1 warmup-set delta from a prior "didn't feel it"
 * signal should apply.
 */
export function isHardToFeel(libraryId: string, name: string): boolean {
  if (HARD_TO_FEEL_EXERCISE_IDS.has(libraryId)) return true
  const lower = name.toLowerCase()
  for (const pat of HARD_TO_FEEL_NAME_PATTERNS) {
    if (lower.includes(pat)) return true
  }
  return false
}
