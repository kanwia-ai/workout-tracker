// Per-muscle weekly volume model + secondary-goal emphasis — regression suite
// for the 2026-06-09 senior audit, track B2:
//
//   1. The engine had NO volume model: fixed 4/3/3 sets + a time filler, flat
//      week 1 through 5. Chest sat at 4 sets/wk when the project's own
//      research (docs/research/00-MASTER-SYNTHESIS.md "Volume landmarks per
//      muscle per week") says MEV is 8.
//   2. profile.primary_goals[1] was collected with the UI promise "adds a
//      secondary emphasis" but never read.
//
// The MEV/MAV/MRV numbers asserted here are pinned from the research table
// directly (NOT imported from the implementation) so the engine can't drift
// from its own evidence base without a red test.

import { describe, it, expect } from 'vitest'
import { buildMesocycle } from './buildMesocycle'
import { interpretProfile } from './interpretProfile'
import {
  MAIN_VARIANTS,
  ACCESSORY_VARIANTS,
  type VariantSpec,
} from './variants'
import type { UserProgramProfile } from '../../types/profile'
import type { MuscleGroup, PlannedSession } from '../../types/plan'

// ─── Research landmarks (00-MASTER-SYNTHESIS.md, R1 P2 Israetel/Schoenfeld) ─
// Hard sets/muscle/week. MEV = the floor the engine must hit for every muscle
// the split claims to train; MRV = the ceiling its additions must respect.
const RESEARCH_MEV: Partial<Record<MuscleGroup, number>> = {
  chest: 8,
  back: 10,
  shoulders: 8,
  biceps: 8,
  triceps: 6,
  quads: 8,
  hamstrings: 6,
  glutes: 6,
  calves: 8,
  core: 4,
}
const RESEARCH_MRV: Partial<Record<MuscleGroup, number>> = {
  chest: 20,
  back: 22,
  shoulders: 22,
  biceps: 20,
  triceps: 18,
  quads: 20,
  hamstrings: 16,
  glutes: 16,
  calves: 20,
  core: 15,
}

// ─── Fixtures ──────────────────────────────────────────────────────────────
const UNINJURED_INTERMEDIATE: UserProgramProfile = {
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

const FRESH_MENISCUS: UserProgramProfile = {
  ...UNINJURED_INTERMEDIATE,
  injuries: [{ part: 'left_meniscus', severity: 'modify' }],
}

// ─── Counting helpers (test-local, mirror the research convention) ─────────
// A variant's primary muscles get full credit, secondaries half credit —
// indirect volume counts about half per the RP/Israetel convention. Rehab,
// mobility, and cardio work isn't a "hard set" and doesn't count.
const COUNTED_ROLES = new Set(['main lift', 'accessory', 'isolation', 'core'])

function variantOf(libraryId: string): VariantSpec | null {
  for (const pool of [MAIN_VARIANTS, ACCESSORY_VARIANTS]) {
    for (const v of Object.values(pool)) {
      if ((v.library_id ?? `variant:${v.id}`) === libraryId) return v
    }
  }
  return null
}

function weekSessions(sessions: PlannedSession[], week: number): PlannedSession[] {
  return sessions.filter((s) => s.week_number === week)
}

function weeklySets(sessions: PlannedSession[], week: number): Map<MuscleGroup, number> {
  const out = new Map<MuscleGroup, number>()
  for (const s of weekSessions(sessions, week)) {
    for (const ex of s.exercises) {
      if (!COUNTED_ROLES.has(ex.role)) continue
      const v = variantOf(ex.library_id)
      if (!v) continue
      for (const m of v.primary_muscles) out.set(m, (out.get(m) ?? 0) + ex.sets)
      for (const m of v.secondary_muscles) out.set(m, (out.get(m) ?? 0) + ex.sets * 0.5)
    }
  }
  return out
}

function totalSets(sessions: PlannedSession[], week: number): number {
  return weekSessions(sessions, week).reduce(
    (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0),
    0,
  )
}

/** Muscles the split claims to train: union of session focus ∩ landmark table. */
function coverageMuscles(sessions: PlannedSession[], week: number): MuscleGroup[] {
  const out: MuscleGroup[] = []
  for (const s of weekSessions(sessions, week)) {
    for (const m of s.focus) {
      if (RESEARCH_MEV[m] !== undefined && !out.includes(m)) out.push(m)
    }
  }
  return out
}

// ─── 1. MEV floors ─────────────────────────────────────────────────────────

describe('per-muscle weekly volume — MEV floors (audit: chest at 4 sets/wk)', () => {
  const meso = buildMesocycle(
    interpretProfile(UNINJURED_INTERMEDIATE),
    6,
    UNINJURED_INTERMEDIATE,
  )

  it('chest gets at least its researched MEV (8 hard sets) in week 1', () => {
    // The audit headline: bench 4 sets was the ONLY chest work all week.
    const chest = weeklySets(meso.sessions, 1).get('chest') ?? 0
    expect(
      chest,
      `chest at ${chest} weekly sets — research MEV is 8`,
    ).toBeGreaterThanOrEqual(8)
  })

  it('no coverage muscle sits below MEV in week 1 when time permits (60 min)', () => {
    const counts = weeklySets(meso.sessions, 1)
    for (const m of coverageMuscles(meso.sessions, 1)) {
      const got = counts.get(m) ?? 0
      expect(
        got,
        `${m}: ${got} weekly sets is below researched MEV ${RESEARCH_MEV[m]}`,
      ).toBeGreaterThanOrEqual(RESEARCH_MEV[m]!)
    }
  })

  it('novice volume holds near MEV: chest stays within MEV..MEV+2 at peak week', () => {
    // Research: "Novice: cap weekly volume at MEV + 2 sets per muscle."
    const novice: UserProgramProfile = {
      ...UNINJURED_INTERMEDIATE,
      training_age_months: 6,
    }
    const noviceMeso = buildMesocycle(interpretProfile(novice), 6, novice)
    const chestWk5 = weeklySets(noviceMeso.sessions, 5).get('chest') ?? 0
    expect(chestWk5).toBeGreaterThanOrEqual(8)
    expect(chestWk5, 'novice chest volume must cap at MEV + 2').toBeLessThanOrEqual(10)
  })
})

// ─── 2. Ramp across the block ──────────────────────────────────────────────

describe('volume ramps across the block (MEV → MAV, deload 50%)', () => {
  const meso = buildMesocycle(
    interpretProfile(UNINJURED_INTERMEDIATE),
    6,
    UNINJURED_INTERMEDIATE,
  )

  it('week-over-week set progression exists for an uninjured profile', () => {
    // Work weeks 1..5 accumulate: total sets never decrease, and the peak
    // week trains strictly more than week 1 (the audit: flat 1 through 5).
    const totals = [1, 2, 3, 4, 5].map((w) => totalSets(meso.sessions, w))
    for (let i = 1; i < totals.length; i += 1) {
      expect(
        totals[i]!,
        `week ${i + 1} (${totals[i]} sets) trains less than week ${i} (${totals[i - 1]})`,
      ).toBeGreaterThanOrEqual(totals[i - 1]!)
    }
    expect(
      totals[4]!,
      `no ramp: week 5 (${totals[4]} sets) vs week 1 (${totals[0]})`,
    ).toBeGreaterThan(totals[0]!)
  })

  it('chest specifically builds from MEV toward MAV by week 5', () => {
    const wk1 = weeklySets(meso.sessions, 1).get('chest') ?? 0
    const wk5 = weeklySets(meso.sessions, 5).get('chest') ?? 0
    expect(wk5, `chest wk5 (${wk5}) should exceed wk1 (${wk1})`).toBeGreaterThan(wk1)
  })

  it('the ramp never pushes an under-MRV muscle past MRV', () => {
    const wk1 = weeklySets(meso.sessions, 1)
    const wk5 = weeklySets(meso.sessions, 5)
    for (const m of coverageMuscles(meso.sessions, 5)) {
      const mrv = RESEARCH_MRV[m]!
      // Baseline selection can exceed MRV on its own (glute-med corrective
      // work double-counts as "glutes"); the volume layer must not be the
      // one to breach the ceiling.
      if ((wk1.get(m) ?? 0) > mrv) continue
      expect(
        wk5.get(m) ?? 0,
        `${m}: week-5 volume exceeds researched MRV ${mrv}`,
      ).toBeLessThanOrEqual(mrv)
    }
  })

  it('deload week (6) cuts volume to ~50% — below week 1, well below peak', () => {
    const wk1 = totalSets(meso.sessions, 1)
    const wk5 = totalSets(meso.sessions, 5)
    const wk6 = totalSets(meso.sessions, 6)
    expect(wk6, 'deload must be below the MEV week').toBeLessThan(wk1)
    expect(wk6, 'deload must be well below the peak week').toBeLessThan(wk5 * 0.75)
  })
})

// ─── 3. Rehab cap — no ramp through a healing joint ────────────────────────

describe('rehab-active muscles hold at MEV (no ramp through a healing knee)', () => {
  it('fresh meniscus: quad volume stays at/below MEV through week 5', () => {
    // Research: "Injury on affected muscle: cap at MEV until cleared."
    const meso = buildMesocycle(interpretProfile(FRESH_MENISCUS), 6, FRESH_MENISCUS)
    for (const week of [1, 3, 5]) {
      const quads = weeklySets(meso.sessions, week).get('quads') ?? 0
      expect(
        quads,
        `wk${week}: quads ramped to ${quads} sets on a rehabbing knee (MEV cap is 8)`,
      ).toBeLessThanOrEqual(8)
    }
  })
})

// ─── 4. Time-tight tradeoff — priority muscles win deterministically ───────

describe('active_minutes too tight for MAV everywhere → priority muscles win', () => {
  const TIGHT: UserProgramProfile = {
    ...UNINJURED_INTERMEDIATE,
    time_budget_min: 45,
    active_minutes: 45,
  }
  const TIGHT_TRICEPS: UserProgramProfile = {
    ...TIGHT,
    muscle_priority: ['triceps'],
  }

  it('triceps-priority profile lands strictly more peak-week triceps sets than the no-priority twin', () => {
    const base = buildMesocycle(interpretProfile(TIGHT), 6, TIGHT)
    const prio = buildMesocycle(interpretProfile(TIGHT_TRICEPS), 6, TIGHT_TRICEPS)
    const baseTri = weeklySets(base.sessions, 5).get('triceps') ?? 0
    const prioTri = weeklySets(prio.sessions, 5).get('triceps') ?? 0
    expect(
      prioTri,
      `priority plan has ${prioTri} triceps sets vs ${baseTri} without priority`,
    ).toBeGreaterThan(baseTri)
  })

  it('the tradeoff is deterministic — same profile builds the same plan twice', () => {
    const a = buildMesocycle(interpretProfile(TIGHT_TRICEPS), 6, TIGHT_TRICEPS)
    const b = buildMesocycle(interpretProfile(TIGHT_TRICEPS), 6, TIGHT_TRICEPS)
    const shape = (m: typeof a): string =>
      JSON.stringify(
        m.sessions.map((s) => [s.id, s.exercises.map((e) => [e.library_id, e.sets])]),
      )
    expect(shape(a)).toBe(shape(b))
  })
})

// ─── 5. Secondary goal emphasis (audit: primary_goals[1] never read) ───────

describe('secondary goal produces a structurally different plan', () => {
  const ONE_GOAL = UNINJURED_INTERMEDIATE
  const TWO_GOALS: UserProgramProfile = {
    ...UNINJURED_INTERMEDIATE,
    primary_goals: ['build_muscle', 'get_stronger'],
  }

  it('build_muscle + get_stronger: main lifts use the stronger-goal scheme, accessories stay hypertrophy', () => {
    const meso = buildMesocycle(interpretProfile(TWO_GOALS), 6, TWO_GOALS)
    const push = weekSessions(meso.sessions, 1).find((s) => s.subtitle === 'UPPER · PUSH')!
    const main = push.exercises.find((e) => e.role === 'main lift')!
    // get_stronger main_compounds = [3, 5]; build_muscle alone would be 5-8.
    expect(main.reps, 'main lift should carry the strength emphasis').toBe('3-5')
    const accessory = push.exercises.find((e) => e.role === 'accessory')
    expect(accessory, 'expected an accessory on push day').toBeDefined()
    // build_muscle accessories = [8, 12] — hypertrophy work is preserved.
    expect(accessory!.reps, 'accessories should stay hypertrophy').toBe('8-12')
  })

  it('one-goal vs two-goal profiles produce structurally different plans', () => {
    const one = buildMesocycle(interpretProfile(ONE_GOAL), 6, ONE_GOAL)
    const two = buildMesocycle(interpretProfile(TWO_GOALS), 6, TWO_GOALS)
    const mainRepsOf = (m: typeof one): string =>
      m.sessions.find((s) => s.subtitle === 'UPPER · PUSH')!.exercises.find(
        (e) => e.role === 'main lift',
      )!.reps
    expect(mainRepsOf(one)).toBe('5-8')
    expect(mainRepsOf(two)).toBe('3-5')
    expect(JSON.stringify(two.sessions)).not.toBe(JSON.stringify(one.sessions))
  })
})
