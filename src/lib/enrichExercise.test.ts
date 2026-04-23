import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enrichExercise } from './enrichExercise'
import * as generate from './generate'
import type { AnalyzedExercise } from './gemini'

// callEdge is mocked — no real network calls leave the test suite. The shape
// assertions verify that enrichExercise passes the Gemini-analysis payload
// through intact and validates the response with its Zod schema.

const sampleExercise: AnalyzedExercise = {
  name: 'Bulgarian Split Squat',
  primary_muscles: ['quads', 'glutes'],
  secondary_muscles: ['core'],
  equipment: ['dumbbell', 'bench'],
  movement_pattern: 'squat',
  form_cues: ['drive through the front heel'],
  injury_flags: ['unilateral_loaded', 'loaded_knee_flexion_deep'],
  confidence: 'high',
  source_url: 'https://youtu.be/abc',
}

const validEnrichment = {
  compatible_protocols: ['hip_flexors', 'meniscus'],
  contraindicated_protocols: [],
  progression: {
    name: 'Barbell Back Squat',
    why: 'bilateral load with heavier absolute weight',
  },
  regression: {
    name: 'Goblet Split Squat',
    why: 'lower load and less balance demand',
  },
  rationale: 'Good fit for knee rehab at mid-stage — unilateral loading trains quad strength without maximum axial load.',
}

describe('enrichExercise', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('forwards exercise + profile to callEdge as enrich_exercise payload', async () => {
    const spy = vi.spyOn(generate, 'callEdge').mockResolvedValue(validEnrichment as never)

    await enrichExercise(sampleExercise, {
      injuries: ['left_meniscus'],
      goal: 'athletic',
    })

    expect(spy).toHaveBeenCalledOnce()
    const [op, payload] = spy.mock.calls[0]
    expect(op).toBe('enrich_exercise')
    const p = payload as { exercise: AnalyzedExercise; profile: { injuries: string[] } | null }
    expect(p.exercise.name).toBe('Bulgarian Split Squat')
    expect(p.profile?.injuries).toEqual(['left_meniscus'])
  })

  it('passes null profile when context is omitted', async () => {
    const spy = vi.spyOn(generate, 'callEdge').mockResolvedValue(validEnrichment as never)
    await enrichExercise(sampleExercise)
    const [, payload] = spy.mock.calls[0]
    expect((payload as { profile: unknown }).profile).toBeNull()
  })

  it('returns the enrichment object when the schema matches', async () => {
    vi.spyOn(generate, 'callEdge').mockResolvedValue(validEnrichment as never)
    const result = await enrichExercise(sampleExercise)
    expect(result.compatible_protocols).toEqual(['hip_flexors', 'meniscus'])
    expect(result.progression.name).toBe('Barbell Back Squat')
    expect(result.rationale).toMatch(/knee rehab/)
  })

  it('propagates callEdge errors (e.g. unknown op while not deployed)', async () => {
    vi.spyOn(generate, 'callEdge').mockRejectedValue(new Error('edge enrich_exercise failed: 400 unknown op'))
    await expect(enrichExercise(sampleExercise)).rejects.toThrow(/unknown op/)
  })
})
