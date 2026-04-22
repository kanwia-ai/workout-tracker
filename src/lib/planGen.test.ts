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

import { buildExercisePool, generatePlan, loadMesocycle } from './planGen'
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
        subtitle: '',
        estimated_minutes: 55,
        status: 'upcoming',
        day_of_week: 0,
        rationale: 'Lower A Monday; fresh week start, 48h until Lower B.',
        exercises: [
          {
            library_id: 'fedb:hip-thrust',
            name: 'Barbell Hip Thrust',
            sets: 3,
            reps: '8-12',
            rir: 2,
            rest_seconds: 120,
            role: 'main lift',
            warmup_sets: [],
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

describe('loadMesocycle (Phase-1 migration back-fill)', () => {
  it('back-fills day_of_week + rationale for stored rows missing those fields', async () => {
    // Build a pre-2P.1 shaped mesocycle: sessions have ordinals spread across a
    // 3-sessions/week cadence over 3 weeks, but NO day_of_week and NO rationale.
    // 9 sessions / 3 weeks = 3/wk → pickRecoveryPattern(3) = [0, 2, 4].
    const preMigrationSessions = [
      { week_number: 1, ordinal: 1 },
      { week_number: 1, ordinal: 2 },
      { week_number: 1, ordinal: 3 },
      { week_number: 2, ordinal: 1 },
      { week_number: 2, ordinal: 2 },
      { week_number: 2, ordinal: 3 },
      { week_number: 3, ordinal: 1 },
      { week_number: 3, ordinal: 2 },
      { week_number: 3, ordinal: 3 },
    ].map((meta, i) => ({
      id: `s-w${meta.week_number}-o${meta.ordinal}`,
      week_number: meta.week_number,
      ordinal: meta.ordinal,
      focus: ['glutes'],
      title: `Session ${i + 1}`,
      estimated_minutes: 55,
      status: 'upcoming',
      // deliberately omit day_of_week + rationale
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
    }))

    // Bypass the validated save path — write straight to the mock Dexie store
    // so the stale shape survives, exactly as a Phase-1 row in real Dexie would.
    mesoStore.set('meso-pre-migration', {
      id: 'meso-pre-migration',
      user_id: 'user-legacy',
      generated_at: '2026-01-01T00:00:00.000Z',
      length_weeks: 3,
      sessions_json: JSON.stringify(preMigrationSessions),
      profile_snapshot_json: JSON.stringify(baseProfile),
      synced: false,
    })

    const meso = await loadMesocycle('meso-pre-migration')
    expect(meso).not.toBeNull()
    const loaded = meso as Mesocycle

    // No throw, sessions hydrated, and every session has both fields populated.
    expect(loaded.sessions).toHaveLength(9)
    for (const s of loaded.sessions) {
      expect(typeof s.day_of_week).toBe('number')
      expect(s.day_of_week).toBeGreaterThanOrEqual(0)
      expect(s.day_of_week).toBeLessThanOrEqual(6)
      expect(typeof s.rationale).toBe('string')
      expect(s.rationale.length).toBeGreaterThan(0)
    }

    // Days must follow pickRecoveryPattern(3) = [0, 2, 4] indexed by (ordinal-1)
    const byKey = new Map(loaded.sessions.map(s => [`w${s.week_number}-o${s.ordinal}`, s.day_of_week]))
    expect(byKey.get('w1-o1')).toBe(0)
    expect(byKey.get('w1-o2')).toBe(2)
    expect(byKey.get('w1-o3')).toBe(4)
    expect(byKey.get('w2-o1')).toBe(0)
    expect(byKey.get('w2-o2')).toBe(2)
    expect(byKey.get('w2-o3')).toBe(4)
    expect(byKey.get('w3-o1')).toBe(0)
    expect(byKey.get('w3-o2')).toBe(2)
    expect(byKey.get('w3-o3')).toBe(4)
  })

  it('returns null when the id is not present', async () => {
    expect(await loadMesocycle('does-not-exist')).toBeNull()
  })
})
