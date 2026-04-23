import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveCheckin,
  loadCheckin,
  listCheckinsForUser,
  exportCheckinsForUser,
} from './checkins'
import { db } from './db'
import type { SessionCheckin } from '../types/checkin'

function makeCheckin(overrides: Partial<SessionCheckin> = {}): SessionCheckin {
  return {
    session_id: 'sess-1',
    user_id: 'user-1',
    completed_at: '2026-04-10T12:00:00.000Z',
    week_number: 2,
    overall_feel: 4,
    exercises: [
      {
        library_id: 'ex:rdl',
        name: 'romanian deadlift',
        rating: 'solid',
        used_weight_lb: 135,
        reps_done: [8, 8, 6],
      },
      {
        library_id: 'ex:hip-thrust',
        name: 'barbell hip thrust',
        rating: 'tough',
      },
    ],
    synced: false,
    ...overrides,
  }
}

describe('checkins CRUD', () => {
  beforeEach(async () => {
    await db.sessionCheckins.clear()
  })

  it('saveCheckin + loadCheckin round-trip via Dexie', async () => {
    const checkin = makeCheckin()
    await saveCheckin(checkin)
    const loaded = await loadCheckin(checkin.session_id)
    expect(loaded).not.toBeNull()
    expect(loaded?.session_id).toBe('sess-1')
    expect(loaded?.user_id).toBe('user-1')
    expect(loaded?.overall_feel).toBe(4)
    expect(loaded?.exercises).toHaveLength(2)
    expect(loaded?.exercises[0]?.rating).toBe('solid')
    expect(loaded?.exercises[0]?.used_weight_lb).toBe(135)
    expect(loaded?.exercises[0]?.reps_done).toEqual([8, 8, 6])
  })

  it('loadCheckin returns null when no row exists', async () => {
    const loaded = await loadCheckin('nope')
    expect(loaded).toBeNull()
  })

  it('saveCheckin forces synced: false regardless of input', async () => {
    // Even if the caller passes synced: true (e.g. round-tripping a cloud
    // row), local saves should re-mark dirty so the future sync worker
    // picks it up.
    await saveCheckin({ ...makeCheckin(), synced: true })
    const row = await db.sessionCheckins.get('sess-1')
    expect(row?.synced).toBe(false)
  })

  it('saveCheckin rejects invalid overall_feel', async () => {
    const bad = { ...makeCheckin(), overall_feel: 7 as unknown as 5 }
    await expect(saveCheckin(bad)).rejects.toThrow()
    // No partial write on validation failure.
    const row = await db.sessionCheckins.get('sess-1')
    expect(row).toBeUndefined()
  })

  it('saveCheckin rejects an invalid exercise rating', async () => {
    const bad: SessionCheckin = {
      ...makeCheckin(),
      exercises: [
        {
          library_id: 'ex:rdl',
          name: 'rdl',
          // @ts-expect-error — intentionally invalid enum for validation test
          rating: 'medium',
        },
      ],
    }
    await expect(saveCheckin(bad)).rejects.toThrow()
  })

  it('saveCheckin overwrites previous row for same session_id', async () => {
    await saveCheckin(makeCheckin({ overall_feel: 2 }))
    await saveCheckin(makeCheckin({ overall_feel: 5 }))
    const loaded = await loadCheckin('sess-1')
    expect(loaded?.overall_feel).toBe(5)
    const count = await db.sessionCheckins.count()
    expect(count).toBe(1)
  })

  it('listCheckinsForUser returns user rows sorted newest-first', async () => {
    await saveCheckin(
      makeCheckin({ session_id: 'a', completed_at: '2026-04-01T00:00:00.000Z' }),
    )
    await saveCheckin(
      makeCheckin({ session_id: 'b', completed_at: '2026-04-05T00:00:00.000Z' }),
    )
    await saveCheckin(
      makeCheckin({ session_id: 'c', completed_at: '2026-04-03T00:00:00.000Z' }),
    )
    const list = await listCheckinsForUser('user-1')
    expect(list.map((c) => c.session_id)).toEqual(['b', 'c', 'a'])
  })

  it('listCheckinsForUser filters by sinceISO inclusive', async () => {
    await saveCheckin(
      makeCheckin({ session_id: 'old', completed_at: '2026-03-20T00:00:00.000Z' }),
    )
    await saveCheckin(
      makeCheckin({ session_id: 'edge', completed_at: '2026-04-01T00:00:00.000Z' }),
    )
    await saveCheckin(
      makeCheckin({ session_id: 'new', completed_at: '2026-04-10T00:00:00.000Z' }),
    )
    const list = await listCheckinsForUser('user-1', '2026-04-01T00:00:00.000Z')
    expect(list.map((c) => c.session_id)).toEqual(['new', 'edge'])
  })

  it('listCheckinsForUser scopes by user_id', async () => {
    await saveCheckin(makeCheckin({ session_id: 'a', user_id: 'user-1' }))
    await saveCheckin(makeCheckin({ session_id: 'b', user_id: 'user-2' }))
    const user1 = await listCheckinsForUser('user-1')
    const user2 = await listCheckinsForUser('user-2')
    expect(user1.map((c) => c.session_id)).toEqual(['a'])
    expect(user2.map((c) => c.session_id)).toEqual(['b'])
  })

  it('exportCheckinsForUser returns valid JSON with count + checkins', async () => {
    await saveCheckin(makeCheckin({ session_id: 'a' }))
    await saveCheckin(
      makeCheckin({ session_id: 'b', completed_at: '2026-04-12T00:00:00.000Z' }),
    )
    const json = await exportCheckinsForUser('user-1')
    const parsed = JSON.parse(json)
    expect(parsed.user_id).toBe('user-1')
    expect(parsed.count).toBe(2)
    expect(Array.isArray(parsed.checkins)).toBe(true)
    expect(parsed.checkins).toHaveLength(2)
    // Newest first ordering preserved through export.
    expect(parsed.checkins[0].session_id).toBe('b')
    expect(typeof parsed.exported_at).toBe('string')
  })

  it('exportCheckinsForUser returns an empty list JSON when no rows exist', async () => {
    const json = await exportCheckinsForUser('ghost')
    const parsed = JSON.parse(json)
    expect(parsed.count).toBe(0)
    expect(parsed.checkins).toEqual([])
  })
})
