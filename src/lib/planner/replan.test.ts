// Tests for `replanNextBlock` — the end-of-block adaptive re-plan.
//
// Two paths under test:
//   - EDGE path (VITE_USE_LOCAL_PLANNER='false'): feeds the block's
//     check-ins to Claude Opus via `replan_mesocycle`, gated on 18
//     check-ins. Falls back to the local replan when the edge dies.
//   - LOCAL path (default): deterministic on-device replan — check-in
//     signals drive volume steps, pain notes guard rehab advancement, and
//     the rehab stage continues across blocks. No check-in gate.
//
// Everything hits the database via fake-indexeddb; the edge function
// (`callEdge`) is ALWAYS mocked — no real API traffic in these tests.

import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock `../generate` BEFORE importing replan so the mocked `callEdge` is in
// play by the time the module under test binds to it.
vi.mock('../generate', () => ({
  callEdge: vi.fn(),
}))

import { callEdge } from '../generate'
import { db } from '../db'
import { saveCheckin } from '../checkins'
import { saveProfileLocal } from '../profileRepo'
import {
  InsufficientCheckinsError,
  MIN_CHECKINS_FOR_REPLAN,
  replanNextBlock,
} from './replan'
import { orchestratePlan } from './orchestrate'
import { buildMesocycle, type BuiltMesocycle } from './buildMesocycle'
import { MesocycleSchema } from '../../types/plan'
import type { SessionCheckin, ExerciseRating } from '../../types/checkin'
import type { UserProgramProfile } from '../../types/profile'
import type { ProgrammingDirectives } from '../../types/directives'

// Test profile covers an injury + a chronic flag so the directives we
// reconstruct for the payload actually have something interesting in them.
const TEST_PROFILE: UserProgramProfile = {
  goal: 'strength',
  primary_goal: 'athletic',
  primary_goals: ['athletic'],
  sessions_per_week: 4,
  training_age_months: 24,
  equipment: ['full_gym'],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'female',
  aesthetic_preference: 'get_stronger',
  posture_notes: 'desk worker',
  first_name: 'Kyra',
  injuries: [
    { part: 'left_meniscus', severity: 'modify', note: 'rehab week 3' },
  ],
}

const TEST_USER_ID = 'test-user-replan'

// Build a plausible ReplanResult payload that matches the Zod schema
// exactly. The shape mirrors what the edge function returns on success.
function makeStubReplanPayload(
  directives: ProgrammingDirectives,
): {
  directives: ProgrammingDirectives
  rationale_for_user: string
  adjustments_summary: string[]
} {
  return {
    directives,
    rationale_for_user:
      "you handled the hinge days well. i kept the RDL progression the same but bumped accessory volume a touch. keep watching the left knee on split squats.",
    adjustments_summary: [
      'Dropped Bulgarian split squats — you flagged knee tightness in weeks 3 and 5.',
      'Bumped accessory volume by one set on hinge days.',
      'Widened finisher rep range to 10-15 (was 8-12) to match reported feel.',
    ],
  }
}

// Seed N check-ins for the given session ids. Returns the array of
// SessionCheckin objects that were persisted. Rotates through a small set
// of ratings so the aggregation looks realistic in the prompt.
async function seedCheckins(
  userId: string,
  sessionIds: string[],
): Promise<SessionCheckin[]> {
  const ratings = ['easy', 'solid', 'tough', 'failed'] as const
  const rows: SessionCheckin[] = []
  for (let i = 0; i < sessionIds.length; i++) {
    const checkin: SessionCheckin = {
      session_id: sessionIds[i]!,
      user_id: userId,
      completed_at: new Date(2026, 2, i + 1).toISOString(),
      week_number: (Math.floor(i / 4) % 6) + 1,
      overall_feel: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      exercises: [
        {
          library_id: 'ex:back-squat',
          name: 'Back Squat',
          rating: ratings[i % ratings.length]!,
          reps_done: [5, 5, 4],
        },
        {
          library_id: 'ex:rdl',
          name: 'Romanian Deadlift',
          rating: ratings[(i + 1) % ratings.length]!,
          reps_done: [8, 8, 8],
        },
      ],
      synced: false,
    }
    await saveCheckin(checkin)
    rows.push(checkin)
  }
  return rows
}

async function seedPlanAndProfile(): Promise<{
  mesocycleId: string
  sessionIds: string[]
  directives: ProgrammingDirectives
}> {
  await saveProfileLocal(TEST_USER_ID, TEST_PROFILE)
  const { mesocycle, directives } = orchestratePlan(TEST_PROFILE, TEST_USER_ID, 6)

  // Persist the mesocycle via the same Dexie shape `generatePlanLocal` uses.
  await db.mesocycles.put({
    id: mesocycle.id,
    user_id: mesocycle.user_id,
    generated_at: mesocycle.generated_at,
    length_weeks: mesocycle.length_weeks,
    sessions_json: JSON.stringify(mesocycle.sessions),
    profile_snapshot_json: JSON.stringify(TEST_PROFILE),
    synced: false,
  })

  return {
    mesocycleId: mesocycle.id,
    sessionIds: mesocycle.sessions.map((s) => s.id),
    directives,
  }
}

describe('replanNextBlock (edge mode)', () => {
  beforeEach(async () => {
    // The edge path is opt-in now (local replan is the default) — these
    // tests pin the legacy behavior explicitly.
    vi.stubEnv('VITE_USE_LOCAL_PLANNER', 'false')
    vi.mocked(callEdge).mockReset()
    await db.sessionCheckins.clear()
    await db.sessionLogs.clear()
    await db.mesocycles.clear()
    await db.userProgramProfiles.clear()
    await db.replanHistory.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('MIN_CHECKINS_FOR_REPLAN is 18 (75% of a 6×4 block)', () => {
    // Load-bearing constant — documented in the task brief. If we ever
    // raise/lower this, the SettingsScreen tooltip + guard need to
    // match. Test it so a careless edit is caught.
    expect(MIN_CHECKINS_FOR_REPLAN).toBe(18)
  })

  it('throws InsufficientCheckinsError when check-ins < 18', async () => {
    const { mesocycleId, sessionIds } = await seedPlanAndProfile()
    // Seed exactly 17 check-ins — one under the threshold.
    await seedCheckins(TEST_USER_ID, sessionIds.slice(0, 17))

    await expect(replanNextBlock(TEST_USER_ID, mesocycleId)).rejects.toBeInstanceOf(
      InsufficientCheckinsError,
    )
    // Belt-and-suspenders: assert the error carries the right counts
    // so the UI can render a useful message.
    try {
      await replanNextBlock(TEST_USER_ID, mesocycleId)
    } catch (err) {
      if (err instanceof InsufficientCheckinsError) {
        expect(err.count).toBe(17)
        expect(err.required).toBe(18)
      }
    }

    // And CRITICALLY: no API call should fire on the guard path.
    expect(callEdge).not.toHaveBeenCalled()
  })

  it('returns a ReplanResult on the happy path and persists replan history', async () => {
    const { mesocycleId, sessionIds, directives } = await seedPlanAndProfile()
    await seedCheckins(TEST_USER_ID, sessionIds.slice(0, 20))

    const stubPayload = makeStubReplanPayload(directives)
    vi.mocked(callEdge).mockResolvedValue(stubPayload)

    const result = await replanNextBlock(TEST_USER_ID, mesocycleId)
    expect(result.directives).toEqual(directives)
    expect(result.rationale_for_user).toMatch(/hinge days/i)
    expect(result.adjustments_summary).toHaveLength(3)

    // History row was written.
    const history = await db.replanHistory
      .where('user_id')
      .equals(TEST_USER_ID)
      .toArray()
    expect(history).toHaveLength(1)
    expect(history[0]!.completed_mesocycle_id).toBe(mesocycleId)
    const parsed = JSON.parse(history[0]!.result_json)
    expect(parsed.rationale_for_user).toMatch(/hinge days/i)
  })

  it('passes the right payload shape to callEdge', async () => {
    const { mesocycleId, sessionIds, directives } = await seedPlanAndProfile()
    await seedCheckins(TEST_USER_ID, sessionIds.slice(0, 20))

    vi.mocked(callEdge).mockResolvedValue(makeStubReplanPayload(directives))

    await replanNextBlock(TEST_USER_ID, mesocycleId)

    expect(callEdge).toHaveBeenCalledTimes(1)
    const [op, payload] = vi.mocked(callEdge).mock.calls[0]!
    expect(op).toBe('replan_mesocycle')
    expect(payload).toMatchObject({
      profile: expect.objectContaining({ first_name: 'Kyra' }),
      completedMesocycle: expect.objectContaining({ id: mesocycleId }),
      previousDirectives: expect.objectContaining({
        goal: expect.any(Object),
        week_shape: expect.any(Object),
      }),
    })
    // Check-ins must be filtered down to THIS block's session ids.
    const p = payload as { checkins: SessionCheckin[] }
    expect(p.checkins.length).toBe(20)
    for (const c of p.checkins) {
      expect(sessionIds).toContain(c.session_id)
    }
  })

  it('ignores check-ins from unrelated mesocycles when counting', async () => {
    const { mesocycleId, sessionIds, directives } = await seedPlanAndProfile()
    // 18 valid check-ins for this block…
    await seedCheckins(TEST_USER_ID, sessionIds.slice(0, 18))
    // …plus a bunch of check-ins with session_ids that don't belong to
    // this block. These should be ignored by the 18-min guard.
    await seedCheckins(
      TEST_USER_ID,
      Array.from({ length: 10 }, (_, i) => `unrelated-session-${i}`),
    )

    vi.mocked(callEdge).mockResolvedValue(makeStubReplanPayload(directives))
    await expect(replanNextBlock(TEST_USER_ID, mesocycleId)).resolves.toBeDefined()

    // The payload must contain ONLY the 18 in-block check-ins, not the 28
    // total rows in Dexie.
    const [, payload] = vi.mocked(callEdge).mock.calls[0]!
    const p = payload as { checkins: SessionCheckin[] }
    expect(p.checkins).toHaveLength(18)
  })

  it('throws when the mesocycle does not exist in Dexie', async () => {
    await saveProfileLocal(TEST_USER_ID, TEST_PROFILE)
    await expect(
      replanNextBlock(TEST_USER_ID, 'meso-does-not-exist'),
    ).rejects.toThrow(/not found in local DB/)
    expect(callEdge).not.toHaveBeenCalled()
  })

  it('throws when no profile is saved for the user', async () => {
    const { mesocycle } = orchestratePlan(TEST_PROFILE, TEST_USER_ID, 6)
    await db.mesocycles.put({
      id: mesocycle.id,
      user_id: mesocycle.user_id,
      generated_at: mesocycle.generated_at,
      length_weeks: mesocycle.length_weeks,
      sessions_json: JSON.stringify(mesocycle.sessions),
      profile_snapshot_json: JSON.stringify(TEST_PROFILE),
      synced: false,
    })
    // Deliberately do NOT save the profile.
    await expect(replanNextBlock(TEST_USER_ID, mesocycle.id)).rejects.toThrow(
      /no profile found/,
    )
    expect(callEdge).not.toHaveBeenCalled()
  })
})

// ─── Local replan (audit 2026-06-09 fix: dead backend must degrade) ─────────
describe('replanNextBlock — local replan', () => {
  beforeEach(async () => {
    vi.mocked(callEdge).mockReset()
    await db.sessionCheckins.clear()
    await db.sessionLogs.clear()
    await db.mesocycles.clear()
    await db.userProgramProfiles.clear()
    await db.replanHistory.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // One check-in with an explicit signal shape, persisted via the real
  // saveCheckin path.
  async function seedSignalCheckin(
    sessionId: string,
    opts: {
      feel: 1 | 2 | 3 | 4 | 5
      rating: ExerciseRating
      at: string
      notes?: string
    },
  ): Promise<void> {
    await saveCheckin({
      session_id: sessionId,
      user_id: TEST_USER_ID,
      completed_at: opts.at,
      week_number: 1,
      overall_feel: opts.feel,
      ...(opts.notes ? { overall_notes: opts.notes } : {}),
      exercises: [
        { library_id: 'ex:back-squat', name: 'Back Squat', rating: opts.rating },
      ],
      synced: false,
    })
  }

  async function squatSessionIdsOf(mesocycleId: string): Promise<string[]> {
    const row = await db.mesocycles.get(mesocycleId)
    const sessions = JSON.parse(row!.sessions_json) as Array<{
      id: string
      subtitle: string
    }>
    return sessions
      .filter((s) => s.subtitle === 'LOWER · SQUAT-DOMINANT')
      .map((s) => s.id)
  }

  it('local mode: replans with sparse history and never calls the edge', async () => {
    const { mesocycleId, sessionIds } = await seedPlanAndProfile()
    // Way below the edge path's 18-check-in gate — the local path softens it.
    await seedCheckins(TEST_USER_ID, sessionIds.slice(0, 5))

    const result = await replanNextBlock(TEST_USER_ID, mesocycleId)

    expect(callEdge).not.toHaveBeenCalled()
    expect(result.directives.week_shape.sessions_per_week).toBe(4)
    expect(result.adjustments_summary.length).toBeGreaterThan(0)
    expect(result.rationale_for_user.length).toBeGreaterThan(0)

    const history = await db.replanHistory
      .where('user_id')
      .equals(TEST_USER_ID)
      .toArray()
    expect(history).toHaveLength(1)
    expect(history[0]!.completed_mesocycle_id).toBe(mesocycleId)
  })

  it('local mode: works with zero check-ins', async () => {
    const { mesocycleId } = await seedPlanAndProfile()

    const result = await replanNextBlock(TEST_USER_ID, mesocycleId)

    expect(callEdge).not.toHaveBeenCalled()
    expect(result.adjustments_summary.length).toBeGreaterThan(0)
  })

  it('volume steps follow check-in signals and produce different valid blocks', async () => {
    const { mesocycleId, sessionIds } = await seedPlanAndProfile()

    // Consistently too hard → one volume step down.
    for (let i = 0; i < 8; i++) {
      await seedSignalCheckin(sessionIds[i]!, {
        feel: i % 2 === 0 ? 1 : 2,
        rating: 'tough',
        at: new Date(2026, 2, i + 1).toISOString(),
      })
    }
    const hard = await replanNextBlock(TEST_USER_ID, mesocycleId)
    expect(hard.directives.target_lifting_minutes).toBe(50)

    // Consistently too easy → one volume step up.
    await db.sessionCheckins.clear()
    await db.replanHistory.clear()
    for (let i = 0; i < 8; i++) {
      await seedSignalCheckin(sessionIds[i]!, {
        feel: 5,
        rating: 'easy',
        at: new Date(2026, 2, i + 1).toISOString(),
      })
    }
    const easy = await replanNextBlock(TEST_USER_ID, mesocycleId)
    expect(easy.directives.target_lifting_minutes).toBe(70)

    // Both sets of directives must build a schema-valid next block, and the
    // two blocks must actually differ (the easy one carries more work).
    const build = (d: ProgrammingDirectives): BuiltMesocycle =>
      buildMesocycle(d, 6, TEST_PROFILE)
    const hardBlock = build(hard.directives)
    const easyBlock = build(easy.directives)
    for (const b of [hardBlock, easyBlock]) {
      const parsed = MesocycleSchema.safeParse({
        id: b.id,
        user_id: TEST_USER_ID,
        generated_at: b.generated_at,
        length_weeks: b.length_weeks,
        sessions: b.sessions,
        profile_snapshot: TEST_PROFILE,
      })
      expect(parsed.success).toBe(true)
    }
    const wk1Sets = (b: BuiltMesocycle): number =>
      b.sessions
        .filter((s) => s.week_number === 1)
        .reduce(
          (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0),
          0,
        )
    expect(wk1Sets(easyBlock)).toBeGreaterThan(wk1Sets(hardBlock))
  })

  it('a completed pain-free block advances the rehab stage', async () => {
    const { mesocycleId } = await seedPlanAndProfile()
    const squatIds = await squatSessionIdsOf(mesocycleId)
    expect(squatIds.length).toBe(6)
    // All squat-pattern sessions completed after the block was generated.
    const base = Date.now() + 60_000
    for (let i = 0; i < squatIds.length; i++) {
      await seedSignalCheckin(squatIds[i]!, {
        feel: 3,
        rating: 'solid',
        at: new Date(base + i * 1000).toISOString(),
      })
    }

    const result = await replanNextBlock(TEST_USER_ID, mesocycleId)
    const inj = result.directives.injury_directives.find(
      (d) => d.source === 'left_meniscus',
    )!
    // Note-derived base ('rehab week 3') + the completed 6-week block.
    expect(inj.stage_weeks).toBe(9)
    expect(result.adjustments_summary.join(' ')).toMatch(/moves up/i)
  })

  it('pain notes withhold the rehab stage advancement', async () => {
    const { mesocycleId } = await seedPlanAndProfile()
    const squatIds = await squatSessionIdsOf(mesocycleId)
    const base = Date.now() + 60_000
    for (let i = 0; i < squatIds.length; i++) {
      await seedSignalCheckin(squatIds[i]!, {
        feel: 3,
        rating: 'solid',
        at: new Date(base + i * 1000).toISOString(),
        ...(i < 2 ? { notes: 'left knee pain on the way down' } : {}),
      })
    }

    const result = await replanNextBlock(TEST_USER_ID, mesocycleId)
    const inj = result.directives.injury_directives.find(
      (d) => d.source === 'left_meniscus',
    )!
    // The block was completed, but the pain notes hold the stage where the
    // note put it ('rehab week 3') instead of pushing ahead.
    expect(inj.stage_weeks).toBe(3)
    expect(result.adjustments_summary.join(' ')).toMatch(/pain/i)
  })

  it('edge mode: a dead edge falls back to the local replan', async () => {
    vi.stubEnv('VITE_USE_LOCAL_PLANNER', 'false')
    const { mesocycleId, sessionIds } = await seedPlanAndProfile()
    await seedCheckins(TEST_USER_ID, sessionIds.slice(0, 20))
    vi.mocked(callEdge).mockRejectedValue(
      new Error('edge replan_mesocycle network error: NXDOMAIN'),
    )

    const result = await replanNextBlock(TEST_USER_ID, mesocycleId)

    expect(callEdge).toHaveBeenCalledTimes(1)
    expect(result.adjustments_summary.length).toBeGreaterThan(0)
    expect(result.rationale_for_user.length).toBeGreaterThan(0)
    const history = await db.replanHistory
      .where('user_id')
      .equals(TEST_USER_ID)
      .toArray()
    expect(history).toHaveLength(1)
  })
})
