// =============================================================================
// INTEGRATION SIMULATION — NOT a regression suite.
//
// This file simulates a 6-week (or 5-week strength) training block end-to-end
// through the adaptive engine. The goal is to find cross-module bugs between
// buildMesocycle, autoProgress (computeAutoProgressionForSession), and
// skipRecalibration / planSelectors. Unit tests for each module pass; this
// file exists to catch *integration* drift.
//
// All `it()` blocks soft-assert (`expect(true).toBe(true)`) — the value is in
// the printed traces and the markdown report at /tmp/integration_sim_report.md.
//
// Run with:
//   npx vitest run src/lib/planner/integration.simulation.test.ts --reporter=verbose
//
// When done analyzing the run, this file can be deleted — it is a one-shot
// diagnostic, not a permanent fixture.
// =============================================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { computeAutoProgressionForSession } from './autoProgress'
import { buildMesocycle } from './buildMesocycle'
import { interpretProfile } from './interpretProfile'
import { saveCheckin } from '../checkins'
import { getSessionForDateWithRecalibration } from '../planSelectors'
import { saveProfileLocal } from '../profileRepo'
import { db } from '../db'
import type { PlannedExercise, PlannedSession, Mesocycle } from '../../types/plan'
import type {
  ExerciseCheckin,
  SessionCheckin,
  ExerciseRating,
} from '../../types/checkin'
import type { UserProgramProfile } from '../../types/profile'
import type { CompletedSessionRef } from './skipRecalibration'

// ─── helpers ────────────────────────────────────────────────────────────────

interface ScenarioStep {
  /** Per-set rating per exercise. Applied to every exercise in the session. */
  rating: ExerciseRating
  /**
   * 'ceiling' = reps_done filled with the top of the rep range
   * 'floor'   = reps_done filled with the bottom of the rep range
   * 'fail'    = reps_done has the final set drop below the floor
   * 'skip'    = no reps_done at all (rating drives)
   */
  reps: 'ceiling' | 'floor' | 'fail' | 'skip'
  /** overall_feel 1..5 */
  overall_feel?: 1 | 2 | 3 | 4 | 5
}

/** Parse "8-12" → [8,12]; "10" → [10,10]. */
function parseReps(reps: string): [number, number] {
  const matches = reps.match(/\d+/g)
  if (!matches || matches.length === 0) return [8, 12]
  const lo = Number.parseInt(matches[0]!, 10)
  const hi = Number.parseInt(matches[matches.length - 1]!, 10)
  return [lo, hi]
}

/** Build per-exercise reps_done array per the step's reps strategy. */
function buildRepsDone(
  ex: PlannedExercise,
  strategy: ScenarioStep['reps'],
): number[] | undefined {
  if (strategy === 'skip') return undefined
  const [floor, ceil] = parseReps(ex.reps)
  const arr: number[] = []
  for (let i = 0; i < ex.sets; i += 1) {
    if (strategy === 'ceiling') arr.push(ceil)
    else if (strategy === 'floor') arr.push(floor)
    else if (strategy === 'fail') {
      // Last set falls below floor; earlier sets at floor.
      if (i === ex.sets - 1) arr.push(Math.max(0, floor - 2))
      else arr.push(floor)
    }
  }
  return arr
}

/** Resolve the working weight for a given session/exercise via autoProgress
 * (or fall back to the exercise's seed `suggested_weight_lbs` if no history).
 * Mirrors the WorkoutView wiring: exclude the current session_id so reopening
 * a session doesn't bump itself.
 */
async function resolveWorkingWeight(
  userId: string,
  session: PlannedSession,
  ex: PlannedExercise,
): Promise<{ weight: number | null; from: 'auto' | 'seed' | 'none' }> {
  const out = await computeAutoProgressionForSession(userId, session.id, [ex])
  const r = out[ex.library_id]
  if (r) return { weight: r.weight, from: 'auto' }
  if (ex.suggested_weight_lbs !== undefined)
    return { weight: ex.suggested_weight_lbs, from: 'seed' }
  return { weight: null, from: 'none' }
}

/** Run a session: pull each exercise's recommended weight, then write a
 * SessionCheckin reflecting the scenario step. Logs a per-exercise trace.
 */
async function runSession(args: {
  userId: string
  session: PlannedSession
  step: ScenarioStep
  /** Override per-session: null means use step.rating for all. */
  perExerciseRating?: Record<string, ExerciseRating>
  completedAt: string
}): Promise<{
  exerciseTrace: { library_id: string; name: string; weight: number | null; from: string }[]
  checkin: SessionCheckin
}> {
  const { userId, session, step, completedAt } = args
  const exerciseCheckins: ExerciseCheckin[] = []
  const trace: { library_id: string; name: string; weight: number | null; from: string }[] = []

  for (const ex of session.exercises) {
    const { weight, from } = await resolveWorkingWeight(userId, session, ex)
    trace.push({ library_id: ex.library_id, name: ex.name, weight, from })
    // Skip non-progressing/bodyweight exercises in the checkin if they have
    // no weight to log. We still log a rating so the session "happened".
    if (weight === null || weight === undefined) {
      exerciseCheckins.push({
        library_id: ex.library_id,
        name: ex.name,
        rating: args.perExerciseRating?.[ex.library_id] ?? step.rating,
      })
      continue
    }
    const rating = args.perExerciseRating?.[ex.library_id] ?? step.rating
    const reps_done = buildRepsDone(ex, step.reps)
    const checkin: ExerciseCheckin = {
      library_id: ex.library_id,
      name: ex.name,
      rating,
      used_weight_lb: weight,
    }
    if (reps_done !== undefined) checkin.reps_done = reps_done
    exerciseCheckins.push(checkin)
  }

  const sessionCheckin: SessionCheckin = {
    session_id: session.id,
    user_id: userId,
    completed_at: completedAt,
    week_number: session.week_number,
    overall_feel: step.overall_feel ?? 3,
    exercises: exerciseCheckins,
    synced: false,
  }
  await saveCheckin(sessionCheckin)

  return { exerciseTrace: trace, checkin: sessionCheckin }
}

/** Track first-seen vs last-seen weight for a small set of "key" exercises so
 * the per-scenario summary can show squat 145 → 175 etc.
 */
class StartEndTracker {
  private start = new Map<string, { name: string; weight: number }>()
  private end = new Map<string, { name: string; weight: number }>()
  observe(library_id: string, name: string, weight: number | null): void {
    if (weight === null || weight === undefined) return
    if (!this.start.has(library_id)) this.start.set(library_id, { name, weight })
    this.end.set(library_id, { name, weight })
  }
  summary(): { name: string; start: number; end: number; delta: number }[] {
    const out: { name: string; start: number; end: number; delta: number }[] = []
    for (const [k, s] of this.start.entries()) {
      const e = this.end.get(k)
      if (!e) continue
      out.push({ name: s.name, start: s.weight, end: e.weight, delta: e.weight - s.weight })
    }
    return out
  }
}

/** Pretty-print a summary block. */
function printSummary(label: string, t: StartEndTracker): void {
  console.log(`\n=== SCENARIO SUMMARY: ${label} ===`)
  for (const row of t.summary()) {
    const sign = row.delta >= 0 ? '+' : ''
    console.log(
      `  ${row.name}: ${row.start} → ${row.end} (${sign}${row.delta})`,
    )
  }
}

/** Build a profile fixture. Default is no injuries, full gym, 4x/week. */
function mkProfile(overrides: Partial<UserProgramProfile> = {}): UserProgramProfile {
  return {
    goal: 'aesthetics',
    primary_goal: 'build_muscle',
    primary_goals: ['build_muscle'],
    sessions_per_week: 4,
    training_age_months: 24,
    equipment: ['full_gym'],
    time_budget_min: 60,
    active_minutes: 60,
    sex: 'male',
    posture_notes: '',
    weight_kg: 80,
    injuries: [],
    ...overrides,
  }
}

// Module-level so all `it()` runs share a clean Dexie at the top.
async function resetDexie(): Promise<void> {
  await db.sessionCheckins.clear()
  await db.userProgramProfiles.clear()
  await db.sessionLogs.clear()
}

// ─── SHARED setup helper ────────────────────────────────────────────────────
async function buildBlock(profile: UserProgramProfile, userId: string): Promise<{
  meso: { length_weeks: number; sessions: PlannedSession[] }
  byWeek: Map<number, PlannedSession[]>
}> {
  // Persist profile so computeAutoProgressionForSession picks up training_age_months.
  await saveProfileLocal(userId, profile)
  const directives = interpretProfile(profile)
  const built = buildMesocycle(directives, undefined, profile)
  const byWeek = new Map<number, PlannedSession[]>()
  for (const s of built.sessions) {
    if (!byWeek.has(s.week_number)) byWeek.set(s.week_number, [])
    byWeek.get(s.week_number)!.push(s)
  }
  for (const arr of byWeek.values()) arr.sort((a, b) => a.ordinal - b.ordinal)
  return { meso: built, byWeek }
}

// ─── SCENARIO RUNNERS ───────────────────────────────────────────────────────

describe('INTEGRATION SIMULATION — full block end-to-end', () => {
  beforeEach(async () => {
    await resetDexie()
  })

  // ---------------------------------------------------------------- 1
  it('SCENARIO 1 — Beast mode (every session easy, ceiling met)', async () => {
    const userId = 'user-beast'
    const profile = mkProfile({ training_age_months: 24, primary_goal: 'build_muscle', primary_goals: ['build_muscle'] })
    const { meso, byWeek } = await buildBlock(profile, userId)
    console.log(`\n[Beast] meso length_weeks=${meso.length_weeks}, ${meso.sessions.length} sessions`)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)

    for (let week = 1; week <= meso.length_weeks; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        const offsetDays = (week - 1) * 7 + s.ordinal
        const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step: { rating: 'easy', reps: 'ceiling', overall_feel: 5 },
          completedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
        const head = exerciseTrace[0]
        if (head) {
          console.log(`  W${week} S${s.ordinal} (${s.title}): ${head.name} ${head.weight} (${head.from})`)
        }
      }
    }
    printSummary('1 Beast mode (24mo build_muscle, 6wk)', tracker)
    expect(true).toBe(true)
  })

  // ---------------------------------------------------------------- 2
  it('SCENARIO 2 — Steady (60% easy/ceiling, 30% solid/floor, 10% tough/ceiling)', async () => {
    const userId = 'user-steady'
    const profile = mkProfile({ training_age_months: 12 })
    const { meso, byWeek } = await buildBlock(profile, userId)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)
    let i = 0

    for (let week = 1; week <= meso.length_weeks; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        // Deterministic mix: 0..5 easy/ceiling, 6..8 solid/floor, 9 tough/ceiling.
        const slot = i % 10
        let step: ScenarioStep
        if (slot < 6) step = { rating: 'easy', reps: 'ceiling', overall_feel: 4 }
        else if (slot < 9) step = { rating: 'solid', reps: 'floor', overall_feel: 4 }
        else step = { rating: 'tough', reps: 'ceiling', overall_feel: 3 }
        i += 1

        const offsetDays = (week - 1) * 7 + s.ordinal
        const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step,
          completedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
        const head = exerciseTrace[0]
        if (head) {
          console.log(`  W${week} S${s.ordinal} ${step.rating}/${step.reps}: ${head.name} ${head.weight}`)
        }
      }
    }
    printSummary('2 Steady (12mo build_muscle, 6wk)', tracker)
    expect(true).toBe(true)
  })

  // ---------------------------------------------------------------- 3
  it('SCENARIO 3 — Stalling (tough/floor every session)', async () => {
    const userId = 'user-stall'
    const profile = mkProfile({ training_age_months: 36 })
    const { meso, byWeek } = await buildBlock(profile, userId)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)

    for (let week = 1; week <= meso.length_weeks; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        const offsetDays = (week - 1) * 7 + s.ordinal
        const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step: { rating: 'tough', reps: 'floor', overall_feel: 2 },
          completedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
        const head = exerciseTrace[0]
        if (head) {
          console.log(`  W${week} S${s.ordinal} tough/floor: ${head.name} ${head.weight}`)
        }
      }
    }
    printSummary('3 Stalling (36mo build_muscle, 6wk)', tracker)
    expect(true).toBe(true)
  })

  // ---------------------------------------------------------------- 4
  it('SCENARIO 4 — Failing (easy weeks 1-2, two-strike fail in week 3)', async () => {
    const userId = 'user-fail'
    const profile = mkProfile({ training_age_months: 6 })
    const { meso, byWeek } = await buildBlock(profile, userId)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)

    for (let week = 1; week <= meso.length_weeks; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        let step: ScenarioStep
        if (week <= 2) step = { rating: 'easy', reps: 'ceiling', overall_feel: 4 }
        else if (week === 3) step = { rating: 'failed', reps: 'fail', overall_feel: 2 }
        else step = { rating: 'solid', reps: 'floor', overall_feel: 3 }

        const offsetDays = (week - 1) * 7 + s.ordinal
        const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step,
          completedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
        const head = exerciseTrace[0]
        if (head) {
          console.log(`  W${week} S${s.ordinal} ${step.rating}/${step.reps}: ${head.name} ${head.weight}`)
        }
      }
    }
    printSummary('4 Failing (6mo build_muscle, 6wk)', tracker)
    expect(true).toBe(true)
  })

  // ---------------------------------------------------------------- 5
  it('SCENARIO 5 — Skipped a week (layoff mid-block, recalibration banner)', async () => {
    const userId = 'user-skip'
    const profile = mkProfile({ training_age_months: 24 })
    const { meso, byWeek } = await buildBlock(profile, userId)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)

    // Weeks 1-2: solid/ceiling normal training. Persist `sessionLogs` rows so
    // computeGapFromLogs can find the last session ended_at when we resume.
    for (let week = 1; week <= 2; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        const offsetDays = (week - 1) * 7 + s.ordinal
        const endedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        await db.sessionLogs.put({
          id: `${s.id}-log`,
          user_id: userId,
          workout_id: s.id,
          date: endedAt.slice(0, 10),
          started_at: endedAt,
          ended_at: endedAt,
          phases_json: '[]',
          completed_sets: 0,
          total_sets: 0,
          synced: false,
        })
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step: { rating: 'solid', reps: 'ceiling', overall_feel: 4 },
          completedAt: endedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
      }
    }

    // Week 3: SKIPPED — no checkins, no sessionLogs. Last session ended at end
    // of week 2. We resume at week 4's first session (14d after the last).
    const week4Sessions = byWeek.get(4) ?? []
    if (week4Sessions.length > 0) {
      const firstW4 = week4Sessions[0]!
      // The "today" date is exactly 14 days after the last completed session.
      const lastEndedISO = (
        await db.sessionLogs.where('user_id').equals(userId).toArray()
      )
        .map((l) => l.ended_at!)
        .filter(Boolean)
        .sort()
        .pop()!
      const today = new Date(new Date(lastEndedISO).getTime() + 14 * 86400000)

      const meso2: Mesocycle = {
        id: meso.id,
        user_id: userId,
        generated_at: new Date().toISOString(),
        length_weeks: meso.length_weeks,
        sessions: meso.sessions,
        profile_snapshot: profile,
      } as unknown as Mesocycle

      const result = await getSessionForDateWithRecalibration(
        meso2,
        [],
        today,
        firstW4.week_number,
        userId,
        { trainingAgeMonths: profile.training_age_months },
      )
      console.log(`\n  [Layoff] today=${today.toISOString()} gap=14d`)
      console.log(`  [Layoff] recalibration: ${JSON.stringify(result.recalibration)}`)

      // Verify expectations: trained 14d → deload_mild, 0.92×, same week.
      const recal = result.recalibration
      if (recal) {
        const okAction = recal.action === 'deload_mild'
        const okMult = recal.load_multiplier === 0.92
        const okWeek = recal.effective_week_number === firstW4.week_number
        const noStrength = !/strength loss/i.test(recal.rationale)
        console.log(
          `  [Layoff] expectations: action=${okAction} mult=${okMult} sameWeek=${okWeek} noStrengthCopy=${noStrength}`,
        )
      } else {
        console.log('  [Layoff] BUG?: no recalibration returned')
      }

      // Resume normally for the rest of the block.
      for (let week = 4; week <= meso.length_weeks; week += 1) {
        const sessions = byWeek.get(week) ?? []
        for (const s of sessions) {
          const offsetDays = (week - 1) * 7 + s.ordinal + 7  // shifted by 1w gap
          const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
          const { exerciseTrace } = await runSession({
            userId,
            session: s,
            step: { rating: 'solid', reps: 'ceiling', overall_feel: 4 },
            completedAt,
          })
          for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
        }
      }
    }

    printSummary('5 Skipped Week (24mo build_muscle, 6wk, 14d gap)', tracker)
    expect(true).toBe(true)
  })

  // ---------------------------------------------------------------- 6
  it('SCENARIO 6 — Novice fast-tracking (every session easy/ceiling)', async () => {
    const userId = 'user-novice'
    const profile = mkProfile({ training_age_months: 1, primary_goal: 'build_muscle', primary_goals: ['build_muscle'] })
    const { meso, byWeek } = await buildBlock(profile, userId)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)

    for (let week = 1; week <= meso.length_weeks; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        const offsetDays = (week - 1) * 7 + s.ordinal
        const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step: { rating: 'easy', reps: 'ceiling', overall_feel: 5 },
          completedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
        const head = exerciseTrace[0]
        if (head) {
          console.log(`  W${week} S${s.ordinal} easy/ceiling: ${head.name} ${head.weight} (${head.from})`)
        }
      }
    }
    printSummary('6 Novice (1mo build_muscle, 6wk)', tracker)
    expect(true).toBe(true)
  })

  // ---------------------------------------------------------------- 7
  it('SCENARIO 7 — Strength block (lean_and_strong → 5wk meso, deload week 5)', async () => {
    const userId = 'user-strength'
    const profile = mkProfile({
      training_age_months: 24,
      primary_goal: 'lean_and_strong',
      primary_goals: ['lean_and_strong'],
    })
    const { meso, byWeek } = await buildBlock(profile, userId)
    console.log(`\n[Strength] meso length_weeks=${meso.length_weeks}`)

    const tracker = new StartEndTracker()
    const baseDate = new Date(2026, 0, 1)

    // Same "Steady" pattern as scenario 2.
    let i = 0
    for (let week = 1; week <= meso.length_weeks; week += 1) {
      const sessions = byWeek.get(week) ?? []
      for (const s of sessions) {
        const slot = i % 10
        let step: ScenarioStep
        if (slot < 6) step = { rating: 'easy', reps: 'ceiling', overall_feel: 4 }
        else if (slot < 9) step = { rating: 'solid', reps: 'floor', overall_feel: 4 }
        else step = { rating: 'tough', reps: 'ceiling', overall_feel: 3 }
        i += 1

        const offsetDays = (week - 1) * 7 + s.ordinal
        const completedAt = new Date(baseDate.getTime() + offsetDays * 86400000).toISOString()
        const { exerciseTrace } = await runSession({
          userId,
          session: s,
          step,
          completedAt,
        })
        for (const t of exerciseTrace) tracker.observe(t.library_id, t.name, t.weight)
      }
    }

    // Verify week 5 deload structural shape:
    // - sets ≤ 50% of week 4 (volume cut)
    // - RIR same as work weeks (NOT +1)
    const w4 = byWeek.get(4) ?? []
    const w5 = byWeek.get(5) ?? []
    if (w4.length > 0 && w5.length > 0) {
      const w4Main = w4[0]!.exercises[0]!
      const w5Main = w5[0]!.exercises[0]!
      console.log(
        `\n[Strength] deload check W4 ${w4Main.name}: sets=${w4Main.sets} rir=${w4Main.rir}; W5 sets=${w5Main.sets} rir=${w5Main.rir}`,
      )
      const setsCutOk = w5Main.sets <= Math.ceil(w4Main.sets * 0.5)
      const rirSameOk = w5Main.rir === w4Main.rir
      console.log(`[Strength] setsCutOk=${setsCutOk} rirSameOk=${rirSameOk}`)
    }

    printSummary('7 Strength block (24mo lean_and_strong, 5wk)', tracker)
    expect(meso.length_weeks).toBe(5)
  })
})
