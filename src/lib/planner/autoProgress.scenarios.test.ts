// =============================================================================
// SCENARIO SIMULATOR — NOT a regression test.
//
// This file exists to print what the adaptive engine actually recommends in
// a set of realistic user-history scenarios so a human can compare against
// what an evidence-based coach would prescribe. It uses `it()` blocks for
// the structure, but the load-bearing output is the `console.log` reporting,
// not the assertions (assertions are kept loose / soft so the file always
// finishes printing all scenarios).
//
// Run with:
//   npm test -- src/lib/planner/autoProgress.scenarios.test.ts
//
// When you're done reading the report, delete this file. It's a one-shot
// reporting tool, not a permanent fixture.
// =============================================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeNextWeight,
  computeAutoProgressionForSession,
  type ProgressionResult,
} from './autoProgress'
import { computeRecalibration, type RecalibrationResult } from './skipRecalibration'
import { buildMesocycle, mesocycleLengthFor } from './buildMesocycle'
import { interpretProfile } from './interpretProfile'
import {
  buildLibraryMuscleMap,
  summarizeByMuscleGroup,
  renderMuscleRollupTable,
} from '../../../supabase/functions/generate/prompts/replanMesocycle'
import { db } from '../db'
import type { PlannedExercise } from '../../types/plan'
import type { ExerciseCheckin, SessionCheckin } from '../../types/checkin'
import type { UserProgramProfile } from '../../types/profile'

// ─── helpers ────────────────────────────────────────────────────────────────

function mkExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    library_id: 'ex:back-squat',
    name: 'Back Squat',
    sets: 3,
    reps: '8-12',
    rir: 2,
    rest_seconds: 90,
    role: 'main lift',
    warmup_sets: [],
    ...overrides,
  }
}

function mkCheckin(overrides: Partial<ExerciseCheckin> = {}): ExerciseCheckin {
  return {
    library_id: 'ex:back-squat',
    name: 'Back Squat',
    rating: 'solid',
    used_weight_lb: 50,
    reps_done: [10, 10, 10],
    ...overrides,
  }
}

function mkSessionCheckin(overrides: Partial<SessionCheckin> = {}): SessionCheckin {
  return {
    session_id: 'sess-1',
    user_id: 'user-1',
    completed_at: '2026-04-10T12:00:00.000Z',
    week_number: 2,
    overall_feel: 4,
    exercises: [mkCheckin()],
    synced: false,
    ...overrides,
  }
}

async function seedCheckin(checkin: SessionCheckin): Promise<void> {
  await db.sessionCheckins.put({
    session_id: checkin.session_id,
    user_id: checkin.user_id,
    completed_at: checkin.completed_at,
    week_number: checkin.week_number,
    checkin_json: JSON.stringify(checkin),
    synced: false,
  })
}

// Format helpers for readable console output.
const fmt = {
  result(r: ProgressionResult | null): string {
    if (!r) return '<null>'
    return `${r.action.toUpperCase()} → ${r.weight} lb  (${r.reason})`
  },
  recal(r: RecalibrationResult): string {
    return `${r.action} | mult=${r.load_multiplier} | week=${r.effective_week_number} | "${r.rationale}"`
  },
}

interface ScenarioRow {
  scenario: string
  input: string
  output: string
  expected: string
  match: 'YES' | 'NO' | 'PARTIAL' | 'N/A'
}

// Module-level collector so the report block at the bottom can summarize.
const withinBlockRows: ScenarioRow[] = []
const recalibrationRows: ScenarioRow[] = []

// ─── SCENARIO FAMILY 1: within-block weight auto-progression ───────────────

describe('SCENARIOS — within-block (computeNextWeight)', () => {
  function runScenario(label: string, args: {
    exercise: PlannedExercise
    history: ExerciseCheckin[]
    inputSummary: string
    expected: string
    matchPredicate: (r: ProgressionResult | null) => boolean
  }): void {
    const result = computeNextWeight({ exercise: args.exercise, history: args.history })
    const out = fmt.result(result)
    const matched = args.matchPredicate(result) ? 'YES' : 'NO'
    console.log(
      `\n  [${label}]  role=${args.exercise.role}\n` +
      `    INPUT     : ${args.inputSummary}\n` +
      `    OUTPUT    : ${out}\n` +
      `    EXPECTED  : ${args.expected}\n` +
      `    MATCH     : ${matched}`
    )
    withinBlockRows.push({
      scenario: label,
      input: args.inputSummary,
      output: out,
      expected: args.expected,
      match: matched as 'YES' | 'NO',
    })
  }

  // ---------------- A. Crushing it ----------------
  // Under the double-progression gate (audit §1), [10,10,10] only hits the
  // FLOOR of "8-12" — not the ceiling of 12 — so this is a HALF bump now.
  it('A. Crushing it — easy + floor only hit (main + accessory)', () => {
    runScenario('A-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [10, 10, 10] })],
      inputSummary: '3×"8-12" plan, last: easy 50 lb, [10,10,10] (floor met, ceiling=12 not met)',
      expected: 'half bump +2.5 → 52.5 lb',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 52.5,
    })
    runScenario('A-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [10, 10, 10] })],
      inputSummary: '3×"8-12" plan, last: easy 50 lb, [10,10,10] (floor only)',
      expected: 'half bump +2.5 → 52.5 lb (floor of 2.5 — half of 2.5 still 2.5)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 52.5,
    })
    runScenario('A-main-ceiling', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [12, 12, 12] })],
      inputSummary: '3×"8-12" plan, last: easy 50 lb, [12,12,12] (ceiling cleared)',
      expected: 'full bump +5 → 55 lb',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 55,
    })
    expect(true).toBe(true)
  })

  // ---------------- B. Just barely ----------------
  it('B. Just barely — tough + reps hit (main + accessory)', () => {
    runScenario('B-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [mkCheckin({ rating: 'tough', used_weight_lb: 50, reps_done: [10, 10, 10] })],
      inputSummary: '3×10 plan, last: tough 50 lb, [10,10,10]',
      expected: 'hold at 50',
      matchPredicate: (r) => r?.action === 'hold' && r?.weight === 50,
    })
    runScenario('B-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [mkCheckin({ rating: 'tough', used_weight_lb: 50, reps_done: [10, 10, 10] })],
      inputSummary: '3×10 plan, last: tough 50 lb, [10,10,10]',
      expected: 'hold at 50',
      matchPredicate: (r) => r?.action === 'hold' && r?.weight === 50,
    })
    expect(true).toBe(true)
  })

  // ---------------- C. One miss ----------------
  it('C. One miss — solid but final set short (one-strike hold)', () => {
    // Under the double-progression gate, [10,10,8] cleared the floor but
    // not the ceiling of "8-12" → HALF bump now.
    runScenario('C-main', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [
        mkCheckin({ rating: 'solid', used_weight_lb: 50, reps_done: [10, 10, 8] }),
      ],
      inputSummary: '3×"8-12" plan, last: solid 50 lb, [10,10,8] (floor=8 met, ceiling=12 missed)',
      expected: 'half bump +2.5 → 52.5 (floor met, ceiling not)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 52.5,
    })
    runScenario('C-accessory', {
      exercise: mkExercise({ role: 'accessory', sets: 3, reps: '8-12' }),
      history: [
        mkCheckin({ rating: 'solid', used_weight_lb: 50, reps_done: [10, 10, 8] }),
      ],
      inputSummary: '3×"8-12" plan, last: solid 50 lb, [10,10,8]',
      expected: 'half bump +2.5 → 52.5 (accessory floor of 2.5)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 52.5,
    })

    // True "one miss" — last set below the floor:
    runScenario('C-main-strict (final-set 5 below floor)', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [
        mkCheckin({ rating: 'solid', used_weight_lb: 50, reps_done: [10, 10, 5] }),
      ],
      inputSummary: '3×10 plan, last: solid 50 lb, [10,10,5] (final < floor=8)',
      expected: 'hold at 50 (one-strike)',
      matchPredicate: (r) => r?.action === 'hold' && r?.weight === 50,
    })
    expect(true).toBe(true)
  })

  // ---------------- D. Two consecutive misses ----------------
  it('D. Two consecutive misses — drop ~10%', () => {
    runScenario('D-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [
        mkCheckin({ rating: 'failed', used_weight_lb: 50, reps_done: [10, 10, 7] }),
        mkCheckin({ rating: 'failed', used_weight_lb: 50, reps_done: [10, 10, 8] }),
      ],
      inputSummary: 'last: failed 50 [10,10,7]; prev: failed 50 [10,10,8]',
      expected: 'drop ~10% → 45 lb',
      matchPredicate: (r) => r?.action === 'drop' && r?.weight === 45,
    })
    runScenario('D-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [
        mkCheckin({ rating: 'failed', used_weight_lb: 50, reps_done: [10, 10, 7] }),
        mkCheckin({ rating: 'failed', used_weight_lb: 50, reps_done: [10, 10, 8] }),
      ],
      inputSummary: 'last: failed 50 [10,10,7]; prev: failed 50 [10,10,8]',
      expected: 'drop ~10% → 45 lb (rounded to 2.5)',
      matchPredicate: (r) => r?.action === 'drop' && r?.weight === 45,
    })
    expect(true).toBe(true)
  })

  // ---------------- E. Beast mode 3 weeks straight ----------------
  it('E. Beast mode — 3 weeks of easy + reps hit, history climbs 50→55→60', () => {
    // The function ONLY uses `history[0]` for the bump base. Show that
    // simulating the climb is a per-call thing — feed it [60, 55, 50].
    // Under the ceiling gate, [10,10,10] is floor-only → HALF bump.
    runScenario('E-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [
        mkCheckin({ rating: 'easy', used_weight_lb: 60, reps_done: [10, 10, 10] }),
        mkCheckin({ rating: 'easy', used_weight_lb: 55, reps_done: [10, 10, 10] }),
        mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [10, 10, 10] }),
      ],
      inputSummary: '3 sessions easy 50→55→60, [10,10,10] each (floor only)',
      expected: 'half bump +2.5 → 62.5 lb (ceiling not cleared)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 62.5,
    })
    runScenario('E-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [
        mkCheckin({ rating: 'easy', used_weight_lb: 60, reps_done: [10, 10, 10] }),
        mkCheckin({ rating: 'easy', used_weight_lb: 55, reps_done: [10, 10, 10] }),
        mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [10, 10, 10] }),
      ],
      inputSummary: '3 sessions easy 50→55→60, [10,10,10] each (floor only)',
      expected: 'half bump +2.5 → 62.5 lb',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 62.5,
    })
    expect(true).toBe(true)
  })

  // ---------------- F. Tough then crushing it ----------------
  it('F. Tough → crushing it — newest dominates', () => {
    // [10,10,10] is floor-only on "8-12" → HALF bump, not full.
    runScenario('F-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [
        mkCheckin({ rating: 'easy', used_weight_lb: 55, reps_done: [10, 10, 10] }),
        mkCheckin({ rating: 'tough', used_weight_lb: 50, reps_done: [10, 10, 10] }),
      ],
      inputSummary: 'last: easy 55 [10,10,10]; prior: tough 50 [10,10,10]',
      expected: 'half bump +2.5 from 55 → 57.5 (floor only)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 57.5,
    })
    runScenario('F-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [
        mkCheckin({ rating: 'easy', used_weight_lb: 55, reps_done: [10, 10, 10] }),
        mkCheckin({ rating: 'tough', used_weight_lb: 50, reps_done: [10, 10, 10] }),
      ],
      inputSummary: 'last: easy 55 [10,10,10]; prior: tough 50 [10,10,10]',
      expected: 'half bump +2.5 from 55 → 57.5 (floor only)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 57.5,
    })
    expect(true).toBe(true)
  })

  // ---------------- G. Skipped logging reps but rated easy ----------------
  it('G. Rating drives — easy with no reps_done still bumps', () => {
    runScenario('G-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: undefined })],
      inputSummary: 'last: easy 50 lb, reps_done=undefined',
      expected: 'bump +5 → 55 lb (rating drives, missing reps treated as complete)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 55,
    })
    runScenario('G-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: undefined })],
      inputSummary: 'last: easy 50 lb, reps_done=undefined',
      expected: 'bump +2.5 → 52.5 lb',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 52.5,
    })
    expect(true).toBe(true)
  })

  // ---------------- H. First-ever session ----------------
  it('H. First-ever session — empty history → null', () => {
    runScenario('H-main', {
      exercise: mkExercise({ role: 'main lift' }),
      history: [],
      inputSummary: 'no prior history',
      expected: 'null (planner suggestion wins)',
      matchPredicate: (r) => r === null,
    })
    runScenario('H-accessory', {
      exercise: mkExercise({ role: 'accessory' }),
      history: [],
      inputSummary: 'no prior history',
      expected: 'null (planner suggestion wins)',
      matchPredicate: (r) => r === null,
    })
    expect(true).toBe(true)
  })
})

// ─── computeAutoProgressionForSession (Dexie end-to-end) ───────────────────

describe('SCENARIOS — computeAutoProgressionForSession (Dexie e2e)', () => {
  beforeEach(async () => {
    await db.sessionCheckins.clear()
  })

  it('multi-exercise: squat (main, easy, floor only) half bumps, leg-extension (isolation, failed) holds, plank (core) absent', async () => {
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'multi-1',
        completed_at: '2026-04-10T12:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            name: 'Back Squat',
            rating: 'easy',
            used_weight_lb: 135,
            reps_done: [10, 10, 10],
          }),
          mkCheckin({
            library_id: 'ex:leg-extension',
            name: 'Leg Extension',
            rating: 'failed',
            used_weight_lb: 90,
            reps_done: [10, 10, 5], // missed the floor
          }),
          mkCheckin({
            library_id: 'ex:plank',
            name: 'Plank',
            rating: 'solid',
            used_weight_lb: undefined,
            reps_done: undefined,
          }),
        ],
      }),
    )
    const exercises: PlannedExercise[] = [
      mkExercise({ library_id: 'ex:back-squat', name: 'Back Squat', role: 'main lift' }),
      mkExercise({ library_id: 'ex:leg-extension', name: 'Leg Extension', role: 'isolation' }),
      mkExercise({ library_id: 'ex:plank', name: 'Plank', role: 'core' }),
    ]
    const out = await computeAutoProgressionForSession('user-1', null, exercises)

    console.log('\n  [Multi-exercise session] →')
    for (const ex of exercises) {
      const r = out[ex.library_id] ?? null
      console.log(`    ${ex.library_id} (${ex.role}): ${fmt.result(r)}`)
    }
    console.log(
      `    EXPECTED: squat=BUMP→137.5 (half bump, floor only), leg-ext=HOLD@90 (one-strike, failed rating), plank=ABSENT (core role)`
    )

    // [10,10,10] cleared the floor of "8-12" but not the ceiling → half bump.
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 137.5 })
    expect(out['ex:leg-extension']).toMatchObject({ action: 'hold', weight: 90 })
    expect(out['ex:plank']).toBeUndefined()
  })

  it('excludeSessionId works: prior checkin drives recommendation, current is dropped', async () => {
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'prior',
        completed_at: '2026-04-01T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 135,
            reps_done: [10, 10, 10],
          }),
        ],
      }),
    )
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'current',
        completed_at: '2026-04-15T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 200,
            reps_done: [10, 10, 10],
          }),
        ],
      }),
    )
    const out = await computeAutoProgressionForSession('user-1', 'current', [
      mkExercise({ library_id: 'ex:back-squat', role: 'main lift' }),
    ])
    console.log(
      `\n  [excludeSessionId] →\n    OUTPUT  : ${fmt.result(out['ex:back-squat'] ?? null)}\n` +
      `    EXPECTED: BUMP → 137.5 lb (driven by 'prior' easy 135 [10,10,10] — floor only → half bump)`
    )
    // [10,10,10] cleared the floor of "8-12" but not the ceiling → half bump.
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 137.5 })
  })
})

// ─── SCENARIO FAMILY 2: skip recalibration ────────────────────────────────

describe('SCENARIOS — skipRecalibration (computeRecalibration)', () => {
  function runRecal(label: string, gap: number, week: number, ageMonths: number, expected: string): void {
    const r = computeRecalibration(gap, week, ageMonths)
    const out = fmt.recal(r)
    console.log(
      `\n  [${label}] gap=${gap}d, week=${week}, age=${ageMonths}mo\n` +
      `    OUTPUT   : ${out}\n` +
      `    EXPECTED : ${expected}`
    )
    recalibrationRows.push({
      scenario: label,
      input: `gap=${gap}d week=${week} age=${ageMonths}mo`,
      output: out,
      expected,
      match: 'N/A',
    })
  }

  it('0 days off — slide (no adjustment)', () => {
    runRecal('Recal-0d-w1-novice', 0, 1, 0, 'slide, mult=1.0, week=1')
    runRecal('Recal-0d-w4-intermed', 0, 4, 24, 'slide, mult=1.0, week=4')
    expect(true).toBe(true)
  })

  it('3 days off — still within slide window', () => {
    runRecal('Recal-3d-w1-novice', 3, 1, 0, 'slide, mult=1.0, week=1')
    runRecal('Recal-3d-w4-intermed', 3, 4, 24, 'slide, mult=1.0, week=4')
    expect(true).toBe(true)
  })

  it('5 days off — mild deload (~90% load)', () => {
    runRecal('Recal-5d-w1-novice', 5, 1, 0, 'deload_mild, mult=0.9, week=1')
    runRecal('Recal-5d-w4-intermed', 5, 4, 24, 'deload_mild, mult=0.9, week=4')
    expect(true).toBe(true)
  })

  it('14 days off — step back one microcycle (~85% load)', () => {
    runRecal('Recal-14d-w1-novice', 14, 1, 0, 'step_back_one_week, mult=0.85, week=max(1, w-1)')
    runRecal('Recal-14d-w4-intermed', 14, 4, 24, 'step_back_one_week, mult=0.85, week=3')
    expect(true).toBe(true)
  })

  it('15+ days off — training-age dependent', () => {
    runRecal('Recal-21d-w1-novice (<12mo)', 21, 1, 0, 'reset, mult=0.7, week=1, rep override [8,12]')
    runRecal('Recal-21d-w4-intermed (>=12mo)', 21, 4, 24, 'step_back_two_weeks, mult=0.8, week=max(1, w-2)')
    expect(true).toBe(true)
  })
})

// ─── SCENARIO FAMILY 3 (V2): EXTENDED within-block (post-audit) ────────────
//
// These exercise the NEW rules layered on top of the original simulator:
//   - double-progression rep-ceiling gate (full vs half bump)
//   - tough + ceiling met → half bump (rewarded)
//   - training-age-tiered bump magnitude
//   - same-load two-strike guard for drops
//   - rating-driven path when reps_done is missing

interface ExtendedRow {
  scenario: string
  input: string
  output: string
  expected: string
  match: 'YES' | 'NO' | 'PARTIAL' | 'N/A'
}
const extendedWithinBlockRows: ExtendedRow[] = []
const extendedRecalRows: ExtendedRow[] = []
const extendedMesoRows: ExtendedRow[] = []
const extendedReplanRows: ExtendedRow[] = []

describe('SCENARIOS V2 — within-block extensions (audit recs 1, 2, 3, 11)', () => {
  function runV2(label: string, args: {
    exercise: PlannedExercise
    history: ExerciseCheckin[]
    inputSummary: string
    expected: string
    matchPredicate: (r: ProgressionResult | null) => boolean
    trainingAgeMonths?: number
  }): void {
    const result = computeNextWeight({
      exercise: args.exercise,
      history: args.history,
      trainingAgeMonths: args.trainingAgeMonths,
    })
    const out = fmt.result(result)
    const matched = args.matchPredicate(result) ? 'YES' : 'NO'
    console.log(
      `\n  [${label}]  role=${args.exercise.role} age=${args.trainingAgeMonths ?? 'unset (intermediate)'}\n` +
      `    INPUT     : ${args.inputSummary}\n` +
      `    OUTPUT    : ${out}\n` +
      `    EXPECTED  : ${args.expected}\n` +
      `    MATCH     : ${matched}`
    )
    extendedWithinBlockRows.push({
      scenario: label,
      input: args.inputSummary,
      output: out,
      expected: args.expected,
      match: matched as 'YES' | 'NO',
    })
  }

  // ---------------- V2-A. Ceiling-met vs floor-only — solid rating ----------------
  it('V2-A. Ceiling cleared (full bump) vs floor only (half bump) — rating="solid", "8-12" prescription', () => {
    runV2('V2-A-ceiling', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [mkCheckin({ rating: 'solid', used_weight_lb: 100, reps_done: [12, 12, 12] })],
      inputSummary: '3×"8-12", solid 100 lb [12,12,12] (ceiling cleared)',
      expected: 'BUMP +5 → 105 lb (intermediate main, full bump)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 105,
    })
    runV2('V2-A-floor', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [mkCheckin({ rating: 'solid', used_weight_lb: 100, reps_done: [10, 10, 10] })],
      inputSummary: '3×"8-12", solid 100 lb [10,10,10] (floor only — ceiling=12 not cleared)',
      expected: 'BUMP +2.5 → 102.5 lb (half bump)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 102.5,
    })
    expect(true).toBe(true)
  })

  // ---------------- V2-B. Tough + ceiling met → half bump; tough + floor only → hold ----------------
  it('V2-B. Tough + ceiling cleared = HALF BUMP (rewarded). Tough + floor only = HOLD.', () => {
    runV2('V2-B-tough-ceiling', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [mkCheckin({ rating: 'tough', used_weight_lb: 100, reps_done: [12, 12, 12] })],
      inputSummary: 'tough 100 [12,12,12] (ceiling cleared despite tough)',
      expected: 'BUMP +2.5 → 102.5 (half bump — rewarded for clearing ceiling)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 102.5,
    })
    runV2('V2-B-tough-floor', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [mkCheckin({ rating: 'tough', used_weight_lb: 100, reps_done: [10, 10, 10] })],
      inputSummary: 'tough 100 [10,10,10] (floor only)',
      expected: 'HOLD @ 100 (tough but didn\'t earn forward motion)',
      matchPredicate: (r) => r?.action === 'hold' && r?.weight === 100,
    })
    expect(true).toBe(true)
  })

  // ---------------- V2-C. Training-age scan — same input, different age ----------------
  it('V2-C. Training-age scaling on a main lift — easy + ceiling met at 145 lb', () => {
    const baseHistory = [mkCheckin({
      rating: 'easy',
      used_weight_lb: 145,
      reps_done: [12, 12, 12],
    })]
    runV2('V2-C-novice (<3mo)', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: baseHistory,
      trainingAgeMonths: 1,
      inputSummary: '<3mo lifter, easy 145 [12,12,12], main lift "8-12"',
      expected: 'BUMP +10 → 155 lb (novice column for main lift)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 155,
    })
    runV2('V2-C-early (6mo)', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: baseHistory,
      trainingAgeMonths: 6,
      inputSummary: '6mo lifter, easy 145 [12,12,12], main lift "8-12"',
      expected: 'BUMP +5 → 150 lb (early column)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 150,
    })
    runV2('V2-C-intermediate (24mo)', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: baseHistory,
      trainingAgeMonths: 24,
      inputSummary: '24mo lifter, easy 145 [12,12,12], main lift "8-12"',
      expected: 'BUMP +5 → 150 lb (intermediate column)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 150,
    })
    runV2('V2-C-advanced (60mo)', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: baseHistory,
      trainingAgeMonths: 60,
      inputSummary: '60mo lifter, easy 145 [12,12,12], main lift "8-12"',
      expected: 'BUMP +2.5 → 147.5 lb (advanced column — fine increment)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 147.5,
    })
    expect(true).toBe(true)
  })

  // ---------------- V2-D. Two-strike same-load drop vs different-load no-drop ----------------
  it('V2-D. Same-load two-strike → DROP. Different-load two-strike → HOLD.', () => {
    runV2('V2-D-same-load', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [
        mkCheckin({ rating: 'failed', used_weight_lb: 145, reps_done: [10, 9, 7] }),
        mkCheckin({ rating: 'failed', used_weight_lb: 145, reps_done: [10, 10, 7] }),
      ],
      trainingAgeMonths: 24,
      inputSummary: 'last failed @145, prev failed @145 (same load)',
      expected: 'DROP ~10% → ~130 lb (same-load two-strike triggers backoff)',
      matchPredicate: (r) => r?.action === 'drop' && r?.weight !== undefined && r.weight < 145,
    })
    runV2('V2-D-different-load', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [
        mkCheckin({ rating: 'failed', used_weight_lb: 155, reps_done: [10, 9, 7] }),
        mkCheckin({ rating: 'failed', used_weight_lb: 130, reps_done: [10, 10, 7] }),
      ],
      trainingAgeMonths: 24,
      inputSummary: 'last failed @155, prev failed @130 (different load — gap > bump)',
      expected: 'HOLD @ 155 (no same-load strike — phantom drop avoided)',
      matchPredicate: (r) => r?.action === 'hold' && r?.weight === 155,
    })
    expect(true).toBe(true)
  })

  // ---------------- V2-E. Rating="easy" without reps_done → bump ----------------
  it('V2-E. Easy rating + reps_done undefined → BUMP (rating drives, missing reps lenient)', () => {
    runV2('V2-E-main-easy-no-reps', {
      exercise: mkExercise({ role: 'main lift', sets: 3, reps: '8-12' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 100, reps_done: undefined })],
      trainingAgeMonths: 24,
      inputSummary: 'easy 100 lb, reps_done=undefined (user skipped per-set entry)',
      expected: 'BUMP +5 → 105 lb (rating drives, ceiling-met treated as true)',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 105,
    })
    runV2('V2-E-acc-easy-no-reps', {
      exercise: mkExercise({ role: 'accessory', sets: 3, reps: '8-12' }),
      history: [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: undefined })],
      trainingAgeMonths: 24,
      inputSummary: 'easy 50 lb accessory, reps_done=undefined',
      expected: 'BUMP +2.5 → 52.5 lb',
      matchPredicate: (r) => r?.action === 'bump' && r?.weight === 52.5,
    })
    expect(true).toBe(true)
  })
})

// ─── SCENARIO FAMILY 4 (V2): EXTENDED skip recalibration tier scan ─────────

describe('SCENARIOS V2 — skipRecalibration extended tier scan (audit rec 5)', () => {
  function runRecalV2(
    label: string,
    gap: number,
    week: number,
    ageMonths: number,
    expected: string,
    expectedMult: number,
    expectedAction: string,
  ): void {
    const r = computeRecalibration(gap, week, ageMonths)
    const out = fmt.recal(r)
    const multMatch = Math.abs(r.load_multiplier - expectedMult) < 0.001
    const actionMatch = r.action === expectedAction
    const hasLossWord = /loss/i.test(r.rationale)
    const matched = multMatch && actionMatch && !hasLossWord ? 'YES' : 'NO'
    console.log(
      `\n  [${label}] gap=${gap}d, week=${week}, age=${ageMonths}mo\n` +
      `    OUTPUT       : ${out}\n` +
      `    EXPECTED     : ${expected}\n` +
      `    MATCH        : ${matched} (mult=${multMatch}, action=${actionMatch}, loss-word=${hasLossWord})`
    )
    extendedRecalRows.push({
      scenario: label,
      input: `gap=${gap}d week=${week} age=${ageMonths}mo`,
      output: out,
      expected,
      match: matched as 'YES' | 'NO',
    })
  }

  it('TRAINED tier scan — softened multipliers (0.95/0.92/0.92/0.9/0.85)', () => {
    runRecalV2('V2-TR-5d', 5, 4, 24, 'deload_mild, mult=0.95, week=4', 0.95, 'deload_mild')
    runRecalV2('V2-TR-10d', 10, 4, 24, 'deload_mild, mult=0.92, week=4', 0.92, 'deload_mild')
    runRecalV2('V2-TR-14d', 14, 4, 24, 'deload_mild, mult=0.92, week=4', 0.92, 'deload_mild')
    runRecalV2('V2-TR-21d', 21, 4, 24, 'step_back_one_week, mult=0.9, week=3', 0.9, 'step_back_one_week')
    runRecalV2('V2-TR-28d', 28, 4, 24, 'step_back_two_weeks, mult=0.85, week=2', 0.85, 'step_back_two_weeks')
    expect(true).toBe(true)
  })

  it('NOVICE tier scan — steeper multipliers (0.9/0.85/0.85/0.85/reset@0.7)', () => {
    runRecalV2('V2-NV-5d', 5, 4, 6, 'deload_mild, mult=0.9, week=4', 0.9, 'deload_mild')
    runRecalV2('V2-NV-10d', 10, 4, 6, 'deload_mild, mult=0.85, week=4', 0.85, 'deload_mild')
    runRecalV2('V2-NV-14d', 14, 4, 6, 'deload_mild, mult=0.85, week=4', 0.85, 'deload_mild')
    runRecalV2('V2-NV-21d', 21, 4, 6, 'step_back_one_week, mult=0.85, week=3', 0.85, 'step_back_one_week')
    runRecalV2('V2-NV-25d', 25, 4, 6, 'reset, mult=0.7, week=1', 0.7, 'reset')
    expect(true).toBe(true)
  })

  it('rationale strings contain ZERO mention of "loss" — adaptation framing only', () => {
    const allCases: Array<[number, number, number]> = [
      [0, 4, 24], [3, 4, 24], [5, 4, 24], [10, 4, 24], [14, 4, 24], [21, 4, 24], [28, 4, 24], [40, 4, 24],
      [5, 4, 6], [14, 4, 6], [21, 4, 6], [25, 4, 6],
    ]
    let badCount = 0
    for (const [gap, week, age] of allCases) {
      const r = computeRecalibration(gap, week, age)
      const hasLoss = /loss/i.test(r.rationale)
      if (hasLoss) badCount += 1
      console.log(
        `    gap=${gap}d age=${age}mo → "${r.rationale}" → loss-word? ${hasLoss}`
      )
    }
    console.log(`\n  TOTAL cases with /loss/i in rationale: ${badCount} (expected: 0)`)
    expect(badCount).toBe(0)
  })
})

// ─── SCENARIO FAMILY 5 (V2): mesocycle builder length + deload ─────────────

describe('SCENARIOS V2 — buildMesocycle length + deload (audit rec 4)', () => {
  function mkProfile(overrides: Partial<UserProgramProfile> = {}): UserProgramProfile {
    return {
      goal: 'strength',
      sessions_per_week: 4,
      training_age_months: 24,
      equipment: ['full_gym'],
      time_budget_min: 60,
      active_minutes: 60,
      sex: 'female',
      posture_notes: '',
      injuries: [],
      ...overrides,
    } as UserProgramProfile
  }

  function logMeso(label: string, expected: string, actual: number, match: boolean): void {
    console.log(
      `\n  [${label}]\n` +
      `    OUTPUT    : length_weeks=${actual}\n` +
      `    EXPECTED  : ${expected}\n` +
      `    MATCH     : ${match ? 'YES' : 'NO'}`
    )
    extendedMesoRows.push({
      scenario: label,
      input: label,
      output: `length_weeks=${actual}`,
      expected,
      match: match ? 'YES' : 'NO',
    })
  }

  it('lean_and_strong profile → 5-week meso', () => {
    const profile = mkProfile({
      primary_goal: 'lean_and_strong',
      primary_goals: ['lean_and_strong'],
    })
    const directives = interpretProfile(profile)
    const meso = buildMesocycle(directives, undefined, profile)
    const helperLength = mesocycleLengthFor(profile)
    logMeso(
      'V2-Meso-lean-strong',
      '5 weeks (per mesocycleLengthFor)',
      meso.length_weeks,
      meso.length_weeks === 5 && helperLength === 5,
    )
    expect(true).toBe(true)
  })

  it('build_muscle profile → 6-week meso', () => {
    const profile = mkProfile({
      primary_goal: 'build_muscle',
      primary_goals: ['build_muscle'],
    })
    const directives = interpretProfile(profile)
    const meso = buildMesocycle(directives, undefined, profile)
    const helperLength = mesocycleLengthFor(profile)
    logMeso(
      'V2-Meso-build-muscle',
      '6 weeks',
      meso.length_weeks,
      meso.length_weeks === 6 && helperLength === 6,
    )
    expect(true).toBe(true)
  })

  it('no profile → default 6-week meso', () => {
    const helperLength = mesocycleLengthFor(undefined)
    logMeso(
      'V2-Meso-default',
      '6 weeks (default when profile missing)',
      helperLength,
      helperLength === 6,
    )
    expect(true).toBe(true)
  })

  it('5-week strength block — seed weight identical wks 1-4, deload (wk 5) cuts sets ≥50%, RIR identical', () => {
    const profile = mkProfile({
      primary_goal: 'lean_and_strong',
      primary_goals: ['lean_and_strong'],
    })
    const directives = interpretProfile(profile)
    const meso = buildMesocycle(directives, undefined, profile)
    expect(meso.length_weeks).toBe(5)

    // Pick a library_id that exists in week 1 & 2 (same session-shape).
    // Find an exercise common to wk1 and wk2 ord 1.
    const wk1Sessions = meso.sessions.filter((s) => s.week_number === 1)
    const wk1S1 = wk1Sessions[0]!
    const exemplarLibId = wk1S1.exercises[0]!.library_id

    // Walk weeks 1..5 for that library_id and dump suggested_weight_lbs / sets / rir
    console.log(`\n  [V2-Meso-5wk-walk] tracking library_id=${exemplarLibId}`)
    const seedWeights: Array<number | undefined> = []
    const setCounts: number[] = []
    const rirs: number[] = []
    for (let wk = 1; wk <= 5; wk += 1) {
      const sess = meso.sessions.find(
        (s) =>
          s.week_number === wk &&
          s.subtitle === wk1S1.subtitle &&
          s.ordinal === wk1S1.ordinal,
      )
      const ex = sess?.exercises.find((e) => e.library_id === exemplarLibId)
      const seedW = ex?.suggested_weight_lbs
      const sets = ex?.sets ?? 0
      const rir = ex?.rir ?? 0
      seedWeights.push(seedW)
      setCounts.push(sets)
      rirs.push(rir)
      console.log(
        `    wk${wk}: seed=${seedW ?? '<unset>'} sets=${sets} rir=${rir}` +
        `${wk === 5 ? '  ← deload' : ''}`,
      )
    }

    // Confirm: seeds identical wks 1..4 (no weekly progression), and wk 5 sets ≤ 50% of wk 4
    const distinctSeedsWk1to4 = new Set(seedWeights.slice(0, 4)).size
    const wk4Sets = setCounts[3]!
    const wk5Sets = setCounts[4]!
    const setsCutBy50 = wk5Sets <= Math.ceil(wk4Sets * 0.5)
    const rirIdentical = rirs[3] === rirs[4]
    console.log(
      `    → distinct seeds wks 1-4: ${distinctSeedsWk1to4} (expect 1)\n` +
      `    → wk5 sets=${wk5Sets} ≤ ceil(wk4 sets ${wk4Sets} × 0.5) = ${Math.ceil(wk4Sets * 0.5)}? ${setsCutBy50}\n` +
      `    → wk4 RIR=${rirs[3]} === wk5 RIR=${rirs[4]}? ${rirIdentical}`
    )
    extendedMesoRows.push({
      scenario: 'V2-Meso-5wk-walk',
      input: 'lean_and_strong → 5wk block, exemplar lift across wks 1-5',
      output: `seeds[1..4] distinct=${distinctSeedsWk1to4}, sets[4]=${wk4Sets} sets[5]=${wk5Sets}, rir[4]=${rirs[3]} rir[5]=${rirs[4]}`,
      expected: 'seeds identical wks 1-4 (1 distinct), wk5 sets ≤ 50%, RIR identical',
      match: distinctSeedsWk1to4 === 1 && setsCutBy50 && rirIdentical ? 'YES' : 'NO',
    })
    expect(true).toBe(true)
  })
})

// ─── SCENARIO FAMILY 6 (V2): replan rollup helpers ─────────────────────────

describe('SCENARIOS V2 — replan rollup helpers (audit rec 7)', () => {
  function logRollup(label: string, summary: string, expected: string, match: boolean): void {
    console.log(
      `\n  [${label}]\n` +
      `    OUTPUT    : ${summary}\n` +
      `    EXPECTED  : ${expected}\n` +
      `    MATCH     : ${match ? 'YES' : 'NO'}`
    )
    extendedReplanRows.push({
      scenario: label,
      input: label,
      output: summary,
      expected,
      match: match ? 'YES' : 'NO',
    })
  }

  it('multi-muscle session: focus=[quads, glutes] → exercises attributed to first focus (quads)', () => {
    const completedMeso = {
      sessions: [
        {
          focus: ['quads', 'glutes'],
          exercises: [
            { library_id: 'ex:back-squat', name: 'Back Squat' },
            { library_id: 'ex:hip-thrust', name: 'Hip Thrust' },
          ],
        },
      ],
    }
    const map = buildLibraryMuscleMap(completedMeso)
    const squatMuscle = map.get('ex:back-squat')
    const thrustMuscle = map.get('ex:hip-thrust')
    console.log(
      `    map(ex:back-squat) → ${squatMuscle}\n` +
      `    map(ex:hip-thrust) → ${thrustMuscle}`
    )
    logRollup(
      'V2-Replan-multi-focus',
      `squat=${squatMuscle}, thrust=${thrustMuscle}`,
      'both → "quads" (first element of session.focus)',
      squatMuscle === 'quads' && thrustMuscle === 'quads',
    )
    expect(true).toBe(true)
  })

  it('6 checkins, 4 easy on quads → dominant rating quads="easy"', () => {
    const map = new Map([
      ['ex:back-squat', 'quads'],
      ['ex:leg-extension', 'quads'],
    ])
    const checkins = [
      { session_id: 's1', overall_feel: 4, exercises: [{ library_id: 'ex:back-squat', rating: 'easy' }] },
      { session_id: 's2', overall_feel: 4, exercises: [{ library_id: 'ex:back-squat', rating: 'easy' }] },
      { session_id: 's3', overall_feel: 4, exercises: [{ library_id: 'ex:leg-extension', rating: 'easy' }] },
      { session_id: 's4', overall_feel: 4, exercises: [{ library_id: 'ex:leg-extension', rating: 'easy' }] },
      { session_id: 's5', overall_feel: 4, exercises: [{ library_id: 'ex:back-squat', rating: 'solid' }] },
      { session_id: 's6', overall_feel: 4, exercises: [{ library_id: 'ex:leg-extension', rating: 'solid' }] },
    ]
    const rollup = summarizeByMuscleGroup(checkins, map)
    const quads = rollup.find((r) => r.muscle === 'quads')
    console.log(`    rollup quads:`, quads)
    logRollup(
      'V2-Replan-easy-dominant',
      `quads dominant_rating="${quads?.dominant_rating}", count=${quads?.exercise_count}`,
      'quads dominant_rating="easy", count=6',
      quads?.dominant_rating === 'easy' && quads.exercise_count === 6,
    )
    expect(true).toBe(true)
  })

  it('1 failed checkin on glutes → tough_or_failed_pct counts it', () => {
    const map = new Map([
      ['ex:hip-thrust', 'glutes'],
    ])
    const checkins = [
      { session_id: 's1', overall_feel: 3, exercises: [{ library_id: 'ex:hip-thrust', rating: 'solid' }] },
      { session_id: 's2', overall_feel: 3, exercises: [{ library_id: 'ex:hip-thrust', rating: 'failed' }] },
      { session_id: 's3', overall_feel: 3, exercises: [{ library_id: 'ex:hip-thrust', rating: 'solid' }] },
    ]
    const rollup = summarizeByMuscleGroup(checkins, map)
    const glutes = rollup.find((r) => r.muscle === 'glutes')
    console.log(`    rollup glutes:`, glutes)
    // 1 failed out of 3 = 0.33
    const expectedPct = Math.round((1 / 3) * 100) / 100
    logRollup(
      'V2-Replan-failed-counts',
      `glutes tough_or_failed_pct=${glutes?.tough_or_failed_pct}, exercise_count=${glutes?.exercise_count}`,
      `tough_or_failed_pct ≈ ${expectedPct} (1/3)`,
      glutes?.tough_or_failed_pct === expectedPct,
    )
    expect(true).toBe(true)
  })

  it('empty checkins → empty rollup', () => {
    const map = new Map<string, string>()
    const rollup = summarizeByMuscleGroup([], map)
    const rendered = renderMuscleRollupTable(rollup)
    console.log(`    rollup length=${rollup.length}\n    rendered:\n${rendered}`)
    logRollup(
      'V2-Replan-empty',
      `rollup.length=${rollup.length}, rendered contains "no muscle group rollup" = ${rendered.includes('no muscle group rollup')}`,
      'rollup is empty array, rendered says "no muscle group rollup available"',
      rollup.length === 0 && rendered.includes('no muscle group rollup'),
    )
    expect(true).toBe(true)
  })

  it('unknown library_id → bucketed under "other"', () => {
    const map = new Map([['ex:known', 'quads']])
    const checkins = [
      { session_id: 's1', overall_feel: 4, exercises: [{ library_id: 'ex:known', rating: 'solid' }] },
      { session_id: 's2', overall_feel: 4, exercises: [{ library_id: 'ex:mystery', rating: 'tough' }] },
      { session_id: 's3', overall_feel: 4, exercises: [{ library_id: 'ex:totally-new', rating: 'easy' }] },
    ]
    const rollup = summarizeByMuscleGroup(checkins, map)
    const other = rollup.find((r) => r.muscle === 'other')
    console.log(`    rollup other:`, other)
    logRollup(
      'V2-Replan-unknown-bucket',
      `other count=${other?.exercise_count}, dominant=${other?.dominant_rating}`,
      'other.exercise_count=2 (mystery + totally-new)',
      other?.exercise_count === 2,
    )
    expect(true).toBe(true)
  })
})

// ─── REPORT ───────────────────────────────────────────────────────────────

describe('REPORT — comparison vs evidence-based programming', () => {
  it('prints the consolidated tables', () => {
    console.log('\n\n========================================')
    console.log('=== WITHIN-BLOCK AUTO-PROGRESSION ===')
    console.log('========================================')
    console.log('| Scenario | Input | Output | Expected | Match |')
    console.log('|---|---|---|---|---|')
    for (const r of withinBlockRows) {
      console.log(`| ${r.scenario} | ${r.input} | ${r.output} | ${r.expected} | ${r.match} |`)
    }
    console.log('\n========================================')
    console.log('=== SKIP RECALIBRATION ===')
    console.log('========================================')
    console.log('| Scenario | Input | Output |')
    console.log('|---|---|---|')
    for (const r of recalibrationRows) {
      console.log(`| ${r.scenario} | ${r.input} | ${r.output} |`)
    }

    console.log('\n========================================')
    console.log('=== V2 EXTENDED — WITHIN BLOCK ===')
    console.log('========================================')
    console.log('| Scenario | Input | Output | Expected | Match |')
    console.log('|---|---|---|---|---|')
    for (const r of extendedWithinBlockRows) {
      console.log(`| ${r.scenario} | ${r.input} | ${r.output} | ${r.expected} | ${r.match} |`)
    }

    console.log('\n========================================')
    console.log('=== V2 EXTENDED — RECALIBRATION ===')
    console.log('========================================')
    console.log('| Scenario | Input | Output | Expected | Match |')
    console.log('|---|---|---|---|---|')
    for (const r of extendedRecalRows) {
      console.log(`| ${r.scenario} | ${r.input} | ${r.output} | ${r.expected} | ${r.match} |`)
    }

    console.log('\n========================================')
    console.log('=== V2 EXTENDED — MESOCYCLE BUILDER ===')
    console.log('========================================')
    console.log('| Scenario | Input | Output | Expected | Match |')
    console.log('|---|---|---|---|---|')
    for (const r of extendedMesoRows) {
      console.log(`| ${r.scenario} | ${r.input} | ${r.output} | ${r.expected} | ${r.match} |`)
    }

    console.log('\n========================================')
    console.log('=== V2 EXTENDED — REPLAN ROLLUP ===')
    console.log('========================================')
    console.log('| Scenario | Input | Output | Expected | Match |')
    console.log('|---|---|---|---|---|')
    for (const r of extendedReplanRows) {
      console.log(`| ${r.scenario} | ${r.input} | ${r.output} | ${r.expected} | ${r.match} |`)
    }

    expect(true).toBe(true)
  })
})

/* =============================================================================
 * REPORT (post-run human notes)
 * =============================================================================
 *
 * --- Within-block (computeNextWeight) — POST audit changes 3, 4, 11 ---
 *
 * | Scenario | Input | System Output | Research-Expected | Match? |
 * |---|---|---|---|---|
 * | A. Floor only (main) | easy 50 [10,10,10] "8-12" | BUMP → 52.5 | half bump (floor only) | YES |
 * | A. Floor only (acc)  | easy 50 [10,10,10] "8-12" | BUMP → 52.5 | half bump (floor=2.5) | YES |
 * | A. Ceiling met (main) | easy 50 [12,12,12] "8-12" | BUMP → 55 | full bump (ceiling cleared) | YES |
 * | B. Just barely (main) | tough 50 [10,10,10] | HOLD @ 50 | hold (ceiling not met) | YES |
 * | B. Just barely (acc)  | tough 50 [10,10,10] | HOLD @ 50 | hold | YES |
 * | C. Floor only (main) | solid 50 [10,10,8] "8-12" | BUMP → 52.5 | half bump | YES |
 * | C. One miss strict (main, [10,10,5] below floor) | solid 50 [10,10,5] | HOLD @ 50 | hold (one-strike) | YES |
 * | D. Two failures (main) | failed 50 / failed 50 | DROP → 45 | ~10% drop | YES |
 * | D. Two failures (acc) | failed 50 / failed 50 | DROP → 45 | ~10% drop | YES |
 * | E. 3 weeks beast (main, floor only) | easy 60 [10,10,10] (newest) | BUMP → 62.5 | half bump | YES |
 * | E. 3 weeks beast (acc) | easy 60 [10,10,10] (newest) | BUMP → 62.5 | half bump | YES |
 * | F. Tough → easy (main, floor only) | easy 55 / tough 50 | BUMP → 57.5 | half bump | YES |
 * | F. Tough → easy (acc, floor only) | easy 55 / tough 50 | BUMP → 57.5 | half bump | YES |
 * | G. Easy w/o reps (main) | easy 50 reps=undef | BUMP → 55 | full bump (lenient) | YES |
 * | H. First session | empty history | null | null (planner wins) | YES |
 *
 * Verdict (within-block, post-audit):
 *   The system now implements proper double progression: clearing the TOP
 *   of the prescribed rep range earns a full bump; clearing only the floor
 *   earns a half bump. "Tough but cleared the ceiling" is rewarded with a
 *   half bump rather than a flat hold (the user earned forward motion).
 *   Bump magnitude scales with training age (novice main lift +10; advanced
 *   +2.5). Two-strike drop now requires the two failures to be at the SAME
 *   load (±1 bump) — prevents stale failures at different weights from
 *   triggering a phantom drop.
 *
 * Notable nuances / surprises:
 *   - Empty/undefined reps_done is still treated as "complete" — both for
 *     floor and ceiling — so the user's rating drives when they skip rep
 *     entry. Pragmatic for the UX; a coach would want better data.
 *   - Half bump has a floor of 2.5 (the smallest realistic plate increment).
 *     Half of +2.5 stays at +2.5; half of +5 → +2.5; half of +10 → +5.
 *   - "First session" returning null and deferring to planner suggestion
 *     is correct — there's nothing to bump from. No surprise.
 *
 * --- Skip recalibration (computeRecalibration) ---
 *
 * | Scenario | Input | System Output |
 * |---|---|---|
 * | 0d, w1, novice | gap=0 | slide, mult=1.0, week=1 |
 * | 0d, w4, intermed | gap=0 | slide, mult=1.0, week=4 |
 * | 3d, w1, novice | gap=3 | slide, mult=1.0, week=1 |
 * | 3d, w4, intermed | gap=3 | slide, mult=1.0, week=4 |
 * | 5d, w1, novice | gap=5 | deload_mild, mult=0.9, week=1 |
 * | 5d, w4, intermed | gap=5 | deload_mild, mult=0.9, week=4 |
 * | 14d, w1, novice | gap=14 | step_back_one_week, mult=0.85, week=1 (clamped) |
 * | 14d, w4, intermed | gap=14 | step_back_one_week, mult=0.85, week=3 |
 * | 21d, w1, novice (<12mo) | gap=21 | reset, mult=0.7, week=1, rep override [8,12] |
 * | 21d, w4, intermed (≥12mo) | gap=21 | step_back_two_weeks, mult=0.8, week=2 |
 *
 * Verdict (skip recalibration):
 *   Aligns with Mujika & Padilla 2000 detraining literature. Trained lifters
 *   retain most strength through ~2 weeks; novices detrain faster and have
 *   less movement retention. The 4-tier graded response (slide / 90% / 85%
 *   week-back / 70-80% week-back-2 with novice reset) is more thoughtful
 *   than most apps' all-or-nothing "you missed a week, restart" flow.
 *
 * Notable nuances / surprises:
 *   - 4-day threshold for deload triggering is aggressive — a user who
 *     skipped a session because they were sick on Wednesday would hit 4-7
 *     days off and get a 90% load. Probably right (post-illness should
 *     deload anyway), but worth noting.
 *   - Novice reset at 21 days drops to 70% AND swaps rep scheme to 8-12
 *     regardless of original prescription. Reasonable for safety, but if
 *     the original block prescribed 5×5 strength, this changes the stimulus
 *     entirely. Coach would likely want a "you missed 3 weeks, let's chat"
 *     touchpoint, not just a silent rep-scheme swap.
 *   - effective_week_number floor of 1 means "step_back_one_week" at week 1
 *     stays at week 1 — silently equivalent to no week-step-back, just the
 *     85% load. Probably fine but the rationale string still says "repeating
 *     last week's loads" which is misleading at week 1.
 *   - No special handling for >30 days, >60 days, "completely new mesocycle
 *     needed" — anything past 14 days collapses into the same two buckets.
 *
 * --- replan.ts (high-level read, NOT executed) ---
 *
 *   Input: userId + completedMesocycleId. Internally loads the mesocycle,
 *   the user's profile, all SessionCheckins for that block (must have
 *   ≥18 = 75% of a 6×4 block), and re-runs interpretProfile on the live
 *   profile to reconstruct "previous directives".
 *
 *   Output: ReplanResult { directives, rationale_for_user, adjustments_summary }.
 *   Persists to db.replanHistory.
 *
 *   Rule basis: Calls Claude Opus via the `replan_mesocycle` edge function
 *   (~$0.37/call). The actual rules live server-side in the edge prompt
 *   (supabase/functions/generate/...), NOT in this file. So replan.ts
 *   itself is a thin client — it gates on data sufficiency (MIN_CHECKINS_FOR_REPLAN
 *   = 18), assembles the payload, validates the response shape with Zod,
 *   and persists. The "evidence-based-ness" of the actual programming
 *   adjustments depends entirely on the Opus prompt, which I haven't
 *   inspected here.
 *
 *   Rules I CAN see in replan.ts: the ≥18-checkin gate is a sensible cost
 *   guard (don't burn $0.37 on three lazy weeks of data). The decision to
 *   always re-derive previous directives from the live profile (rather
 *   than the stored snapshot) is a defensible "live state wins" call but
 *   may understate drift if the user changed their profile mid-block.
 *
 * =============================================================================
 */
