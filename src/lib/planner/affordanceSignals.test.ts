// Tests for the micro-feedback affordance signals defined in
// docs/research/02-coaching-philosophy.md §UX affordances.
//
// Covers:
//   1. Per-set rating aggregation (3-tap → ExerciseRating) and its
//      override behavior in computeNextWeight.
//   2. Warmup-count delta from mind_muscle_felt history.
//   3. Hard-to-feel exercise classification (id + name patterns).
//   4. Dexie / SessionCheckin schema accepts the new optional fields.

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  aggregateSetRatings,
  SessionCheckinSchema,
  type SessionCheckin,
  type SetRating,
} from '../../types/checkin'
import {
  computeNextWeight,
  computeWarmupDeltasForSession,
} from './autoProgress'
import { warmupCountDeltaFromHistory } from './generateWarmup'
import {
  HARD_TO_FEEL_EXERCISE_IDS,
  isHardToFeel,
} from './constants'
import { db } from '../db'
import type { PlannedExercise } from '../../types/plan'
import type { ExerciseCheckin } from '../../types/checkin'

// ─── Fixtures ──────────────────────────────────────────────────────────────

function mkExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    library_id: 'variant:cable_row_neutral',
    name: 'Neutral-Grip Cable Row',
    sets: 3,
    reps: '8-12',
    rir: 2,
    rest_seconds: 90,
    role: 'main lift',
    warmup_sets: [{ percent: 50, reps: 10 }, { percent: 70, reps: 5 }],
    ...overrides,
  }
}

function mkCheckin(overrides: Partial<ExerciseCheckin> = {}): ExerciseCheckin {
  return {
    library_id: 'variant:cable_row_neutral',
    name: 'Neutral-Grip Cable Row',
    rating: 'solid',
    used_weight_lb: 100,
    reps_done: [12, 12, 12],
    ...overrides,
  }
}

async function seedCheckin(checkin: SessionCheckin): Promise<void> {
  await db.sessionCheckins.put({
    session_id: checkin.session_id,
    user_id: checkin.user_id,
    completed_at: checkin.completed_at,
    week_number: checkin.week_number,
    checkin_json: JSON.stringify(checkin),
    synced: false,
  })
}

beforeEach(async () => {
  await db.sessionCheckins.clear()
})

// ─── aggregateSetRatings (pure) ────────────────────────────────────────────

describe('aggregateSetRatings', () => {
  it('returns undefined when no taps are captured', () => {
    expect(aggregateSetRatings([])).toBeUndefined()
    expect(aggregateSetRatings([null, null, null])).toBeUndefined()
  })

  it('all "easy" → easy', () => {
    expect(aggregateSetRatings(['easy', 'easy', 'easy'])).toBe('easy')
  })

  it('all "on it" → solid', () => {
    expect(aggregateSetRatings(['on it', 'on it', 'on it'])).toBe('solid')
  })

  it('all "cooked" → tough', () => {
    expect(aggregateSetRatings(['cooked', 'cooked', 'cooked'])).toBe('tough')
  })

  it('majority "on it" with one "easy" → solid', () => {
    // mean = (2 + 2 + 1)/3 = 1.67 → solid (≥ 1.5, < 2.5)
    expect(aggregateSetRatings(['on it', 'on it', 'easy'])).toBe('solid')
  })

  it('majority "on it" with one "cooked" → solid', () => {
    // mean = (2 + 2 + 3)/3 = 2.33 → solid (≥ 1.5, < 2.5)
    expect(aggregateSetRatings(['on it', 'on it', 'cooked'])).toBe('solid')
  })

  it('mostly "cooked" with one "on it" → tough', () => {
    // mean = (3 + 3 + 2)/3 = 2.67 → tough
    expect(aggregateSetRatings(['cooked', 'cooked', 'on it'])).toBe('tough')
  })

  it('mixed extremes (easy + cooked) average to solid', () => {
    // mean = (1 + 3)/2 = 2 → solid
    expect(aggregateSetRatings(['easy', 'cooked'])).toBe('solid')
  })

  it('null entries are dropped from the average', () => {
    // mean over present values only = (3 + 3)/2 = 3 → tough
    expect(aggregateSetRatings(['cooked', null, 'cooked', null])).toBe('tough')
  })
})

// ─── computeNextWeight prefers set_ratings when present ──────────────────

describe('computeNextWeight — per-set ratings override session-end rating', () => {
  it('all "easy" set-taps + ceiling reps → full bump (overrides "tough" session rating)', () => {
    // The session-end chip said "tough", but the in-flow per-set taps all
    // said "easy". Per the coaching philosophy, the per-set signal is the
    // source of truth ("the user's body is the source of truth, not the
    // spreadsheet"). Effective rating should be 'easy' → full +5 bump.
    const ex = mkExercise({ role: 'main lift', reps: '8-12' })
    const history = [
      mkCheckin({
        rating: 'tough',
        used_weight_lb: 100,
        reps_done: [12, 12, 12],
        set_ratings: ['easy', 'easy', 'easy'],
      }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })

  it('all "cooked" set-taps + ceiling reps → half bump (overrides "easy" session rating)', () => {
    // The user clicked "easy" at the end but tapped "cooked" every set
    // mid-flow. The in-flow signal wins — "tough" branch, ceiling met
    // → half bump.
    const ex = mkExercise({ role: 'main lift', reps: '8-12' })
    const history = [
      mkCheckin({
        rating: 'easy',
        used_weight_lb: 100,
        reps_done: [12, 12, 12],
        set_ratings: ['cooked', 'cooked', 'cooked'],
      }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 102.5 })
  })

  it('falls back to session rating when set_ratings is missing or empty', () => {
    const ex = mkExercise({ role: 'main lift', reps: '8-12' })
    const history = [
      mkCheckin({
        rating: 'easy',
        used_weight_lb: 100,
        reps_done: [12, 12, 12],
        // no set_ratings field
      }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })

  it('all-null set_ratings (taps skipped) → falls back to session rating', () => {
    const ex = mkExercise({ role: 'main lift', reps: '8-12' })
    const history = [
      mkCheckin({
        rating: 'tough',
        used_weight_lb: 100,
        reps_done: [12, 12, 12],
        set_ratings: [null, null, null],
      }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    // session rating "tough" + ceiling met → half bump
    expect(result).toMatchObject({ action: 'bump', weight: 102.5 })
  })
})

// ─── warmupCountDeltaFromHistory (pure) ───────────────────────────────────

describe('warmupCountDeltaFromHistory', () => {
  it('empty history → 0', () => {
    expect(warmupCountDeltaFromHistory([])).toBe(0)
  })

  it('no signal in history → 0', () => {
    expect(warmupCountDeltaFromHistory([null, undefined, null])).toBe(0)
  })

  it("most recent signal 'missed' → +1", () => {
    expect(warmupCountDeltaFromHistory(['missed'])).toBe(1)
  })

  it("most recent signal 'missed' (even with older 'felt') → +1", () => {
    expect(warmupCountDeltaFromHistory(['missed', 'felt', 'felt'])).toBe(1)
  })

  it("most recent signal 'felt' → 0 (return to baseline)", () => {
    expect(warmupCountDeltaFromHistory(['felt'])).toBe(0)
  })

  it("most recent signal 'felt' with prior 'missed' → 0", () => {
    expect(warmupCountDeltaFromHistory(['felt', 'missed'])).toBe(0)
  })

  it('skips null entries when finding most recent signal', () => {
    expect(warmupCountDeltaFromHistory([null, null, 'missed'])).toBe(1)
    expect(warmupCountDeltaFromHistory([null, 'felt', 'missed'])).toBe(0)
  })

  it('delta never exceeds +1 (gentle, not aggressive)', () => {
    // Even after several missed sessions in a row, the delta stays +1.
    // Aggressive auto-bump would conflict with the "signals as inputs,
    // not triggers" principle.
    expect(warmupCountDeltaFromHistory(['missed', 'missed', 'missed', 'missed'])).toBe(1)
  })
})

// ─── computeWarmupDeltasForSession (Dexie-backed) ─────────────────────────

describe('computeWarmupDeltasForSession', () => {
  const userId = 'user-1'
  const exercises = [
    mkExercise({
      library_id: 'variant:cable_row_neutral',
      name: 'Neutral-Grip Cable Row',
    }),
    mkExercise({
      library_id: 'variant:back_squat_moderate',
      name: 'Back Squat',
    }),
  ]

  it('returns empty map when there is no history', async () => {
    const out = await computeWarmupDeltasForSession(userId, null, exercises)
    expect(out).toEqual({})
  })

  it('returns 0 entries (no key) for exercises that are not hard-to-feel', async () => {
    await seedCheckin({
      session_id: 'sess-1',
      user_id: userId,
      completed_at: '2026-04-01T12:00:00.000Z',
      week_number: 1,
      overall_feel: 3,
      exercises: [
        {
          library_id: 'variant:back_squat_moderate',
          name: 'Back Squat',
          rating: 'solid',
          mind_muscle_felt: 'missed',  // wouldn't actually be set for a squat
        },
      ],
      synced: false,
    })
    const out = await computeWarmupDeltasForSession(userId, null, exercises)
    // Back squat is NOT in HARD_TO_FEEL_EXERCISE_IDS, so it's filtered out
    // before even reading history.
    expect(out['variant:back_squat_moderate']).toBeUndefined()
  })

  it("returns +1 for hard-to-feel exercise when last session was 'missed'", async () => {
    await seedCheckin({
      session_id: 'sess-1',
      user_id: userId,
      completed_at: '2026-04-01T12:00:00.000Z',
      week_number: 1,
      overall_feel: 3,
      exercises: [
        {
          library_id: 'variant:cable_row_neutral',
          name: 'Neutral-Grip Cable Row',
          rating: 'solid',
          mind_muscle_felt: 'missed',
        },
      ],
      synced: false,
    })
    const out = await computeWarmupDeltasForSession(userId, null, exercises)
    expect(out['variant:cable_row_neutral']).toBe(1)
  })

  it("returns 0 (no entry) for hard-to-feel exercise when last session was 'felt'", async () => {
    await seedCheckin({
      session_id: 'sess-1',
      user_id: userId,
      completed_at: '2026-04-01T12:00:00.000Z',
      week_number: 1,
      overall_feel: 3,
      exercises: [
        {
          library_id: 'variant:cable_row_neutral',
          name: 'Neutral-Grip Cable Row',
          rating: 'solid',
          mind_muscle_felt: 'felt',
        },
      ],
      synced: false,
    })
    const out = await computeWarmupDeltasForSession(userId, null, exercises)
    // 'felt' → 0 delta, which the function omits from the map.
    expect(out['variant:cable_row_neutral']).toBeUndefined()
  })

  it('excludeSessionId filters the most recent check-in from history', async () => {
    // Two sessions: an older "missed" and a more recent "felt". If we
    // include both, "felt" wins → no delta. If we exclude the most recent
    // (simulating "this session is the one we're hydrating"), "missed"
    // becomes the latest → delta = 1.
    await seedCheckin({
      session_id: 'sess-old',
      user_id: userId,
      completed_at: '2026-03-25T12:00:00.000Z',
      week_number: 1,
      overall_feel: 3,
      exercises: [
        {
          library_id: 'variant:cable_row_neutral',
          name: 'Neutral-Grip Cable Row',
          rating: 'solid',
          mind_muscle_felt: 'missed',
        },
      ],
      synced: false,
    })
    await seedCheckin({
      session_id: 'sess-new',
      user_id: userId,
      completed_at: '2026-04-01T12:00:00.000Z',
      week_number: 2,
      overall_feel: 3,
      exercises: [
        {
          library_id: 'variant:cable_row_neutral',
          name: 'Neutral-Grip Cable Row',
          rating: 'solid',
          mind_muscle_felt: 'felt',
        },
      ],
      synced: false,
    })

    const withAll = await computeWarmupDeltasForSession(userId, null, exercises)
    expect(withAll['variant:cable_row_neutral']).toBeUndefined()

    const excludingNew = await computeWarmupDeltasForSession(userId, 'sess-new', exercises)
    expect(excludingNew['variant:cable_row_neutral']).toBe(1)
  })
})

// ─── isHardToFeel classifier (pure) ───────────────────────────────────────

describe('isHardToFeel', () => {
  it('curated variant ids are recognized', () => {
    for (const id of HARD_TO_FEEL_EXERCISE_IDS) {
      expect(isHardToFeel(id, 'Some Name')).toBe(true)
    }
  })

  it('name patterns catch fedb / LLM-emitted exercises', () => {
    expect(isHardToFeel('fedb:lat-pulldown-wide', 'Wide-Grip Lat Pulldown')).toBe(true)
    expect(isHardToFeel('fedb:cable-pulldown', 'Cable Pulldown')).toBe(true)
    expect(isHardToFeel('ex:any', 'Banded Clamshell (Side-Lying)')).toBe(true)
    expect(isHardToFeel('ex:any', 'Hip Abduction Machine')).toBe(true)
    expect(isHardToFeel('ex:any', 'Lying Hamstring Curl')).toBe(true)
    expect(isHardToFeel('ex:any', 'Seated Leg Curl')).toBe(true)
    expect(isHardToFeel('ex:any', 'Cable Face Pull')).toBe(true)
    expect(isHardToFeel('ex:any', 'Rear Delt Fly')).toBe(true)
    expect(isHardToFeel('ex:any', 'Prone Y Raise')).toBe(true)
  })

  it('compound lifts are NOT classified as hard-to-feel', () => {
    expect(isHardToFeel('variant:back_squat_moderate', 'Back Squat')).toBe(false)
    expect(isHardToFeel('variant:bench_press_moderate', 'Bench Press')).toBe(false)
    expect(isHardToFeel('variant:pullup_full', 'Pull-Up')).toBe(false)
    expect(isHardToFeel('ex:any', 'Romanian Deadlift')).toBe(false)
    expect(isHardToFeel('ex:any', 'Overhead Press')).toBe(false)
  })
})

// ─── SessionCheckin schema accepts the new optional fields ────────────────

describe('SessionCheckinSchema — additive micro-feedback fields', () => {
  it('parses a check-in with set_ratings array', () => {
    const checkin: SessionCheckin = {
      session_id: 'sess-1',
      user_id: 'user-1',
      completed_at: '2026-04-10T12:00:00.000Z',
      week_number: 2,
      overall_feel: 4,
      exercises: [
        {
          library_id: 'ex:back-squat',
          name: 'Back Squat',
          rating: 'solid',
          set_ratings: ['easy', 'on it', 'cooked', null],
        },
      ],
      synced: false,
    }
    const parsed = SessionCheckinSchema.safeParse(checkin)
    expect(parsed.success).toBe(true)
  })

  it('parses a check-in with rest_needed_seconds array', () => {
    const checkin: SessionCheckin = {
      session_id: 'sess-1',
      user_id: 'user-1',
      completed_at: '2026-04-10T12:00:00.000Z',
      week_number: 2,
      overall_feel: 4,
      exercises: [
        {
          library_id: 'ex:back-squat',
          name: 'Back Squat',
          rating: 'solid',
          rest_needed_seconds: [45, null, 60],
        },
      ],
      synced: false,
    }
    const parsed = SessionCheckinSchema.safeParse(checkin)
    expect(parsed.success).toBe(true)
  })

  it("parses a check-in with mind_muscle_felt = 'felt' or 'missed'", () => {
    const baseCheckin: SessionCheckin = {
      session_id: 'sess-1',
      user_id: 'user-1',
      completed_at: '2026-04-10T12:00:00.000Z',
      week_number: 2,
      overall_feel: 4,
      exercises: [
        {
          library_id: 'variant:cable_row_neutral',
          name: 'Neutral-Grip Cable Row',
          rating: 'solid',
          mind_muscle_felt: 'felt',
        },
      ],
      synced: false,
    }
    expect(SessionCheckinSchema.safeParse(baseCheckin).success).toBe(true)
    const missedCheckin = {
      ...baseCheckin,
      exercises: [{ ...baseCheckin.exercises[0]!, mind_muscle_felt: 'missed' as const }],
    }
    expect(SessionCheckinSchema.safeParse(missedCheckin).success).toBe(true)
  })

  it('rejects an invalid mind_muscle_felt value', () => {
    const checkin = {
      session_id: 'sess-1',
      user_id: 'user-1',
      completed_at: '2026-04-10T12:00:00.000Z',
      week_number: 2,
      overall_feel: 4,
      exercises: [
        {
          library_id: 'ex:any',
          name: 'Any',
          rating: 'solid',
          mind_muscle_felt: 'kinda',
        },
      ],
      synced: false,
    }
    expect(SessionCheckinSchema.safeParse(checkin).success).toBe(false)
  })

  it('legacy check-ins (no new fields) still parse', () => {
    const legacy = {
      session_id: 'sess-1',
      user_id: 'user-1',
      completed_at: '2026-04-10T12:00:00.000Z',
      week_number: 2,
      overall_feel: 4,
      exercises: [
        { library_id: 'ex:back-squat', name: 'Back Squat', rating: 'solid' },
      ],
      synced: false,
    }
    expect(SessionCheckinSchema.safeParse(legacy).success).toBe(true)
  })
})

// ─── Dexie LocalSetLog accepts the new optional fields ────────────────────

describe('Dexie LocalSetLog — additive micro-feedback fields (v10)', () => {
  it('persists a set log with set_rating, rest_needed_seconds, and mind_muscle_felt', async () => {
    await db.setLogs.clear()
    await db.setLogs.put({
      id: 'set-1',
      session_log_id: 'sess-1',
      exercise_id: 'ex:back-squat',
      set_number: 1,
      weight: 100,
      reps_completed: 10,
      timestamp: new Date().toISOString(),
      synced: false,
      set_rating: 'on it',
      rest_needed_seconds: 45,
      mind_muscle_felt: 'felt',
    })
    const row = await db.setLogs.get('set-1')
    expect(row).toBeDefined()
    expect(row?.set_rating).toBe('on it')
    expect(row?.rest_needed_seconds).toBe(45)
    expect(row?.mind_muscle_felt).toBe('felt')
  })

  it('persists a set log without any micro-feedback fields (legacy path)', async () => {
    await db.setLogs.clear()
    await db.setLogs.put({
      id: 'set-1',
      session_log_id: 'sess-1',
      exercise_id: 'ex:back-squat',
      set_number: 1,
      weight: 100,
      reps_completed: 10,
      timestamp: new Date().toISOString(),
      synced: false,
    })
    const row = await db.setLogs.get('set-1')
    expect(row).toBeDefined()
    expect(row?.set_rating).toBeUndefined()
    expect(row?.rest_needed_seconds).toBeUndefined()
    expect(row?.mind_muscle_felt).toBeUndefined()
  })
})
