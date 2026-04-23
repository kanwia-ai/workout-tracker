import { describe, it, expect } from 'vitest'
import {
  getToday,
  getWeekView,
  getSessionForDateWithRecalibration,
} from './planSelectors'
import type { Mesocycle, PlannedSession } from '../types/plan'
import type { CompletedSessionRef } from './planner/skipRecalibration'

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

describe('getSessionForDateWithRecalibration', () => {
  const userId = 'user-int'
  // 2026-04-22 is a Wednesday. JS getDay()=3 → Mon-0 dow=2.
  const wednesday = new Date(2026, 3, 22, 10, 0, 0)

  function makeSessionWithDow(
    week: number,
    ordinal: number,
    dow: number,
  ): PlannedSession {
    return {
      id: `int-w${week}-o${ordinal}`,
      week_number: week,
      ordinal,
      focus: ['full_body'],
      title: `Session ${week}.${ordinal}`,
      subtitle: '',
      estimated_minutes: 55,
      exercises: [makePlannedExercise()],
      day_of_week: dow,
      rationale: 'test rationale',
      status: 'upcoming',
    } as PlannedSession
  }

  function makePlanWithDow(): Mesocycle {
    // 3 sessions/week scheduled Mon/Wed/Fri (dow 0, 2, 4) across 6 weeks.
    const sessions: PlannedSession[] = []
    for (let w = 1; w <= 6; w++) {
      sessions.push(makeSessionWithDow(w, 1, 0))
      sessions.push(makeSessionWithDow(w, 2, 2))
      sessions.push(makeSessionWithDow(w, 3, 4))
    }
    return {
      id: 'meso-int',
      user_id: userId,
      generated_at: '2026-04-01T00:00:00Z',
      length_weeks: 6,
      sessions,
      profile_snapshot: { sessions_per_week: 3 },
    }
  }

  it('returns null session when plan is null', async () => {
    const result = await getSessionForDateWithRecalibration(
      null, [], wednesday, 1, userId, { logs: [] },
    )
    expect(result.session).toBeNull()
    expect(result.recalibration).toBeNull()
  })

  it('returns plain session (no recalibration) when user has no prior logs', async () => {
    const plan = makePlanWithDow()
    const result = await getSessionForDateWithRecalibration(
      plan, [], wednesday, 1, userId, { logs: [] },
    )
    expect(result.session).not.toBeNull()
    expect(result.session?.week_number).toBe(1)
    expect(result.session?.ordinal).toBe(2)   // Wed is ordinal 2 in Mon/Wed/Fri
    expect(result.recalibration).toBeNull()
  })

  it('returns plain session (no banner) when gap is 0-3 days (slide)', async () => {
    const plan = makePlanWithDow()
    // Last session 2 days ago — slide range.
    const logs: CompletedSessionRef[] = [
      {
        user_id: userId,
        ended_at: new Date(2026, 3, 20, 18, 0, 0).toISOString(),
      },
    ]
    const result = await getSessionForDateWithRecalibration(
      plan, [], wednesday, 1, userId, { logs, trainingAgeMonths: 24 },
    )
    expect(result.session).not.toBeNull()
    expect(result.recalibration).toBeNull()
  })

  it('returns recalibration banner when gap ≥ 4 days (deload_mild)', async () => {
    const plan = makePlanWithDow()
    // Last session 5 days ago — deload range.
    const logs: CompletedSessionRef[] = [
      {
        user_id: userId,
        ended_at: new Date(2026, 3, 17, 18, 0, 0).toISOString(),
      },
    ]
    const result = await getSessionForDateWithRecalibration(
      plan, [], wednesday, 1, userId, { logs, trainingAgeMonths: 24 },
    )
    expect(result.session).not.toBeNull()
    expect(result.recalibration).not.toBeNull()
    expect(result.recalibration?.action).toBe('deload_mild')
    expect(result.recalibration?.load_multiplier).toBe(0.9)
    expect(result.recalibration?.rationale).toMatch(/90%/)
  })

  it('step_back_one_week when gap is 10 days on a non-week-1 session', async () => {
    const plan = makePlanWithDow()
    const logs: CompletedSessionRef[] = [
      {
        user_id: userId,
        ended_at: new Date(2026, 3, 12, 18, 0, 0).toISOString(),
      },
    ]
    // Tell selector this is week 4.
    const result = await getSessionForDateWithRecalibration(
      plan, [], wednesday, 4, userId, { logs, trainingAgeMonths: 24 },
    )
    expect(result.session?.week_number).toBe(4)
    expect(result.recalibration?.action).toBe('step_back_one_week')
    expect(result.recalibration?.effective_week_number).toBe(3)
  })

  it('reset for novice lifter with 20+ day gap', async () => {
    const plan = makePlanWithDow()
    const logs: CompletedSessionRef[] = [
      {
        user_id: userId,
        ended_at: new Date(2026, 2, 25, 12, 0, 0).toISOString(),
      },
    ]
    const result = await getSessionForDateWithRecalibration(
      plan, [], wednesday, 4, userId, { logs, trainingAgeMonths: 6 },
    )
    expect(result.recalibration?.action).toBe('reset')
    expect(result.recalibration?.effective_week_number).toBe(1)
  })

  it('ignores logs from other users', async () => {
    const plan = makePlanWithDow()
    const logs: CompletedSessionRef[] = [
      {
        user_id: 'someone-else',
        ended_at: new Date(2026, 3, 17, 18, 0, 0).toISOString(),
      },
    ]
    const result = await getSessionForDateWithRecalibration(
      plan, [], wednesday, 1, userId, { logs, trainingAgeMonths: 24 },
    )
    expect(result.session).not.toBeNull()
    expect(result.recalibration).toBeNull()
  })
})
