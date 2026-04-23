// Tests for `replanNextBlock` — the end-of-block adaptive re-plan that
// feeds the last 6 weeks of check-ins to Claude Opus and gets back
// adjusted ProgrammingDirectives for the NEXT block.
//
// Everything hits the database via fake-indexeddb; the edge function
// (`callEdge`) is ALWAYS mocked — no real API traffic in these tests.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
import type { SessionCheckin } from '../../types/checkin'
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
  aesthetic_preference: 'athletic',
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

describe('replanNextBlock', () => {
  beforeEach(async () => {
    vi.mocked(callEdge).mockReset()
    await db.sessionCheckins.clear()
    await db.mesocycles.clear()
    await db.userProgramProfiles.clear()
    await db.replanHistory.clear()
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
