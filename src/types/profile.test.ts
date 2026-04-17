import { describe, it, expect } from 'vitest'
import { UserProgramProfileSchema } from './profile'

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
})
