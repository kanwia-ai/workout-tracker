// Drift-guard: the edge function schema mirror (supabase/functions/generate/schemas.ts)
// hand-duplicates the enum arrays that appear in src/types/plan.ts and
// src/types/profile.ts because Deno edge code can't cleanly import from src/.
// This test parses the edge file as text and asserts the mirrored arrays
// match the Zod enum options exactly — catches renames, reorderings, and
// additions the moment they happen.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MuscleGroup, SessionStatus, PlannedExerciseSchema, PlannedSessionSchema } from './plan'

const EDGE_SCHEMAS_PATH = resolve(
  import.meta.dirname ?? process.cwd(),
  '..',
  '..',
  'supabase/functions/generate/schemas.ts',
)

function extractEnumArray(source: string, constName: string): string[] {
  // Matches: `const <constName> = [ ... ] as const` (multi-line).
  const re = new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*\\[([^\\]]+)\\]`, 's')
  const match = source.match(re)
  if (!match) throw new Error(`Could not find const ${constName} in edge schemas.ts`)
  const inner = match[1]
  return inner
    .split(',')
    .map(s => s.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean)
}

describe('edge schema enum drift guard', () => {
  const source = readFileSync(EDGE_SCHEMAS_PATH, 'utf-8')

  it('MUSCLE_GROUP_ENUM matches MuscleGroup.options', () => {
    const edge = extractEnumArray(source, 'MUSCLE_GROUP_ENUM')
    expect(edge).toEqual(MuscleGroup.options)
  })

  it('SESSION_STATUS_ENUM matches SessionStatus.options', () => {
    const edge = extractEnumArray(source, 'SESSION_STATUS_ENUM')
    expect(edge).toEqual(SessionStatus.options)
  })

  it('plannedExerciseSchema property set matches PlannedExerciseSchema keys', () => {
    // The edge schema is shared by generate_plan and swap_exercise ops — any
    // field rename on the Zod side must land on the edge side too or both
    // ops will silently drift. Parse the property-names list from the edge
    // schema's `propertyOrdering` (which, by convention, includes every
    // property) and assert equality with the Zod shape's keys.
    const match = source.match(/plannedExerciseSchema\s*=\s*\{[\s\S]*?propertyOrdering:\s*\[([^\]]+)\]/)
    if (!match) throw new Error('could not locate plannedExerciseSchema propertyOrdering')
    const edgeKeys = match[1]
      .split(',')
      .map(s => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean)
      .sort()
    const zodKeys = Object.keys(PlannedExerciseSchema.shape).sort()
    expect(edgeKeys).toEqual(zodKeys)
  })

  it('plannedSessionSchema property set matches PlannedSessionSchema keys', () => {
    // Same drift-guard pattern as plannedExerciseSchema above. The session
    // schema is nested inside mesocycleSchema and consumed by generate_plan
    // — if a field is added to the Zod PlannedSessionSchema without a
    // matching edge-side entry, Gemini silently omits it.
    const match = source.match(/plannedSessionSchema\s*=\s*\{[\s\S]*?propertyOrdering:\s*\[([^\]]+)\]/)
    if (!match) throw new Error('could not locate plannedSessionSchema propertyOrdering')
    const edgeKeys = match[1]
      .split(',')
      .map(s => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean)
      .sort()
    const zodKeys = Object.keys(PlannedSessionSchema.shape).sort()
    expect(edgeKeys).toEqual(zodKeys)
  })
})
