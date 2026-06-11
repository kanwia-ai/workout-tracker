import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushDirtyToCloud } from './syncBackfill'
import { db } from './db'
import { supabase } from './supabase'

const USER = 'user-1'

interface CloudWrite {
  table: string
  op: 'insert' | 'upsert'
  payload: Record<string, unknown>
}

/**
 * Healthy backend: every write succeeds and is recorded. Optionally fail
 * specific tables to simulate partial outages (RLS gaps, table-level errors).
 */
function mockAliveCloud(failTables: string[] = []) {
  const writes: CloudWrite[] = []
  vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
    const fail = failTables.includes(table)
    const result = fail
      ? Promise.resolve({ data: null, error: { message: `boom: ${table}` } })
      : Promise.resolve({ data: null, error: null })
    const chain = {
      insert: (payload: Record<string, unknown>) => {
        if (!fail) writes.push({ table, op: 'insert', payload })
        return result
      },
      upsert: (payload: Record<string, unknown>) => {
        if (!fail) writes.push({ table, op: 'upsert', payload })
        return result
      },
    }
    return chain
  }) as never)
  return writes
}

/** Dead backend: every call explodes before reaching the network layer. */
function mockDeadCloud() {
  vi.spyOn(supabase, 'from').mockImplementation((() => {
    throw new Error('backend unreachable')
  }) as never)
}

async function clearTables() {
  await Promise.all([
    db.userProgramProfiles.clear(),
    db.sessionCheckins.clear(),
    db.sessionLogs.clear(),
    db.setLogs.clear(),
    db.cardioLogs.clear(),
    db.personalRecords.clear(),
    db.userWeights.clear(),
  ])
}

/** Seed one dirty row in every class flushDirtyToCloud covers. */
async function seedDirtyEverything() {
  await db.userProgramProfiles.put({
    user_id: USER,
    profile_json: JSON.stringify({ goal: 'glutes' }),
    updated_at: '2026-06-10T10:00:00.000Z',
    synced: false,
  })
  await db.sessionCheckins.put({
    session_id: 'sess-1',
    user_id: USER,
    completed_at: '2026-06-10T11:00:00.000Z',
    week_number: 2,
    checkin_json: JSON.stringify({ session_id: 'sess-1', user_id: USER }),
    synced: false,
  })
  await db.sessionLogs.put({
    id: 'log-1',
    user_id: USER,
    workout_id: 'wk-1',
    workout_title: 'lower a',
    date: '2026-06-10',
    started_at: '2026-06-10T10:00:00.000Z',
    ended_at: '2026-06-10T11:00:00.000Z',
    phases_json: '[]',
    completed_sets: 10,
    total_sets: 12,
    synced: false,
  })
  await db.setLogs.put({
    id: 'set-1',
    session_log_id: 'log-1',
    user_id: USER,
    exercise_id: 'ex-1',
    exercise_name: 'hip thrust',
    set_number: 1,
    weight: 80,
    reps_completed: 10,
    timestamp: '2026-06-10T10:10:00.000Z',
    synced: false,
  })
  await db.cardioLogs.put({
    id: 'cardio-1',
    user_id: USER,
    date: '2026-06-10',
    type: 'incline_walk',
    duration_minutes: 20,
    synced: false,
  })
  await db.personalRecords.put({
    id: `${USER}:ex-1`,
    user_id: USER,
    exercise_id: 'ex-1',
    exercise_name: 'hip thrust',
    weight: 90,
    date: '2026-06-10',
    synced: false,
  })
  await db.userWeights.put({
    id: `${USER}:ex-1`,
    user_id: USER,
    exercise_id: 'ex-1',
    weight: 80,
    date: '2026-06-10',
    synced: false,
  })
}

describe('flushDirtyToCloud — the "backend is back" sweep', () => {
  beforeEach(async () => {
    await clearTables()
    vi.restoreAllMocks()
  })

  it('pushes every dirty class and reports ok when all of it lands', async () => {
    await seedDirtyEverything()
    const writes = mockAliveCloud()

    const result = await flushDirtyToCloud(USER)

    expect(result.ok).toBe(true)
    expect(result.stillDirty).toEqual([])

    const tablesWritten = new Set(writes.map((w) => w.table))
    expect(tablesWritten).toEqual(
      new Set([
        'user_program_profiles',
        'session_checkins',
        'session_logs',
        'set_logs',
        'cardio_logs',
        'personal_records',
        'last_weights',
      ]),
    )

    // Every local row flipped to synced.
    expect((await db.userProgramProfiles.get(USER))?.synced).toBe(true)
    expect((await db.sessionCheckins.get('sess-1'))?.synced).toBe(true)
    expect((await db.sessionLogs.get('log-1'))?.synced).toBe(true)
    expect((await db.setLogs.get('set-1'))?.synced).toBe(true)
    expect((await db.cardioLogs.get('cardio-1'))?.synced).toBe(true)
    expect((await db.personalRecords.get(`${USER}:ex-1`))?.synced).toBe(true)
    expect((await db.userWeights.get(`${USER}:ex-1`))?.synced).toBe(true)
  })

  it('one failing table never blocks the others; failure is reported honestly', async () => {
    await seedDirtyEverything()
    mockAliveCloud(['session_logs'])

    const result = await flushDirtyToCloud(USER)

    expect(result.ok).toBe(false)
    expect(result.stillDirty).toContain('sessions')
    // Sessions stayed dirty for the next attempt…
    expect((await db.sessionLogs.get('log-1'))?.synced).toBe(false)
    // …but everything else still flushed.
    expect((await db.userProgramProfiles.get(USER))?.synced).toBe(true)
    expect((await db.sessionCheckins.get('sess-1'))?.synced).toBe(true)
    expect((await db.setLogs.get('set-1'))?.synced).toBe(true)
    expect((await db.cardioLogs.get('cardio-1'))?.synced).toBe(true)
    expect((await db.personalRecords.get(`${USER}:ex-1`))?.synced).toBe(true)
    expect((await db.userWeights.get(`${USER}:ex-1`))?.synced).toBe(true)
  })

  it('never throws against a dead backend — everything stays queued', async () => {
    await seedDirtyEverything()
    mockDeadCloud()

    const result = await flushDirtyToCloud(USER)

    expect(result.ok).toBe(false)
    expect(result.stillDirty).toEqual(
      expect.arrayContaining(['profile', 'checkins', 'sessions', 'sets', 'cardio', 'prs', 'weights']),
    )
    // Nothing lost, nothing falsely marked synced.
    expect((await db.sessionLogs.get('log-1'))?.synced).toBe(false)
    expect((await db.userProgramProfiles.get(USER))?.synced).toBe(false)
  })

  it('only touches the given user\'s rows', async () => {
    await db.sessionLogs.put({
      id: 'other-log',
      user_id: 'someone-else',
      workout_id: 'wk-9',
      date: '2026-06-10',
      started_at: '2026-06-10T10:00:00.000Z',
      phases_json: '[]',
      completed_sets: 1,
      total_sets: 1,
      synced: false,
    })
    const writes = mockAliveCloud()

    const result = await flushDirtyToCloud(USER)

    expect(result.ok).toBe(true)
    expect(writes).toHaveLength(0)
    expect((await db.sessionLogs.get('other-log'))?.synced).toBe(false)
  })

  it('is a cheap no-op when nothing is dirty', async () => {
    const writes = mockAliveCloud()
    const result = await flushDirtyToCloud(USER)
    expect(result.ok).toBe(true)
    expect(writes).toHaveLength(0)
  })
})
