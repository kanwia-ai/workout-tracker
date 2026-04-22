import { describe, it, expect } from 'vitest'
import {
  isGenericTitle,
  deriveBodyPartTitle,
  remapTitleIfGeneric,
} from './legacyTitleRemap'

type E = { primary_muscles?: string[]; name: string }

function ex(name: string, muscles: string[] = []): E {
  return { name, primary_muscles: muscles }
}

describe('isGenericTitle', () => {
  it('matches all generic legacy patterns', () => {
    const generic = [
      'Lower A',
      'lower a',
      'Upper B',
      'Push A',
      'Pull C',
      'Legs',
      'Full Body',
      'Full-Body',
      'Body A',
      'Day 1',
      'day 12',
      'Session 3',
      'Workout 7',
      'Week 2 Day 3',
      'week 10 day 1',
      'Mon',
      'Tuesday',
      'fri',
      '  Lower A  ', // trimmed
    ]
    for (const t of generic) {
      expect(isGenericTitle(t), `expected "${t}" generic`).toBe(true)
    }
  })

  it('does NOT match body-part titles or other human titles', () => {
    const nonGeneric = [
      'glutes & hamstrings',
      'shoulders + core',
      'chest & triceps',
      'quad-focused legs',
      'upper body strength',
      'back & biceps',
      'lower body strength',
      '',
      'Heavy Hip Thrust Day',
    ]
    for (const t of nonGeneric) {
      expect(isGenericTitle(t), `expected "${t}" non-generic`).toBe(false)
    }
  })
})

describe('deriveBodyPartTitle', () => {
  it('picks top two muscles when balanced — glutes & hamstrings', () => {
    // Bag: glutes 3, hamstrings 2, quads 1
    const exs: E[] = [
      ex('Barbell Hip Thrust', ['glutes']),
      ex('Glute Bridge', ['glutes']),
      ex('Cable Kickback', ['glutes']),
      ex('Seated Leg Curl', ['hamstrings']),
      ex('Romanian Deadlift', ['hamstrings']),
      ex('Leg Extension', ['quads']),
    ]
    expect(deriveBodyPartTitle('Lower A', exs)).toBe('glutes & hamstrings')
  })

  it('picks chest & triceps when balanced push day', () => {
    // Bag: chest 3, triceps 3, shoulders 1
    const exs: E[] = [
      ex('Bench Press', ['chest']),
      ex('Incline DB Press', ['chest']),
      ex('Chest Fly', ['chest']),
      ex('Tricep Pushdown', ['triceps']),
      ex('Skullcrusher', ['triceps']),
      ex('Overhead Tricep Ext', ['triceps']),
      ex('Lateral Raise', ['shoulders']),
    ]
    expect(deriveBodyPartTitle('Upper A', exs)).toBe('chest & triceps')
  })

  it('picks back & biceps when pull day', () => {
    // Bag: back 4, biceps 2
    const exs: E[] = [
      ex('Barbell Row', ['back_upper']),
      ex('Seated Cable Row', ['back_upper']),
      ex('Lat Pulldown', ['lats']),
      ex('Pull-up', ['lats']),
      ex('Barbell Curl', ['biceps']),
      ex('Hammer Curl', ['biceps']),
    ]
    // back_upper + lats both map to "back" display → 4, biceps 2.
    // They differ by 2 so "two close" rule fails → macro/umbrella title.
    // But since dominant muscle "back" owns 4/6 = 66% (<70%), and the macro
    // upper-pull owns 100%, we get 'upper body strength' — which is fine, but
    // we want back & biceps. Adjust threshold by making closer counts.
    // Actually with back=4 biceps=2: diff=2, not "within 1", so falls to
    // umbrella. Add one more biceps to tighten.
    exs.push(ex('Preacher Curl', ['biceps']))
    // Bag: back 4, biceps 3 → close (diff=1, second>=2) → "back & biceps".
    expect(deriveBodyPartTitle('Upper B', exs)).toBe('back & biceps')
  })

  it('single dominant lower muscle → "quad-focused legs"', () => {
    // Bag: quads 4
    const exs: E[] = [
      ex('Back Squat', ['quads']),
      ex('Front Squat', ['quads']),
      ex('Leg Press', ['quads']),
      ex('Leg Extension', ['quads']),
    ]
    expect(deriveBodyPartTitle('Lower B', exs)).toBe('quad-focused legs')
  })

  it('balanced across upper-push and upper-pull → upper body strength', () => {
    const exs: E[] = [
      ex('Bench Press', ['chest']),
      ex('Overhead Press', ['shoulders']),
      ex('Barbell Row', ['back_upper']),
      ex('Lat Pulldown', ['lats']),
    ]
    // chest 1, shoulders 1, back 2 → "back" leads by 1 so "close two" kicks
    // in only if second >= 2. shoulders=1 and chest=1 → not close. Falls
    // through to upper-push + upper-pull both present → 'upper body strength'.
    expect(deriveBodyPartTitle('Upper A', exs)).toBe('upper body strength')
  })

  it('balanced across lower macros → lower body strength', () => {
    // All lower macro, multiple muscles each with count 1 — no pair ≥2.
    const exs: E[] = [
      ex('Squat', ['quads']),
      ex('RDL', ['hamstrings']),
      ex('Hip Thrust', ['glutes']),
      ex('Calf Raise', ['calves']),
    ]
    expect(deriveBodyPartTitle('Legs', exs)).toBe('lower body strength')
  })

  it('mixed macros with no dominance → full body strength', () => {
    const exs: E[] = [
      ex('Squat', ['quads']),
      ex('Bench Press', ['chest']),
      ex('Barbell Row', ['back_upper']),
      ex('Plank', ['core_anterior']),
    ]
    expect(deriveBodyPartTitle('Day 1', exs)).toBe('full body strength')
  })

  it('empty exercises array → returns original title unchanged', () => {
    expect(deriveBodyPartTitle('Lower A', [])).toBe('Lower A')
  })

  it('falls back to name-keyword inference when primary_muscles missing', () => {
    // Simulates a PlannedExercise from Dexie (no primary_muscles field).
    const exs: E[] = [
      { name: 'Barbell Hip Thrust' },
      { name: 'Glute Bridge' },
      { name: 'Hip Thrust Variation' },
      { name: 'Romanian Deadlift' },
      { name: 'Seated Leg Curl' },
    ]
    // glutes x3, hamstrings x2 → "glutes & hamstrings".
    expect(deriveBodyPartTitle('Lower A', exs)).toBe('glutes & hamstrings')
  })
})

describe('remapTitleIfGeneric', () => {
  it('remaps generic titles using derivation', () => {
    const exs: E[] = [
      ex('Back Squat', ['quads']),
      ex('Front Squat', ['quads']),
      ex('Leg Press', ['quads']),
      ex('Leg Extension', ['quads']),
    ]
    expect(remapTitleIfGeneric('Lower B', exs)).toBe('quad-focused legs')
  })

  it('leaves non-generic titles untouched', () => {
    const exs: E[] = [ex('Back Squat', ['quads'])]
    expect(remapTitleIfGeneric('heavy glute day', exs)).toBe('heavy glute day')
  })

  it('returns original when generic but exercises are empty', () => {
    expect(remapTitleIfGeneric('Upper A', [])).toBe('Upper A')
  })
})
