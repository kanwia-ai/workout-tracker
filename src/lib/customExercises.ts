// ─── Custom exercises ────────────────────────────────────────────────────────
// User-authored exercises (e.g. "incline push-ups"). Stored in Dexie v7's
// `customExercises` table and surfaced in the ExerciseBrowser's "mine" filter.
// IDs are prefixed `custom:` so downstream code (plan generator, swap flow,
// logs) can tell them apart from curated (`ex-*`) and free-exercise-db
// (`fedb:*`) entries.

import { db, type LocalCustomExercise } from './db'

export type CustomExerciseEquipment =
  | 'bodyweight'
  | 'dumbbell'
  | 'barbell'
  | 'cable'
  | 'machine'
  | 'kettlebell'
  | 'bands'
  | 'other'

export interface CustomExerciseInput {
  name: string
  primary_muscles: string[]
  secondary_muscles?: string[]
  equipment?: CustomExerciseEquipment | null
  video_url?: string | null
  notes?: string | null
}

/** Load all custom exercises for a user, most-recent first. */
export async function loadCustomExercises(userId: string): Promise<LocalCustomExercise[]> {
  const rows = await db.customExercises.where('user_id').equals(userId).toArray()
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/**
 * Persist a new custom exercise. Generates a `custom:<uuid>` id and stamps
 * `created_at`. Returns the stored row so callers can optimistically update
 * local state without refetching.
 */
export async function saveCustomExercise(
  userId: string,
  data: CustomExerciseInput,
): Promise<LocalCustomExercise> {
  const row: LocalCustomExercise = {
    id: `custom:${newId()}`,
    user_id: userId,
    name: data.name.trim(),
    primary_muscles: [...data.primary_muscles],
    secondary_muscles: [...(data.secondary_muscles ?? [])],
    equipment: data.equipment ?? null,
    video_url: data.video_url?.trim() || null,
    notes: data.notes?.trim() || null,
    created_at: new Date().toISOString(),
    synced: false,
  }
  await db.customExercises.put(row)
  return row
}

/** Delete a single custom exercise by id. */
export async function deleteCustomExercise(id: string): Promise<void> {
  await db.customExercises.delete(id)
}

// crypto.randomUUID is available in all modern browsers that Dexie targets,
// but we fall back to a Math.random id if the environment is unusually
// locked down (iOS web view in some legacy configs).
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
