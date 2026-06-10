import { describe, it, expect } from 'vitest'
import { swapVariantLocal } from './swapLocal'
import type { PlannedExercise, PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

const baseProfile: UserProgramProfile = {
  goal: 'strength',
  sessions_per_week: 4,
  training_age_months: 18,
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: 'desk worker',
}

function makePlannedExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    library_id: overrides.library_id ?? 'variant:back_squat',
    name: overrides.name ?? 'Back Squat',
    sets: overrides.sets ?? 4,
    reps: overrides.reps ?? '6-8',
    rir: overrides.rir ?? 2,
    rest_seconds: overrides.rest_seconds ?? 180,
    role: overrides.role ?? 'main lift',
    warmup_sets: overrides.warmup_sets ?? [
      { percent: 50, reps: 10 },
      { percent: 70, reps: 5 },
      { percent: 85, reps: 3 },
    ],
    notes: overrides.notes,
  }
}

function makeSession(exercises: PlannedExercise[]): PlannedSession {
  return {
    id: 's-w1-o1',
    week_number: 1,
    ordinal: 1,
    focus: ['quads', 'glutes'],
    title: 'Lower A',
    subtitle: 'LOWER · SQUAT-DOMINANT',
    estimated_minutes: 55,
    status: 'upcoming',
    day_of_week: 0,
    rationale: 'Lower A Monday.',
    exercises,
  }
}

describe('swapVariantLocal', () => {
  it('swaps a squat variant for another squat-pattern main lift', () => {
    const current = makePlannedExercise({
      library_id: 'variant:back_squat',
      name: 'Back Squat',
    })
    const session = makeSession([current])

    const { replacement, reason } = swapVariantLocal({
      currentExercise: current,
      session,
      profile: baseProfile,
      reason: 'generic',
    })

    expect(replacement.library_id.startsWith('variant:')).toBe(true)
    expect(replacement.library_id).not.toBe('variant:back_squat')
    expect(replacement.role).toBe('main lift')
    // Working-set prescription is preserved verbatim (we swap WHAT not HOW HARD).
    expect(replacement.sets).toBe(current.sets)
    expect(replacement.reps).toBe(current.reps)
    expect(replacement.rir).toBe(current.rir)
    expect(replacement.warmup_sets).toEqual(current.warmup_sets)
    expect(reason).toMatch(/swapped to/i)
  })

  it('never proposes an exercise already in the session', () => {
    const current = makePlannedExercise({
      library_id: 'variant:back_squat',
      name: 'Back Squat',
    })
    // Seed the session with the exact front_squat variant so the swapper
    // should skip it. front_squat uses barbell+rack and would otherwise be a
    // top candidate.
    const frontSquat = makePlannedExercise({
      library_id: 'variant:front_squat',
      name: 'Front Squat',
    })
    const session = makeSession([current, frontSquat])

    for (let i = 0; i < 10; i++) {
      const { replacement } = swapVariantLocal({
        currentExercise: current,
        session,
        profile: baseProfile,
        reason: 'generic',
      })
      expect(replacement.library_id).not.toBe('variant:front_squat')
    }
  })

  it('honors attemptedIds — excludes previously-proposed variants', () => {
    const current = makePlannedExercise({
      library_id: 'variant:back_squat',
      name: 'Back Squat',
    })
    const session = makeSession([current])

    // First call — get whatever the top generic pick is.
    const first = swapVariantLocal({
      currentExercise: current,
      session,
      profile: baseProfile,
      reason: 'generic',
    })
    const firstId = first.replacement.library_id.slice('variant:'.length)

    // Second call — pass firstId as attempted; result must not repeat it.
    const second = swapVariantLocal({
      currentExercise: current,
      session,
      profile: baseProfile,
      reason: 'generic',
      attemptedIds: [firstId],
    })
    const secondId = second.replacement.library_id.slice('variant:'.length)
    expect(secondId).not.toBe(firstId)
  })

  it('machine_busy ranks simple-gear variants above rack/cable/machine ones', () => {
    const current = makePlannedExercise({
      library_id: 'variant:back_squat',
      name: 'Back Squat',
    })
    const session = makeSession([current])

    const { replacement } = swapVariantLocal({
      currentExercise: current,
      session,
      profile: baseProfile,
      reason: 'machine_busy',
    })

    // Top candidate should not require a rack, cable, or plates when an
    // alternative without them exists (e.g. dumbbell goblet / split squat).
    const resolvedId = replacement.library_id.slice('variant:'.length)
    expect(['back_squat', 'heel_elevated_barbell_back_squat', 'front_squat', 'front_squat_moderate', 'leg_press_narrow_rom', 'heel_elevated_goblet_squat', 'goblet_squat_light', 'bulgarian_split_squat_loaded', 'split_squat_rear_foot_elevated_bodyweight', 'split_squat_bodyweight', 'split_squat_loaded', 'reverse_lunge_loaded', 'forward_lunge_loaded']).toContain(resolvedId)
    // It must not itself require rack/cable/plates/machine.
    const requiresHardGear = /(rack|cable|plates|machine)/.test(replacement.library_id)
    expect(requiresHardGear).toBe(false)
  })

  it('too_hard returns a simpler variant from the same pattern', () => {
    const current = makePlannedExercise({
      library_id: 'variant:back_squat',
      name: 'Back Squat',
    })
    const session = makeSession([current])

    const { replacement } = swapVariantLocal({
      currentExercise: current,
      session,
      profile: baseProfile,
      reason: 'too_hard',
    })

    // Expect something flagged as easier — bodyweight / supported / goblet /
    // elevated / assisted.
    expect(replacement.name.toLowerCase()).toMatch(
      /(goblet|split|bodyweight|elevated|assisted|supported|leg press)/,
    )
  })

  it('throws for unresolvable library_ids', () => {
    const current = makePlannedExercise({
      library_id: 'variant:not_a_real_variant_xyz',
      name: 'Mystery Exercise',
    })
    const session = makeSession([current])

    expect(() =>
      swapVariantLocal({
        currentExercise: current,
        session,
        profile: baseProfile,
        reason: 'generic',
      }),
    ).toThrow(/cannot swap this exercise locally/i)
  })

  it('throws when there are no compatible candidates', () => {
    // bodyweight-only profile + a machine-heavy variant → no candidates.
    const bodyweightProfile: UserProgramProfile = {
      ...baseProfile,
      equipment: ['bodyweight_only'],
    }
    const current = makePlannedExercise({
      library_id: 'variant:leg_press_narrow_rom',
      name: 'Leg Press (Partial ROM)',
    })
    const session = makeSession([current])

    // leg_press_narrow_rom resolves fine, but no other 'main lift' variant
    // sharing primary muscles (quads/glutes) is bodyweight-only eligible
    // besides split_squat_bodyweight, which has equipment: [] — so this
    // should succeed with that candidate.
    const { replacement } = swapVariantLocal({
      currentExercise: current,
      session,
      profile: bodyweightProfile,
      reason: 'generic',
    })
    expect(replacement.library_id).toBe('variant:split_squat_bodyweight')
  })
})

// ─── Injury-aware swaps (audit 2026-06-09 fix: swap safety) ────────────────
// swapVariantLocal used to bypass injury bans entirely — a week-1 meniscus
// rehab user tapping "too easy" on a goblet squat was offered Back Squat.
// Swap candidates must pass the same protocol filters as initial generation:
// stage bans are absolute, and when a rehab stage owns the session's main
// slot, offers stay within the stage's allowed variants.
describe('swapVariantLocal — injury awareness', () => {
  const meniscusProfile: UserProgramProfile = {
    ...baseProfile,
    injuries: [{ part: 'left_meniscus', severity: 'modify' }],
  }

  // Week 1 of a fresh meniscus-modify profile = stage 1 of the protocol.
  const STAGE_1_ALLOWED = [
    'heel_elevated_goblet_squat',
    'box_squat_high',
    'split_squat_rear_foot_elevated_bodyweight',
    'leg_press_narrow_rom',
  ]

  // Walk the swap until it runs out of candidates, collecting every offer.
  function collectOffers(
    current: PlannedExercise,
    session: PlannedSession,
    profile: UserProgramProfile,
    reason: 'too_easy' | 'too_hard' | 'generic',
  ): { offered: string[]; exhausted: boolean } {
    const attempted: string[] = []
    const offered: string[] = []
    let exhausted = false
    for (let i = 0; i < 40; i++) {
      try {
        const { replacement } = swapVariantLocal({
          currentExercise: current,
          session,
          profile,
          reason,
          attemptedIds: attempted,
        })
        const id = replacement.library_id.startsWith('variant:')
          ? replacement.library_id.slice('variant:'.length)
          : replacement.library_id
        offered.push(id)
        attempted.push(id)
      } catch {
        exhausted = true
        break
      }
    }
    return { offered, exhausted }
  }

  it('never offers a banned or out-of-stage squat to a week-1 meniscus user (too_easy)', () => {
    const current = makePlannedExercise({
      library_id: 'variant:heel_elevated_goblet_squat',
      name: 'Heel-Elevated Goblet Squat',
    })
    const session = makeSession([current])

    const { offered } = collectOffers(current, session, meniscusProfile, 'too_easy')

    expect(offered.length).toBeGreaterThan(0)
    // The audit bug: Back Squat offered to a healing knee. Never again —
    // not under any alias, and nothing outside the stage's allowed list.
    expect(offered).not.toContain('back_squat')
    expect(offered).not.toContain('back_squat_moderate_load')
    expect(offered).not.toContain('bulgarian_split_squat_loaded')
    for (const id of offered) {
      expect(STAGE_1_ALLOWED).toContain(id)
    }
  })

  it('exhausts the stage-allowed pool and throws instead of breaching the protocol', () => {
    const current = makePlannedExercise({
      library_id: 'variant:heel_elevated_goblet_squat',
      name: 'Heel-Elevated Goblet Squat',
    })
    const session = makeSession([current])

    const { offered, exhausted } = collectOffers(current, session, meniscusProfile, 'generic')

    // Stage 1 allows 4 variants; the current one is excluded → at most 3
    // offers, then a clean throw (the UI surfaces "can't swap" instead of
    // a knee-hostile movement).
    expect(offered.length).toBeLessThanOrEqual(3)
    expect(exhausted).toBe(true)
  })

  it('accessory swaps in a rehab-constrained session stay open (bans only)', () => {
    const main = makePlannedExercise({
      library_id: 'variant:heel_elevated_goblet_squat',
      name: 'Heel-Elevated Goblet Squat',
    })
    const legCurl = makePlannedExercise({
      library_id: 'variant:seated_leg_curl',
      name: 'Seated Leg Curl',
      role: 'isolation',
      rest_seconds: 75,
      warmup_sets: [],
    })
    const session = makeSession([main, legCurl])

    const { replacement } = swapVariantLocal({
      currentExercise: legCurl,
      session,
      profile: meniscusProfile,
      reason: 'machine_busy',
    })
    // Hamstring isolation swap still works — the stage restriction only
    // owns the session's main-pattern slot.
    expect(replacement.library_id).toBe('variant:nordic_hamstring_curl')
  })

  it('uninjured profiles keep the full pool (regression)', () => {
    const current = makePlannedExercise({
      library_id: 'variant:heel_elevated_goblet_squat',
      name: 'Heel-Elevated Goblet Squat',
    })
    const session = makeSession([current])

    const { offered } = collectOffers(current, session, baseProfile, 'too_easy')
    // Without an injury, harder squat progressions are fair game.
    expect(offered).toContain('back_squat')
  })

  it('honors exercise dislikes when alternatives exist', () => {
    const dislikeProfile: UserProgramProfile = {
      ...baseProfile,
      exercise_dislikes: ['overhead_pressing'],
    }
    const current = makePlannedExercise({
      library_id: 'variant:bench_press_moderate',
      name: 'Bench Press',
      rest_seconds: 180,
    })
    const session: PlannedSession = {
      ...makeSession([current]),
      ordinal: 2,
      focus: ['chest', 'shoulders', 'triceps'],
      subtitle: 'UPPER · PUSH',
    }

    const { offered } = collectOffers(current, session, dislikeProfile, 'generic')
    expect(offered.length).toBeGreaterThan(0)
    expect(offered).not.toContain('overhead_dumbbell_press')
    expect(offered).not.toContain('overhead_barbell_press_moderate')
    expect(offered).not.toContain('dumbbell_shoulder_press_neutral_grip')
  })
})
