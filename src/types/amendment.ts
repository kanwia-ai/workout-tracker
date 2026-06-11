// Day amendment — a today-only edit layered onto the scheduled session at
// resolution time (getSessionForDate). The plan itself is never mutated:
// clear the amendment and the original session is back. Stored as JSON on
// the LocalDayOverride row for the date, so the existing reactive
// useDayOverrides hook picks up changes for free.
import { z } from 'zod'
import { PlannedExerciseSchema } from './plan'
import { Equipment } from './profile'

export const DayAmendmentSchema = z.object({
  /**
   * Exercises appended to the end of the session (mobility blocks, library
   * picks, captured videos). Deduped by library_id against the session.
   */
  added_exercises: z.array(PlannedExerciseSchema).default([]),
  /**
   * Equipment available TODAY (different gym / hotel / home). Display-only
   * once saved — the concrete effect is captured in `swaps` at save time so
   * application stays deterministic.
   */
  equipment_today: z.array(Equipment).optional(),
  /**
   * Replacements keyed by the ORIGINAL exercise's library_id. Computed by
   * the injury-aware local swap when the user confirms today's equipment.
   */
  swaps: z.record(z.string(), PlannedExerciseSchema).default({}),
})

export type DayAmendment = z.infer<typeof DayAmendmentSchema>

export function emptyAmendment(): DayAmendment {
  return { added_exercises: [], swaps: {} }
}

export function amendmentIsEmpty(a: DayAmendment): boolean {
  return (
    a.added_exercises.length === 0 &&
    Object.keys(a.swaps).length === 0 &&
    !a.equipment_today
  )
}
