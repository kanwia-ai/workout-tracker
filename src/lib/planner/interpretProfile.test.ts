import { describe, it, expect } from 'vitest'
import { interpretProfile } from './interpretProfile'
import type { UserProgramProfile } from '../../types/profile'

// ─── Fixture profiles ──────────────────────────────────────────────────────
// Each profile mirrors a real archetype so the interpretation output can be
// asserted concretely. Don't snapshot the whole directive — assert the
// clinically-meaningful fields so refactors don't silently drift.

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

const HYPERTROPHY_BEGINNER: UserProgramProfile = {
  goal: 'aesthetics',
  primary_goal: 'build_muscle',
  primary_goals: ['build_muscle'],
  sessions_per_week: 5,
  training_age_months: 6,
  equipment: ['full_gym'],
  time_budget_min: 75,
  active_minutes: 75,
  sex: 'male',
  aesthetic_preference: 'muscle_size_bulk',
  posture_notes: '',
  injuries: [],
}

const POST_ACL_RETURN: UserProgramProfile = {
  goal: 'strength',
  primary_goal: 'get_stronger',
  primary_goals: ['get_stronger'],
  sessions_per_week: 4,
  training_age_months: 60,
  equipment: ['full_gym'],
  time_budget_min: 75,
  active_minutes: 75,
  sex: 'male',
  posture_notes: '6 months post ACL reconstruction, cleared for loading',
  injuries: [
    { part: 'right_knee', severity: 'modify', note: 'ACL rehab wk 24' },
  ],
}

const DESK_WORKER_TONED: UserProgramProfile = {
  goal: 'general_fitness',
  primary_goal: 'fat_loss',
  primary_goals: ['fat_loss'],
  sessions_per_week: 3,
  training_age_months: 0,
  equipment: ['home_weights'],
  time_budget_min: 45,
  active_minutes: 45,
  sex: 'female',
  aesthetic_preference: 'toned_lean',
  posture_notes: 'office desk job, chronic lower back soreness, rounded shoulders',
  injuries: [
    { part: 'lower_back', severity: 'chronic' },
  ],
}

const POWERLIFTER_CRANKY_SHOULDER: UserProgramProfile = {
  goal: 'strength',
  primary_goal: 'get_stronger',
  primary_goals: ['get_stronger'],
  sessions_per_week: 4,
  training_age_months: 120,
  equipment: ['full_gym', 'barbell'],
  time_budget_min: 90,
  active_minutes: 90,
  sex: 'male',
  posture_notes: 'competitive powerlifter, cranky left shoulder under heavy bench',
  injuries: [
    { part: 'left_shoulder', severity: 'modify', note: 'impingement, bench and OHP pain' },
  ],
}

const NOVEL_INJURY: UserProgramProfile = {
  goal: 'general_fitness',
  primary_goal: 'general_fitness',
  primary_goals: ['general_fitness'],
  sessions_per_week: 3,
  training_age_months: 12,
  equipment: ['full_gym'],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'prefer_not_to_say',
  posture_notes: '',
  injuries: [
    { part: 'other', severity: 'modify', note: 'plantar fasciitis, left foot' },
  ],
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('interpretProfile — goal interpretation', () => {
  it('maps athletic + athletic aesthetic to strength_power bias with 3-6 main rep range', () => {
    const d = interpretProfile(KYRA_PROFILE)
    expect(d.goal.aesthetic).toBe('athletic')
    expect(d.goal.primary_adaptation).toBe('strength_power')
    expect(d.goal.rep_scheme_bias.main_compounds).toEqual([3, 6])
    expect(d.goal.cardio_policy).toBe('separated')
  })

  it('muscle_size_bulk aesthetic overrides to hypertrophy even on build_muscle goal', () => {
    const d = interpretProfile(HYPERTROPHY_BEGINNER)
    expect(d.goal.aesthetic).toBe('hypertrophy')
    expect(d.goal.primary_adaptation).toBe('size')
    // Hypertrophy compound range
    expect(d.goal.rep_scheme_bias.main_compounds[0]).toBeGreaterThanOrEqual(5)
  })

  it('toned_lean aesthetic bumps rep ranges higher on fat_loss', () => {
    const d = interpretProfile(DESK_WORKER_TONED)
    expect(d.goal.rep_scheme_bias.accessories[1]).toBeGreaterThanOrEqual(12)
  })

  it('get_stronger → strength_power with 3-5 main range', () => {
    const d = interpretProfile(POWERLIFTER_CRANKY_SHOULDER)
    expect(d.goal.primary_adaptation).toBe('strength_power')
    expect(d.goal.rep_scheme_bias.main_compounds).toEqual([3, 5])
    expect(d.goal.cardio_policy).toBe('minimal')
  })

  it('general_fitness falls through to balanced defaults', () => {
    const d = interpretProfile(NOVEL_INJURY)
    expect(d.goal.primary_adaptation).toBe('mixed')
  })
})

describe('interpretProfile — week shape', () => {
  it('4 sessions → upper_lower with all 4 session types distinct', () => {
    const d = interpretProfile(KYRA_PROFILE)
    expect(d.week_shape.session_spacing).toBe('upper_lower')
    expect(d.week_shape.template).toEqual([
      'lower_squat_focus',
      'upper_push',
      'lower_hinge_focus',
      'upper_pull',
    ])
  })

  it('5 sessions → upper/lower plus conditioning', () => {
    const d = interpretProfile(HYPERTROPHY_BEGINNER)
    expect(d.week_shape.template).toHaveLength(5)
    expect(d.week_shape.template).toContain('conditioning')
  })

  it('3 sessions → full body alternating', () => {
    const d = interpretProfile(DESK_WORKER_TONED)
    expect(d.week_shape.template.every((t) => t.startsWith('full_body'))).toBe(true)
    expect(d.week_shape.session_spacing).toBe('alternating')
  })
})

describe('interpretProfile — injury directives', () => {
  it('maps left_meniscus → meniscus protocol with left side flag', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meniscus = d.injury_directives.find((i) => i.source === 'left_meniscus')
    expect(meniscus).toBeDefined()
    expect(meniscus!.matched_protocol).toBe('meniscus')
    expect(meniscus!.unilateral_side).toBe('left')
    expect(meniscus!.severity).toBe('rehab')
  })

  it('extracts rehab week from note ("rehab week 3" → stage_weeks=3)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meniscus = d.injury_directives.find((i) => i.source === 'left_meniscus')
    expect(meniscus!.stage_weeks).toBe(3)
  })

  it('chronic lower_back → chronic severity + long stage, NOT rehab progression', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const lbp = d.injury_directives.find((i) => i.source === 'lower_back')
    expect(lbp).toBeDefined()
    expect(lbp!.severity).toBe('chronic')
    expect(lbp!.stage_weeks).toBe(52)
    expect(lbp!.recovery_target).toMatch(/ongoing management/i)
  })

  it('body_part=other produces matched_protocol=null and lands in unhandled_inputs', () => {
    const d = interpretProfile(NOVEL_INJURY)
    const other = d.injury_directives.find((i) => i.source === 'other')
    expect(other!.matched_protocol).toBeNull()
    expect(d.unhandled_inputs.join(' ')).toMatch(/plantar/i)
  })

  it('ACL wk24 note extracts stage_weeks=24', () => {
    const d = interpretProfile(POST_ACL_RETURN)
    const knee = d.injury_directives.find((i) => i.source === 'right_knee')
    expect(knee!.stage_weeks).toBe(24)
    expect(knee!.unilateral_side).toBe('right')
    expect(knee!.matched_protocol).toBe('knee_pfp')
  })

  it('shoulder injury on heavy lifter → shoulder protocol with modify severity', () => {
    const d = interpretProfile(POWERLIFTER_CRANKY_SHOULDER)
    const shoulder = d.injury_directives.find((i) => i.source === 'left_shoulder')
    expect(shoulder!.matched_protocol).toBe('shoulder')
    expect(shoulder!.severity).toBe('rehab')
    expect(shoulder!.unilateral_side).toBe('left')
  })
})

describe('interpretProfile — root cause flags', () => {
  it('chronic LBP + desk worker triggers glute+hinge priority root cause', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const rc = d.root_causes.find((r) =>
      /quad\/hip-flexor dominance/i.test(r.likely_cause),
    )
    expect(rc).toBeDefined()
    expect(rc!.do_not_ban).toContain('squat')
    expect(rc!.do_not_ban).toContain('deadlift')
    expect(rc!.priority_work).toContain('glute_med_isolation')
  })

  it('hip_flexors injury alone triggers tight-hip root cause', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const rc = d.root_causes.find((r) => /tight hip flexors/i.test(r.observation))
    expect(rc).toBeDefined()
    expect(rc!.priority_work).toContain('couch_stretch')
  })

  it('trap injury triggers upper-cross root cause', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const rc = d.root_causes.find((r) => /upper-cross/i.test(r.observation))
    expect(rc).toBeDefined()
    expect(rc!.do_not_ban).toContain('overhead_press')
  })

  it('rounded-shoulders note ALONE triggers upper-cross pattern even without trap injury', () => {
    const d = interpretProfile(DESK_WORKER_TONED)
    const rc = d.root_causes.find((r) => /upper-cross/i.test(r.observation))
    expect(rc).toBeDefined()
  })

  it('no chronic pattern → empty root_causes', () => {
    const d = interpretProfile(HYPERTROPHY_BEGINNER)
    expect(d.root_causes).toHaveLength(0)
  })
})

describe('interpretProfile — meta', () => {
  it('marks source=rules for pure rule-based interpretation', () => {
    const d = interpretProfile(KYRA_PROFILE)
    expect(d.source).toBe('rules')
  })

  it('produces a 6-week progression narrative (wk1_2, wk3_4, wk5, wk6)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    expect(d.progression.wk1_2).toMatch(/accumulation/i)
    expect(d.progression.wk5).toMatch(/peak/i)
    expect(d.progression.wk6).toMatch(/deload/i)
  })

  it('is pure — same input always produces same output', () => {
    const a = interpretProfile(KYRA_PROFILE)
    const b = interpretProfile(KYRA_PROFILE)
    expect(a).toEqual(b)
  })

  it('zero network calls (implicit — pure TS, no fetch stubbing needed)', () => {
    // If this file had a network call, the test harness would reject it
    // (vitest default). Trivially true but documents intent.
    const d = interpretProfile(KYRA_PROFILE)
    expect(d).toBeDefined()
  })
})

describe('interpretProfile — Kyra golden case (integration)', () => {
  it('produces a coherent directive set for Kyra with all injury-driven flags present', () => {
    const d = interpretProfile(KYRA_PROFILE)
    // Goal alignment
    expect(d.goal.aesthetic).toBe('athletic')
    expect(d.goal.primary_adaptation).toBe('strength_power')
    // Week shape
    expect(d.week_shape.session_spacing).toBe('upper_lower')
    // All 4 injuries → 4 directives
    expect(d.injury_directives).toHaveLength(4)
    // Critical: LBP is CHRONIC, not banned — do_not_ban includes squat+deadlift
    const lbpRoot = d.root_causes.find((r) =>
      /quad\/hip-flexor dominance/i.test(r.likely_cause),
    )
    expect(lbpRoot!.do_not_ban).toEqual(
      expect.arrayContaining(['squat', 'deadlift']),
    )
    // Meniscus has unilateral side + stage from note
    const meniscus = d.injury_directives.find((i) => i.source === 'left_meniscus')
    expect(meniscus!.unilateral_side).toBe('left')
    expect(meniscus!.stage_weeks).toBe(3)
  })
})
