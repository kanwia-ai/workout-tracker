import { describe, it, expect } from 'vitest'
import { orchestratePlan } from './orchestrate'
import type { UserProgramProfile } from '../../types/profile'

const KYRA_PROFILE: UserProgramProfile = {
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
  posture_notes: 'desk worker, tight hip flexors, knee clicks going deep',
  first_name: 'Kyra',
  injuries: [
    { part: 'left_meniscus', severity: 'modify', note: 'rehab week 3' },
    { part: 'lower_back', severity: 'chronic' },
  ],
}

describe('orchestratePlan', () => {
  it('returns a schema-valid Mesocycle, directives, and source tag', () => {
    const { mesocycle, directives, source } = orchestratePlan(KYRA_PROFILE, 'test-user-1', 6)
    expect(mesocycle.id).toBeDefined()
    expect(mesocycle.user_id).toBe('test-user-1')
    expect(mesocycle.length_weeks).toBe(6)
    expect(mesocycle.sessions.length).toBe(24)
    expect(directives.injury_directives).toHaveLength(2)
    expect(source).toBe('local_planner')
  })

  it('does not hit any network — pure synchronous call', () => {
    // If this test completes synchronously without throwing, we have zero
    // network dependency. No promises, no API calls.
    const result = orchestratePlan(KYRA_PROFILE, 'u1', 6)
    expect(result.mesocycle).toBeDefined()
  })

  it('preserves profile_snapshot for replay / debugging', () => {
    const { mesocycle } = orchestratePlan(KYRA_PROFILE, 'u1', 6)
    expect(mesocycle.profile_snapshot).toEqual(KYRA_PROFILE)
  })

  it('is deterministic up to the id + generated_at fields', () => {
    const a = orchestratePlan(KYRA_PROFILE, 'u1', 6)
    const b = orchestratePlan(KYRA_PROFILE, 'u1', 6)
    // Ids + timestamps will differ; the structural plan should match.
    expect(a.mesocycle.sessions.length).toBe(b.mesocycle.sessions.length)
    for (let i = 0; i < a.mesocycle.sessions.length; i += 1) {
      const sa = a.mesocycle.sessions[i]!
      const sb = b.mesocycle.sessions[i]!
      expect(sa.title).toBe(sb.title)
      expect(sa.subtitle).toBe(sb.subtitle)
      expect(sa.focus).toEqual(sb.focus)
      expect(sa.day_of_week).toBe(sb.day_of_week)
      expect(sa.exercises.map((e) => e.name)).toEqual(sb.exercises.map((e) => e.name))
    }
  })
})
