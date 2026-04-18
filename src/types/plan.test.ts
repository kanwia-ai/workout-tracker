import { describe, it, expect } from 'vitest'
import { MesocycleSchema, PlannedSessionSchema, type Mesocycle } from './plan'

function makePlannedExercise(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    library_id: 'fedb:hip-thrust',
    name: 'Barbell Hip Thrust',
    sets: 3,
    reps: '8-12',
    rir: 2,
    rest_seconds: 120,
    role: 'main lift',
    ...overrides,
  }
}

const FOCUS_ROTATION = [
  ['glutes', 'hamstrings'],
  ['chest', 'triceps'],
  ['back', 'biceps'],
  ['full_body'],
  ['rehab', 'mobility'],
  ['quads', 'core'],
]

function makeSession(week: number, ordinal: number, id: string) {
  const focus = FOCUS_ROTATION[(week + ordinal) % FOCUS_ROTATION.length]
  const session: Record<string, unknown> = {
    id,
    week_number: week,
    ordinal,
    focus,
    title: `Week ${week} — Session ${ordinal}`,
    estimated_minutes: 55,
    day_of_week: (ordinal - 1) * 2, // 0, 2, 4 for 3/wk cadence
    rationale: `Week ${week} session ${ordinal}; placed for recovery balance.`,
    exercises: [
      makePlannedExercise(),
      makePlannedExercise({
        library_id: 'fedb:rdl',
        name: 'Romanian Deadlift',
        role: 'accessory',
        reps: '10',
      }),
      makePlannedExercise({
        library_id: 'fedb:step-up',
        name: 'DB Step-Up',
        role: 'accessory',
        sets: 2,
        reps: '12',
        rir: 3,
        rest_seconds: 90,
      }),
      makePlannedExercise({
        library_id: 'fedb:dead-bug',
        name: 'Dead Bug',
        role: 'core',
        sets: 2,
        reps: '10',
        rir: 1,
        rest_seconds: 45,
        notes: 'slow and controlled',
      }),
    ],
    status: 'upcoming' as const,
  }
  // Exercise half the sessions with intended_date present, half absent, to exercise optionality.
  if ((week + ordinal) % 2 === 0) {
    session.intended_date = `2026-04-${String(week * 7 + ordinal).padStart(2, '0')}`
  }
  return session
}

describe('MesocycleSchema', () => {
  it('round-trips a plausible 6-week plan with ~3 sessions per week', () => {
    const sessions = []
    for (let week = 1; week <= 6; week++) {
      for (let ordinal = 1; ordinal <= 3; ordinal++) {
        sessions.push(makeSession(week, ordinal, `s-w${week}-o${ordinal}`))
      }
    }
    const plan = {
      id: 'meso-1',
      user_id: 'user-1',
      generated_at: '2026-04-17T00:00:00Z',
      length_weeks: 6,
      sessions,
      profile_snapshot: { goal: 'glutes', sessions_per_week: 3 },
    }
    expect(() => MesocycleSchema.parse(plan)).not.toThrow()
    const parsed: Mesocycle = MesocycleSchema.parse(plan)
    expect(parsed.sessions).toHaveLength(18)
    // Focus rotation includes non-anatomical groups
    const allFocus = parsed.sessions.flatMap(s => s.focus)
    expect(allFocus).toContain('glutes')
    expect(allFocus).toContain('rehab')
    expect(allFocus).toContain('full_body')
    // Some sessions have intended_date, some don't — schema tolerates both
    const withDate = parsed.sessions.filter(s => s.intended_date).length
    expect(withDate).toBeGreaterThan(0)
    expect(withDate).toBeLessThan(parsed.sessions.length)
  })
})

describe('PlannedSessionSchema rejections', () => {
  const baseSession = {
    id: 's-1', week_number: 1, ordinal: 1, focus: ['full_body'],
    title: 'x', estimated_minutes: 45,
    exercises: [{ library_id: 'fedb:x', name: 'x', sets: 3, reps: '10', rir: 2, rest_seconds: 60, role: 'main lift' }],
    status: 'upcoming',
    day_of_week: 0,
    rationale: 'Monday full-body; fresh week start, 48h to next session.',
  } as const

  it('rejects empty exercises array', () => {
    expect(PlannedSessionSchema.safeParse({ ...baseSession, exercises: [] }).success).toBe(false)
  })
  it('rejects unknown muscle group in focus', () => {
    expect(PlannedSessionSchema.safeParse({ ...baseSession, focus: ['legs'] }).success).toBe(false)
  })
  it('rejects estimated_minutes below 10', () => {
    expect(PlannedSessionSchema.safeParse({ ...baseSession, estimated_minutes: 5 }).success).toBe(false)
  })
  it('rejects sets=0', () => {
    const bad = { ...baseSession, exercises: [{ ...baseSession.exercises[0], sets: 0 }] }
    expect(PlannedSessionSchema.safeParse(bad).success).toBe(false)
  })
  it('rejects rir above 5', () => {
    const bad = { ...baseSession, exercises: [{ ...baseSession.exercises[0], rir: 6 }] }
    expect(PlannedSessionSchema.safeParse(bad).success).toBe(false)
  })
})

describe('PlannedSessionSchema day_of_week + rationale', () => {
  const baseSession = {
    id: 's-1', week_number: 1, ordinal: 1, focus: ['full_body'],
    title: 'x', estimated_minutes: 45,
    exercises: [{ library_id: 'fedb:x', name: 'x', sets: 3, reps: '10', rir: 2, rest_seconds: 60, role: 'main lift' }],
    status: 'upcoming',
    day_of_week: 0,
    rationale: 'Lower body Monday; 48h before Thursday Lower B.',
  } as const

  it('accepts a session with valid day_of_week + rationale', () => {
    const ok = PlannedSessionSchema.safeParse({ ...baseSession })
    expect(ok.success).toBe(true)
  })
  it('rejects day_of_week=7 (outside 0-6)', () => {
    expect(PlannedSessionSchema.safeParse({ ...baseSession, day_of_week: 7 }).success).toBe(false)
  })
  it('rejects day_of_week=-1 (outside 0-6)', () => {
    expect(PlannedSessionSchema.safeParse({ ...baseSession, day_of_week: -1 }).success).toBe(false)
  })
  it('rejects missing rationale', () => {
    const { rationale: _rationale, ...noRationale } = baseSession
    expect(PlannedSessionSchema.safeParse(noRationale).success).toBe(false)
  })
  it('rejects rationale longer than 280 characters', () => {
    const longRationale = 'a'.repeat(281)
    expect(PlannedSessionSchema.safeParse({ ...baseSession, rationale: longRationale }).success).toBe(false)
  })
})

describe('MesocycleSchema rejections', () => {
  const baseMeso = {
    id: 'm-1', user_id: 'u-1', generated_at: '2026-04-17T00:00:00Z',
    length_weeks: 6, profile_snapshot: {},
    sessions: [{
      id: 's-1', week_number: 1, ordinal: 1, focus: ['full_body'],
      title: 'x', estimated_minutes: 45,
      exercises: [{ library_id: 'fedb:x', name: 'x', sets: 3, reps: '10', rir: 2, rest_seconds: 60, role: 'main lift' }],
      status: 'upcoming',
      day_of_week: 0,
      rationale: 'Baseline session for schema test.',
    }],
  }

  it('rejects length_weeks below 3', () => {
    expect(MesocycleSchema.safeParse({ ...baseMeso, length_weeks: 2 }).success).toBe(false)
  })
  it('rejects length_weeks above 12', () => {
    expect(MesocycleSchema.safeParse({ ...baseMeso, length_weeks: 13 }).success).toBe(false)
  })
  it('rejects non-ISO generated_at', () => {
    expect(MesocycleSchema.safeParse({ ...baseMeso, generated_at: 'tomorrow' }).success).toBe(false)
  })
  it('rejects empty sessions array', () => {
    expect(MesocycleSchema.safeParse({ ...baseMeso, sessions: [] }).success).toBe(false)
  })
})
