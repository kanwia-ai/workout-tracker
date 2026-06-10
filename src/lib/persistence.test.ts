import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveSession,
  saveSetLog,
  saveLastWeight,
  updatePR,
  loadLastWeights,
  loadPRs,
  loadSessionHistory,
  saveCardioLog,
  syncDirtyPersistence,
} from './persistence'
import { db } from './db'
import { supabase } from './supabase'
import type { SessionPhase } from '../types'

const USER = 'user-1'

const PHASES: SessionPhase[] = [
  { name: 'warmup', started_at: '2026-06-09T10:00:00Z', ended_at: '2026-06-09T10:05:00Z' },
  { name: 'strength', started_at: '2026-06-09T10:05:00Z', ended_at: '2026-06-09T10:45:00Z' },
] as SessionPhase[]

function sessionParams(overrides: Partial<Parameters<typeof saveSession>[0]> = {}) {
  return {
    userId: USER,
    workoutId: 'wk-1',
    workoutTitle: 'lower a',
    date: '2026-06-09',
    startedAt: '2026-06-09T10:00:00Z',
    endedAt: '2026-06-09T10:45:00Z',
    phases: PHASES,
    completedSets: 12,
    totalSets: 14,
    ...overrides,
  }
}

/** Simulate the dead Supabase project: every query throws (NXDOMAIN-style). */
function mockDeadCloud() {
  vi.spyOn(supabase, 'from').mockImplementation((() => {
    throw new Error('backend unreachable')
  }) as never)
}

interface CloudWrite {
  table: string
  op: 'insert' | 'upsert'
  payload: Record<string, unknown>
  options?: Record<string, unknown>
}

/**
 * Simulate a healthy backend: reads resolve with the seeded `rows` for each
 * table, writes succeed and are recorded so tests can assert payloads.
 */
function mockAliveCloud(rows: Record<string, unknown[]> = {}) {
  const writes: CloudWrite[] = []
  vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
    const result = Promise.resolve({ data: rows[table] ?? [], error: null })
    const ok = { data: null, error: null }
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      insert: (payload: Record<string, unknown>) => {
        writes.push({ table, op: 'insert', payload })
        return Promise.resolve(ok)
      },
      upsert: (payload: Record<string, unknown>, options?: Record<string, unknown>) => {
        writes.push({ table, op: 'upsert', payload, options })
        return Promise.resolve(ok)
      },
      then: (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        result.then(onFulfilled, onRejected),
    }
    return chain
  }) as never)
  return writes
}

async function clearTables() {
  await Promise.all([
    db.sessionLogs.clear(),
    db.setLogs.clear(),
    db.cardioLogs.clear(),
    db.personalRecords.clear(),
    db.userWeights.clear(),
  ])
}

describe('persistence — local-first with a dead backend', () => {
  beforeEach(async () => {
    await clearTables()
    vi.restoreAllMocks()
  })

  it('a completed workout round-trips save→read entirely through Dexie', async () => {
    mockDeadCloud()

    // Save the full end-of-session payload, exactly like WorkoutView does.
    const sessionId = await saveSession(sessionParams())
    expect(sessionId).toBeTruthy() // the bug: this returned null when cloud was down

    await saveSetLog({
      sessionLogId: sessionId!,
      userId: USER,
      exerciseId: 'ex-hip-thrust',
      exerciseName: 'Barbell Hip Thrust',
      setNumber: 1,
      weight: 60,
      repsCompleted: 10,
    })
    await saveLastWeight(USER, 'ex-hip-thrust', 60)
    const isPR = await updatePR(USER, 'ex-hip-thrust', 'Barbell Hip Thrust', 60)
    expect(isPR).toBe(true)

    // Reads come back from Dexie even with the cloud unreachable.
    const history = await loadSessionHistory(USER)
    expect(history).toHaveLength(1)
    expect(history[0].workout_title).toBe('lower a')
    expect(history[0].completed_sets).toBe(12)
    expect(history[0].ended_at).toBe('2026-06-09T10:45:00Z')
    expect(history[0].phases).toEqual(PHASES)

    expect(await loadLastWeights(USER)).toEqual({ 'ex-hip-thrust': 60 })
    expect(await loadPRs(USER)).toEqual({ 'ex-hip-thrust': 60 })

    // Everything is queued for sync — marked dirty, never dropped.
    const sessionRow = await db.sessionLogs.get(sessionId!)
    expect(sessionRow?.synced).toBe(false)
    const setRows = await db.setLogs.where('session_log_id').equals(sessionId!).toArray()
    expect(setRows).toHaveLength(1)
    expect(setRows[0].synced).toBe(false)
  })

  it('updatePR keeps the highest weight: lower attempts are not PRs', async () => {
    mockDeadCloud()
    expect(await updatePR(USER, 'ex-rdl', 'Romanian Deadlift', 80)).toBe(true)
    expect(await updatePR(USER, 'ex-rdl', 'Romanian Deadlift', 70)).toBe(false)
    expect(await loadPRs(USER)).toEqual({ 'ex-rdl': 80 })
    expect(await updatePR(USER, 'ex-rdl', 'Romanian Deadlift', 90)).toBe(true)
    expect(await loadPRs(USER)).toEqual({ 'ex-rdl': 90 })
  })

  it('saveLastWeight overwrites the previous weight for the same exercise', async () => {
    mockDeadCloud()
    await saveLastWeight(USER, 'ex-goblet-squat', 16)
    await saveLastWeight(USER, 'ex-goblet-squat', 20)
    expect(await loadLastWeights(USER)).toEqual({ 'ex-goblet-squat': 20 })
    // One row per (user, exercise) — an upsert, not an append.
    const rows = await db.userWeights.where('user_id').equals(USER).toArray()
    expect(rows).toHaveLength(1)
  })

  it('saveCardioLog stores locally and marks the row dirty', async () => {
    mockDeadCloud()
    await saveCardioLog({
      userId: USER,
      date: '2026-06-09',
      type: 'incline_walk',
      durationMinutes: 20,
      incline: 8,
    })
    const rows = await db.cardioLogs.where('user_id').equals(USER).toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('incline_walk')
    expect(rows[0].duration_minutes).toBe(20)
    expect(rows[0].synced).toBe(false)
  })

  it('loadSessionHistory respects the limit and sorts newest-first', async () => {
    mockDeadCloud()
    await saveSession(sessionParams({ date: '2026-06-01', workoutTitle: 'old one' }))
    await saveSession(sessionParams({ date: '2026-06-08', workoutTitle: 'middle one' }))
    await saveSession(sessionParams({ date: '2026-06-09', workoutTitle: 'new one' }))
    const history = await loadSessionHistory(USER, 2)
    expect(history).toHaveLength(2)
    expect(history[0].workout_title).toBe('new one')
    expect(history[1].workout_title).toBe('middle one')
  })
})

describe('persistence — background push when the backend is alive', () => {
  beforeEach(async () => {
    await clearTables()
    vi.restoreAllMocks()
  })

  it('saveSession lands in Dexie, then pushes up and flips synced', async () => {
    const writes = mockAliveCloud()
    const id = await saveSession(sessionParams())
    expect(id).toBeTruthy()

    await vi.waitFor(async () => {
      expect((await db.sessionLogs.get(id!))?.synced).toBe(true)
    })

    const push = writes.find((w) => w.table === 'session_logs')
    expect(push).toBeTruthy()
    expect(push?.op).toBe('upsert')
    expect(push?.payload.id).toBe(id)
    expect(push?.payload.user_id).toBe(USER)
    expect(push?.payload.workout_title).toBe('lower a')
    expect(push?.payload.phases).toEqual(PHASES)
    expect(push?.payload.completed_sets).toBe(12)
  })

  it('saveLastWeight and updatePR upsert keyed on (user_id, exercise_id)', async () => {
    const writes = mockAliveCloud()
    await saveLastWeight(USER, 'ex-hip-thrust', 60)
    await updatePR(USER, 'ex-hip-thrust', 'Barbell Hip Thrust', 60)

    await vi.waitFor(async () => {
      const w = await db.userWeights.where('user_id').equals(USER).first()
      const pr = await db.personalRecords.where('user_id').equals(USER).first()
      expect(w?.synced).toBe(true)
      expect(pr?.synced).toBe(true)
    })

    const weightPush = writes.find((w) => w.table === 'last_weights')
    expect(weightPush?.options).toEqual({ onConflict: 'user_id,exercise_id' })
    expect(weightPush?.payload).toMatchObject({ user_id: USER, exercise_id: 'ex-hip-thrust', weight: 60 })

    const prPush = writes.find((w) => w.table === 'personal_records')
    expect(prPush?.options).toEqual({ onConflict: 'user_id,exercise_id' })
    expect(prPush?.payload).toMatchObject({
      user_id: USER,
      exercise_id: 'ex-hip-thrust',
      exercise_name: 'Barbell Hip Thrust',
      weight: 60,
    })
  })

  it('saveSetLog and saveCardioLog push and flip synced', async () => {
    const writes = mockAliveCloud()
    await saveSetLog({
      sessionLogId: 'sess-1',
      userId: USER,
      exerciseId: 'ex-rdl',
      exerciseName: 'Romanian Deadlift',
      setNumber: 2,
      weight: 80,
      repsCompleted: 8,
    })
    await saveCardioLog({ userId: USER, date: '2026-06-09', type: 'incline_walk', durationMinutes: 20 })

    await vi.waitFor(async () => {
      const set = await db.setLogs.where('user_id').equals(USER).first()
      const cardio = await db.cardioLogs.where('user_id').equals(USER).first()
      expect(set?.synced).toBe(true)
      expect(cardio?.synced).toBe(true)
    })

    expect(writes.find((w) => w.table === 'set_logs')?.payload).toMatchObject({
      user_id: USER,
      exercise_id: 'ex-rdl',
      exercise_name: 'Romanian Deadlift',
      set_number: 2,
    })
    expect(writes.find((w) => w.table === 'cardio_logs')?.payload).toMatchObject({
      user_id: USER,
      type: 'incline_walk',
      duration_minutes: 20,
    })
  })
})

describe('persistence — backfill sweep after the backend comes back', () => {
  beforeEach(async () => {
    await clearTables()
    vi.restoreAllMocks()
  })

  it('pushes every dirty row, sessions before their set logs', async () => {
    // Phase 1: backend dead — a full workout queues up locally.
    mockDeadCloud()
    const sessionId = await saveSession(sessionParams())
    await saveSetLog({
      sessionLogId: sessionId!,
      userId: USER,
      exerciseId: 'ex-hip-thrust',
      exerciseName: 'Barbell Hip Thrust',
      setNumber: 1,
      weight: 60,
      repsCompleted: 10,
    })
    await saveLastWeight(USER, 'ex-hip-thrust', 60)
    await updatePR(USER, 'ex-hip-thrust', 'Barbell Hip Thrust', 60)
    await saveCardioLog({ userId: USER, date: '2026-06-09', type: 'incline_walk', durationMinutes: 20 })
    // Give the doomed fire-and-forget pushes a tick to settle.
    await new Promise((r) => setTimeout(r, 0))
    expect((await db.sessionLogs.get(sessionId!))?.synced).toBe(false)

    // Phase 2: backend restored — the sweep drains the queue.
    vi.restoreAllMocks()
    const writes = mockAliveCloud()
    await syncDirtyPersistence(USER)

    expect((await db.sessionLogs.get(sessionId!))?.synced).toBe(true)
    expect((await db.setLogs.where('user_id').equals(USER).first())?.synced).toBe(true)
    expect((await db.cardioLogs.where('user_id').equals(USER).first())?.synced).toBe(true)
    expect((await db.personalRecords.where('user_id').equals(USER).first())?.synced).toBe(true)
    expect((await db.userWeights.where('user_id').equals(USER).first())?.synced).toBe(true)

    const tables = writes.map((w) => w.table)
    expect(tables).toContain('session_logs')
    expect(tables).toContain('set_logs')
    expect(tables).toContain('cardio_logs')
    expect(tables).toContain('personal_records')
    expect(tables).toContain('last_weights')
    // Sessions must land before set logs (cloud FK).
    expect(tables.indexOf('session_logs')).toBeLessThan(tables.indexOf('set_logs'))
  })

  it('is idempotent: a second sweep pushes nothing', async () => {
    mockDeadCloud()
    await saveLastWeight(USER, 'ex-rdl', 80)
    await new Promise((r) => setTimeout(r, 0))

    vi.restoreAllMocks()
    mockAliveCloud()
    await syncDirtyPersistence(USER)

    vi.restoreAllMocks()
    const secondWrites = mockAliveCloud()
    await syncDirtyPersistence(USER)
    expect(secondWrites).toHaveLength(0)
  })

  it('leaves rows dirty when the backend is still down', async () => {
    mockDeadCloud()
    await saveLastWeight(USER, 'ex-rdl', 80)
    await new Promise((r) => setTimeout(r, 0))

    await syncDirtyPersistence(USER)
    expect((await db.userWeights.where('user_id').equals(USER).first())?.synced).toBe(false)
  })
})

describe('persistence — reads merge cloud rows', () => {
  beforeEach(async () => {
    await clearTables()
    vi.restoreAllMocks()
  })

  it('loadPRs takes the higher cloud PR and caches it locally', async () => {
    await db.personalRecords.put({
      id: `${USER}:ex-a`,
      user_id: USER,
      exercise_id: 'ex-a',
      exercise_name: 'A',
      weight: 60,
      date: '2026-06-01',
      synced: true,
    })
    mockAliveCloud({
      personal_records: [{ exercise_id: 'ex-a', exercise_name: 'A', weight: 80, date: '2026-05-01' }],
    })
    expect(await loadPRs(USER)).toEqual({ 'ex-a': 80 })
    const row = await db.personalRecords.get(`${USER}:ex-a`)
    expect(row?.weight).toBe(80)
    expect(row?.synced).toBe(true)
  })

  it('loadPRs keeps a higher local PR over a lower cloud row', async () => {
    await db.personalRecords.put({
      id: `${USER}:ex-a`,
      user_id: USER,
      exercise_id: 'ex-a',
      exercise_name: 'A',
      weight: 90,
      date: '2026-06-01',
      synced: false,
    })
    mockAliveCloud({
      personal_records: [{ exercise_id: 'ex-a', exercise_name: 'A', weight: 80, date: '2026-06-08' }],
    })
    expect(await loadPRs(USER)).toEqual({ 'ex-a': 90 })
    expect((await db.personalRecords.get(`${USER}:ex-a`))?.weight).toBe(90)
  })

  it('loadLastWeights: newer cloud date wins over an older synced local row', async () => {
    await db.userWeights.put({
      id: `${USER}:ex-a`,
      user_id: USER,
      exercise_id: 'ex-a',
      weight: 50,
      date: '2026-06-01',
      synced: true,
    })
    mockAliveCloud({
      last_weights: [{ exercise_id: 'ex-a', weight: 55, date: '2026-06-05' }],
    })
    expect(await loadLastWeights(USER)).toEqual({ 'ex-a': 55 })
    expect((await db.userWeights.get(`${USER}:ex-a`))?.weight).toBe(55)
  })

  it('loadLastWeights: a dirty local row is never clobbered by the cloud', async () => {
    await db.userWeights.put({
      id: `${USER}:ex-a`,
      user_id: USER,
      exercise_id: 'ex-a',
      weight: 60,
      date: '2026-06-01',
      synced: false,
    })
    mockAliveCloud({
      last_weights: [{ exercise_id: 'ex-a', weight: 55, date: '2026-06-09' }],
    })
    expect(await loadLastWeights(USER)).toEqual({ 'ex-a': 60 })
    const row = await db.userWeights.get(`${USER}:ex-a`)
    expect(row?.weight).toBe(60)
    expect(row?.synced).toBe(false)
  })

  it('loadSessionHistory caches cloud-only sessions into Dexie', async () => {
    mockAliveCloud({
      session_logs: [
        {
          id: 'cloud-1',
          user_id: USER,
          workout_id: 'wk-9',
          workout_title: 'from another device',
          date: '2026-06-05',
          started_at: '2026-06-05T10:00:00Z',
          ended_at: '2026-06-05T10:40:00Z',
          phases: PHASES,
          completed_sets: 10,
          total_sets: 10,
          notes: null,
        },
      ],
    })
    const history = await loadSessionHistory(USER)
    expect(history).toHaveLength(1)
    expect(history[0].workout_title).toBe('from another device')
    expect(history[0].phases).toEqual(PHASES)

    const cached = await db.sessionLogs.get('cloud-1')
    expect(cached?.synced).toBe(true)
    expect(cached?.workout_title).toBe('from another device')
  })
})
