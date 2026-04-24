import { describe, it, expect } from 'vitest'
import { suggestStartingWeight } from './startingWeights'
import type { VariantSpec } from './variants'
import type { UserProgramProfile } from '../../types/profile'

// ─── Fixtures ──────────────────────────────────────────────────────────────
const KG_PER_LB = 1 / 2.20462

const novice = (weightLbs: number): UserProgramProfile => ({
  goal: 'strength',
  sessions_per_week: 4,
  training_age_months: 6,  // novice: 3-12 months
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: '',
  weight_kg: weightLbs * KG_PER_LB,
})

const newLifter = (weightLbs: number): UserProgramProfile => ({
  ...novice(weightLbs),
  training_age_months: 1,  // < 3 months
})

const intermediate = (weightLbs: number): UserProgramProfile => ({
  ...novice(weightLbs),
  training_age_months: 18,  // 1-3 years
})

const advanced = (weightLbs: number): UserProgramProfile => ({
  ...novice(weightLbs),
  training_age_months: 48,  // 3+ years
})

const mk = (id: string, name: string, overrides: Partial<VariantSpec> = {}): VariantSpec => ({
  id,
  name,
  primary_muscles: ['glutes'],
  secondary_muscles: [],
  equipment: ['barbell'],
  role: 'main lift',
  ramp_style: 'compound',
  default_rest_seconds: 120,
  ...overrides,
})

function call(
  variant: VariantSpec,
  profile: UserProgramProfile,
  reps = 8,
  role: VariantSpec['role'] = variant.role,
): number | undefined {
  return suggestStartingWeight({ variant, profile, role, reps, rir: 2 })
}

// ─── Baseline accuracy ─────────────────────────────────────────────────────

describe('suggestStartingWeight — research-backed baselines', () => {
  it('barbell back squat for 150 lb novice ≈ 75 lb (±5)', () => {
    const v = mk('back_squat', 'Back Squat')
    const w = call(v, novice(150))!
    expect(w).toBeGreaterThanOrEqual(70)
    expect(w).toBeLessThanOrEqual(80)
  })

  it('barbell hip thrust for 150 lb novice ≈ 115 lb (±5)', () => {
    const v = mk('glute_max_bridge_or_hip_thrust', 'Barbell Hip Thrust')
    const w = call(v, novice(150))!
    expect(w).toBeGreaterThanOrEqual(110)
    expect(w).toBeLessThanOrEqual(120)
  })

  it('DB bench for 180 lb intermediate ≈ 45 lb per hand (±5)', () => {
    const v = mk('incline_dumbbell_press', 'Incline Dumbbell Press', {
      equipment: ['dumbbell', 'bench'],
      role: 'main lift',
      primary_muscles: ['chest'],
    })
    const w = call(v, intermediate(180))!
    expect(w).toBeGreaterThanOrEqual(40)
    expect(w).toBeLessThanOrEqual(50)
  })

  it('barbell overhead press ≈ 0.3 × BW', () => {
    const v = mk('overhead_press', 'Overhead Press', { primary_muscles: ['shoulders'] })
    const w = call(v, novice(160))!
    // 0.3 * 160 = 48 → round to 50, floor to 50 (above empty bar).
    expect(w).toBeGreaterThanOrEqual(45)
    expect(w).toBeLessThanOrEqual(55)
  })
})

// ─── Bodyweight exercises return undefined ────────────────────────────────

describe('suggestStartingWeight — bodyweight returns undefined', () => {
  it('push-up → undefined', () => {
    const v = mk('push_up', 'Push-Up', { equipment: [], role: 'accessory' })
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('hanging leg raise → undefined', () => {
    const v = mk('hanging_leg_raise', 'Hanging Leg Raise', {
      equipment: ['pullup_bar'],
      role: 'core',
      primary_muscles: ['core'],
    })
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('wall sit → undefined', () => {
    const v = mk('wall_sit', 'Wall Sit', { equipment: [], role: 'accessory' })
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('plank → undefined', () => {
    const v = mk('front_plank', 'Front Plank', {
      equipment: [],
      role: 'core',
      primary_muscles: ['core'],
    })
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('bulgarian split squat (bodyweight) → undefined', () => {
    const v = mk(
      'split_squat_rear_foot_elevated_bodyweight',
      'Bulgarian Split Squat (Bodyweight)',
      { equipment: ['bench'], role: 'main lift', primary_muscles: ['quads'] },
    )
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('dead bug → undefined', () => {
    const v = mk('dead_bug', 'Dead Bug', {
      equipment: [],
      role: 'core',
      primary_muscles: ['core'],
    })
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('banded clamshell → undefined', () => {
    const v = mk('banded_clamshell', 'Banded Clamshell', {
      equipment: ['band'],
      role: 'isolation',
      primary_muscles: ['glutes'],
    })
    expect(call(v, novice(150))).toBeUndefined()
  })
})

// ─── Scaling factors ──────────────────────────────────────────────────────

describe('suggestStartingWeight — scaling factors', () => {
  it('higher rep range scales down', () => {
    const v = mk('back_squat', 'Back Squat')
    const low = call(v, novice(160), 5)!
    const mid = call(v, novice(160), 14)!
    const high = call(v, novice(160), 20)!
    expect(mid).toBeLessThan(low)
    expect(high).toBeLessThan(mid)
  })

  it('advanced training age scales up', () => {
    const v = mk('back_squat', 'Back Squat')
    const nov = call(v, novice(160))!
    const adv = call(v, advanced(160))!
    expect(adv).toBeGreaterThan(nov)
  })

  it('new lifter (< 3 months) scales down vs novice', () => {
    const v = mk('back_squat', 'Back Squat')
    const nov = call(v, novice(160))!
    const fresh = call(v, newLifter(160))!
    expect(fresh).toBeLessThan(nov)
  })
})

// ─── Rounding + floors ────────────────────────────────────────────────────

describe('suggestStartingWeight — rounding + floors', () => {
  it('rounds to nearest 5 lb', () => {
    const v = mk('back_squat', 'Back Squat')
    const w = call(v, novice(137))!
    expect(w % 5).toBe(0)
  })

  it('barbell floor is 45 lb (empty bar)', () => {
    const v = mk('overhead_press', 'Overhead Press', { primary_muscles: ['shoulders'] })
    const w = call(v, newLifter(110))!
    expect(w).toBeGreaterThanOrEqual(45)
  })

  it('DB floor is 5 lb', () => {
    const v = mk('db_lateral_raise', 'DB Lateral Raise', {
      equipment: ['dumbbell'],
      role: 'isolation',
      primary_muscles: ['shoulders'],
    })
    const w = call(v, newLifter(105))!
    expect(w).toBeGreaterThanOrEqual(5)
  })

  it('DB lateral raise caps at 15 lb for untrained', () => {
    const v = mk('db_lateral_raise', 'DB Lateral Raise', {
      equipment: ['dumbbell'],
      role: 'isolation',
      primary_muscles: ['shoulders'],
    })
    const w = call(v, novice(220))!
    expect(w).toBeLessThanOrEqual(15)
  })
})

// ─── Fallback + defaults ──────────────────────────────────────────────────

describe('suggestStartingWeight — fallbacks', () => {
  it('missing weight_kg falls back to 165 lb default (barbell squat ≈ 80 lb)', () => {
    const v = mk('back_squat', 'Back Squat')
    const profile: UserProgramProfile = {
      goal: 'strength',
      sessions_per_week: 4,
      training_age_months: 6,
      equipment: ['full_gym'],
      injuries: [],
      time_budget_min: 60,
      sex: 'female',
      posture_notes: '',
      // no weight_kg
    }
    const w = suggestStartingWeight({ variant: v, profile, role: 'main lift', reps: 8, rir: 2 })!
    // 0.5 * 165 = 82.5 → round to 80 or 85
    expect(w).toBeGreaterThanOrEqual(75)
    expect(w).toBeLessThanOrEqual(90)
  })

  it('unmapped barbell variant falls back to 0.35 × BW', () => {
    const v = mk('mystery_barbell_thing', 'Some Mystery Barbell Thing', {
      equipment: ['barbell'],
      primary_muscles: ['core'],
    })
    const w = call(v, novice(150))!
    // 0.35 * 150 = 52.5, floor 45 → 50 or 55
    expect(w).toBeGreaterThanOrEqual(45)
    expect(w).toBeLessThanOrEqual(60)
  })

  it('unmapped bodyweight-only variant returns undefined', () => {
    const v = mk('mystery_bw_move', 'Mystery Bodyweight Move', {
      equipment: [],
      role: 'accessory',
      primary_muscles: ['core'],
    })
    expect(call(v, novice(150))).toBeUndefined()
  })
})

// ─── Specificity of keyword matching ──────────────────────────────────────

describe('suggestStartingWeight — keyword specificity', () => {
  it('"hip thrust" does NOT match "hip flexor stretch"', () => {
    const v = mk('hip_flexor_stretch', 'Hip Flexor Stretch', {
      equipment: [],
      role: 'mobility',
      primary_muscles: ['mobility'],
    })
    expect(call(v, novice(150))).toBeUndefined()
  })

  it('face pull (cable) resolves to face_pull baseline, not barbell fallback', () => {
    const v = mk('face_pull', 'Face Pull', {
      equipment: ['cable_machine', 'rope'],
      role: 'accessory',
      primary_muscles: ['shoulders', 'back'],
    })
    const w = call(v, novice(150))!
    // 0.12 * 150 = 18 → 20
    expect(w).toBeGreaterThanOrEqual(15)
    expect(w).toBeLessThanOrEqual(25)
  })

  it('goblet squat catches before generic "squat" fallback', () => {
    const v = mk('heel_elevated_goblet_squat', 'Heel-Elevated Goblet Squat', {
      equipment: ['dumbbell', 'plates'],
      role: 'main lift',
      primary_muscles: ['quads'],
    })
    const w = call(v, novice(150))!
    // 0.2 * 150 = 30 → 30 (DB)
    expect(w).toBeGreaterThanOrEqual(25)
    expect(w).toBeLessThanOrEqual(40)
  })
})
