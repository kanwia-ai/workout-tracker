// Zod schema mirroring the server-side `extractExercisesSchema` in
// supabase/functions/generate/schemas.ts. Both must stay in lockstep; when
// fields are added/removed here, update the JSON Schema too.
import { z } from 'zod'

export const ExtractedExercisesSchema = z.object({
  exercises: z.array(
    z.object({
      name: z.string(),
      sets: z.number().int().optional(),
      reps: z.string().optional(),
      weight: z.number().optional(),
      rest_seconds: z.number().int().optional(),
      notes: z.string().optional(),
    }),
  ),
})

export type ExtractedExercisesPayload = z.infer<typeof ExtractedExercisesSchema>
