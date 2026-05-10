import { describe, it, expect } from 'vitest'
import { dedupWarmupExercises, generateWarmup } from './generateWarmup'
import type { StructuredWarmupExercise } from './generateWarmup'
import { interpretProfile } from './interpretProfile'
import type { UserProgramProfile } from '../../types/profile'

// Tight unit coverage for the warmup dedup pass. The integrated
// generateWarmup() call already gets a smoke-check at the bottom — these
// cases drive the behavior directly so a regression points at the dedup
// rules instead of the broader composition.

const make = (
  partial: Partial<StructuredWarmupExercise> & { name: string; display_name: string },
): StructuredWarmupExercise => ({
  category: 'mobility',
  ...partial,
})

describe('dedupWarmupExercises', () => {
  it('returns empty for an empty list', () => {
    expect(dedupWarmupExercises([])).toEqual([])
  })

  it('drops the second of two entries with identical names', () => {
    const a = make({ name: 'cat_cow', display_name: 'Cat / Cow' })
    const b = make({ name: 'cat_cow', display_name: 'Cat / Cow' })
    const out = dedupWarmupExercises([a, b])
    expect(out).toHaveLength(1)
    expect(out[0]).toBe(a)
  })

  it('drops "Ankle Dorsiflexion Mobility" + "Ankle Dorsiflexion Drill" near-dup', () => {
    const a = make({
      name: 'ankle_dorsiflexion_mobility',
      display_name: 'Ankle Dorsiflexion Mobility',
    })
    const b = make({
      name: 'ankle_dorsiflexion',
      display_name: 'Ankle Dorsiflexion Drill',
    })
    const out = dedupWarmupExercises([a, b])
    expect(out).toHaveLength(1)
    expect(out[0].display_name).toBe('Ankle Dorsiflexion Mobility')
  })

  it('drops two entries with the same display_name even if ids differ', () => {
    const a = make({
      name: 'reverse_incline_walking_5min',
      display_name: 'Reverse Incline Walking',
      category: 'cv_prep',
    })
    const b = make({
      name: 'reverse_incline_walking_3min',
      display_name: 'Reverse Incline Walking',
      category: 'cv_prep',
    })
    const out = dedupWarmupExercises([a, b])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('reverse_incline_walking_5min')
  })

  it('keeps "Hip Flexor Stretch" + "Hip Flexor Opener" — different roots', () => {
    const a = make({
      name: 'hip_flexor_stretch',
      display_name: 'Hip Flexor Stretch',
    })
    const b = make({
      name: 'hip_flexor_opener',
      display_name: 'Hip Flexor Opener',
    })
    const out = dedupWarmupExercises([a, b])
    expect(out).toHaveLength(2)
  })

  it('strips parenthetical qualifiers when comparing', () => {
    // "Wall Slide" vs "Wall Slide (Lower Trap Bias)" → same root → dedup
    const a = make({ name: 'wall_slide', display_name: 'Wall Slide' })
    const b = make({
      name: 'wall_slide_lower_trap',
      display_name: 'Wall Slide (Lower Trap Bias)',
    })
    const out = dedupWarmupExercises([a, b])
    expect(out).toHaveLength(1)
    expect(out[0]).toBe(a)
  })

  it('preserves stable order across mixed dups + uniques', () => {
    const a = make({ name: 'cat_cow', display_name: 'Cat / Cow' })
    const b = make({ name: 'bird_dog', display_name: 'Bird Dog', category: 'activation' })
    const c = make({ name: 'cat_cow', display_name: 'Cat / Cow' }) // dup of a
    const d = make({
      name: 'thoracic_extension',
      display_name: 'Thoracic Extension',
    })
    const out = dedupWarmupExercises([a, b, c, d])
    expect(out.map((e) => e.name)).toEqual(['cat_cow', 'bird_dog', 'thoracic_extension'])
  })
})

// ─── End-to-end: integration smoke through generateWarmup() ────────────────
// Hands a profile that historically produced "Reverse Incline Walking" twice
// on Kyra's leg day, and asserts only one survives after composition.

const KYRA: UserProgramProfile = {
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

describe('generateWarmup — integrated dedup', () => {
  it('emits no two exercises sharing the same display_name', () => {
    const d = interpretProfile(KYRA)
    const w = generateWarmup({
      session_id: 'kyra-dedup-1',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    const names = w.exercises.map((e) => e.display_name.toLowerCase())
    expect(names.length).toBe(new Set(names).size)
  })

  it('emits no two exercises that normalize to the same root', () => {
    const d = interpretProfile(KYRA)
    const w = generateWarmup({
      session_id: 'kyra-dedup-2',
      session_type: 'lower_squat_focus',
      week_number: 1,
      directives: d,
    })
    // Reuse the same normalization the dedup pass uses by routing through
    // dedupWarmupExercises — if the dedup is a no-op the count matches.
    expect(dedupWarmupExercises(w.exercises).length).toBe(w.exercises.length)
  })
})
