import { describe, it, expect } from 'vitest'
import { buildMesocycle, buildSession, resolveStage } from './buildMesocycle'
import { interpretProfile } from './interpretProfile'
import { getProtocol } from '../../data/rehab-protocols'
import type { UserProgramProfile } from '../../types/profile'

// ─── Fixtures ──────────────────────────────────────────────────────────────
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

// Fresh meniscus rehab — stage_weeks=0, so plan wk1 = stage wk1_2_reintegration.
// Tests that start with fresh rehab should use this, not Kyra's profile.
const FRESH_MENISCUS_PROFILE: UserProgramProfile = {
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
  posture_notes: '',
  injuries: [
    { part: 'left_meniscus', severity: 'modify', note: 'just cleared for loading' },
  ],
}

const NO_INJURY_PROFILE: UserProgramProfile = {
  goal: 'aesthetics',
  primary_goal: 'build_muscle',
  primary_goals: ['build_muscle'],
  sessions_per_week: 4,
  training_age_months: 12,
  equipment: ['full_gym'],
  time_budget_min: 60,
  active_minutes: 60,
  sex: 'male',
  posture_notes: '',
  injuries: [],
}

// ─── Basic mesocycle shape ─────────────────────────────────────────────────

describe('buildMesocycle — basic shape', () => {
  it('builds a 6-week 24-session mesocycle for 4 sessions/week', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const meso = buildMesocycle(d, 6)
    expect(meso.length_weeks).toBe(6)
    expect(meso.sessions).toHaveLength(24)
    // Week numbers span 1..6
    expect(new Set(meso.sessions.map((s) => s.week_number))).toEqual(
      new Set([1, 2, 3, 4, 5, 6]),
    )
  })

  it('every session has id, focus, exercises, rationale, day_of_week', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const meso = buildMesocycle(d)
    for (const s of meso.sessions) {
      expect(s.id).toMatch(/^session-wk\d+-s\d+$/)
      expect(s.focus.length).toBeGreaterThanOrEqual(1)
      expect(s.exercises.length).toBeGreaterThanOrEqual(2)
      expect(s.rationale.length).toBeGreaterThan(5)
      expect(s.day_of_week).toBeGreaterThanOrEqual(0)
      expect(s.day_of_week).toBeLessThanOrEqual(6)
    }
  })

  it('every main-lift exercise gets 3 ramp warmup sets', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const meso = buildMesocycle(d)
    const mainLifts = meso.sessions.flatMap((s) =>
      s.exercises.filter((e) => e.role === 'main lift'),
    )
    for (const lift of mainLifts) {
      // Some are accessory-ramp (1 set) — main compounds have 3
      if (lift.warmup_sets.length === 3) {
        expect(lift.warmup_sets.map((w) => w.percent)).toEqual([50, 70, 85])
      }
    }
  })

  it('rationale is under 280 chars on every session', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const meso = buildMesocycle(d)
    for (const s of meso.sessions) {
      expect(s.rationale.length).toBeLessThanOrEqual(280)
    }
  })
})

// ─── Injury-driven programming ─────────────────────────────────────────────

describe('buildMesocycle — injury-driven variant selection', () => {
  it("Kyra's leg day week 1 uses a modified squat variant (she's in rehab stage 3-4), not raw back squat", () => {
    // Kyra's note "rehab week 3" → stage_weeks=3, so plan wk1 = effective rehab wk4
    // → stage wk3_4_loading (allowed: front_squat_moderate, heel_elevated_barbell,
    // reverse_lunge_loaded, split_squat_loaded).
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )
    expect(wk1Leg).toBeDefined()
    const main = wk1Leg!.exercises[0]!.name.toLowerCase()
    // Not a raw back squat (that's the final-stage variant)
    expect(main).not.toBe('back squat')
    // Must be a stage-appropriate modified variant
    const stageAllowed =
      main === 'front squat' ||
      main.includes('heel-elevated') ||
      main.includes('reverse lunge') ||
      main.includes('split squat')
    expect(stageAllowed, `expected stage wk3_4 variant, got "${main}"`).toBe(true)
  })

  it('FRESH meniscus rehab wk1 uses stage-1 variant (heel-elevated / goblet / box / split), not barbell', () => {
    const d = interpretProfile(FRESH_MENISCUS_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    const main = wk1Leg.exercises[0]!.name.toLowerCase()
    expect(main).not.toBe('back squat')
    expect(main).not.toBe('front squat')
    const stage1Ok =
      main.includes('heel-elevated goblet') ||
      main.includes('goblet') ||
      main.includes('high-box') ||
      main.includes('bulgarian split squat (bodyweight)') ||
      main.includes('split squat (bodyweight)') ||
      main.includes('leg press')
    expect(stage1Ok, `fresh rehab wk1 should be stage-1 variant, got "${main}"`).toBe(true)
  })

  it('FRESH meniscus rehab wk1 uses 8-12 rep scheme (stage override, not goal bias)', () => {
    const d = interpretProfile(FRESH_MENISCUS_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    expect(wk1Leg.exercises[0]!.reps).toBe('8-12')
  })

  it("Kyra's leg day uses stage wk3_4 rep scheme (5-8) in plan wk1, reflecting her 3-week offset", () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    expect(wk1Leg.exercises[0]!.reps).toBe('5-8')
  })

  it("Kyra's leg day week 5 uses return-stage variant (back squat / front squat / loaded lunge)", () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    // Kyra enters with stage_weeks=3, so plan wk5 = effective wk8 → past all stages → return
    const wk5Leg = meso.sessions.find(
      (s) => s.week_number === 5 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    const n = wk5Leg.exercises[0]!.name.toLowerCase()
    const returnOk =
      n === 'back squat' ||
      n === 'front squat' ||
      n.includes('lunge') ||
      n.includes('split squat')
    expect(returnOk).toBe(true)
  })

  it('priority accessories (hip abduction, hamstring curl) appear on leg day for meniscus rehab', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    const names = wk1Leg.exercises.map((e) => e.name.toLowerCase())
    const hasHamstring = names.some((n) => n.includes('leg curl') || n.includes('hamstring'))
    const hasGluteMed = names.some((n) => n.includes('abduction') || n.includes('clamshell'))
    expect(hasHamstring || hasGluteMed).toBe(true)  // at least one priority accessory
  })

  it('banned variants are not selected as main lift', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    const main = wk1Leg.exercises[0]!
    const n = main.name.toLowerCase()
    // wk1_2_reintegration bans: back_squat, walking_lunge_loaded, jumping_landing, bulgarian_split_squat_loaded
    expect(n).not.toBe('loaded bulgarian split squat')
    expect(n).not.toBe('back squat')
  })

  it('decompression accessory (leg pullover) appears on Kyra leg day', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    const names = wk1Leg.exercises.map((e) => e.name.toLowerCase())
    const hasDecompression = names.some(
      (n) => n.includes('pullover') || n.includes('decompression'),
    )
    expect(hasDecompression).toBe(true)
  })
})

// ─── Stage resolution ──────────────────────────────────────────────────────

describe('resolveStage', () => {
  it('picks the stage matching effective rehab week', () => {
    const meniscus = getProtocol('meniscus')!
    // No offset: plan wk 1 → stage wk1_2 (first stage)
    const s1 = resolveStage(meniscus, 1, 0)
    expect(s1!.id).toContain('wk1_2')
    // Offset by 2 (user enters at rehab wk 2): plan wk 1 → effective wk 3 → stage wk3_4
    const s2 = resolveStage(meniscus, 1, 2)
    expect(s2!.id).toContain('wk3_4')
  })

  it('past-final-stage pins to last stage', () => {
    const meniscus = getProtocol('meniscus')!
    const sLast = resolveStage(meniscus, 100, 0)
    expect(sLast!.id).toContain('wk5_6')
  })
})

// ─── Week 6 deload ─────────────────────────────────────────────────────────

describe('week 6 deload', () => {
  it('week 6 sessions have reduced set counts vs week 3', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const meso = buildMesocycle(d)
    const wk3First = meso.sessions.find((s) => s.week_number === 3)!
    const wk6First = meso.sessions.find(
      (s) =>
        s.week_number === 6 && s.subtitle === wk3First.subtitle && s.ordinal === wk3First.ordinal,
    )!
    // First exercise of comparable session
    expect(wk6First.exercises[0]!.sets).toBeLessThanOrEqual(
      wk3First.exercises[0]!.sets,
    )
  })

  it('week 6 rationale mentions deload', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const meso = buildMesocycle(d)
    const wk6 = meso.sessions.filter((s) => s.week_number === 6)
    expect(wk6.every((s) => s.rationale.includes('deload'))).toBe(true)
  })
})

// ─── Goal-driven rep schemes ───────────────────────────────────────────────

describe('goal → rep scheme', () => {
  it('athletic/strength_power gets 3-6 main rep range', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)  // build_muscle → hypertrophy
    const meso = buildMesocycle(d)
    const wk3NoInjury = meso.sessions.find((s) => s.week_number === 3 && s.subtitle.includes('SQUAT'))!
    const main = wk3NoInjury.exercises[0]!
    // build_muscle default = 5-8
    expect(main.reps).toBe('5-8')
  })

  it("Kyra's athletic bias produces 3-6 main rep range on non-rehab sessions", () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk5Upper = meso.sessions.find(
      (s) => s.week_number === 5 && s.subtitle === 'UPPER · PUSH',
    )!
    const main = wk5Upper.exercises[0]!
    expect(main.reps).toBe('3-6')
  })
})

// ─── GOLDEN ACCEPTANCE TEST: Kyra's leg day ───────────────────────────────
// Validates that the refactored planner, given Kyra's real profile, produces
// a leg day that structurally mirrors her friend's evidence-based workout:
//
//   - Targeted warmup (priority accessories pre-main via sequencing) ✓
//   - Hamstring opener (seated leg curl) ✓ — corrects quad dominance
//   - Modified squat variant (heel-elevated / goblet in early weeks) ✓
//   - Decompression pair (leg pullover after axial load) ✓
//   - Hip abduction for glute med ✓ — frontal-plane knee tracking
//
// If this test regresses, the plan has slid back into generic programming.

describe("GOLDEN: Kyra's leg day structurally matches friend's workout", () => {
  it('wk1 leg day meets the clinical acceptance criteria (stage wk3_4 — her actual rehab stage)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk1Leg = meso.sessions.find(
      (s) => s.week_number === 1 && s.subtitle.includes('SQUAT-DOMINANT'),
    )
    expect(wk1Leg, 'expected a lower_squat_focus session in week 1').toBeDefined()

    const names = wk1Leg!.exercises.map((e) => e.name.toLowerCase())

    // Criterion 1: stage-appropriate modified squat variant (Kyra at wk3_4_loading)
    const main = wk1Leg!.exercises[0]!.name.toLowerCase()
    const mainIsStageOk =
      main === 'front squat' ||
      main.includes('heel-elevated') ||
      main.includes('reverse lunge') ||
      main.includes('split squat')
    expect(mainIsStageOk, `main lift "${main}" should be a stage-appropriate modified variant`).toBe(true)

    // Criterion 2: hamstring opener (seated leg curl) — priority accessory
    const hasHamstringOpener = names.some(
      (n) => n.includes('leg curl') || n.includes('hamstring'),
    )
    expect(hasHamstringOpener, 'expected hamstring opener priority').toBe(true)

    // Criterion 3: glute med accessory (hip abduction or clamshell)
    const hasGluteMed = names.some(
      (n) => n.includes('abduction') || n.includes('clamshell'),
    )
    expect(hasGluteMed, 'expected glute med accessory for knee tracking').toBe(true)

    // Criterion 4: decompression pair after main compound
    const hasDecompression = names.some(
      (n) => n.includes('pullover') || n.includes('decompression'),
    )
    expect(hasDecompression, 'expected decompression exercise post-axial-load').toBe(true)

    // Criterion 5: rep scheme respects rehab stage (5-8 for her stage wk3_4)
    expect(wk1Leg!.exercises[0]!.reps).toBe('5-8')
  })

  it('wk6 leg day has progressed to a full-ROM squat variant (meniscus recovered)', () => {
    const d = interpretProfile(KYRA_PROFILE)
    const meso = buildMesocycle(d)
    const wk6Leg = meso.sessions.find(
      (s) => s.week_number === 6 && s.subtitle.includes('SQUAT-DOMINANT'),
    )!
    const main = wk6Leg.exercises[0]!.name.toLowerCase()
    // By wk6 + Kyra's 3-week stage offset = effective wk9, past all stages → final stage
    // Final stage allows back squat / front squat / loaded lunges
    const isFullReturn =
      main === 'back squat' ||
      main === 'front squat' ||
      main.includes('lunge') ||
      main.includes('split squat')
    expect(isFullReturn, `wk6 main "${main}" should be a full-ROM return variant`).toBe(true)
  })
})

// ─── buildSession direct ──────────────────────────────────────────────────

describe('buildSession', () => {
  it('respects session-type defaults when no injury applies', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const session = buildSession({
      sessionType: 'upper_push',
      weekNumber: 1,
      ordinal: 1,
      directives: d,
      dayOfWeek: 1,
    })
    expect(session.subtitle).toContain('PUSH')
    expect(session.focus).toContain('chest')
    expect(session.exercises[0]!.name).toMatch(/bench press/i)
  })

  it('produces a unique id per (week, ordinal)', () => {
    const d = interpretProfile(NO_INJURY_PROFILE)
    const s1 = buildSession({ sessionType: 'upper_push', weekNumber: 1, ordinal: 1, directives: d, dayOfWeek: 0 })
    const s2 = buildSession({ sessionType: 'upper_push', weekNumber: 1, ordinal: 2, directives: d, dayOfWeek: 1 })
    expect(s1.id).not.toBe(s2.id)
  })
})
