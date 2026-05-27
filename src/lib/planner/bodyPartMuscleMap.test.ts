import { describe, it, expect } from 'vitest'
import { affectedMuscleGroupsFor, exerciseIsAffected } from './bodyPartMuscleMap'

describe('bodyPartMuscleMap', () => {
  describe('affectedMuscleGroupsFor', () => {
    it('returns empty set for empty input', () => {
      expect(affectedMuscleGroupsFor([])).toEqual(new Set())
    })

    it('left meniscus → quads, hamstrings, glutes, calves', () => {
      const result = affectedMuscleGroupsFor(['left_meniscus'])
      expect(result.has('quads')).toBe(true)
      expect(result.has('hamstrings')).toBe(true)
      expect(result.has('glutes')).toBe(true)
      expect(result.has('calves')).toBe(true)
      // Doesn't flag upper body
      expect(result.has('chest')).toBe(false)
      expect(result.has('back')).toBe(false)
    })

    it('lower_back flags both lower body AND back/shoulders (axial loading)', () => {
      const result = affectedMuscleGroupsFor(['lower_back'])
      expect(result.has('back')).toBe(true)
      expect(result.has('hamstrings')).toBe(true)
      expect(result.has('shoulders')).toBe(true) // overhead pressing compresses spine
      expect(result.has('biceps')).toBe(false)
    })

    it('upper_back flags pulling + pressing + overhead muscles', () => {
      const result = affectedMuscleGroupsFor(['upper_back'])
      expect(result.has('back')).toBe(true)
      expect(result.has('shoulders')).toBe(true)
      expect(result.has('biceps')).toBe(true)
      expect(result.has('triceps')).toBe(true)
      // doesn't trigger lower-body exercises
      expect(result.has('quads')).toBe(false)
    })

    it('shoulder flags all pressing + pulling + ohp work', () => {
      const result = affectedMuscleGroupsFor(['right_shoulder'])
      expect(result.has('chest')).toBe(true)
      expect(result.has('shoulders')).toBe(true)
      expect(result.has('back')).toBe(true)
      expect(result.has('triceps')).toBe(true)
    })

    it('multiple parts compose into a union', () => {
      const result = affectedMuscleGroupsFor(['left_meniscus', 'right_shoulder'])
      // From meniscus
      expect(result.has('quads')).toBe(true)
      // From shoulder
      expect(result.has('chest')).toBe(true)
      expect(result.has('shoulders')).toBe(true)
    })

    it("'other' is a free-text catch — returns empty (resolver can't infer)", () => {
      expect(affectedMuscleGroupsFor(['other'])).toEqual(new Set())
    })

    it('deduplicates muscle groups when multiple parts hit the same muscle', () => {
      // Both meniscus parts flag the same lower-body muscles
      const result = affectedMuscleGroupsFor(['left_meniscus', 'right_meniscus'])
      // Set semantics — each muscle appears at most once
      expect(Array.from(result).length).toBe(4) // quads, hamstrings, glutes, calves
    })
  })

  describe('exerciseIsAffected', () => {
    it('returns false when affected set is empty', () => {
      expect(exerciseIsAffected(['quads'], [], new Set())).toBe(false)
    })

    it('flags exercise when primary muscle is in affected set', () => {
      const affected = affectedMuscleGroupsFor(['left_knee'])
      expect(exerciseIsAffected(['quads'], [], affected)).toBe(true)
    })

    it('flags exercise when secondary muscle is in affected set', () => {
      const affected = affectedMuscleGroupsFor(['lower_back'])
      // chest-press primarily hits chest; secondary muscles include shoulders
      // (which lower_back also flags via spinal compression).
      expect(exerciseIsAffected(['chest'], ['shoulders'], affected)).toBe(true)
    })

    it('does NOT flag exercise when no muscle intersects', () => {
      const affected = affectedMuscleGroupsFor(['left_knee'])
      // biceps curl — primary biceps, secondary none — knee resolver doesn't flag it
      expect(exerciseIsAffected(['biceps'], undefined, affected)).toBe(false)
    })

    it('handles undefined secondary_muscles', () => {
      const affected = affectedMuscleGroupsFor(['lower_back'])
      expect(exerciseIsAffected(['back'], undefined, affected)).toBe(true)
    })
  })

  describe('research-honest verifications', () => {
    it('chronic LBP user gets back, hinge, and overhead pressing flagged together', () => {
      const affected = affectedMuscleGroupsFor(['lower_back'])
      // Deadlift/RDL primary = hamstrings/glutes
      expect(exerciseIsAffected(['hamstrings', 'glutes'], ['back'], affected)).toBe(true)
      // Bent-over row primary = back
      expect(exerciseIsAffected(['back'], ['biceps'], affected)).toBe(true)
      // OHP primary = shoulders (spinal compression)
      expect(exerciseIsAffected(['shoulders'], ['triceps'], affected)).toBe(true)
    })

    it('knee-off user gets squats but not lat pulldown', () => {
      const affected = affectedMuscleGroupsFor(['left_knee'])
      // Squat primary = quads
      expect(exerciseIsAffected(['quads'], ['glutes', 'hamstrings'], affected)).toBe(true)
      // Lat pulldown primary = back
      expect(exerciseIsAffected(['back'], ['biceps'], affected)).toBe(false)
    })
  })
})
