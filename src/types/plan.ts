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
})

export const MesocycleSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  generated_at: z.string().datetime(),    // ISO 8601 timestamp
  length_weeks: z.number().int().min(3).max(12),
  sessions: z.array(PlannedSessionSchema).min(1),
  profile_snapshot: z.unknown(),   // copy of UserProgramProfile at gen time
})

export type Mesocycle = z.infer<typeof MesocycleSchema>
export type PlannedSession = z.infer<typeof PlannedSessionSchema>
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>
