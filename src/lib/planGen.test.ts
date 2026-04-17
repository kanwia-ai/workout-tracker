import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { UserProgramProfile } from '../types/profile'
import type { Mesocycle } from '../types/plan'

// Mock `./generate` BEFORE importing planGen so the mocked `callEdge` is in play.
vi.mock('./generate', () => ({
  callEdge: vi.fn(),
}))

// Mock `./db` with an in-memory stand-in. Keeps the tests fast and isolated
// from the real Dexie / IndexedDB layer (which requires fake-indexeddb setup).
const libraryRows: Array<{
  id: string
  name: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  category: string | null
  level: string | null
  force: string | null
  mechanic: string | null
  instructions: string[]
  imageCount: number
  rawId: string
}> = []

const mesoStore = new Map<string, unknown>()

vi.mock('./db', () => ({
  db: {
    exerciseLibrary: {
      toArray: async () => libraryRows,
    },
    mesocycles: {
      put: vi.fn(async (row: { id: string } & Record<string, unknown>) => {
        mesoStore.set(row.id, row)
        return row.id
      }),
      get: async (id: string) => mesoStore.get(id),
    },
  },
}))

import { buildExercisePool, generatePlan } from './planGen'
import { callEdge } from './generate'

function makeLibraryRow(overrides: Partial<(typeof libraryRows)[number]> = {}) {
  return {
    id: overrides.id ?? 'fedb:test-exercise',
    name: overrides.name ?? 'Test Exercise',
    equipment: overrides.equipment ?? 'body only',
    primaryMuscles: overrides.primaryMuscles ?? ['glutes'],
    secondaryMuscles: overrides.secondaryMuscles ?? [],
    category: overrides.category ?? 'strength',
    level: overrides.level ?? 'beginner',
    force: overrides.force ?? null,
    mechanic: overrides.mechanic ?? null,
    instructions: overrides.instructions ?? [],
    imageCount: overrides.imageCount ?? 0,
    rawId: overrides.rawId ?? 'test-exercise',
  }
}

const baseProfile: UserProgramProfile = {
  goal: 'glutes',
  sessions_per_week: 4,
  training_age_months: 18,
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: 'desk worker',
}

function validPartialPlan(): Omit<Mesocycle, 'user_id' | 'generated_at' | 'profile_snapshot'> {
  return {
    id: 'meso-1',
    length_weeks: 6,
    sessions: [
      {
        id: 's-w1-o1',
        week_number: 1,
        ordinal: 1,
        focus: ['glutes'],
        title: 'Lower A',
        estimated_minutes: 55,
        status: 'upcoming',
        exercises: [
          {
            library_id: 'fedb:hip-thrust',
            name: 'Barbell Hip Thrust',
            sets: 3,
            reps: '8-12',
            rir: 2,
            rest_seconds: 120,
            role: 'main lift',
          },
        ],
      },
    ],
  }
}

beforeEach(() => {
  libraryRows.length = 0
  mesoStore.clear()
  vi.mocked(callEdge).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('buildExercisePool', () => {
  it('filters out non-bodyweight entries when user only has bodyweight_only', async () => {
    libraryRows.push(
      makeLibraryRow({ id: 'a', equipment: 'body only' }),
      makeLibraryRow({ id: 'b', equipment: 'barbell' }),
      makeLibraryRow({ id: 'c', equipment: 'bands' }),
      makeLibraryRow({ id: 'd', equipment: 'body only' }),
      makeLibraryRow({ id: 'e', equipment: 'dumbbell' }),
    )
    const pool = await buildExercisePool({ ...baseProfile, equipment: ['bodyweight_only'] })
    expect(pool.map(p => p.id).sort()).toEqual(['a', 'd'])
  })

  it('includes all entries when user has full_gym', async () => {
    libraryRows.push(
      makeLibraryRow({ id: 'a', equipment: 'body only' }),
      makeLibraryRow({ id: 'b', equipment: 'barbell' }),
      makeLibraryRow({ id: 'c', equipment: 'bands' }),
      makeLibraryRow({ id: 'd', equipment: 'kettlebells' }),
      makeLibraryRow({ id: 'e', equipment: 'dumbbell' }),
    )
    const pool = await buildExercisePool({ ...baseProfile, equipment: ['full_gym'] })
    expect(pool).toHaveLength(5)
  })

  it('caps the pool at 200 entries', async () => {
    for (let i = 0; i < 250; i++) {
      libraryRows.push(makeLibraryRow({ id: `e-${i}`, equipment: 'body only' }))
    }
    const pool = await buildExercisePool({ ...baseProfile, equipment: ['bodyweight_only'] })
    expect(pool).toHaveLength(200)
  })

  it('maps each entry to { id, name, primaryMuscles, equipment }', async () => {
    libraryRows.push(
      makeLibraryRow({
        id: 'fedb:hip-thrust',
        name: 'Barbell Hip Thrust',
        equipment: 'barbell',
        primaryMuscles: ['glutes'],
      }),
    )
    const pool = await buildExercisePool({ ...baseProfile, equipment: ['full_gym'] })
    expect(pool[0]).toEqual({
      id: 'fedb:hip-thrust',
      name: 'Barbell Hip Thrust',
      primaryMuscles: ['glutes'],
      equipment: 'barbell',
    })
  })
})

describe('generatePlan', () => {
  it('merges server fields and persists to Dexie on the happy path', async () => {
    libraryRows.push(makeLibraryRow({ id: 'a', equipment: 'barbell' }))
    vi.mocked(callEdge).mockResolvedValue(validPartialPlan())

    const before = Date.now()
    const meso = await generatePlan(baseProfile, 'user-123')
    const after = Date.now()

    expect(meso.id).toBe('meso-1')
    expect(meso.user_id).toBe('user-123')
    expect(meso.length_weeks).toBe(6)
    expect(meso.sessions).toHaveLength(1)
    expect(meso.profile_snapshot).toEqual(baseProfile)

    // generated_at is an ISO timestamp inside the window we just spanned
    const genAt = new Date(meso.generated_at).getTime()
    expect(genAt).toBeGreaterThanOrEqual(before)
    expect(genAt).toBeLessThanOrEqual(after + 1)

    // Stored in Dexie as the flat LocalMesocycle shape with JSON-stringified fields
    expect(mesoStore.size).toBe(1)
    const stored = mesoStore.get('meso-1') as Record<string, unknown>
    expect(stored.id).toBe('meso-1')
    expect(stored.user_id).toBe('user-123')
    expect(stored.length_weeks).toBe(6)
    expect(stored.synced).toBe(false)
    expect(typeof stored.sessions_json).toBe('string')
    expect(JSON.parse(stored.sessions_json as string)).toEqual(meso.sessions)
    expect(typeof stored.profile_snapshot_json).toBe('string')
    expect(JSON.parse(stored.profile_snapshot_json as string)).toEqual(baseProfile)
  })

  it('passes profile, exercisePool, and weeks to callEdge with the correct op', async () => {
    libraryRows.push(makeLibraryRow({ id: 'a', equipment: 'body only' }))
    vi.mocked(callEdge).mockResolvedValue(validPartialPlan())

    await generatePlan(baseProfile, 'user-xyz', 4)

    expect(callEdge).toHaveBeenCalledTimes(1)
    const [op, payload] = vi.mocked(callEdge).mock.calls[0]
    expect(op).toBe('generate_plan')
    expect(payload).toMatchObject({
      profile: baseProfile,
      weeks: 4,
    })
    expect(Array.isArray((payload as { exercisePool: unknown }).exercisePool)).toBe(true)
  })

  it('throws when callEdge rejects with a Zod-style error', async () => {
    libraryRows.push(makeLibraryRow({ id: 'a', equipment: 'body only' }))
    vi.mocked(callEdge).mockRejectedValue(
      new Error('edge generate_plan returned invalid shape: bad'),
    )

    await expect(generatePlan(baseProfile, 'user-123')).rejects.toThrow(
      /edge generate_plan returned invalid shape/,
    )
    expect(mesoStore.size).toBe(0)
  })

  it('throws when the full parsed plan fails MesocycleSchema validation', async () => {
    libraryRows.push(makeLibraryRow({ id: 'a', equipment: 'body only' }))
    // callEdge mocked to bypass the partial-schema guard and return an
    // obviously-invalid payload so the final MesocycleSchema.parse is what fails.
    vi.mocked(callEdge).mockResolvedValue({
      id: 'meso-1',
      length_weeks: 999, // > 12, violates MesocycleSchema
      sessions: [],
    } as unknown as Omit<Mesocycle, 'user_id' | 'generated_at' | 'profile_snapshot'>)

    await expect(generatePlan(baseProfile, 'user-123')).rejects.toThrow()
    expect(mesoStore.size).toBe(0)
  })
})
