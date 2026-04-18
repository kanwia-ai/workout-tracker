// Drift-guard: the edge function schema mirror (supabase/functions/generate/schemas.ts)
// hand-duplicates the enum arrays that appear in src/types/plan.ts and
// src/types/profile.ts because Deno edge code can't cleanly import from src/.
// This test parses the edge file as text and asserts the mirrored arrays
// match the Zod enum options exactly — catches renames, reorderings, and
// additions the moment they happen.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MuscleGroup, SessionStatus } from './plan'

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
})
