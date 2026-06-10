// Regression test for loadLatestMesocycleForUser — 2026-06-10.
//
// Bug: `.reverse().sortBy('generated_at')` returns DESCENDING order in
// Dexie, and the loader then took `rows[rows.length - 1]` — the OLDEST
// mesocycle. Every regenerate persisted the new block correctly and then
// the app loaded the user's first-ever plan, silently discarding the
// regeneration (including the nuance layer's coaching annotations).

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { loadLatestMesocycleForUser } from './planGen'

const USER = 'loader-test-user'

function sessionsJson(tag: string): string {
  return JSON.stringify([
    {
      id: `session-${tag}-wk1-s1`,
      week_number: 1,
      ordinal: 1,
      focus: ['glutes'],
      title: `block ${tag}`,
      subtitle: 'LOWER · PUSH',
      estimated_minutes: 60,
      day_of_week: 0,
      rationale: `engine rationale for ${tag}`,
      status: 'upcoming',
      exercises: [
        {
          library_id: 'fedb:hip-thrust',
          name: 'Barbell Hip Thrust',
          sets: 3,
          reps: '8-12',
          rir: 2,
          rest_seconds: 120,
          role: 'accessory',
          warmup_sets: [],
        },
      ],
    },
  ])
}

const profileJson = JSON.stringify({
  goal: 'aesthetics',
  sessions_per_week: 4,
  training_age_months: 12,
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: '',
})

describe('loadLatestMesocycleForUser', () => {
  beforeEach(async () => {
    await db.mesocycles.clear()
  })

  it('returns the NEWEST mesocycle, not the oldest', async () => {
    await db.mesocycles.put({
      id: 'meso-old',
      user_id: USER,
      generated_at: '2026-04-01T10:00:00.000Z',
      length_weeks: 6,
      sessions_json: sessionsJson('old'),
      profile_snapshot_json: profileJson,
      synced: false,
    })
    await db.mesocycles.put({
      id: 'meso-new',
      user_id: USER,
      generated_at: '2026-06-10T10:00:00.000Z',
      length_weeks: 6,
      sessions_json: sessionsJson('new'),
      profile_snapshot_json: profileJson,
      synced: false,
      rationale: 'block-level coach rationale',
      cited_entries_json: JSON.stringify(['progressive-overload']),
    })

    const plan = await loadLatestMesocycleForUser(USER)
    expect(plan).not.toBeNull()
    expect(plan!.id).toBe('meso-new')
    // Block-level nuance fields round-trip through persistence.
    expect(plan!.rationale).toBe('block-level coach rationale')
    expect(plan!.cited_entries).toEqual(['progressive-overload'])
  })

  it('returns null for a user with no plans', async () => {
    expect(await loadLatestMesocycleForUser('nobody')).toBeNull()
  })
})
