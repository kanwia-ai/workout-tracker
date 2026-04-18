import { z } from 'zod'
import { callEdge } from './generate'
import { buildExercisePool } from './planGen'
import { db } from './db'
import { PlannedExerciseSchema, type PlannedExercise, type PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

// ─── Swap reasons ─────────────────────────────────────────────────────────
// Mirrors the values the edge function's swap_exercise op accepts. Keep these
// in sync with supabase/functions/generate/prompts/swapExercise.ts.
export type SwapReason = 'machine_busy' | 'too_hard' | 'too_easy' | 'injury_flare' | 'generic'

export const SWAP_REASON_LABELS: Record<SwapReason, string> = {
  machine_busy: 'Machine is busy',
  too_hard: 'This is too hard',
  too_easy: 'This is too easy',
  injury_flare: 'Something hurts',
  generic: 'Swap for any reason',
}

// ─── Edge response schema ─────────────────────────────────────────────────
// The server returns exactly one replacement plus a one-sentence explanation.
const SwapResponseSchema = z.object({
  replacement: PlannedExerciseSchema,
  reason: z.string(),
})

export type SwapResponse = z.infer<typeof SwapResponseSchema>

export interface RequestSwapOpts {
  profile: UserProgramProfile
  session: PlannedSession
  exerciseIndex: number
  reason: SwapReason
}

/**
 * Ask the edge function for a replacement exercise for the given slot in a
 * session. Builds the exercise pool from Dexie (same helper plan generation
 * uses) and derives the already-completed list from `session.exercises`
 * before `exerciseIndex` so the model doesn't re-suggest something the user
 * just did.
 *
 * Throws on network errors or schema-invalid responses — caller is expected
 * to surface the error in the swap sheet's error state.
 */
export async function requestSwap(opts: RequestSwapOpts): Promise<SwapResponse> {
  const { profile, session, exerciseIndex, reason } = opts
  const pool = await buildExercisePool(profile)
  const completedExercisesInSession = session.exercises
    .slice(0, exerciseIndex)
    .map(e => e.name)
  return callEdge(
    'swap_exercise',
    {
      profile,
      currentExercise: session.exercises[exerciseIndex],
      sessionFocus: session.focus,
      completedExercisesInSession,
      exercisePool: pool,
      reason,
    },
    SwapResponseSchema,
  )
}

/**
 * Apply an accepted swap to the persisted mesocycle in Dexie.
 *
 * Replaces `sessions[?].exercises[exerciseIndex]` for the session matching
 * `sessionId`. Re-stringifies `sessions_json` (our storage shape stores it
 * JSON-encoded) and flips `synced: false` so any future sync picks up the
 * change. Leaves other exercises and other sessions untouched.
 *
 * Throws if the mesocycle row or the target session is missing — those are
 * structural bugs, not user errors.
 */
export async function applySwap(
  mesoId: string,
  sessionId: string,
  exerciseIndex: number,
  replacement: PlannedExercise,
): Promise<void> {
  const row = await db.mesocycles.get(mesoId)
  if (!row) throw new Error(`applySwap: no mesocycle with id ${mesoId}`)

  const sessions = JSON.parse(row.sessions_json) as PlannedSession[]
  const targetIdx = sessions.findIndex(s => s.id === sessionId)
  if (targetIdx < 0) throw new Error(`applySwap: session ${sessionId} not in plan ${mesoId}`)

  const target = sessions[targetIdx]
  if (exerciseIndex < 0 || exerciseIndex >= target.exercises.length) {
    throw new Error(
      `applySwap: exerciseIndex ${exerciseIndex} out of range for session ${sessionId}`,
    )
  }

  const updatedExercises = target.exercises.map((ex, i) =>
    i === exerciseIndex ? replacement : ex,
  )
  const updatedSession: PlannedSession = { ...target, exercises: updatedExercises }
  const updatedSessions = sessions.map((s, i) => (i === targetIdx ? updatedSession : s))

  await db.mesocycles.put({
    ...row,
    sessions_json: JSON.stringify(updatedSessions),
    synced: false,
  })
}
