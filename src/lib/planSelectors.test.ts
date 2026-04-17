import { describe, it, expect } from 'vitest'
import { getToday, getWeekView } from './planSelectors'
import type { Mesocycle, PlannedSession } from '../types/plan'

// Minimal local helpers — kept independent from src/types/plan.test.ts on purpose.
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

function makeSession(
  week: number,
  ordinal: number,
  status: PlannedSession['status'] = 'upcoming',
): PlannedSession {
  return {
    id: `s-w${week}-o${ordinal}`,
    week_number: week,
    ordinal,
    focus: ['full_body'],
    title: `Week ${week} — Session ${ordinal}`,
    estimated_minutes: 55,
    exercises: [makePlannedExercise()],
    status,
  } as PlannedSession
}

function makePlan(sessions: PlannedSession[]): Mesocycle {
  return {
    id: 'meso-1',
    user_id: 'user-1',
    generated_at: '2026-04-17T00:00:00Z',
    length_weeks: 6,
    sessions,
    profile_snapshot: { goal: 'glutes', sessions_per_week: 3 },
  }
}

// Realistic 6-week, 3-sessions-per-week fixture: 18 sessions total.
// First 3 completed, rest upcoming, so the next upcoming is w2/o1.
function makeFixture(): Mesocycle {
  const sessions: PlannedSession[] = []
  for (let week = 1; week <= 6; week++) {
    for (let ordinal = 1; ordinal <= 3; ordinal++) {
      const completed = week === 1
      sessions.push(makeSession(week, ordinal, completed ? 'completed' : 'upcoming'))
    }
  }
  return makePlan(sessions)
}

describe('getToday', () => {
  it('returns the first session with status === "upcoming"', () => {
    const plan = makeFixture()
    const today = getToday(plan)
    expect(today).not.toBeNull()
    expect(today?.week_number).toBe(2)
    expect(today?.ordinal).toBe(1)
  })

  it('returns null when plan is null', () => {
    expect(getToday(null)).toBeNull()
  })

  it('returns null when all sessions are completed', () => {
    const plan = makeFixture()
    const allDone: Mesocycle = {
      ...plan,
      sessions: plan.sessions.map(s => ({ ...s, status: 'completed' as const })),
    }
    expect(getToday(allDone)).toBeNull()
  })

  it('prefers an in_progress session over later upcoming sessions', () => {
    const plan = makeFixture()
    // Mark w3/o2 as in_progress (later than the natural "next upcoming" at w2/o1)
    const withInProgress: Mesocycle = {
      ...plan,
      sessions: plan.sessions.map(s =>
        s.week_number === 3 && s.ordinal === 2
          ? { ...s, status: 'in_progress' as const }
          : s
      ),
    }
    const today = getToday(withInProgress)
    expect(today?.week_number).toBe(3)
    expect(today?.ordinal).toBe(2)
    expect(today?.status).toBe('in_progress')
  })

  it('tolerates an unsorted sessions array', () => {
    const sessions: PlannedSession[] = [
      makeSession(2, 1, 'upcoming'),
      makeSession(1, 1, 'completed'),
      makeSession(1, 2, 'completed'),
    ]
    const plan = makePlan(sessions)
    const today = getToday(plan)
    expect(today?.week_number).toBe(2)
    expect(today?.ordinal).toBe(1)
  })
})

describe('getWeekView', () => {
  it('returns sessions for the given week number, sorted by ordinal', () => {
    const plan = makeFixture()
    // Shuffle sessions within a week so we can verify the sort happens.
    const shuffled: Mesocycle = {
      ...plan,
      sessions: [
        makeSession(3, 3),
        makeSession(3, 1),
        makeSession(3, 2),
        ...plan.sessions.filter(s => s.week_number !== 3),
      ],
    }
    const week3 = getWeekView(shuffled, 3)
    expect(week3).toHaveLength(3)
    expect(week3.map(s => s.ordinal)).toEqual([1, 2, 3])
    expect(week3.every(s => s.week_number === 3)).toBe(true)
  })

  it('returns an empty array for a week with no sessions', () => {
    const plan = makeFixture()
    expect(getWeekView(plan, 99)).toEqual([])
  })

  it('returns an empty array when plan is null', () => {
    expect(getWeekView(null, 1)).toEqual([])
  })
})
