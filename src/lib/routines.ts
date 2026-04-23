import { z } from 'zod'
import { db } from './db'
import { callEdge } from './generate'
import type { PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import { buildRoutineLocal } from './planner/generateRoutineLocal'

// ─── Zod schema + types for the routine payload ─────────────────────────────
// Mirrors the JSON Schema used by the `generate_routine` edge op in
// `supabase/functions/generate/schemas.ts`. Keep this in sync: if the server
// schema gains or loses a field, update here too.

export const RoutineKind = z.enum(['warmup', 'cooldown', 'cardio'])
export type RoutineKind = z.infer<typeof RoutineKind>

export const RoutineExerciseSchema = z.object({
  name: z.string(),
  duration_seconds: z.number().int().min(10).max(900).optional(),
  reps: z.string().optional(),
  notes: z.string().optional(),
})
export type RoutineExercise = z.infer<typeof RoutineExerciseSchema>

export const RoutineSchema = z.object({
  title: z.string(),
  exercises: z.array(RoutineExerciseSchema).min(2).max(12),
})
export type Routine = z.infer<typeof RoutineSchema>

// ─── Helpers ────────────────────────────────────────────────────────────────

export interface GenerateRoutineInput {
  session: PlannedSession
  kind: RoutineKind
  profile: UserProgramProfile
  minutes: number
  focusTag?: string
}

/**
 * Call `generate_routine` on the edge function, validate, and persist to Dexie.
 *
 * Row id is `${session.id}:${kind}` so a session has at most one saved routine
 * of each kind. `synced: false` marks it for the (future) cloud-sync worker.
 * Throws on network / validation errors so callers can surface retry UI.
 */
export async function generateRoutine(input: GenerateRoutineInput): Promise<Routine> {
  const { session, kind, profile, minutes, focusTag } = input

  // Opt-in local path: same env flag as generatePlan. Skips the edge function
  // entirely and composes the routine from the clinical-planner layer +
  // deterministic cooldown/cardio tables. Zero API cost.
  const useLocal = import.meta.env.VITE_USE_LOCAL_PLANNER === 'true'

  let routine: Routine
  if (useLocal) {
    routine = buildRoutineLocal(kind, session, profile, minutes, focusTag)
  } else {
    const payload = {
      profile,
      kind,
      minutes,
      sessionFocus: session.focus,
      ...(focusTag ? { focusTag } : {}),
    }
    routine = await callEdge('generate_routine', payload, RoutineSchema)
  }

  await db.routines.put({
    id: `${session.id}:${kind}`,
    session_id: session.id,
    kind,
    minutes,
    focusTag,
    routine_json: JSON.stringify(routine),
    generated_at: new Date().toISOString(),
    synced: false,
  })

  return routine
}

/**
 * Read a persisted routine from Dexie, unmarshal the JSON-stringified payload,
 * and re-validate via `RoutineSchema`. Returns null when no row exists for the
 * given (sessionId, kind) pair.
 */
export async function loadRoutine(
  sessionId: string,
  kind: RoutineKind,
): Promise<Routine | null> {
  const row = await db.routines.get(`${sessionId}:${kind}`)
  if (!row) return null
  try {
    const parsed = JSON.parse(row.routine_json)
    return RoutineSchema.parse(parsed)
  } catch (err) {
    // Persisted shape drift (schema migration, old backend output, truncated
    // JSON from an aborted generation). Drop the stale row rather than crash
    // the whole app — the caller will regenerate next time.
    console.warn('loadRoutine: dropping invalid persisted row', {
      sessionId,
      kind,
      err: err instanceof Error ? err.message : String(err),
    })
    try {
      await db.routines.delete(`${sessionId}:${kind}`)
    } catch {
      // ignore delete failure — Dexie might be read-only in test envs
    }
    return null
  }
}
