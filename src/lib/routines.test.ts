import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import type { PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'

// Mock `./generate` BEFORE importing routines so the mocked `callEdge` is in play.
vi.mock('./generate', () => ({
  callEdge: vi.fn(),
}))

import { db } from './db'
import {
  generateRoutine,
  loadRoutine,
  RoutineSchema,
  type Routine,
} from './routines'
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

const baseSession: PlannedSession = {
  id: 'sess-1',
  week_number: 1,
  ordinal: 1,
  focus: ['glutes'],
  title: 'Lower A',
  subtitle: '',
  estimated_minutes: 55,
  day_of_week: 0,
  rationale: 'Lower A Monday; fresh week start.',
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
      warmup_sets: [],
    },
  ],
}

const validRoutine: Routine = {
  title: 'Glute Warm-up',
  exercises: [
    { name: 'Banded glute bridge', reps: '15', notes: 'Squeeze at top' },
    { name: 'Hip airplane', duration_seconds: 30 },
    { name: '90/90 hip switch', reps: '10/side' },
  ],
}

beforeEach(async () => {
  vi.mocked(callEdge).mockReset()
  await db.routines.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('generateRoutine', () => {
  it('calls callEdge with generate_routine op + correct payload', async () => {
    vi.mocked(callEdge).mockResolvedValue(validRoutine)

    await generateRoutine({
      session: baseSession,
      kind: 'warmup',
      profile: baseProfile,
      minutes: 10,
      focusTag: 'activation',
    })

    expect(callEdge).toHaveBeenCalledTimes(1)
    const [op, payload] = vi.mocked(callEdge).mock.calls[0]
    expect(op).toBe('generate_routine')
    expect(payload).toMatchObject({
      profile: baseProfile,
      kind: 'warmup',
      minutes: 10,
      focusTag: 'activation',
      sessionFocus: ['glutes'],
    })
  })

  it('persists the row to Dexie keyed by `${sessionId}:${kind}` with synced=false', async () => {
    vi.mocked(callEdge).mockResolvedValue(validRoutine)

    await generateRoutine({
      session: baseSession,
      kind: 'cooldown',
      profile: baseProfile,
      minutes: 5,
    })

    const row = await db.routines.get('sess-1:cooldown')
    expect(row).toBeDefined()
    expect(row?.id).toBe('sess-1:cooldown')
    expect(row?.session_id).toBe('sess-1')
    expect(row?.kind).toBe('cooldown')
    expect(row?.minutes).toBe(5)
    expect(row?.synced).toBe(false)
    expect(typeof row?.generated_at).toBe('string')
    expect(JSON.parse(row!.routine_json)).toEqual(validRoutine)
  })
})

describe('loadRoutine', () => {
  it('returns null for a missing row', async () => {
    const result = await loadRoutine('does-not-exist', 'warmup')
    expect(result).toBeNull()
  })

  it('round-trips a stored routine', async () => {
    vi.mocked(callEdge).mockResolvedValue(validRoutine)
    await generateRoutine({
      session: baseSession,
      kind: 'warmup',
      profile: baseProfile,
      minutes: 10,
    })

    const loaded = await loadRoutine('sess-1', 'warmup')
    expect(loaded).toEqual(validRoutine)
  })
})

describe('RoutineSchema', () => {
  it('rejects an exercises array with fewer than 2 items', () => {
    const result = RoutineSchema.safeParse({
      title: 'Tiny warm-up',
      exercises: [{ name: 'Only one' }],
    })
    expect(result.success).toBe(false)
  })
})
