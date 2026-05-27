// DO NOT rename fields or enum values — the Gemini prompt and the edge-function
// JSON Schema mirror reference these identifiers verbatim. Adding values is safe.
import { z } from 'zod'

export const MuscleGroup = z.enum([
  'quads', 'hamstrings', 'glutes', 'calves',
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'full_body', 'rehab', 'mobility',
])
export type MuscleGroup = z.infer<typeof MuscleGroup>
export const SessionStatus = z.enum(['upcoming', 'in_progress', 'completed', 'skipped'])
export type SessionStatus = z.infer<typeof SessionStatus>

// Warmup ramp set — percent of working weight (0..100) + rep target. Emitted
// by Gemini so ramp prescriptions don't have to be inferred client-side from
// role/name heuristics. See MASTER-SYNTHESIS §Warmup prescription by exercise
// role.
export const WarmupSetSchema = z.object({
  percent: z.number().int().min(0).max(100),
  reps: z.number().int().min(1).max(30),
})
export type WarmupSet = z.infer<typeof WarmupSetSchema>

export const PlannedExerciseSchema = z.object({
  library_id: z.string(),       // "fedb:..." or curated id
  name: z.string(),             // denormalized for offline display
  sets: z.number().int().min(1).max(10),
  reps: z.string(),             // "8-12" or "10"
  rir: z.number().int().min(0).max(5),
  rest_seconds: z.number().int().min(0).max(600),
  role: z.string(),             // "main lift" | "accessory" | "isolation" | "core" | "rehab"
  notes: z.string().optional(),
  /**
   * Ramp-set prescription. REQUIRED on every exercise (may be empty for
   * rehab/mobility/core/cardio). Compound main lifts get 3 sets
   * (50%/10, 70%/5, 85%/3); accessories get 1 set (60%/8); rehab/mobility/
   * core/cardio emit []. Legacy Dexie plans lacking this field are
   * back-filled to [] in loadMesocycle, same pattern as day_of_week.
   */
  warmup_sets: z.array(WarmupSetSchema).max(6),
  /**
   * Rule-based starting-weight suggestion in pounds, derived from the
   * user's bodyweight + training age + variant baseline. Omitted only for
   * true bodyweight movements (push-ups, planks, hanging leg raises, etc.)
   * where a prescribed load doesn't apply. UI seeds the weight pill with
   * this value on first render so accessories don't display as "—".
   */
  suggested_weight_lbs: z.number().positive().optional(),
  /**
   * Per-exercise "why this for you" note produced by the LLM nuance layer.
   * Optional — populated only when retrieval finds a KB entry with something
   * specific to say about this exercise (cueing, mind-muscle quirk, injury
   * compatibility). Generic accessories typically have no rationale.
   * Capped short on purpose; the goal is one coach-voice sentence.
   */
  rationale: z.string().max(240).optional(),
  /**
   * Ids of the KB entries the nuance layer cited when authoring `rationale`.
   * Kept structurally separate from the prose so a future UI can render the
   * citation chips without parsing the rationale string.
   */
  cited_entries: z.array(z.string()).optional(),
})

export const PlannedSessionSchema = z.object({
  id: z.string(),                // stable ID the app generates
  week_number: z.number().int().min(1),
  ordinal: z.number().int().min(1),   // position within the week (1..N)
  focus: z.array(MuscleGroup).min(1),
  title: z.string(),
  /**
   * Short UPPERCASE descriptor shown beside the title in the UI,
   * e.g. "LOWER · PULL-DOMINANT" or "UPPER · PUSH". REQUIRED going
   * forward; legacy plans lacking this field are back-filled to an
   * empty string in loadMesocycle.
   */
  subtitle: z.string().max(60),
  estimated_minutes: z.number().int().min(10).max(180),
  exercises: z.array(PlannedExerciseSchema).min(1),
  day_of_week: z.number().int().min(0).max(6),   // 0=Mon .. 6=Sun
  rationale: z.string().max(280),                // ≤280 chars, one short sentence
  status: SessionStatus,
  intended_date: z.string().optional(),   // hint only — YYYY-MM-DD or ISO, not validated strictly
  /**
   * Ids of the KB entries the LLM nuance layer cited when authoring the
   * session-level rationale. When the LLM annotates a plan, it overwrites
   * the engine's structural `rationale` with a coach-voice paragraph and
   * populates this array with the entries that backed the claims.
   * Kept optional so engine-only plans (LLM unavailable) stay schema-valid.
   */
  cited_entries: z.array(z.string()).optional(),
})

export const MesocycleSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  generated_at: z.string().datetime(),    // ISO 8601 timestamp
  length_weeks: z.number().int().min(3).max(12),
  sessions: z.array(PlannedSessionSchema).min(1),
  profile_snapshot: z.unknown(),   // copy of UserProgramProfile at gen time
  /**
   * Block-level "why this block looks the way it does" paragraph from the
   * LLM nuance layer. Optional — engine-only plans won't have it. When set,
   * the HomeScreen surfaces it once per new block (gated on a "rationale
   * acknowledged" flag in localStorage) so the user sees it without it
   * nagging on every visit.
   */
  rationale: z.string().max(800).optional(),
  /**
   * Specific-target acknowledgment — the LLM's explicit response to the
   * user's `profile.specific_target` field (e.g. "lose 1 dress size by
   * June"). Names the actual lever (diet for body comp; programming for
   * strength) and frames the deadline realistically. Surfaced on the
   * onboarding StepConfirm completion screen + Settings detail view.
   */
  specific_target_acknowledgment: z.string().max(600).optional(),
  /**
   * Ids of KB entries the LLM cited when authoring the block-level
   * rationale + specific-target acknowledgment.
   */
  cited_entries: z.array(z.string()).optional(),
})

export type Mesocycle = z.infer<typeof MesocycleSchema>
export type PlannedSession = z.infer<typeof PlannedSessionSchema>
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>

/**
 * Resistance-band tension level. Banded exercises (e.g. clamshells, monster
 * walks) have no meaningful pound number — the user picks a band by feel.
 * The four-step ladder mirrors how bands are commonly sold + cues; the
 * WorkoutView weight pill swaps for a 4-button segmented control on banded
 * exercises (detected by the absence of `suggested_weight_lbs` + a name
 * match on /\bband(ed|s)?\b/).
 */
export type BandTension = 'light' | 'medium' | 'heavy' | 'x-heavy'
