import { describe, it, expect } from 'vitest'
import {
  MOBILITY_SECTIONS,
  dayOfYearLocal,
  pickRoutineForDay,
} from './mobility-routines'

describe('MOBILITY_SECTIONS', () => {
  it('every section has at least 3 routines', () => {
    for (const section of MOBILITY_SECTIONS) {
      expect(section.routines.length, `section ${section.id}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('every routine has at least 4 and at most 7 exercise blocks', () => {
    for (const section of MOBILITY_SECTIONS) {
      for (const routine of section.routines) {
        const label = `${section.id}/${routine.id}`
        expect(routine.exercises.length, label).toBeGreaterThanOrEqual(4)
        expect(routine.exercises.length, label).toBeLessThanOrEqual(7)
      }
    }
  })

  it('routine ids are unique within a section', () => {
    for (const section of MOBILITY_SECTIONS) {
      const ids = section.routines.map(r => r.id)
      expect(new Set(ids).size, `section ${section.id}`).toBe(ids.length)
    }
  })

  it('every routine declares minutes in the 5-20 range', () => {
    for (const section of MOBILITY_SECTIONS) {
      for (const routine of section.routines) {
        expect(routine.minutes, `${section.id}/${routine.id}`).toBeGreaterThanOrEqual(5)
        expect(routine.minutes, `${section.id}/${routine.id}`).toBeLessThanOrEqual(20)
      }
    }
  })
})

describe('dayOfYearLocal', () => {
  it('returns 0 for Jan 1', () => {
    expect(dayOfYearLocal(new Date(2026, 0, 1))).toBe(0)
  })

  it('returns 31 for Feb 1 of a common year', () => {
    expect(dayOfYearLocal(new Date(2026, 1, 1))).toBe(31)
  })

  it('handles leap years (Dec 31, 2024 is day 365)', () => {
    expect(dayOfYearLocal(new Date(2024, 11, 31))).toBe(365)
  })
})

describe('pickRoutineForDay', () => {
  const section = MOBILITY_SECTIONS[0]

  it('returns a valid routine for day 0 of the year', () => {
    const routine = pickRoutineForDay(section, new Date(2026, 0, 1))
    expect(section.routines).toContain(routine)
  })

  it('returns a valid routine for a day past 365 (leap year Dec 31)', () => {
    const routine = pickRoutineForDay(section, new Date(2024, 11, 31))
    expect(section.routines).toContain(routine)
  })

  it('is deterministic for the same date', () => {
    const date = new Date(2026, 3, 23)
    const a = pickRoutineForDay(section, date)
    const b = pickRoutineForDay(section, date)
    expect(a.id).toBe(b.id)
  })

  it('produces different routines on different days when the pool has >1 entry', () => {
    for (const s of MOBILITY_SECTIONS) {
      if (s.routines.length <= 1) continue
      const seen = new Set<string>()
      // Walk through one full cycle of the pool.
      for (let d = 0; d < s.routines.length; d++) {
        const date = new Date(2026, 0, 1 + d)
        seen.add(pickRoutineForDay(s, date).id)
      }
      expect(seen.size, `section ${s.id} cycled over ${s.routines.length} days`).toBe(
        s.routines.length
      )
    }
  })

  it('two consecutive days return different routines when pool size > 1', () => {
    for (const s of MOBILITY_SECTIONS) {
      if (s.routines.length <= 1) continue
      const day1 = pickRoutineForDay(s, new Date(2026, 0, 1))
      const day2 = pickRoutineForDay(s, new Date(2026, 0, 2))
      expect(day1.id, `section ${s.id}`).not.toBe(day2.id)
    }
  })
})
