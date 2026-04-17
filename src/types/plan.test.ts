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

function makeSession(week: number, ordinal: number, id: string) {
  return {
    id,
    week_number: week,
    ordinal,
    focus: ['glutes', 'hamstrings'] as const,
    title: `Week ${week} — Lower A`,
    estimated_minutes: 55,
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
    intended_date: `2026-04-${String(week * 7 + ordinal).padStart(2, '0')}`,
  }
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
    expect(parsed.sessions[0].focus).toContain('glutes')
  })
})

describe('PlannedSessionSchema', () => {
  it('rejects a session with 0 exercises', () => {
    const bad = PlannedSessionSchema.safeParse({
      id: 's-empty',
      week_number: 1,
      ordinal: 1,
      focus: ['full_body'],
      title: 'Empty session',
      estimated_minutes: 30,
      exercises: [],
      status: 'upcoming',
    })
    expect(bad.success).toBe(false)
  })
})
