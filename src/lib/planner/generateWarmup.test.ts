import { describe, it, expect } from 'vitest'
import { generateWarmup } from './generateWarmup'
import { interpretProfile } from './interpretProfile'
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
    { part: 'right_trap', severity: 'chronic' },
    { part: 'hip_flexors', severity: 'chronic' },
  ],
}

const FRESH_MENISCUS_PROFILE: UserProgramProfile = {
  ...KYRA_PROFILE,
  injuries: [
    { part: 'left_meniscus', severity: 'modify', note: 'just cleared' },
  ],
  posture_notes: '',
}

const NO_INJURY_PROFILE: UserProgramProfile = {
  ...KYRA_PROFILE,
  injuries: [],
  posture_notes: '',
}

describe('generateWarmup — shape', () => {
  it('returns session_id + ordered exercises + summary', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'test-1',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    expect(w.session_id).toBe('test-1')
    expect(w.exercises.length).toBeGreaterThanOrEqual(1)
    expect(w.summary.length).toBeGreaterThan(5)
    expect(w.source).toBe('rules')
  })

  it('estimated_minutes is 3-20', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'test-1',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    expect(w.estimated_minutes).toBeGreaterThanOrEqual(3)
    expect(w.estimated_minutes).toBeLessThanOrEqual(20)
  })

  it('exercises are ordered cv_prep → mobility → activation → specific', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'test-1',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const order = ['cv_prep', 'mobility', 'activation', 'specific'] as const
    let lastIdx = -1
    for (const ex of w.exercises) {
      const idx = order.indexOf(ex.category)
      expect(idx).toBeGreaterThanOrEqual(lastIdx)
      lastIdx = idx
    }
  })
})

describe("generateWarmup — Kyra's leg day (golden)", () => {
  it('includes reverse-incline walking (meniscus protocol stage warmup)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'kyra-wk1-leg',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const names = w.exercises.map((e) => e.name)
    expect(names).toContain('reverse_incline_walking_5min')
  })

  it('includes hip/ankle mobility (meniscus + hip flexors + ankle-adjacent)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'kyra-wk1-leg',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const categories = w.exercises.map((e) => e.category)
    expect(categories).toContain('mobility')
  })

  it('includes glute/hamstring activation (knee-tracking + LBP priority)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'kyra-wk1-leg',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const categories = w.exercises.map((e) => e.category)
    expect(categories).toContain('activation')
  })

  it('is "not stretching" — emphasizes mobility + activation, not static holds only', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const w = generateWarmup({
      session_id: 'kyra-wk1-leg',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const hasActivation = w.exercises.some((e) => e.category === 'activation')
    expect(hasActivation).toBe(true)
  })
})

describe('generateWarmup — fresh meniscus wk1 uses stage-1 warmup protocol', () => {
  it('includes terminal knee extensions (stage wk1_2 specific) and reverse-incline walking', () => {
    const d = interpretProfile(FRESH_MENISCUS_PROFILE)
    const w = generateWarmup({
      session_id: 'fresh-wk1-leg',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const names = w.exercises.map((e) => e.name)
    expect(names.some((n) => n.includes('terminal_knee_extensions'))).toBe(true)
    expect(names.some((n) => n.includes('reverse_incline_walking'))).toBe(true)
  })
})

describe('generateWarmup — upper sessions', () => {
  it('shoulder rehab user gets cuff + scap activation on upper_push', () => {
    const profile: UserProgramProfile = {
      ...NO_INJURY_PROFILE,
      injuries: [{ part: 'left_shoulder', severity: 'modify', note: 'impingement, reintegration' }],
    }
    const d = interpretProfile(profile)
    const w = generateWarmup({
      session_id: 'shoulder-upper-push',
      session_type: 'upper_push',
      week_number: 1,
      directives: d,
    })
    const names = w.exercises.map((e) => e.name)
    expect(names.some((n) => n.includes('external_rotation'))).toBe(true)
  })
})

describe('generateWarmup — fallback when no injury matches session', () => {
  it('produces a sensible generic warmup when no injury directives apply', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const w = generateWarmup({
      session_id: 'generic-upper',
      session_type: 'upper_push',
      week_number: 1,
      directives: d,
    })
    expect(w.exercises.length).toBeGreaterThanOrEqual(1)
    // Upper fallback should include thoracic extension or scap work
    const names = w.exercises.map((e) => e.name)
    expect(
      names.some((n) => n.includes('thoracic') || n.includes('scap') || n.includes('pull_apart')),
    ).toBe(true)
  })
})
