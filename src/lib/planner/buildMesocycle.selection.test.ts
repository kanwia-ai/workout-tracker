// Engine selection correctness — regression suite for the 2026-06-09 senior
// audit ("Engine quality" section). Each describe block pins one audit fix:
//
//   1. Rehab-variant leak: protocol stage variants must only constrain session
//      slots whose movement pattern matches the protocol's target.
//   2. Dedupe: no session may contain the same exercise twice.
//   3. exercise_dislikes: hard-filtered from main + accessory selection.
//   4. equipment: variant pool filtered by what the user actually has.
//   5. muscle_priority: priority muscles get measurably more weekly volume.

import { describe, it, expect } from 'vitest'
import { buildMesocycle } from './buildMesocycle'
import { interpretProfile } from './interpretProfile'
import {
  MAIN_VARIANTS,
  ACCESSORY_VARIANTS,
  type VariantSpec,
} from './variants'
import type { UserProgramProfile } from '../../types/profile'
import type { PlannedExercise, PlannedSession } from '../../types/plan'

// ─── Fixtures ──────────────────────────────────────────────────────────────
// The exact audit profile: build_muscle, 4 days (Mon/Tue/Thu/Fri), 60 min,
// full gym, female 30, left meniscus (modify), chronic lower back, desk worker.
const AUDIT_PROFILE: UserProgramProfile = {
  goal: 'aesthetics',
  primary_goal: 'build_muscle',
  primary_goals: ['build_muscle'],
  sessions_per_week: 4,
  preferred_days: [0, 1, 3, 4],
  training_age_months: 24,
  equipment: ['full_gym'],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'female',
  age: 30,
  posture_notes: 'desk worker, sits most of the day',
  injuries: [
    { part: 'left_meniscus', severity: 'modify' },
    { part: 'lower_back', severity: 'chronic' },
  ],
}

const NO_INJURY_PROFILE: UserProgramProfile = {
  goal: 'aesthetics',
  primary_goal: 'build_muscle',
  primary_goals: ['build_muscle'],
  sessions_per_week: 4,
  training_age_months: 24,
  equipment: ['full_gym'],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'female',
  posture_notes: '',
  injuries: [],
}

// Resolve a planned exercise back to its VariantSpec (handles both
// `variant:<id>` and curated `library_id` links like ex-hip-thrust).
function variantOf(ex: PlannedExercise): VariantSpec | null {
  for (const pool of [MAIN_VARIANTS, ACCESSORY_VARIANTS]) {
    for (const v of Object.values(pool)) {
      if ((v.library_id ?? `variant:${v.id}`) === ex.library_id) return v
    }
  }
  return null
}

function sessionsInWeek(sessions: PlannedSession[], week: number): PlannedSession[] {
  return sessions.filter((s) => s.week_number === week)
}

// ─── 1. Rehab-variant leak ─────────────────────────────────────────────────

describe('rehab-stage variants only constrain matching movement-pattern slots (audit fix 1)', () => {
  const meso = buildMesocycle(interpretProfile(AUDIT_PROFILE), 6, AUDIT_PROFILE)

  it('upper-push day main lift is a push movement, not a rehab squat', () => {
    const push = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle === 'UPPER · PUSH',
    )
    expect(push, 'expected an upper_push session in week 1').toBeDefined()
    const main = push!.exercises[0]!
    expect(main.role).toBe('main lift')
    const v = variantOf(main)
    expect(v, `main "${main.name}" should resolve to a variant`).not.toBeNull()
    expect(v!.pattern, `main "${main.name}" should be a push`).toBe('push')
    expect(main.name.toLowerCase()).not.toContain('squat')
  })

  it('upper-pull day main lift is a pull movement', () => {
    const pull = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle === 'UPPER · PULL',
    )!
    const main = pull.exercises[0]!
    const v = variantOf(main)
    expect(v!.pattern, `main "${main.name}" should be a pull`).toBe('pull')
  })

  it('hinge day main lift is a hinge movement', () => {
    const hinge = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle.includes('HINGE-DOMINANT'),
    )!
    const main = hinge.exercises[0]!
    const v = variantOf(main)
    expect(v!.pattern, `main "${main.name}" should be a hinge`).toBe('hinge')
  })

  it('the rehab goblet squat appears ONLY on squat-pattern sessions', () => {
    for (const s of meso.sessions) {
      const gobletHere = s.exercises.some((e) =>
        e.name.toLowerCase().includes('goblet'),
      )
      if (gobletHere) {
        expect(
          s.subtitle.includes('SQUAT'),
          `goblet squat leaked onto "${s.subtitle}" (wk ${s.week_number})`,
        ).toBe(true)
      }
    }
    // And it does show up where it belongs — week 1 squat day, stage 1 rehab.
    const squatDay = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    expect(
      squatDay.exercises[0]!.name.toLowerCase(),
      'week-1 squat day main should be the stage-1 rehab variant',
    ).toContain('goblet')
  })

  it('chest gets trained in week 1', () => {
    const week1 = sessionsInWeek(meso.sessions, 1)
    const chestTrained = week1.some((s) =>
      s.exercises.some((e) => {
        const v = variantOf(e)
        return v?.primary_muscles.includes('chest') ?? false
      }),
    )
    expect(chestTrained, 'no chest work anywhere in week 1').toBe(true)
  })

  it('rehab rep override does not leak onto non-matching sessions', () => {
    // Stage 1 meniscus forces 8-12 on the squat slot. The bench slot should
    // keep the goal-driven scheme (build_muscle mains = 5-8).
    const push = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle === 'UPPER · PUSH',
    )!
    expect(push.exercises[0]!.reps).toBe('5-8')
    const squat = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    expect(squat.exercises[0]!.reps).toBe('8-12')
  })
})

// ─── 2. Dedupe — no exercise twice in one session ──────────────────────────

describe('no session contains the same exercise twice (audit fix 2)', () => {
  it('meniscus profile hinge day does not program Barbell Hip Thrust twice', () => {
    // The meniscus protocol routes glute_max_bridge_or_hip_thrust in as a
    // priority accessory on hinge days, where the SAME exercise is already
    // the session's default secondary (library_id ex-hip-thrust). The dedupe
    // key must collapse both spellings.
    const meso = buildMesocycle(interpretProfile(AUDIT_PROFILE), 6, AUDIT_PROFILE)
    const hinge = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle.includes('HINGE-DOMINANT'),
    )!
    const thrustCount = hinge.exercises.filter(
      (e) => e.name === 'Barbell Hip Thrust',
    ).length
    expect(thrustCount, 'Barbell Hip Thrust programmed twice in one session').toBeLessThanOrEqual(1)
  })

  it('no session in the whole block repeats a library_id or name', () => {
    const meso = buildMesocycle(interpretProfile(AUDIT_PROFILE), 6, AUDIT_PROFILE)
    for (const s of meso.sessions) {
      const ids = s.exercises.map((e) => e.library_id)
      const names = s.exercises.map((e) => e.name)
      expect(new Set(ids).size, `dup library_id in wk${s.week_number} "${s.subtitle}"`).toBe(ids.length)
      expect(new Set(names).size, `dup name in wk${s.week_number} "${s.subtitle}"`).toBe(names.length)
    }
  })
})

// ─── 3. exercise_dislikes hard filter ──────────────────────────────────────

describe('exercise_dislikes hard-filter selection (audit fix 3)', () => {
  it('disliking overhead_pressing removes every overhead press from the block', () => {
    const profile: UserProgramProfile = {
      ...NO_INJURY_PROFILE,
      sessions_per_week: 5,
      exercise_dislikes: ['overhead_pressing'],
    }
    const meso = buildMesocycle(interpretProfile(profile), 6, profile)
    for (const s of meso.sessions) {
      for (const e of s.exercises) {
        const hay = e.name.toLowerCase()
        const isOverheadPress =
          (/overhead/.test(hay) && /press/.test(hay)) || /shoulder press/.test(hay)
        expect(
          isOverheadPress,
          `"${e.name}" is an overhead press but the user dislikes overhead pressing (wk${s.week_number} "${s.subtitle}")`,
        ).toBe(false)
      }
    }
  })

  it('push day still has a push main lift after the dislike filter', () => {
    const profile: UserProgramProfile = {
      ...NO_INJURY_PROFILE,
      exercise_dislikes: ['overhead_pressing'],
    }
    const meso = buildMesocycle(interpretProfile(profile), 6, profile)
    const push = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle === 'UPPER · PUSH',
    )!
    const v = variantOf(push.exercises[0]!)
    expect(v!.pattern).toBe('push')
  })

  it('disliking hex_bar removes trap-bar deadlifts', () => {
    const profile: UserProgramProfile = {
      ...NO_INJURY_PROFILE,
      exercise_dislikes: ['hex_bar'],
    }
    const meso = buildMesocycle(interpretProfile(profile), 6, profile)
    for (const s of meso.sessions) {
      for (const e of s.exercises) {
        expect(e.name.toLowerCase()).not.toContain('trap bar')
      }
    }
  })
})

// ─── 4. equipment pool filter ──────────────────────────────────────────────

// Tokens a bands-only user cannot have. Anything outside band/bodyweight.
const NON_BAND_TOKENS = [
  'barbell', 'rack', 'plates', 'bench', 'dumbbell', 'kettlebell', 'trap_bar',
  'cable_machine', 'leg_press_machine', 'hack_squat_machine', 'smith_machine',
  'hip_abduction_machine', 'leg_curl_machine', 'landmine', 'pullup_bar', 'box', 'rope',
]

describe('equipment filters the variant pool (audit fix 4)', () => {
  it('bands_only profile gets NO barbell or machine exercises anywhere', () => {
    const profile: UserProgramProfile = {
      ...NO_INJURY_PROFILE,
      equipment: ['bands_only'],
    }
    const meso = buildMesocycle(interpretProfile(profile), 6, profile)
    for (const s of meso.sessions) {
      for (const e of s.exercises) {
        const v = variantOf(e)
        expect(v, `"${e.name}" should resolve to a variant`).not.toBeNull()
        for (const token of v!.equipment) {
          expect(
            NON_BAND_TOKENS.includes(token),
            `"${e.name}" needs ${token} but the user only has bands (wk${s.week_number} "${s.subtitle}")`,
          ).toBe(false)
        }
      }
    }
  })

  it('bodyweight_only profile gets only equipment-free exercises', () => {
    const profile: UserProgramProfile = {
      ...NO_INJURY_PROFILE,
      equipment: ['bodyweight_only'],
    }
    const meso = buildMesocycle(interpretProfile(profile), 6, profile)
    for (const s of meso.sessions) {
      for (const e of s.exercises) {
        const v = variantOf(e)
        expect(
          v!.equipment,
          `"${e.name}" needs equipment a bodyweight-only user lacks`,
        ).toEqual([])
      }
    }
  })

  it('the pool never goes empty — every session still has a main lift', () => {
    for (const equipment of [['bands_only'], ['bodyweight_only'], ['home_weights']] as const) {
      const profile: UserProgramProfile = {
        ...NO_INJURY_PROFILE,
        equipment: [...equipment],
      }
      const meso = buildMesocycle(interpretProfile(profile), 6, profile)
      for (const s of meso.sessions) {
        expect(s.exercises.length, `${equipment[0]}: empty session`).toBeGreaterThanOrEqual(1)
        // Ordering puts the focus muscle first (an isolation may lead), but
        // every session must still CONTAIN a main lift.
        expect(
          s.exercises.some((e) => e.role === 'main lift'),
          `${equipment[0]}: wk${s.week_number} "${s.subtitle}" has no main lift`,
        ).toBe(true)
      }
    }
  })

  it('full_gym keeps the classic barbell mains (no over-filtering)', () => {
    const meso = buildMesocycle(interpretProfile(NO_INJURY_PROFILE), 6, NO_INJURY_PROFILE)
    const squat = sessionsInWeek(meso.sessions, 1).find(
      (s) => s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    expect(squat.exercises[0]!.name).toBe('Back Squat')
  })
})

// ─── 5. muscle_priority volume bias ────────────────────────────────────────

function weeklySetsFor(
  sessions: PlannedSession[],
  week: number,
  muscle: 'glutes' | 'hamstrings',
): number {
  let total = 0
  for (const s of sessionsInWeek(sessions, week)) {
    for (const e of s.exercises) {
      const v = variantOf(e)
      if (v?.primary_muscles.includes(muscle)) total += e.sets
    }
  }
  return total
}

describe('muscle_priority biases weekly volume (audit fix 5)', () => {
  const basePlan = buildMesocycle(interpretProfile(NO_INJURY_PROFILE), 6, NO_INJURY_PROFILE)
  const priorityProfile: UserProgramProfile = {
    ...NO_INJURY_PROFILE,
    muscle_priority: ['glutes', 'hamstrings'],
  }
  const priorityPlan = buildMesocycle(interpretProfile(priorityProfile), 6, priorityProfile)

  it('glutes+hamstrings priority yields strictly more weekly glute sets than no priority', () => {
    const base = weeklySetsFor(basePlan.sessions, 1, 'glutes')
    const boosted = weeklySetsFor(priorityPlan.sessions, 1, 'glutes')
    expect(
      boosted,
      `priority plan has ${boosted} weekly glute sets vs ${base} without priority`,
    ).toBeGreaterThan(base)
  })

  it('the two plans are not byte-identical', () => {
    expect(JSON.stringify(priorityPlan.sessions)).not.toBe(
      JSON.stringify(basePlan.sessions),
    )
  })

  it('first priority muscle gets a stronger boost than the second', () => {
    // Glute accessories carry the extra set; hamstring accessories get
    // selection preference only. Compare per-accessory set counts on a
    // week-1 lower session that contains both.
    const hinge = sessionsInWeek(priorityPlan.sessions, 1).find(
      (s) => s.subtitle.includes('HINGE-DOMINANT'),
    )!
    const gluteAcc = hinge.exercises.find((e) => {
      const v = variantOf(e)
      return e.role !== 'main lift' && v?.primary_muscles[0] === 'glutes'
    })
    const hamAcc = hinge.exercises.find((e) => {
      const v = variantOf(e)
      return e.role !== 'main lift' && v?.primary_muscles[0] === 'hamstrings'
    })
    expect(gluteAcc, 'expected a glute accessory on hinge day').toBeDefined()
    expect(hamAcc, 'expected a hamstring accessory on hinge day').toBeDefined()
    expect(gluteAcc!.sets).toBeGreaterThan(hamAcc!.sets)
  })
})
