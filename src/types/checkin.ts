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

export const ExerciseCheckinSchema = z.object({
  library_id: z.string(),
  name: z.string(),               // denormalized for offline display
  rating: ExerciseRating,
  used_weight_lb: z.number().optional(),
  reps_done: z.array(z.number().int()).optional(),  // per-set
  notes: z.string().max(200).optional(),
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
