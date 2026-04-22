import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { UserProgramProfile } from '../types/profile'
import type { PlannedExercise, PlannedSession } from '../types/plan'

// Mock `./generate` BEFORE importing swap so the mocked `callEdge` is in play.
vi.mock('./generate', () => ({
  callEdge: vi.fn(),
}))

// Mock `./db` with an in-memory stand-in — matches the pattern used in
// planGen.test.ts. Stores the LocalMesocycle row shape (sessions_json is a
// JSON string) so we can assert re-stringification round-trips cleanly.
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

const mesoStore = new Map<string, Record<string, unknown>>()

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
      get: vi.fn(async (id: string) => mesoStore.get(id)),
    },
  },
}))

import { requestSwap, applySwap } from './swap'
import { callEdge } from './generate'

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

function makePlannedExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    library_id: overrides.library_id ?? 'fedb:hip-thrust',
    name: overrides.name ?? 'Barbell Hip Thrust',
    sets: overrides.sets ?? 3,
    reps: overrides.reps ?? '8-12',
    rir: overrides.rir ?? 2,
    rest_seconds: overrides.rest_seconds ?? 120,
    role: overrides.role ?? 'main lift',
    warmup_sets: overrides.warmup_sets ?? [],
    notes: overrides.notes,
  }
}

function makeSession(exercises: PlannedExercise[]): PlannedSession {
  return {
    id: 's-w1-o1',
    week_number: 1,
    ordinal: 1,
    focus: ['glutes'],
    title: 'Lower A',
    subtitle: '',
    estimated_minutes: 55,
    status: 'upcoming',
    day_of_week: 0,
    rationale: 'Lower A Monday; fresh week start.',
    exercises,
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

describe('requestSwap', () => {
  it('calls callEdge with op=swap_exercise and the expected payload shape', async () => {
    libraryRows.push({
      id: 'fedb:goblet-squat',
      name: 'Goblet Squat',
      equipment: 'dumbbell',
      primaryMuscles: ['quads'],
      secondaryMuscles: [],
      category: 'strength',
      level: 'beginner',
      force: null,
      mechanic: null,
      instructions: [],
      imageCount: 0,
      rawId: 'goblet-squat',
    })

    const replacement = makePlannedExercise({
      library_id: 'fedb:goblet-squat',
      name: 'Goblet Squat',
      role: 'accessory',
    })
    vi.mocked(callEdge).mockResolvedValue({ replacement, reason: 'Targets the same primary muscle.' })

    const original = makePlannedExercise({ library_id: 'fedb:back-squat', name: 'Back Squat' })
    const alreadyDone = makePlannedExercise({ library_id: 'fedb:rdl', name: 'Romanian Deadlift' })
    const session = makeSession([alreadyDone, original])

    const result = await requestSwap({
      profile: baseProfile,
      session,
      exerciseIndex: 1,
      reason: 'machine_busy',
    })

    expect(result.replacement.name).toBe('Goblet Squat')
    expect(result.reason).toMatch(/same primary muscle/i)

    expect(callEdge).toHaveBeenCalledTimes(1)
    const [op, payload] = vi.mocked(callEdge).mock.calls[0]
    expect(op).toBe('swap_exercise')
    expect(payload).toMatchObject({
      profile: baseProfile,
      currentExercise: original,
      sessionFocus: ['glutes'],
      completedExercisesInSession: ['Romanian Deadlift'],
      reason: 'machine_busy',
    })
    expect(Array.isArray((payload as { exercisePool: unknown }).exercisePool)).toBe(true)
  })

  it('rejects when the edge call throws', async () => {
    vi.mocked(callEdge).mockRejectedValue(new Error('edge swap_exercise failed: 500'))
    const session = makeSession([makePlannedExercise()])
    await expect(
      requestSwap({
        profile: baseProfile,
        session,
        exerciseIndex: 0,
        reason: 'generic',
      }),
    ).rejects.toThrow(/edge swap_exercise failed/)
  })
})

describe('applySwap', () => {
  // Helper to seed the mocked Dexie store with a minimal LocalMesocycle row.
  // Mirrors the shape planGen.ts writes, including JSON-stringified sessions.
  function seedMeso(sessions: PlannedSession[]) {
    const row = {
      id: 'meso-1',
      user_id: 'user-1',
      generated_at: '2026-04-17T00:00:00.000Z',
      length_weeks: 6,
      sessions_json: JSON.stringify(sessions),
      profile_snapshot_json: JSON.stringify(baseProfile),
      synced: true,
    }
    mesoStore.set(row.id, row as unknown as Record<string, unknown>)
  }

  it('replaces the target exercise and leaves others untouched', async () => {
    const ex0 = makePlannedExercise({ library_id: 'fedb:a', name: 'Ex A' })
    const ex1 = makePlannedExercise({ library_id: 'fedb:b', name: 'Ex B' })
    const ex2 = makePlannedExercise({ library_id: 'fedb:c', name: 'Ex C' })
    seedMeso([makeSession([ex0, ex1, ex2])])

    const replacement = makePlannedExercise({ library_id: 'fedb:new', name: 'New Exercise' })
    await applySwap('meso-1', 's-w1-o1', 1, replacement)

    const stored = mesoStore.get('meso-1')!
    const sessions = JSON.parse(stored.sessions_json as string) as PlannedSession[]
    expect(sessions).toHaveLength(1)
    expect(sessions[0].exercises).toHaveLength(3)
    expect(sessions[0].exercises[0]).toEqual(ex0)
    expect(sessions[0].exercises[1]).toEqual(replacement)
    expect(sessions[0].exercises[2]).toEqual(ex2)
  })

  it('flags the mesocycle as unsynced after the swap', async () => {
    seedMeso([makeSession([makePlannedExercise()])])
    await applySwap(
      'meso-1',
      's-w1-o1',
      0,
      makePlannedExercise({ library_id: 'fedb:new', name: 'New' }),
    )
    const stored = mesoStore.get('meso-1')!
    expect(stored.synced).toBe(false)
  })

  it('only modifies the target session, leaving other sessions untouched', async () => {
    const s1 = makeSession([makePlannedExercise({ library_id: 'fedb:s1a', name: 'S1 A' })])
    const s2: PlannedSession = {
      ...makeSession([makePlannedExercise({ library_id: 'fedb:s2a', name: 'S2 A' })]),
      id: 's-w1-o2',
      ordinal: 2,
    }
    seedMeso([s1, s2])

    await applySwap(
      'meso-1',
      's-w1-o2',
      0,
      makePlannedExercise({ library_id: 'fedb:new', name: 'New Exercise' }),
    )
    const stored = mesoStore.get('meso-1')!
    const sessions = JSON.parse(stored.sessions_json as string) as PlannedSession[]
    expect(sessions[0]).toEqual(s1) // untouched
    expect(sessions[1].exercises[0].name).toBe('New Exercise')
  })

  it('throws when the mesocycle is missing', async () => {
    await expect(
      applySwap('ghost-meso', 's-w1-o1', 0, makePlannedExercise()),
    ).rejects.toThrow(/no mesocycle/i)
  })

  it('throws when the session is not in the plan', async () => {
    seedMeso([makeSession([makePlannedExercise()])])
    await expect(
      applySwap('meso-1', 's-nope', 0, makePlannedExercise()),
    ).rejects.toThrow(/not in plan/i)
  })

  it('throws when the exerciseIndex is out of range', async () => {
    seedMeso([makeSession([makePlannedExercise()])])
    await expect(
      applySwap('meso-1', 's-w1-o1', 5, makePlannedExercise()),
    ).rejects.toThrow(/out of range/i)
  })
})
