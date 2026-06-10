// Tests for cross-block rehab stage continuity (audit 2026-06-09 fix:
// "rehab never advances between blocks — block 2 restarts meniscus rehab at
// stage 1 forever"). Everything runs against fake-indexeddb — the continuity
// rule must work fully offline.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The continuity rule must work with a dead backend — mock the edge client
// (used only by the fail-soft nuance layer inside generatePlanLocal) so the
// end-to-end tests stay offline and fast.
vi.mock('../generate', () => ({
  callEdge: vi.fn().mockRejectedValue(new Error('edge offline (test)')),
}))

import { db } from '../db'
import { orchestratePlan } from './orchestrate'
import { generatePlanLocal } from '../planGen'
import { interpretProfile } from './interpretProfile'
import {
  applyRehabStageOffsets,
  computeRehabStageOffsets,
  REHAB_ADVANCE_COMPLETION_THRESHOLD,
} from './rehabContinuity'
import type { Mesocycle, PlannedSession } from '../../types/plan'
import type { UserProgramProfile } from '../../types/profile'

const USER_ID = 'test-user-rehab-continuity'

const MENISCUS_PROFILE: UserProgramProfile = {
  goal: 'strength',
  primary_goal: 'get_stronger',
  primary_goals: ['get_stronger'],
  sessions_per_week: 4,
  training_age_months: 24,
  equipment: ['full_gym'],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'female',
  posture_notes: '',
  injuries: [{ part: 'left_meniscus', severity: 'modify' }],
}

const HEALTHY_PROFILE: UserProgramProfile = {
  ...MENISCUS_PROFILE,
  injuries: [],
}

// Persist a generated block with a controlled generated_at so completion
// windows are deterministic. Returns the full mesocycle for session-id math.
async function seedBlock(
  profile: UserProgramProfile,
  generatedAt: string,
): Promise<Mesocycle> {
  const { mesocycle } = orchestratePlan(profile, USER_ID, 6)
  const stamped = { ...mesocycle, generated_at: generatedAt }
  await db.mesocycles.put({
    id: stamped.id,
    user_id: USER_ID,
    generated_at: generatedAt,
    length_weeks: stamped.length_weeks,
    sessions_json: JSON.stringify(stamped.sessions),
    profile_snapshot_json: JSON.stringify(profile),
    synced: false,
  })
  return stamped
}

function squatSessionsOf(meso: Mesocycle): PlannedSession[] {
  return meso.sessions.filter((s) => s.subtitle === 'LOWER · SQUAT-DOMINANT')
}

// Seed a check-in row for each given session id, completed at the given time
// (+i seconds so timestamps stay unique and ordered).
async function seedCheckinsAt(
  sessionIds: readonly string[],
  baseISO: string,
): Promise<void> {
  const base = new Date(baseISO).getTime()
  for (let i = 0; i < sessionIds.length; i++) {
    const completedAt = new Date(base + i * 1000).toISOString()
    await db.sessionCheckins.put({
      session_id: sessionIds[i]!,
      user_id: USER_ID,
      completed_at: completedAt,
      week_number: 1,
      checkin_json: JSON.stringify({
        session_id: sessionIds[i]!,
        user_id: USER_ID,
        completed_at: completedAt,
        week_number: 1,
        overall_feel: 3,
        exercises: [],
        synced: false,
      }),
      synced: false,
    })
  }
}

beforeEach(async () => {
  await db.mesocycles.clear()
  await db.sessionCheckins.clear()
  await db.sessionLogs.clear()
  await db.userProgramProfiles.clear()
})

describe('computeRehabStageOffsets', () => {
  it('returns no offsets for a profile without rehab injuries', async () => {
    await seedBlock(HEALTHY_PROFILE, '2026-01-01T00:00:00.000Z')
    const offsets = await computeRehabStageOffsets(USER_ID, HEALTHY_PROFILE)
    expect(offsets).toEqual({})
  })

  it('returns no offsets when the user has no prior blocks', async () => {
    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({})
  })

  it('advances by the block length when >=70% of protocol sessions completed', async () => {
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    const squats = squatSessionsOf(block1)
    expect(squats.length).toBe(6) // one squat-pattern session per week
    // 5 of 6 = 83% >= 70% threshold.
    await seedCheckinsAt(
      squats.slice(0, 5).map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({ left_meniscus: 6 })
  })

  it('repeats (no offset) below the completion threshold', async () => {
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    const squats = squatSessionsOf(block1)
    // 2 of 6 = 33% < 70%.
    await seedCheckinsAt(
      squats.slice(0, 2).map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({})
    expect(REHAB_ADVANCE_COMPLETION_THRESHOLD).toBe(0.7)
  })

  it('ignores prior blocks whose profile snapshot lacked the injury', async () => {
    // The user trained a full healthy block, THEN tore the meniscus. None of
    // that squat work was rehab work — stage must start at 1.
    const block1 = await seedBlock(HEALTHY_PROFILE, '2026-01-01T00:00:00.000Z')
    await seedCheckinsAt(
      block1.sessions.map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({})
  })

  it('accumulates across multiple completed blocks', async () => {
    // Session ids collide across blocks AND sessionCheckins rows are keyed
    // by session_id, so a newer block's check-ins overwrite the older
    // block's. Session logs are the durable per-workout record (unique row
    // ids) — block 1's completion evidence lives there, like it would for a
    // real user who trained both blocks.
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    const block1Squats = squatSessionsOf(block1)
    for (let i = 0; i < block1Squats.length; i++) {
      await db.sessionLogs.put({
        id: `block1-log-${i}`,
        user_id: USER_ID,
        workout_id: block1Squats[i]!.id,
        date: '2026-01-10',
        started_at: '2026-01-10T10:00:00.000Z',
        ended_at: `2026-01-10T11:00:0${i}.000Z`,
        phases_json: '[]',
        completed_sets: 20,
        total_sets: 22,
        synced: false,
      })
    }
    const block2 = await seedBlock(MENISCUS_PROFILE, '2026-02-15T00:00:00.000Z')
    await seedCheckinsAt(
      squatSessionsOf(block2).map((s) => s.id),
      '2026-02-20T00:00:00.000Z',
    )

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({ left_meniscus: 12 })
  })

  it('an untrained regenerated block never advances the stage', async () => {
    // Session ids collide across blocks (session-wk1-s1 etc.), so completion
    // must be window-scoped: block 1's check-ins land before block 2 was
    // generated and must not count for block 2.
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    await seedCheckinsAt(
      squatSessionsOf(block1).map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )
    // Regenerated block 2 — zero training since.
    await seedBlock(MENISCUS_PROFILE, '2026-02-15T00:00:00.000Z')

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({ left_meniscus: 6 })
  })

  it('counts workout session logs as completion, not just check-ins', async () => {
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    const squats = squatSessionsOf(block1)
    for (let i = 0; i < 5; i++) {
      await db.sessionLogs.put({
        id: `log-${i}`,
        user_id: USER_ID,
        workout_id: squats[i]!.id,
        date: '2026-01-12',
        started_at: '2026-01-12T10:00:00.000Z',
        ended_at: `2026-01-12T11:00:0${i}.000Z`,
        phases_json: '[]',
        completed_sets: 20,
        total_sets: 22,
        synced: false,
      })
    }

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE)
    expect(offsets).toEqual({ left_meniscus: 6 })
  })

  it('excludeMesocycleId withholds that block\'s advancement (pain guard)', async () => {
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    await seedCheckinsAt(
      squatSessionsOf(block1).map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )

    const offsets = await computeRehabStageOffsets(USER_ID, MENISCUS_PROFILE, {
      excludeMesocycleId: block1.id,
    })
    expect(offsets).toEqual({})
  })
})

describe('applyRehabStageOffsets', () => {
  it('bumps stage_weeks only on matching rehab directives', () => {
    const directives = interpretProfile(MENISCUS_PROFILE)
    const before = directives.injury_directives.find(
      (d) => d.source === 'left_meniscus',
    )!
    expect(before.stage_weeks).toBe(0)

    const after = applyRehabStageOffsets(directives, { left_meniscus: 6 })
    const adjusted = after.injury_directives.find(
      (d) => d.source === 'left_meniscus',
    )!
    expect(adjusted.stage_weeks).toBe(6)
    expect(adjusted.severity).toBe('rehab')
    // Original directives untouched (pure function).
    expect(before.stage_weeks).toBe(0)
  })

  it('leaves non-rehab and unmatched directives alone', () => {
    const profile: UserProgramProfile = {
      ...MENISCUS_PROFILE,
      injuries: [
        { part: 'left_meniscus', severity: 'modify' },
        { part: 'lower_back', severity: 'chronic' },
      ],
    }
    const directives = interpretProfile(profile)
    const after = applyRehabStageOffsets(directives, {
      lower_back: 4,
      right_trap: 2,
    })
    // lower_back is chronic (not 'rehab') → untouched; right_trap absent.
    for (const d of after.injury_directives) {
      const original = directives.injury_directives.find((o) => o.source === d.source)!
      expect(d.stage_weeks).toBe(original.stage_weeks)
    }
  })

  it('no offsets → same directives reference (no-op)', () => {
    const directives = interpretProfile(MENISCUS_PROFILE)
    expect(applyRehabStageOffsets(directives, {})).toBe(directives)
  })
})

describe('generatePlanLocal — rehab continuity end-to-end', () => {
  it('block 2 picks up at the next stage after a completed block', async () => {
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    await seedCheckinsAt(
      squatSessionsOf(block1).map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )

    const block2 = await generatePlanLocal(MENISCUS_PROFILE, USER_ID, 6)
    const wk1Squat = squatSessionsOf(block2).find((s) => s.week_number === 1)!
    const main = wk1Squat.exercises.find((e) => e.role === 'main lift')!
    // Effective rehab week 7 → final (return) stage → full back squat at
    // moderate load, NOT the stage-1 heel-elevated goblet.
    expect(main.library_id).toBe('variant:back_squat_moderate_load')
  })

  it('block 2 repeats stage 1 when the prior block was barely trained', async () => {
    const block1 = await seedBlock(MENISCUS_PROFILE, '2026-01-01T00:00:00.000Z')
    await seedCheckinsAt(
      squatSessionsOf(block1)
        .slice(0, 2)
        .map((s) => s.id),
      '2026-01-10T00:00:00.000Z',
    )

    const block2 = await generatePlanLocal(MENISCUS_PROFILE, USER_ID, 6)
    const wk1Squat = squatSessionsOf(block2).find((s) => s.week_number === 1)!
    const main = wk1Squat.exercises.find((e) => e.role === 'main lift')!
    expect(main.library_id).toBe('variant:heel_elevated_goblet_squat')
  })
})
