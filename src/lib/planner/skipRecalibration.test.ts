import { describe, it, expect } from 'vitest'
import {
  computeRecalibration,
  computeGapFromLogs,
  daysBetween,
  RecalibrationResultSchema,
  type CompletedSessionRef,
} from './skipRecalibration'

describe('computeRecalibration — gap ranges', () => {
  it('gap 0 days → slide, load unchanged', () => {
    const r = computeRecalibration(0, 3, 24)
    expect(r.action).toBe('slide')
    expect(r.load_multiplier).toBe(1.0)
    expect(r.effective_week_number).toBe(3)
    expect(r.rep_scheme_override).toBeNull()
  })

  it('gap 3 days → still slide (upper bound of range)', () => {
    const r = computeRecalibration(3, 4, 24)
    expect(r.action).toBe('slide')
    expect(r.load_multiplier).toBe(1.0)
    expect(r.effective_week_number).toBe(4)
  })

  it('gap 4 days → deload_mild at 0.9', () => {
    const r = computeRecalibration(4, 3, 24)
    expect(r.action).toBe('deload_mild')
    expect(r.load_multiplier).toBe(0.9)
    expect(r.effective_week_number).toBe(3)
    expect(r.rationale).toContain('4 days')
    expect(r.rationale).toContain('90%')
  })

  it('gap 7 days → still deload_mild (upper bound of range)', () => {
    const r = computeRecalibration(7, 5, 24)
    expect(r.action).toBe('deload_mild')
    expect(r.load_multiplier).toBe(0.9)
    expect(r.effective_week_number).toBe(5)
  })

  it('gap 8 days → step_back_one_week, effective_week = orig - 1', () => {
    const r = computeRecalibration(8, 4, 24)
    expect(r.action).toBe('step_back_one_week')
    expect(r.load_multiplier).toBe(0.85)
    expect(r.effective_week_number).toBe(3)
  })

  it('gap 14 days → still step_back_one_week (upper bound of range)', () => {
    const r = computeRecalibration(14, 5, 24)
    expect(r.action).toBe('step_back_one_week')
    expect(r.effective_week_number).toBe(4)
  })

  it('gap 15 days (trained lifter, ≥12 months) → step_back_two_weeks', () => {
    const r = computeRecalibration(15, 5, 24)
    expect(r.action).toBe('step_back_two_weeks')
    expect(r.load_multiplier).toBe(0.8)
    expect(r.effective_week_number).toBe(3)
  })

  it('gap 30 days (trained lifter, ≥12 months) → step_back_two_weeks', () => {
    const r = computeRecalibration(30, 6, 60)
    expect(r.action).toBe('step_back_two_weeks')
    expect(r.effective_week_number).toBe(4)
  })
})

describe('computeRecalibration — training age branching at 14+ gap', () => {
  it('novice (<12 months) → reset, effective_week=1, rep override [8,12]', () => {
    const r = computeRecalibration(21, 4, 6)
    expect(r.action).toBe('reset')
    expect(r.load_multiplier).toBe(0.7)
    expect(r.effective_week_number).toBe(1)
    expect(r.rep_scheme_override).toEqual([8, 12])
  })

  it('boundary: exactly 12 months training age → NOT novice, step_back_two', () => {
    const r = computeRecalibration(21, 4, 12)
    expect(r.action).toBe('step_back_two_weeks')
  })

  it('0 months training age (brand new) → reset on long gap', () => {
    const r = computeRecalibration(21, 4, 0)
    expect(r.action).toBe('reset')
    expect(r.effective_week_number).toBe(1)
  })
})

describe('computeRecalibration — effective_week_number clamping', () => {
  it('step_back_one_week clamps to 1 when originalWeek=1', () => {
    const r = computeRecalibration(10, 1, 24)
    expect(r.action).toBe('step_back_one_week')
    expect(r.effective_week_number).toBe(1)
  })

  it('step_back_two_weeks clamps to 1 when originalWeek=1', () => {
    const r = computeRecalibration(20, 1, 24)
    expect(r.action).toBe('step_back_two_weeks')
    expect(r.effective_week_number).toBe(1)
  })

  it('step_back_two_weeks clamps to 1 when originalWeek=2', () => {
    const r = computeRecalibration(20, 2, 24)
    expect(r.action).toBe('step_back_two_weeks')
    expect(r.effective_week_number).toBe(1)
  })

  it('reset always returns effective_week=1 regardless of original', () => {
    const r = computeRecalibration(30, 6, 3)
    expect(r.action).toBe('reset')
    expect(r.effective_week_number).toBe(1)
  })

  it('never returns effective_week_number below 1 under any combination', () => {
    for (const gap of [0, 3, 4, 7, 8, 14, 15, 30, 90]) {
      for (const origWeek of [1, 2, 3, 4, 5, 6]) {
        for (const age of [0, 6, 11, 12, 24, 120]) {
          const r = computeRecalibration(gap, origWeek, age)
          expect(r.effective_week_number).toBeGreaterThanOrEqual(1)
        }
      }
    }
  })
})

describe('computeRecalibration — defensive input handling', () => {
  it('negative gap behaves like gap=0 (slide)', () => {
    const r = computeRecalibration(-5, 3, 24)
    expect(r.action).toBe('slide')
    expect(r.effective_week_number).toBe(3)
  })

  it('fractional gap floors down (3.9 → 3 → slide)', () => {
    const r = computeRecalibration(3.9, 3, 24)
    expect(r.action).toBe('slide')
  })

  it('fractional gap at 4.1 → floors to 4 → deload_mild', () => {
    const r = computeRecalibration(4.1, 3, 24)
    expect(r.action).toBe('deload_mild')
  })

  it('originalWeek=0 coerces to 1 (no sub-1 week)', () => {
    const r = computeRecalibration(0, 0, 24)
    expect(r.effective_week_number).toBe(1)
  })

  it('negative training age treated as 0', () => {
    const r = computeRecalibration(20, 3, -5)
    expect(r.action).toBe('reset')
  })

  it('Zod schema accepts every produced result', () => {
    for (const gap of [0, 4, 10, 20]) {
      for (const age of [3, 24]) {
        const r = computeRecalibration(gap, 3, age)
        expect(() => RecalibrationResultSchema.parse(r)).not.toThrow()
      }
    }
  })
})

describe('daysBetween', () => {
  it('returns 0 for same local day', () => {
    const a = new Date(2026, 3, 22, 8, 0, 0)
    const b = new Date(2026, 3, 22, 22, 0, 0)
    expect(daysBetween(a, b)).toBe(0)
  })

  it('returns 1 for consecutive local days (ignoring time-of-day)', () => {
    const a = new Date(2026, 3, 21, 22, 0, 0)
    const b = new Date(2026, 3, 22, 6, 0, 0)
    expect(daysBetween(a, b)).toBe(1)
  })

  it('returns 7 for one week apart', () => {
    const a = new Date(2026, 3, 15)
    const b = new Date(2026, 3, 22)
    expect(daysBetween(a, b)).toBe(7)
  })
})

describe('computeGapFromLogs', () => {
  const userId = 'user-1'
  const asOf = new Date(2026, 3, 22, 12, 0, 0)

  it('returns null when no logs for user', () => {
    expect(computeGapFromLogs([], userId, asOf)).toBeNull()
  })

  it('returns null when logs exist but none match user_id', () => {
    const logs: CompletedSessionRef[] = [
      { user_id: 'someone-else', ended_at: new Date(2026, 3, 20).toISOString() },
    ]
    expect(computeGapFromLogs(logs, userId, asOf)).toBeNull()
  })

  it('picks the most recent ended_at', () => {
    const logs: CompletedSessionRef[] = [
      { user_id: userId, ended_at: new Date(2026, 3, 10, 12).toISOString() },
      { user_id: userId, ended_at: new Date(2026, 3, 18, 12).toISOString() },
      { user_id: userId, ended_at: new Date(2026, 3, 14, 12).toISOString() },
    ]
    expect(computeGapFromLogs(logs, userId, asOf)).toBe(4)
  })

  it('falls back to date when ended_at missing', () => {
    const logs: CompletedSessionRef[] = [
      { user_id: userId, date: '2026-04-15' },
    ]
    expect(computeGapFromLogs(logs, userId, asOf)).toBe(7)
  })
})
