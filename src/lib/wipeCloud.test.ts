// wipeCloudData — the cloud half of Settings "Start fresh".
//
// Regression: 2026-06-10 — the wipe cleared local Dexie + localStorage only.
// With the backend alive, the next sign-in pulled the cloud profile back
// down and the wipe appeared to do nothing ("just signed me out").
import { describe, expect, it, vi, afterEach } from 'vitest'
import { wipeCloudData } from './wipeCloud'
import { supabase } from './supabase'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockDelete(failingTables: Set<string> = new Set()) {
  const deletedFrom: string[] = []
  vi.spyOn(supabase, 'from').mockImplementation(((table: string) => ({
    delete: () => ({
      eq: async (_col: string, _val: string) => {
        deletedFrom.push(table)
        return failingTables.has(table)
          ? { error: { message: 'permission denied' } }
          : { error: null }
      },
    }),
  })) as unknown as typeof supabase.from)
  return deletedFrom
}

describe('wipeCloudData', () => {
  it('deletes the user rows from every training-data table', async () => {
    const deletedFrom = mockDelete()
    const result = await wipeCloudData('uuid-user-1')
    expect(result.ok).toBe(true)
    expect(result.failed).toEqual([])
    expect(new Set(deletedFrom)).toEqual(
      new Set([
        'user_program_profiles',
        'session_checkins',
        'mesocycles',
        'session_logs',
        'set_logs',
        'cardio_logs',
        'personal_records',
        'last_weights',
        'user_goals',
      ]),
    )
  })

  it('reports failed tables instead of throwing (caller aborts the local wipe)', async () => {
    mockDelete(new Set(['session_logs', 'personal_records']))
    const result = await wipeCloudData('uuid-user-1')
    expect(result.ok).toBe(false)
    expect(result.failed.sort()).toEqual(['personal_records', 'session_logs'])
  })

  it('treats a thrown query (offline) as a failure for that table', async () => {
    vi.spyOn(supabase, 'from').mockImplementation((() => ({
      delete: () => ({
        eq: async () => {
          throw new Error('Failed to fetch')
        },
      }),
    })) as unknown as typeof supabase.from)
    const result = await wipeCloudData('uuid-user-1')
    expect(result.ok).toBe(false)
    expect(result.failed.length).toBe(9)
  })
})
