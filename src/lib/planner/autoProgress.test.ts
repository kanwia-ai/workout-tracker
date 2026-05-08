import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { computeNextWeight, computeAutoProgressionForSession } from './autoProgress'
import { db } from '../db'
import type { PlannedExercise } from '../../types/plan'
import type { ExerciseCheckin, SessionCheckin } from '../../types/checkin'

// ─── Fixtures ──────────────────────────────────────────────────────────────

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
    used_weight_lb: 100,
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

// Convenience: drop a SessionCheckin straight into Dexie the way the
// production saver does (JSON-encoded payload).
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

// ─── computeNextWeight (pure) ──────────────────────────────────────────────

describe('computeNextWeight — non-progressing roles', () => {
  const history = [mkCheckin({ rating: 'easy', used_weight_lb: 100 })]

  it('returns null for role: core', () => {
    const ex = mkExercise({ role: 'core' })
    expect(computeNextWeight({ exercise: ex, history })).toBeNull()
  })

  it('returns null for role: rehab', () => {
    const ex = mkExercise({ role: 'rehab' })
    expect(computeNextWeight({ exercise: ex, history })).toBeNull()
  })

  it('returns null for role: mobility', () => {
    const ex = mkExercise({ role: 'mobility' })
    expect(computeNextWeight({ exercise: ex, history })).toBeNull()
  })
})

describe('computeNextWeight — empty / unusable history', () => {
  it('returns null when history is empty', () => {
    const ex = mkExercise()
    expect(computeNextWeight({ exercise: ex, history: [] })).toBeNull()
  })

  it('returns null when planner gave suggested_weight_lbs but user did not log a weight', () => {
    // The exercise IS weighted (planner emitted a suggestion), the user
    // just skipped entering the load. We don't have a basis to bump *from*
    // — return null and let the planner's static suggestion stand. Note:
    // when BOTH suggested_weight_lbs and used_weight_lb are absent, the
    // exercise is treated as bodyweight (rep-target progression) — see
    // the bodyweight describe block for that path.
    const ex = mkExercise({ suggested_weight_lbs: 100 })
    const history = [mkCheckin({ used_weight_lb: undefined })]
    expect(computeNextWeight({ exercise: ex, history })).toBeNull()
  })

  it('returns null when most recent checkin used_weight_lb is 0', () => {
    const ex = mkExercise({ suggested_weight_lbs: 100 })
    const history = [mkCheckin({ used_weight_lb: 0 })]
    expect(computeNextWeight({ exercise: ex, history })).toBeNull()
  })
})

describe('computeNextWeight — bumps on easy + reps met', () => {
  it("'easy' + reps met bumps +5 for main lift", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 135, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 140 })
  })

  it("'easy' + reps met bumps +2.5 for accessory", () => {
    const ex = mkExercise({ role: 'accessory' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 52.5 })
  })

  it("'easy' + reps met bumps +2.5 for isolation", () => {
    const ex = mkExercise({ role: 'isolation' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 25, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 27.5 })
  })
})

describe('computeNextWeight — bumps on solid + reps met', () => {
  // [10,10,10] cleared the floor of "8-12" but not the ceiling (12), so under
  // the double-progression gate (audit §1) this gets a HALF bump instead of
  // the full +5 it used to. Half of 5 floors to 2.5 → 185 + 2.5 = 187.5.
  it("'solid' + only floor met bumps +2.5 (half) for main lift", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 185, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 187.5 })
  })

  it("'solid' + reps met bumps +2.5 for accessory", () => {
    const ex = mkExercise({ role: 'accessory' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 60, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 62.5 })
  })

  it("'solid' + reps met bumps +2.5 for isolation", () => {
    const ex = mkExercise({ role: 'isolation' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 15, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 17.5 })
  })
})

describe('computeNextWeight — holds', () => {
  it("'tough' + reps met holds at last weight", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [mkCheckin({ rating: 'tough', used_weight_lb: 155, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 155 })
  })

  it("'failed' rating with only one strike holds", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 200, reps_done: [10, 10, 10] }),
      // Prior session was fine — only one consecutive miss.
      mkCheckin({ rating: 'solid', used_weight_lb: 195, reps_done: [10, 10, 10] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 200 })
  })

  it('reps_done shorter than planned sets (2 of 3) holds first time', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      // User logged only 2 of 3 sets, but rated solid — treated as miss → hold.
      mkCheckin({ rating: 'solid', used_weight_lb: 145, reps_done: [10, 10] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 145 })
  })

  it('reps_done value below the rep floor holds first time', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      // Rated solid but final set fell below the floor of 8 — counted as miss.
      mkCheckin({ rating: 'solid', used_weight_lb: 165, reps_done: [8, 8, 5] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 165 })
  })
})

describe('computeNextWeight — empty reps_done is treated as complete', () => {
  it("'easy' + empty reps_done still bumps", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 95, reps_done: [] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 100 })
  })

  it("'easy' + missing reps_done still bumps", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 95, reps_done: undefined })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 100 })
  })
})

describe('computeNextWeight — drops on two-strike failures', () => {
  it("'failed' two checkins in a row drops ~10% rounded to bump increment", () => {
    const ex = mkExercise({ role: 'main lift' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 200 }),
      mkCheckin({ rating: 'failed', used_weight_lb: 200 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    // 200 * 0.9 = 180; rounded to nearest 5 = 180; min(180, 200-5) = 180.
    expect(result?.action).toBe('drop')
    expect(result?.weight).toBe(180)
    // Always strictly below the last weight.
    expect(result!.weight).toBeLessThan(200)
  })

  it('two missed-rep sessions also trigger a drop (no failed rating needed)', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'solid', used_weight_lb: 150, reps_done: [8, 8, 5] }),
      mkCheckin({ rating: 'solid', used_weight_lb: 150, reps_done: [8, 8, 5] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
    expect(result!.weight).toBeLessThan(150)
  })

  it('drop never returns negative or below the bump increment (sanity floor)', () => {
    const ex = mkExercise({ role: 'main lift' }) // bump = 5
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 5 }),
      mkCheckin({ rating: 'failed', used_weight_lb: 5 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
    expect(result!.weight).toBeGreaterThanOrEqual(5)
  })

  it('drop floor for tiny accessory weights stays at bump increment', () => {
    const ex = mkExercise({ role: 'isolation' }) // bump = 2.5
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 2.5 }),
      mkCheckin({ rating: 'failed', used_weight_lb: 2.5 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
    expect(result!.weight).toBeGreaterThanOrEqual(2.5)
  })
})

// ─── Double-progression rep-ceiling gate (audit §1, recs 1+3) ──────────────

describe('computeNextWeight — double-progression ceiling gate', () => {
  it('easy + ceiling met (8-12 with [12,12,12]) → full bump', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 100, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })

  it('solid + ceiling met (8-12 with [12,12,12]) → full bump', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 100, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })

  it('easy + only floor met (8-12 with [10,10,10]) → half bump', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 100, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    // Half of +5 floors to +2.5 (the smallest realistic plate increment).
    expect(result).toMatchObject({ action: 'bump', weight: 102.5 })
  })

  it('solid + only floor met (8-12 with [8,8,8]) → half bump', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 100, reps_done: [8, 8, 8] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 102.5 })
  })

  it('tough + ceiling met (8-12 with [12,12,12]) → half bump (rewarded)', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'tough', used_weight_lb: 100, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 102.5 })
  })

  it('tough + only floor met (8-12 with [9,9,9]) → hold', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'tough', used_weight_lb: 100, reps_done: [9, 9, 9] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 100 })
  })

  it('single-rep target (10) — [10,10,10] is ceiling-met → full bump on solid', () => {
    // When prescribed reps is a single number ("10"), ceiling == floor;
    // hitting exactly 10 across all sets is full credit, not half.
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '10' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 100, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })

  it('treats ceiling as met when prior session logged MORE sets than now planned (post-deload)', () => {
    // Repro: post-deload session has plannedSets=2; prior work-week checkin
    // had reps_done=[12,12,12,12]. Ceiling 12, all 4 sets cleared → must be
    // considered ceiling-met → full bump. Strict !== treated len 4 vs sets 2
    // as "incomplete" and gave a half-bump on a clean week.
    const ex = mkExercise({ role: 'main lift', sets: 2, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'easy', used_weight_lb: 145, reps_done: [12, 12, 12, 12] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('bump')
    expect(result?.weight).toBe(150)
  })
})

// ─── Training-age-aware bumps (audit rec 2) ────────────────────────────────

describe('computeNextWeight — training-age-aware bumps', () => {
  it('novice (<3 mo) on main lift gets +10', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 100, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history, trainingAgeMonths: 1 })
    expect(result).toMatchObject({ action: 'bump', weight: 110 })
  })

  it('advanced (36+ mo) on main lift gets +2.5', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 100, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history, trainingAgeMonths: 48 })
    expect(result).toMatchObject({ action: 'bump', weight: 102.5 })
  })

  it('unknown / undefined training age falls back to +5 main lift (intermediate column)', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 100, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })

  it('novice (<3 mo) on accessory gets +5', () => {
    const ex = mkExercise({ role: 'accessory', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history, trainingAgeMonths: 1 })
    expect(result).toMatchObject({ action: 'bump', weight: 55 })
  })

  it('intermediate accessory (12-36 mo) gets +2.5 — preserves prior default', () => {
    const ex = mkExercise({ role: 'accessory', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'easy', used_weight_lb: 50, reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history, trainingAgeMonths: 24 })
    expect(result).toMatchObject({ action: 'bump', weight: 52.5 })
  })

  it('novice main lift on half bump (only floor met) → +5 (half of +10)', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [mkCheckin({ rating: 'solid', used_weight_lb: 100, reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history, trainingAgeMonths: 1 })
    // Half of +10 = +5 (rounded to 2.5 increment).
    expect(result).toMatchObject({ action: 'bump', weight: 105 })
  })
})

// ─── Two-strike same-load guard (audit rec 11) ─────────────────────────────

describe('computeNextWeight — two-strike same-load guard', () => {
  it('two failures at the same load → drop', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 200 }),
      mkCheckin({ rating: 'failed', used_weight_lb: 200 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
  })

  it('two failures at *different* loads (>1 bump apart) → hold (no phantom drop)', () => {
    // bump for main lift at undefined training age = 5. Difference of 20 lb
    // is well outside the ±1-bump same-load window, so this should hold,
    // NOT drop. Pre-rec-11 behavior would have dropped here.
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 200 }),
      mkCheckin({ rating: 'failed', used_weight_lb: 180 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 200 })
  })

  it('two failures within ±1 bump (200 vs 195) → still drop (counts as same load)', () => {
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 200 }),
      mkCheckin({ rating: 'failed', used_weight_lb: 195 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
  })

  // ─── Lookback window for prior same-load fails (audit follow-up) ─────────
  // On a 4-day split each main lift hits weekly. A user who fails at X, drops
  // back to Y < X, succeeds at Y, climbs to X again, and fails — has TWO
  // strikes at X but they're separated by an intervening successful session
  // at a lower load. history[1] alone misses this; we need to scan a bounded
  // lookback window for the most recent prior miss at the same load.

  it('two-strike fires across one intervening easy session at a lower load', () => {
    // newest first: failed-145, easy-140, failed-145.
    // The easy@140 was a recovery-load success; the prior fail@145 is 2
    // entries back. Scan must find it and DROP.
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
      mkCheckin({ rating: 'easy', used_weight_lb: 140, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
    expect(result!.weight).toBeLessThan(145)
  })

  it('single-strike: most recent prior at same load was easy → HOLD (not drop)', () => {
    // newest first: failed-145, easy-145, easy-140.
    // The most recent prior attempt at the same load (145) succeeded — this
    // is a one-time stumble at a known-good weight, not a real stall.
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
      mkCheckin({ rating: 'easy', used_weight_lb: 145, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'easy', used_weight_lb: 140, reps_done: [12, 12, 12] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 145 })
  })

  it('lookback edge: prior same-load fail 4 entries back still triggers drop', () => {
    // Window = 4: history[1..4]. With prior fail at history[4] (5th entry),
    // it sits at the edge of the inclusive lookback. Should DROP.
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
      mkCheckin({ rating: 'easy', used_weight_lb: 140, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'easy', used_weight_lb: 135, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'easy', used_weight_lb: 130, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result?.action).toBe('drop')
  })

  it('past lookback: prior same-load fail 5+ entries back does NOT drop', () => {
    // history[5] is outside the window of history[1..4] — must HOLD.
    const ex = mkExercise({ role: 'main lift', sets: 3, reps: '8-12' })
    const history = [
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
      mkCheckin({ rating: 'easy', used_weight_lb: 140, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'easy', used_weight_lb: 135, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'easy', used_weight_lb: 130, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'easy', used_weight_lb: 125, reps_done: [12, 12, 12] }),
      mkCheckin({ rating: 'failed', used_weight_lb: 145 }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', weight: 145 })
  })
})

// ─── Bodyweight rep-target progression (audit follow-up) ───────────────────

describe('computeNextWeight — bodyweight main lifts (rep-target progression)', () => {
  // Bodyweight = exercise has no `suggested_weight_lbs` AND most recent
  // checkin has no `used_weight_lb`. Pull-ups, dips, BW push-ups in main-
  // lift role should progress by adding REPS instead of being skipped.

  function mkBwExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
    return mkExercise({
      library_id: 'ex:pull-up',
      name: 'Pull-up',
      sets: 3,
      reps: '8-12',
      role: 'main lift',
      ...overrides,
    })
  }
  function mkBwCheckin(overrides: Partial<ExerciseCheckin> = {}): ExerciseCheckin {
    return mkCheckin({
      library_id: 'ex:pull-up',
      name: 'Pull-up',
      used_weight_lb: undefined,
      ...overrides,
    })
  }

  it("'easy' + ceiling met (12/12/12 of 8-12) → add-rep, rep_target=13, weight=0", () => {
    const ex = mkBwExercise()
    const history = [mkBwCheckin({ rating: 'easy', reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'add-rep', rep_target: 13, weight: 0 })
  })

  it("'solid' + ceiling met → add-rep, rep_target=13", () => {
    const ex = mkBwExercise()
    const history = [mkBwCheckin({ rating: 'solid', reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'add-rep', rep_target: 13, weight: 0 })
  })

  it("'solid' + only floor met (10/10/10 of 8-12) → hold, rep_target=12 (top of range)", () => {
    const ex = mkBwExercise()
    const history = [mkBwCheckin({ rating: 'solid', reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', rep_target: 12, weight: 0 })
  })

  it("'tough' + ceiling met → hold (no half-rep concept for bodyweight)", () => {
    const ex = mkBwExercise()
    const history = [mkBwCheckin({ rating: 'tough', reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', rep_target: 12, weight: 0 })
  })

  it("'tough' + only floor met → hold", () => {
    const ex = mkBwExercise()
    const history = [mkBwCheckin({ rating: 'tough', reps_done: [9, 9, 9] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', rep_target: 12, weight: 0 })
  })

  it("'failed' rating with one strike → hold at ceiling target", () => {
    const ex = mkBwExercise()
    const history = [
      mkBwCheckin({ rating: 'failed', reps_done: [10, 10, 5] }),
      // Prior session was a clean clear → only one consecutive strike.
      mkBwCheckin({ rating: 'solid', reps_done: [12, 12, 12] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'hold', rep_target: 12, weight: 0 })
  })

  it('two-strike: two failures in a row → drop, rep_target reset to floor (8)', () => {
    const ex = mkBwExercise()
    const history = [
      mkBwCheckin({ rating: 'failed', reps_done: [10, 10, 5] }),
      mkBwCheckin({ rating: 'failed', reps_done: [10, 9, 6] }),
    ]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'drop', rep_target: 8, weight: 0 })
  })

  it("role='rehab' bodyweight stretch with no weight → still null (excluded)", () => {
    const ex = mkBwExercise({ role: 'rehab' })
    const history = [mkBwCheckin({ rating: 'easy', reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toBeNull()
  })

  it("role='core' bodyweight with no weight → still null (excluded)", () => {
    const ex = mkBwExercise({ role: 'core' })
    const history = [mkBwCheckin({ rating: 'easy', reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toBeNull()
  })

  it("planner DID give suggested_weight (loaded exercise), but user didn't log weight → null (not bodyweight)", () => {
    // suggested_weight_lbs present means the planner thinks this IS a
    // weighted exercise. User just didn't log → preserve old null behavior
    // so we don't accidentally turn a weighted lift into a rep-progression.
    const ex = mkBwExercise({ suggested_weight_lbs: 100 })
    const history = [mkBwCheckin({ rating: 'easy', reps_done: [12, 12, 12] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toBeNull()
  })

  it('single-rep target (e.g. "10") + ceiling met → add-rep, rep_target=11', () => {
    // Double-progression beyond a single-rep prescription.
    const ex = mkBwExercise({ reps: '10' })
    const history = [mkBwCheckin({ rating: 'easy', reps_done: [10, 10, 10] })]
    const result = computeNextWeight({ exercise: ex, history })
    expect(result).toMatchObject({ action: 'add-rep', rep_target: 11, weight: 0 })
  })
})

// ─── computeAutoProgressionForSession (Dexie-backed) ───────────────────────

describe('computeAutoProgressionForSession', () => {
  beforeEach(async () => {
    await db.sessionCheckins.clear()
  })

  it('returns {} for empty exercises array', async () => {
    await seedCheckin(mkSessionCheckin())
    const out = await computeAutoProgressionForSession('user-1', null, [])
    expect(out).toEqual({})
  })

  it('returns {} for empty userId', async () => {
    await seedCheckin(mkSessionCheckin())
    const out = await computeAutoProgressionForSession('', null, [mkExercise()])
    expect(out).toEqual({})
  })

  it('returns recommendation keyed by library_id with one prior checkin', async () => {
    await seedCheckin(
      mkSessionCheckin({
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 135,
            reps_done: [12, 12, 12],
          }),
        ],
      }),
    )
    const out = await computeAutoProgressionForSession('user-1', null, [
      mkExercise({ library_id: 'ex:back-squat', role: 'main lift' }),
    ])
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 140 })
  })

  it('omits exercises with no recommendation (e.g. role: core)', async () => {
    await seedCheckin(
      mkSessionCheckin({
        exercises: [
          mkCheckin({
            library_id: 'ex:plank',
            name: 'Plank',
            rating: 'solid',
            used_weight_lb: undefined,
            reps_done: undefined,
          }),
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 135,
            reps_done: [12, 12, 12],
          }),
        ],
      }),
    )
    const out = await computeAutoProgressionForSession('user-1', null, [
      mkExercise({ library_id: 'ex:plank', name: 'Plank', role: 'core' }),
      mkExercise({ library_id: 'ex:back-squat', role: 'main lift' }),
    ])
    expect(out['ex:plank']).toBeUndefined()
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 140 })
  })

  it('excludeSessionId filters out the matching checkin', async () => {
    // Old session with the lift at 135 — should be the one that drives output.
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'old',
        completed_at: '2026-04-01T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 135,
            reps_done: [12, 12, 12],
          }),
        ],
      }),
    )
    // Current session (excluded) lifts at 200 — must NOT be used.
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'current',
        completed_at: '2026-04-15T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 200,
            reps_done: [12, 12, 12],
          }),
        ],
      }),
    )
    const out = await computeAutoProgressionForSession('user-1', 'current', [
      mkExercise({ library_id: 'ex:back-squat', role: 'main lift' }),
    ])
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 140 })
  })

  it('different session_id with same library_id is still used when not excluded', async () => {
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'sess-A',
        completed_at: '2026-04-10T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'solid',
            used_weight_lb: 185,
            reps_done: [10, 10, 10],
          }),
        ],
      }),
    )
    const out = await computeAutoProgressionForSession('user-1', 'some-other-session', [
      mkExercise({ library_id: 'ex:back-squat', role: 'main lift' }),
    ])
    // [10,10,10] cleared floor (8) but not ceiling (12) of "8-12" → half bump.
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 187.5 })
  })

  it('newest checkin drives the recommendation when multiple exist', async () => {
    // Older checkin: heavier weight — must be ignored.
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'older',
        completed_at: '2026-04-01T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 200,
            reps_done: [12, 12, 12],
          }),
        ],
      }),
    )
    // Newer checkin: lighter weight — should drive output.
    await seedCheckin(
      mkSessionCheckin({
        session_id: 'newer',
        completed_at: '2026-04-12T00:00:00.000Z',
        exercises: [
          mkCheckin({
            library_id: 'ex:back-squat',
            rating: 'easy',
            used_weight_lb: 100,
            reps_done: [12, 12, 12],
          }),
        ],
      }),
    )
    const out = await computeAutoProgressionForSession('user-1', null, [
      mkExercise({ library_id: 'ex:back-squat', role: 'main lift' }),
    ])
    expect(out['ex:back-squat']).toMatchObject({ action: 'bump', weight: 105 })
  })
})
