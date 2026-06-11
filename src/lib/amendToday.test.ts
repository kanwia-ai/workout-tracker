// Amend-today: today-only session edits (add mobility / add exercise /
// different-equipment re-pick), layered on at session resolution.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  applyAmendment,
  clearAmendmentForDate,
  equipmentRepickForSession,
  loadAmendmentForDate,
  mobilityExercisesForArea,
  saveAmendmentForDate,
} from './amendToday'
import { emptyAmendment } from '../types/amendment'
import { getSessionForDate } from './planSelectors'
import type { Mesocycle, PlannedExercise, PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

const USER = 'amend-test-user'

function ex(libraryId: string, name: string, role = 'accessory'): PlannedExercise {
  return {
    library_id: libraryId,
    name,
    sets: 3,
    reps: '8-12',
    rir: 2,
    rest_seconds: 120,
    role,
    warmup_sets: [],
  }
}

function session(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: 'session-wk1-s1',
    week_number: 1,
    ordinal: 1,
    focus: ['glutes', 'hamstrings'],
    title: 'glutes & posterior chain',
    subtitle: 'LOWER · HINGE-DOMINANT',
    estimated_minutes: 60,
    day_of_week: 0,
    rationale: 'engine rationale',
    status: 'upcoming',
    exercises: [
      ex('variant:romanian_deadlift', 'Romanian Deadlift', 'main lift'),
      ex('variant:seated_leg_curl', 'Seated Leg Curl', 'isolation'),
    ],
    ...overrides,
  }
}

function meso(s: PlannedSession): Mesocycle {
  return {
    id: 'meso-amend',
    user_id: USER,
    generated_at: '2026-06-08T08:00:00.000Z',
    length_weeks: 6,
    sessions: [s],
    profile_snapshot: {},
  } as Mesocycle
}

const PROFILE: UserProgramProfile = {
  goal: 'aesthetics',
  primary_goals: ['build_muscle'],
  sessions_per_week: 4,
  training_age_months: 12,
  equipment: ['full_gym'],
  injuries: [{ part: 'left_meniscus', severity: 'modify' }],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'female',
  posture_notes: '',
}

describe('mobilityExercisesForArea', () => {
  it('returns ready-to-append mobility rows with role mobility and rir 0', () => {
    const moves = mobilityExercisesForArea('hips')
    expect(moves.length).toBeGreaterThanOrEqual(3)
    for (const m of moves) {
      expect(m.role).toBe('mobility')
      expect(m.rir).toBe(0)
      expect(m.warmup_sets).toEqual([])
      expect(m.library_id.startsWith('amend:')).toBe(true)
    }
  })
})

describe('applyAmendment', () => {
  it('appends added exercises and bumps estimated minutes', () => {
    const s = session()
    const amendment = {
      ...emptyAmendment(),
      added_exercises: mobilityExercisesForArea('hips'),
    }
    const out = applyAmendment(s, amendment)
    expect(out.id).toBe(s.id)
    expect(out.exercises.length).toBe(s.exercises.length + 3)
    expect(out.estimated_minutes).toBeGreaterThan(s.estimated_minutes)
    // Originals untouched in order.
    expect(out.exercises[0].name).toBe('Romanian Deadlift')
  })

  it('replaces swapped exercises in place and dedupes additions', () => {
    const s = session()
    const replacement = ex('variant:dumbbell_rdl', 'Dumbbell RDL', 'main lift')
    const amendment = {
      added_exercises: [ex('variant:seated_leg_curl', 'Seated Leg Curl')],
      swaps: { 'variant:romanian_deadlift': replacement },
    }
    const out = applyAmendment(s, amendment)
    expect(out.exercises[0].name).toBe('Dumbbell RDL')
    // Already-present library_id is not appended twice.
    expect(out.exercises.length).toBe(2)
  })
})

describe('equipmentRepickForSession', () => {
  it('keeps compatible exercises and swaps barbell work for a home-weights day', () => {
    const s = session()
    const repick = equipmentRepickForSession(s, ['home_weights'], PROFILE)
    // The barbell RDL needs a swap or flag; nothing should vanish silently.
    const touched =
      Object.keys(repick.swaps).length +
      repick.compatible.length +
      repick.unswappable.length
    expect(touched).toBe(s.exercises.length)
    // Any produced swap must NOT require a barbell.
    for (const swap of Object.values(repick.swaps)) {
      expect(swap.name.toLowerCase()).not.toContain('barbell')
    }
  })

  it('never offers a meniscus-banned variant when repicking (injury filters hold)', () => {
    const squatSession = session({
      subtitle: 'LOWER · SQUAT-DOMINANT',
      exercises: [ex('variant:heel_elevated_goblet_squat', 'Heel-Elevated Goblet Squat', 'main lift')],
    })
    const repick = equipmentRepickForSession(squatSession, ['bodyweight_only'], PROFILE)
    for (const swap of Object.values(repick.swaps)) {
      // Deep loaded knee flexion stays out for a meniscus-modify profile.
      expect(swap.name.toLowerCase()).not.toMatch(/barbell back squat|jump/)
    }
  })
})

describe('persistence + resolution', () => {
  beforeEach(async () => {
    await db.dayOverrides.clear()
  })

  it('round-trips through the override row and applies at getSessionForDate', async () => {
    const s = session()
    const amendment = {
      ...emptyAmendment(),
      added_exercises: mobilityExercisesForArea('hips'),
    }
    await saveAmendmentForDate(USER, '2026-06-10', s.id, amendment)

    const overrides = await db.dayOverrides.where('user_id').equals(USER).toArray()
    expect(overrides).toHaveLength(1)
    expect(overrides[0].session_id).toBe(s.id)

    const resolved = getSessionForDate(meso(s), overrides, new Date(2026, 5, 10), 1)
    expect(resolved).not.toBeNull()
    expect(resolved!.exercises.length).toBe(5)
    expect(resolved!.exercises.some((e) => e.name === 'Couch Stretch')).toBe(true)

    // Other dates are untouched.
    const otherDay = getSessionForDate(meso(session({ day_of_week: 3 })), overrides, new Date(2026, 5, 11), 1)
    expect(otherDay?.exercises.length).toBe(2)
  })

  it('loadAmendmentForDate returns what was saved; clear removes the row', async () => {
    const s = session()
    await saveAmendmentForDate(USER, '2026-06-10', s.id, {
      ...emptyAmendment(),
      equipment_today: ['home_weights'],
      swaps: { 'variant:romanian_deadlift': ex('variant:dumbbell_rdl', 'Dumbbell RDL', 'main lift') },
    })
    const loaded = await loadAmendmentForDate(USER, '2026-06-10')
    expect(loaded.equipment_today).toEqual(['home_weights'])
    expect(Object.keys(loaded.swaps)).toHaveLength(1)

    await clearAmendmentForDate(USER, '2026-06-10', s.id)
    expect(await db.dayOverrides.get(`${USER}:2026-06-10`)).toBeUndefined()
  })

  it('preserves a redirect override when the amendment is cleared', async () => {
    await db.dayOverrides.put({
      id: `${USER}:2026-06-10`,
      user_id: USER,
      date: '2026-06-10',
      session_id: 'session-wk1-s2',
      created_at: '2026-06-10T08:00:00.000Z',
      synced: true,
    })
    await saveAmendmentForDate(USER, '2026-06-10', 'session-wk1-s1', {
      ...emptyAmendment(),
      added_exercises: mobilityExercisesForArea('lower_back'),
    })
    let row = await db.dayOverrides.get(`${USER}:2026-06-10`)
    // Redirect target is preserved, amendment attached.
    expect(row!.session_id).toBe('session-wk1-s2')
    expect(row!.amendment_json).toBeTruthy()

    await clearAmendmentForDate(USER, '2026-06-10', 'session-wk1-s1')
    row = await db.dayOverrides.get(`${USER}:2026-06-10`)
    expect(row).toBeDefined()
    expect(row!.session_id).toBe('session-wk1-s2')
    expect(row!.amendment_json).toBeUndefined()
  })
})
