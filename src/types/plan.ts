// DO NOT rename fields or enum values — the Gemini prompt and the edge-function
// JSON Schema mirror reference these identifiers verbatim. Adding values is safe.
import { z } from 'zod'

export const MuscleGroup = z.enum([
  'quads', 'hamstrings', 'glutes', 'calves',
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'core', 'full_body', 'rehab', 'mobility',
])
export const SessionStatus = z.enum(['upcoming', 'in_progress', 'completed', 'skipped'])

export const PlannedExerciseSchema = z.object({
  library_id: z.string(),       // "fedb:..." or curated id
  name: z.string(),             // denormalized for offline display
  sets: z.number().int().min(1).max(10),
  reps: z.string(),             // "8-12" or "10"
  rir: z.number().int().min(0).max(5),
  rest_seconds: z.number().int().min(0).max(600),
  role: z.string(),             // "main lift" | "accessory" | "core" | "rehab"
  notes: z.string().optional(),
})

export const PlannedSessionSchema = z.object({
  id: z.string(),                // stable ID the app generates
  week_number: z.number().int().min(1),
  ordinal: z.number().int().min(1),   // position within the week (1..N)
  focus: z.array(MuscleGroup).min(1),
  title: z.string(),
  estimated_minutes: z.number().int(),
  exercises: z.array(PlannedExerciseSchema).min(1),
  status: SessionStatus,
  intended_date: z.string().optional(),   // hint only
})

export const MesocycleSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  generated_at: z.string(),
  length_weeks: z.number().int().min(3).max(12),
  sessions: z.array(PlannedSessionSchema),
  profile_snapshot: z.unknown(),   // copy of UserProgramProfile at gen time
})

export type Mesocycle = z.infer<typeof MesocycleSchema>
export type PlannedSession = z.infer<typeof PlannedSessionSchema>
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>
