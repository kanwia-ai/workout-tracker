import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKOUTS } from '../data/workouts'
import { DEFAULT_SCHEDULE } from '../data/schedule'

describe('Workout Data', () => {
  it('has 5 workouts', () => {
    expect(DEFAULT_WORKOUTS).toHaveLength(5)
  })

  it('every workout has at least one section with exercises', () => {
    for (const w of DEFAULT_WORKOUTS) {
      expect(w.sections.length).toBeGreaterThan(0)
      for (const s of w.sections) {
        expect(s.exercises.length).toBeGreaterThan(0)
      }
    }
  })

  it('schedule has 7 days', () => {
    expect(DEFAULT_SCHEDULE).toHaveLength(7)
  })

  it('schedule workout IDs match actual workouts', () => {
    const workoutIds = new Set(DEFAULT_WORKOUTS.map(w => w.id))
    for (const day of DEFAULT_SCHEDULE) {
      if (day.workout_id) {
        expect(workoutIds.has(day.workout_id)).toBe(true)
      }
    }
  })

  it('all exercises have valid rest_seconds', () => {
    for (const w of DEFAULT_WORKOUTS) {
      for (const s of w.sections) {
        for (const e of s.exercises) {
          expect(e.rest_seconds).toBeGreaterThanOrEqual(0)
          expect(e.sets).toBeGreaterThan(0)
        }
      }
    }
  })
})
