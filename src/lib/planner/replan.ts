// End-of-block adaptive re-plan. Given a completed mesocycle + the user's
// per-session check-ins, produces adjusted ProgrammingDirectives for the
// NEXT block — plus a user-facing rationale and a list of concrete
// adjustment bullets.
//
// Two paths (mirrors generatePlan's VITE_USE_LOCAL_PLANNER contract):
//
//   LOCAL (default): a deterministic on-device replan. Reads the block's
//   check-ins from Dexie and adjusts the directives rule-by-rule:
//     - sessions consistently rated too hard → one volume step down
//     - consistently too easy → one volume step up
//     - pain mentions in notes → rehab stage advancement is withheld
//     - rehab stage continuity from rehabContinuity.ts (a substantially
//       completed block advances the stage clock)
//   No check-in gate — it works with whatever history exists. Fully
//   offline; the dead backend can never strand the user mid-program
//   (audit 2026-06-09, root cause #3).
//
//   EDGE (VITE_USE_LOCAL_PLANNER='false'): calls Claude Opus via the
//   `replan_mesocycle` edge op (~$0.37/call), gated on >= 18 check-ins so
//   sparse data never burns quota. When the edge dies mid-call, the local
//   replan takes over instead of surfacing a dead end.
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
  applyRehabStageOffsets,
  computeRehabStageOffsets,
} from './rehabContinuity'
import {
  BODY_PART_TO_PROTOCOL,
  ProgrammingDirectivesSchema,
  type ProgrammingDirectives,
} from '../../types/directives'
import type { SessionCheckin } from '../../types/checkin'
import type { UserProgramProfile } from '../../types/profile'
import { db } from '../db'

/**
 * Minimum check-ins required before we'll burn a ~$0.37 Opus call on a
 * re-plan. 75% of a 6-week × 4-session block = 18 sessions. EDGE PATH ONLY —
 * the local replan works with whatever history exists.
 */
export const MIN_CHECKINS_FOR_REPLAN = 18

/** Check-ins needed before the local replan trusts a too-hard/too-easy trend. */
export const LOCAL_REPLAN_MIN_SIGNAL = 4

/** Minutes of per-session work moved by one local volume step. */
export const LOCAL_REPLAN_VOLUME_STEP_MINUTES = 10

/** Pain mentions across the block's notes needed to trip the pain guard. */
export const LOCAL_REPLAN_PAIN_FLAG_MIN = 2

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
 * Zod schema for the replan result. Mirrors the shape of
 * `replanMesocycleSchema` in supabase/functions/generate/schemas.ts.
 * We keep a separate client-side Zod schema (not imported from the Deno
 * edge) because Vite can't resolve Deno-style imports. The local replan
 * validates against the same schema so both paths honor one contract.
 */
const ReplanResultSchema = z.object({
  directives: ProgrammingDirectivesSchema,
  rationale_for_user: z.string().max(600),
  adjustments_summary: z.array(z.string().max(240)).min(1).max(12),
})

/**
 * Thrown when we don't have enough check-ins to justify an EDGE re-plan
 * call. Caller (Settings UI) disables the button on this signal rather than
 * surfacing the error, but we still throw defensively so direct callers
 * can't accidentally burn Opus quota on sparse data. The local path never
 * throws this — it softens the gate and works with what's there.
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

// ─── Check-in signal extraction ─────────────────────────────────────────────
// Session-level classification: the 1-5 overall feel is the primary signal
// (1 'wrecked' / 2 'rough' = hard; 4 'strong' / 5 'on fire' = easy), with
// per-exercise ratings breaking the tie for middling sessions. A "great"
// session that still contained a failed lift is not an under-stimulus signal.

type SessionSignal = 'hard' | 'easy' | 'steady'

function classifyCheckin(c: SessionCheckin): SessionSignal {
  if (c.overall_feel <= 2) return 'hard'
  if (c.overall_feel >= 4) {
    const failed = c.exercises.some((e) => e.rating === 'failed')
    return failed ? 'steady' : 'easy'
  }
  const rated = c.exercises.length
  if (rated > 0) {
    const hard = c.exercises.filter(
      (e) => e.rating === 'tough' || e.rating === 'failed',
    ).length
    const easy = c.exercises.filter((e) => e.rating === 'easy').length
    if (hard * 2 > rated) return 'hard'
    if (easy * 2 > rated) return 'easy'
  }
  return 'steady'
}

// Free-text pain detection across check-in notes. Deliberately excludes
// plain "sore"/"soreness" — normal muscle soreness isn't a joint warning.
const PAIN_RE =
  /\b(pain|painful|hurts?|hurting|tweak(?:ed)?|flare(?:[-\s]?up)?|flared|sharp|pinch(?:ed|ing)?|ach(?:e|es|ing)|stab(?:bing)?)\b/i

function countPainFlags(checkins: readonly SessionCheckin[]): number {
  let n = 0
  for (const c of checkins) {
    if (c.overall_notes && PAIN_RE.test(c.overall_notes)) n += 1
    for (const ex of c.exercises) {
      if (ex.notes && PAIN_RE.test(ex.notes)) n += 1
    }
  }
  return n
}

// Plain-language body-area names for user-facing copy — never raw enum
// values like 'left_meniscus'.
function plainAreaName(part: string): string {
  const stripped = part.replace(/^left_|^right_/, '')
  switch (stripped) {
    case 'meniscus':
    case 'knee':
      return 'knee'
    case 'lower_back':
      return 'lower back'
    case 'upper_back':
      return 'upper back'
    case 'hip_flexors':
      return 'hips'
    case 'trap':
      return 'traps'
    default:
      return stripped.replace(/_/g, ' ')
  }
}

// ─── History persistence (shared by both paths) ─────────────────────────────
// We don't gate the return on this write — the user should see the rationale
// modal even if Dexie throws (e.g. quota exceeded). But we still try, and we
// log loudly on failure so it's impossible to miss in devtools (escalated
// from warn -> error per the 2026-05-24 silent-failure sweep).
async function persistReplanHistory(
  userId: string,
  completedMesocycleId: string,
  result: ReplanResult,
): Promise<void> {
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
    console.error('replanNextBlock: failed to persist replan history', err)
  }
}

// ─── Local replan ───────────────────────────────────────────────────────────
async function replanNextBlockLocal(args: {
  userId: string
  completedMesocycleId: string
  profile: UserProgramProfile
  checkins: SessionCheckin[]
}): Promise<ReplanResult> {
  const { userId, completedMesocycleId, profile, checkins } = args
  const adjustments: string[] = []
  const rationaleParts: string[] = []

  // ── Signals ──
  let hardCount = 0
  let easyCount = 0
  for (const c of checkins) {
    const s = classifyCheckin(c)
    if (s === 'hard') hardCount += 1
    else if (s === 'easy') easyCount += 1
  }
  const painGuard = countPainFlags(checkins) >= LOCAL_REPLAN_PAIN_FLAG_MIN

  // ── Rehab stage continuity (+ pain guard) ──
  // A substantially-completed block advances the stage clock; pain mentions
  // withhold the just-completed block's advancement (repeat the stage)
  // without rewriting older history.
  const earnedOffsets = await computeRehabStageOffsets(userId, profile)
  const appliedOffsets =
    painGuard && Object.keys(earnedOffsets).length > 0
      ? await computeRehabStageOffsets(userId, profile, {
          excludeMesocycleId: completedMesocycleId,
        })
      : earnedOffsets

  let directives = applyRehabStageOffsets(interpretProfile(profile), appliedOffsets)

  for (const inj of profile.injuries) {
    if (inj.severity !== 'modify' || !BODY_PART_TO_PROTOCOL[inj.part]) continue
    const area = plainAreaName(inj.part)
    const earned = earnedOffsets[inj.part] ?? 0
    const applied = appliedOffsets[inj.part] ?? 0
    if (applied > 0) {
      adjustments.push(
        `your ${area} work moves up a stage — you showed up for it last block.`,
      )
    } else if (earned > applied) {
      adjustments.push(
        `holding the careful ${area} work one more block — your notes mention pain, and that wins.`,
      )
    } else {
      adjustments.push(
        `keeping the ${area} work at the same stage — it moves up once those sessions get done.`,
      )
    }
  }
  if (painGuard) {
    rationaleParts.push("your notes mention pain, so i'm playing it careful.")
  }

  // ── Volume step ──
  // One deterministic step on the session work budget; needs a real trend
  // (strict majority over at least LOCAL_REPLAN_MIN_SIGNAL check-ins).
  const n = checkins.length
  if (n >= LOCAL_REPLAN_MIN_SIGNAL) {
    const base = directives.target_lifting_minutes
    if (hardCount * 2 > n) {
      const next = Math.max(15, base - LOCAL_REPLAN_VOLUME_STEP_MINUTES)
      // One volume step down: fewer weekly sets per muscle (volume_bias) AND
      // a tighter session budget — the bias moves the landmark targets, the
      // minutes keep the cap honest.
      directives = { ...directives, target_lifting_minutes: next, volume_bias: -1 }
      adjustments.push(
        `pulled the weekly workload down a notch — last block ran hot in your check-ins.`,
      )
      rationaleParts.push('it ran hot, so this block starts a little lighter.')
    } else if (easyCount * 2 > n) {
      if (painGuard) {
        adjustments.push(
          'kept the workload steady despite the easy ratings — pain notes outrank them.',
        )
      } else {
        const next = Math.min(180, base + LOCAL_REPLAN_VOLUME_STEP_MINUTES)
        directives = { ...directives, target_lifting_minutes: next, volume_bias: 1 }
        adjustments.push(
          `bumped the weekly workload up a notch — you cruised through last block.`,
        )
        rationaleParts.push('you cruised, so this block carries a bit more work.')
      }
    }
  }

  if (adjustments.length === 0) {
    adjustments.push("kept the plan steady — your check-ins didn't ask for a change.")
  }

  const intro =
    n > 0
      ? `looked over the ${n} check-in${n === 1 ? '' : 's'} from your last block and set up the next one.`
      : 'not much check-in history to read yet, so the next block keeps a steady shape.'
  const rationale = [intro, ...rationaleParts].join(' ').slice(0, 600)

  // Same contract as the edge path — if the local result ever drifts from
  // the schema, fail loudly here rather than handing the UI a bad shape.
  const result = ReplanResultSchema.parse({
    directives,
    rationale_for_user: rationale,
    adjustments_summary: adjustments.slice(0, 12),
  })

  await persistReplanHistory(userId, completedMesocycleId, result)
  return result
}

/**
 * End-of-block adaptive re-plan entry point.
 *
 * Given a user id + the id of the mesocycle they just completed, loads the
 * full context (mesocycle + check-ins + profile) and produces adjusted
 * directives — locally by default, via the `replan_mesocycle` edge op when
 * `VITE_USE_LOCAL_PLANNER='false'` (with the local path as the fallback
 * when the edge is unreachable). Persists the full result to
 * `replanHistory` and returns it.
 *
 * Does NOT generate the next mesocycle. Caller feeds the returned
 * directives to `generatePlanFromDirectives` once the user confirms.
 *
 * @throws {InsufficientCheckinsError} EDGE PATH ONLY: when fewer than
 *   {@link MIN_CHECKINS_FOR_REPLAN} check-ins exist for this block.
 * @throws {Error} when the mesocycle doesn't exist or the profile is missing.
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

  // Local-first: mirrors generatePlan's VITE_USE_LOCAL_PLANNER contract.
  if (import.meta.env.VITE_USE_LOCAL_PLANNER !== 'false') {
    return replanNextBlockLocal({ userId, completedMesocycleId, profile, checkins })
  }

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

  try {
    const result = await callEdge('replan_mesocycle', payload, ReplanResultSchema)
    await persistReplanHistory(userId, completedMesocycleId, result)
    return result
  } catch (err) {
    // Dead backend must degrade, never break (audit root cause #3): hand the
    // replan to the deterministic local path instead of stranding the user.
    console.warn(
      'replanNextBlock: edge replan failed; falling back to local replan',
      err,
    )
    return replanNextBlockLocal({ userId, completedMesocycleId, profile, checkins })
  }
}
