// End-of-block adaptive re-plan. Given a completed 6-week mesocycle + the
// user's per-session check-ins, calls Claude Opus via the `replan_mesocycle`
// edge function and gets back adjusted ProgrammingDirectives for the NEXT
// block — plus a user-facing rationale and a list of concrete adjustment
// bullets.
//
// Flow:
//   1. Load the completed mesocycle from Dexie (verifies the user owns it +
//      gives us the profile snapshot for the payload).
//   2. Load all check-ins for this user filtered to the completed block's
//      session ids. Guard: need >= 18 (75% of a 6×4 block).
//   3. Load the user's live profile (may have drifted from the snapshot —
//      we prefer live).
//   4. Interpret the profile into directives (the "previous directives" we
//      used last block). This keeps the re-plan anchored to what the planner
//      actually programmed, not a stale snapshot.
//   5. Call the edge function. ~$0.37/call on Opus. Runs once per 6 weeks.
//   6. Persist the full ReplanResult to `replanHistory` (see db.ts v9).
//   7. Return the ReplanResult so the caller can feed it to
//      `generatePlanFromDirectives` and/or show the user a "here's what
//      changed" modal.
//
// IMPORTANT: this function does NOT actually generate the next mesocycle.
// That's `generatePlanFromDirectives`'s job — kept separate so the UI can
// show the rationale + adjustments modal BEFORE committing to a new block.

import { z } from 'zod'
import { callEdge } from '../generate'
import { loadMesocycle } from '../planGen'
import { listCheckinsForUser } from '../checkins'
import { loadProfileLocal } from '../profileRepo'
import { interpretProfile } from './interpretProfile'
import {
  ProgrammingDirectivesSchema,
  type ProgrammingDirectives,
} from '../../types/directives'
import { db } from '../db'

/**
 * Minimum check-ins required before we'll burn a ~$0.37 Opus call on a
 * re-plan. 75% of a 6-week × 4-session block = 18 sessions.
 */
export const MIN_CHECKINS_FOR_REPLAN = 18

/**
 * Public return shape for the re-plan. `directives` is ready to feed into
 * `generatePlanFromDirectives`; the other two fields drive the UI modal.
 */
export interface ReplanResult {
  directives: ProgrammingDirectives
  rationale_for_user: string
  adjustments_summary: string[]
}

/**
 * Zod schema for the edge-function response. Mirrors the shape of
 * `replanMesocycleSchema` in supabase/functions/generate/schemas.ts.
 * We keep a separate client-side Zod schema (not imported from the Deno
 * edge) because Vite can't resolve Deno-style imports.
 */
const ReplanResultSchema = z.object({
  directives: ProgrammingDirectivesSchema,
  rationale_for_user: z.string().max(600),
  adjustments_summary: z.array(z.string().max(240)).min(1).max(12),
})

/**
 * Thrown when we don't have enough check-ins to justify a re-plan call.
 * Caller (Settings UI) disables the button on this signal rather than
 * surfacing the error, but we still throw defensively so direct callers
 * can't accidentally burn Opus quota on sparse data.
 */
export class InsufficientCheckinsError extends Error {
  readonly kind = 'InsufficientCheckinsError' as const
  readonly count: number
  readonly required: number
  constructor(count: number, required: number) {
    super(
      `Complete more sessions before re-planning. You have ${count} check-in${
        count === 1 ? '' : 's'
      }; need at least ${required}.`,
    )
    this.count = count
    this.required = required
  }
}

/**
 * End-of-block adaptive re-plan entry point.
 *
 * Given a user id + the id of the mesocycle they just completed, loads the
 * full context (mesocycle + check-ins + profile + previous directives) and
 * asks Claude Opus (via the `replan_mesocycle` edge op) for adjusted
 * directives. Persists the full result to `replanHistory` and returns it.
 *
 * Does NOT generate the next mesocycle. Caller feeds the returned
 * directives to `generatePlanFromDirectives` once the user confirms.
 *
 * @throws {InsufficientCheckinsError} when fewer than
 *   {@link MIN_CHECKINS_FOR_REPLAN} check-ins exist for this block.
 * @throws {Error} when the mesocycle doesn't exist, the profile is missing,
 *   or the edge function returns an invalid shape.
 */
export async function replanNextBlock(
  userId: string,
  completedMesocycleId: string,
): Promise<ReplanResult> {
  const completedMesocycle = await loadMesocycle(completedMesocycleId)
  if (!completedMesocycle) {
    throw new Error(
      `replanNextBlock: mesocycle ${completedMesocycleId} not found in local DB`,
    )
  }

  const profile = await loadProfileLocal(userId)
  if (!profile) {
    throw new Error(
      `replanNextBlock: no profile found for user ${userId}; re-plan requires a saved profile`,
    )
  }

  // Filter check-ins to this mesocycle's sessions. We match by session_id
  // rather than by timestamp range — some users log weeks late and the
  // timestamp-range approach would drop genuine check-ins for this block.
  const sessionIds = new Set(completedMesocycle.sessions.map((s) => s.id))
  const allCheckins = await listCheckinsForUser(userId)
  const checkins = allCheckins.filter((c) => sessionIds.has(c.session_id))

  if (checkins.length < MIN_CHECKINS_FOR_REPLAN) {
    throw new InsufficientCheckinsError(checkins.length, MIN_CHECKINS_FOR_REPLAN)
  }

  // Reconstruct the directives we USED for this block by running the live
  // profile through interpretProfile. Rationale: the rule-based interpreter
  // is deterministic, so the output is identical to what the planner
  // consumed at build time — we don't need a separate persisted directives
  // record to answer "what were last block's directives?".
  const previousDirectives = interpretProfile(profile)

  const payload = {
    profile,
    completedMesocycle,
    checkins,
    previousDirectives,
  }

  const result = await callEdge('replan_mesocycle', payload, ReplanResultSchema)

  // Persist the full re-plan result. We don't gate the return on this
  // write — the user should see the rationale modal even if Dexie throws
  // (e.g. quota exceeded). But we still try, and we log on failure so the
  // telemetry-adjacent code can flag it.
  try {
    const historyId = `replan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await db.replanHistory.put({
      id: historyId,
      user_id: userId,
      completed_mesocycle_id: completedMesocycleId,
      created_at: new Date().toISOString(),
      result_json: JSON.stringify(result),
      synced: false,
    })
  } catch (err) {
    console.warn('replanNextBlock: failed to persist replan history', err)
  }

  return result
}
