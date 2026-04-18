import { describe, it, expect } from 'vitest'
import {
  UserProgramProfileSchema,
  primaryGoalToLegacyGoal,
  legacyGoalToPrimaryGoal,
  type PrimaryGoal,
} from './profile'

describe('UserProgramProfileSchema', () => {
  it('accepts a well-formed profile', () => {
    const ok = UserProgramProfileSchema.safeParse({
      goal: 'glutes',
      sessions_per_week: 4,
      training_age_months: 18,
      equipment: ['full_gym'],
      injuries: [{ part: 'left_meniscus', severity: 'modify' }],
      time_budget_min: 60,
      sex: 'female',
      posture_notes: 'desk worker, tight hip flexors',
    })
    expect(ok.success).toBe(true)
  })
  it('rejects sessions_per_week outside 1-7', () => {
    const bad = UserProgramProfileSchema.safeParse({
      goal: 'glutes', sessions_per_week: 9, training_age_months: 0,
      equipment: [], injuries: [], time_budget_min: 45, sex: 'female', posture_notes: '',
    })
    expect(bad.success).toBe(false)
  })
  it('accepts chronic severity and multiple injuries (Kyra profile)', () => {
    const ok = UserProgramProfileSchema.safeParse({
      goal: 'glutes',
      sessions_per_week: 4,
      training_age_months: 24,
      equipment: ['full_gym'],
      injuries: [
        { part: 'left_meniscus', severity: 'modify' },
        { part: 'lower_back', severity: 'chronic' },
        { part: 'hip_flexors', severity: 'chronic', note: 'tight from desk sitting' },
        { part: 'right_trap', severity: 'modify' },
      ],
      time_budget_min: 75,
      sex: 'female',
      posture_notes: 'desk worker 8h/day',
    })
    expect(ok.success).toBe(true)
  })
  it('rejects unknown goal and empty equipment', () => {
    const bad = UserProgramProfileSchema.safeParse({
      goal: 'ripped', sessions_per_week: 3, training_age_months: 6,
      equipment: [], injuries: [], time_budget_min: 45, sex: 'female', posture_notes: '',
    })
    expect(bad.success).toBe(false)
  })

  // ── v2 additive fields ─────────────────────────────────────────────────
  it('accepts a v2 profile with primary_goal and muscle_priority', () => {
    const ok = UserProgramProfileSchema.safeParse({
      goal: 'aesthetics',
      sessions_per_week: 4,
      training_age_months: 18,
      equipment: ['full_gym'],
      injuries: [],
      time_budget_min: 60,
      sex: 'female',
      posture_notes: '',
      primary_goal: 'build_muscle',
      muscle_priority: ['glutes', 'back'],
      aesthetic_preference: 'strong_defined',
      specific_target: 'first pull-up',
      exercise_dislikes: ['burpees', 'running'],
      want_demo_videos: true,
      age: 32,
      weight_kg: 65,
      height_cm: 170,
      first_name: 'Kyra',
    })
    expect(ok.success).toBe(true)
  })

  it('accepts a v2 profile with only new optional fields absent', () => {
    const ok = UserProgramProfileSchema.safeParse({
      goal: 'general_fitness',
      sessions_per_week: 3,
      training_age_months: 0,
      equipment: ['bodyweight_only'],
      injuries: [],
      time_budget_min: 45,
      sex: 'prefer_not_to_say',
      posture_notes: '',
    })
    expect(ok.success).toBe(true)
  })

  it('rejects an unknown primary_goal', () => {
    const bad = UserProgramProfileSchema.safeParse({
      goal: 'general_fitness',
      sessions_per_week: 3,
      training_age_months: 0,
      equipment: ['bodyweight_only'],
      injuries: [],
      time_budget_min: 45,
      sex: 'prefer_not_to_say',
      posture_notes: '',
      primary_goal: 'win_olympics',
    })
    expect(bad.success).toBe(false)
  })

  it('rejects specific_target over 200 chars', () => {
    const bad = UserProgramProfileSchema.safeParse({
      goal: 'general_fitness',
      sessions_per_week: 3,
      training_age_months: 0,
      equipment: ['bodyweight_only'],
      injuries: [],
      time_budget_min: 45,
      sex: 'prefer_not_to_say',
      posture_notes: '',
      specific_target: 'x'.repeat(201),
    })
    expect(bad.success).toBe(false)
  })
})

describe('primaryGoalToLegacyGoal', () => {
  it('is total across every PrimaryGoal value', () => {
    const all: PrimaryGoal[] = [
      'build_muscle',
      'get_stronger',
      'lean_and_strong',
      'fat_loss',
      'mobility',
      'athletic',
      'general_fitness',
    ]
    for (const pg of all) {
      const legacy = primaryGoalToLegacyGoal(pg)
      expect(typeof legacy).toBe('string')
    }
  })
  it('maps get_stronger → strength', () => {
    expect(primaryGoalToLegacyGoal('get_stronger')).toBe('strength')
  })
  it('maps mobility → rehab', () => {
    expect(primaryGoalToLegacyGoal('mobility')).toBe('rehab')
  })
})

describe('legacyGoalToPrimaryGoal', () => {
  it('maps glutes → build_muscle', () => {
    expect(legacyGoalToPrimaryGoal('glutes')).toBe('build_muscle')
  })
  it('maps strength → get_stronger', () => {
    expect(legacyGoalToPrimaryGoal('strength')).toBe('get_stronger')
  })
  it('maps rehab → mobility', () => {
    expect(legacyGoalToPrimaryGoal('rehab')).toBe('mobility')
  })
})
