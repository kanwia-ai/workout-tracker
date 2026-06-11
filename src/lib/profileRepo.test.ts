import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveProfileLocal, loadProfileLocal, syncProfileUp, pullProfileFromCloud } from './profileRepo'
import { db } from './db'
import { supabase } from './supabase'
import type { UserProgramProfile } from '../types/profile'

const VALID_PROFILE: UserProgramProfile = {
  goal: 'glutes',
  sessions_per_week: 4,
  training_age_months: 18,
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: 'desk',
}

describe('profileRepo', () => {
  beforeEach(async () => {
    await db.userProgramProfiles.clear()
    vi.restoreAllMocks()
  })

  it('round-trips a profile via Dexie', async () => {
    await saveProfileLocal('user-1', VALID_PROFILE)
    const loaded = await loadProfileLocal('user-1')
    expect(loaded?.goal).toBe('glutes')
    expect(loaded?.sessions_per_week).toBe(4)
  })

  it('loadProfileLocal returns null when no row exists for the user', async () => {
    const loaded = await loadProfileLocal('nonexistent-user')
    expect(loaded).toBeNull()
  })

  it('saveProfileLocal throws on invalid profile (sessions_per_week: 99)', async () => {
    const bad = { ...VALID_PROFILE, sessions_per_week: 99 } as unknown as UserProgramProfile
    await expect(saveProfileLocal('user-1', bad)).rejects.toThrow()
    // Should not have written anything
    const row = await db.userProgramProfiles.get('user-1')
    expect(row).toBeUndefined()
  })

  it('saveProfileLocal marks row as synced: false', async () => {
    await saveProfileLocal('user-1', VALID_PROFILE)
    const row = await db.userProgramProfiles.get('user-1')
    expect(row?.synced).toBe(false)
  })

  // ─── Legacy aesthetic_preference migration ─────────────────────────
  // On 2026-05-24 the aesthetic_preference enum collapsed from 5 myth-laden
  // values to 4 research-honest ones. Without a pre-parse migration every
  // stored profile bricks the user's app on load. These tests pin that down.
  describe('legacy aesthetic_preference migration', () => {
    async function writeRawProfile(userId: string, raw: Record<string, unknown>) {
      await db.userProgramProfiles.put({
        user_id: userId,
        profile_json: JSON.stringify(raw),
        updated_at: new Date().toISOString(),
        synced: true,
      })
    }

    it('migrates toned_lean → build_muscle on load', async () => {
      await writeRawProfile('user-legacy', { ...VALID_PROFILE, aesthetic_preference: 'toned_lean' })
      const loaded = await loadProfileLocal('user-legacy')
      expect(loaded?.aesthetic_preference).toBe('build_muscle')
    })

    it('migrates muscle_size_bulk → build_muscle', async () => {
      await writeRawProfile('user-legacy', { ...VALID_PROFILE, aesthetic_preference: 'muscle_size_bulk' })
      const loaded = await loadProfileLocal('user-legacy')
      expect(loaded?.aesthetic_preference).toBe('build_muscle')
    })

    it('migrates strong_defined → get_stronger', async () => {
      await writeRawProfile('user-legacy', { ...VALID_PROFILE, aesthetic_preference: 'strong_defined' })
      const loaded = await loadProfileLocal('user-legacy')
      expect(loaded?.aesthetic_preference).toBe('get_stronger')
    })

    it('migrates athletic → balanced', async () => {
      await writeRawProfile('user-legacy', { ...VALID_PROFILE, aesthetic_preference: 'athletic' })
      const loaded = await loadProfileLocal('user-legacy')
      expect(loaded?.aesthetic_preference).toBe('balanced')
    })

    it('leaves already-current values alone', async () => {
      await writeRawProfile('user-current', { ...VALID_PROFILE, aesthetic_preference: 'build_muscle' })
      const loaded = await loadProfileLocal('user-current')
      expect(loaded?.aesthetic_preference).toBe('build_muscle')
    })
  })

  // ─── Legacy exercise_dislikes migration ────────────────────────────
  // `high_rep_cardio` was renamed `cardio_machines` (51ff614, 2026-05-24)
  // with no data migration. Profiles saved 2026-04-18 → 05-24 with that
  // dislike failed Zod parse on load — the user was silently dumped back
  // into onboarding as if brand new. These tests pin the remap + the
  // defensive "drop anything unknown" behavior.
  describe('legacy exercise_dislikes migration', () => {
    it('loads an exact April-era stored profile (high_rep_cardio + myth aesthetic + specific_target, no units/active_minutes/preferred_days)', async () => {
      // Byte-faithful shape of a profile saved between 2026-04-18 and
      // 2026-05-24: high_rep_cardio dislike, myth-taxonomy aesthetic value,
      // the since-removed `specific_target` field, and none of the newer
      // fields (units / active_minutes / preferred_days).
      const aprilProfile = {
        goal: 'glutes',
        sessions_per_week: 4,
        training_age_months: 24,
        equipment: ['full_gym'],
        injuries: [
          { part: 'left_meniscus', severity: 'modify', note: 'old tear, avoid deep flexion' },
          { part: 'lower_back', severity: 'chronic' },
        ],
        time_budget_min: 60,
        sex: 'female',
        posture_notes: 'desk job, tight hip flexors',
        primary_goal: 'build_muscle',
        muscle_priority: ['glutes', 'hamstrings'],
        aesthetic_preference: 'toned_lean',
        exercise_dislikes: ['high_rep_cardio', 'burpees'],
        want_demo_videos: true,
        age: 31,
        weight_kg: 70,
        height_cm: 170,
        first_name: 'Kyra',
        specific_target: 'glutes',
      }
      await db.userProgramProfiles.put({
        user_id: 'user-april',
        profile_json: JSON.stringify(aprilProfile),
        updated_at: '2026-04-20T10:00:00.000Z',
        synced: true,
      })

      const loaded = await loadProfileLocal('user-april')
      expect(loaded).not.toBeNull()
      expect(loaded?.exercise_dislikes).toEqual(['cardio_machines', 'burpees'])
      expect(loaded?.aesthetic_preference).toBe('build_muscle')
      // Post-parse back-fills still apply on top of the pre-parse migration.
      expect(loaded?.units).toBe('metric')
      expect(loaded?.active_minutes).toBe(60)
      expect(loaded?.first_name).toBe('Kyra')
    })

    it('drops unknown dislike values instead of failing the parse', async () => {
      await db.userProgramProfiles.put({
        user_id: 'user-unknown-dislike',
        profile_json: JSON.stringify({
          ...VALID_PROFILE,
          exercise_dislikes: ['high_rep_cardio', 'vibes_based_cardio', 'burpees'],
        }),
        updated_at: new Date().toISOString(),
        synced: true,
      })
      const loaded = await loadProfileLocal('user-unknown-dislike')
      expect(loaded?.exercise_dislikes).toEqual(['cardio_machines', 'burpees'])
    })

    it('dedupes when the remap collides with an already-present value', async () => {
      await db.userProgramProfiles.put({
        user_id: 'user-dupe-dislike',
        profile_json: JSON.stringify({
          ...VALID_PROFILE,
          exercise_dislikes: ['high_rep_cardio', 'cardio_machines'],
        }),
        updated_at: new Date().toISOString(),
        synced: true,
      })
      const loaded = await loadProfileLocal('user-dupe-dislike')
      expect(loaded?.exercise_dislikes).toEqual(['cardio_machines'])
    })

    it('leaves already-current dislike values alone', async () => {
      await db.userProgramProfiles.put({
        user_id: 'user-current-dislike',
        profile_json: JSON.stringify({
          ...VALID_PROFILE,
          exercise_dislikes: ['burpees', 'box_jumps'],
        }),
        updated_at: new Date().toISOString(),
        synced: true,
      })
      const loaded = await loadProfileLocal('user-current-dislike')
      expect(loaded?.exercise_dislikes).toEqual(['burpees', 'box_jumps'])
    })
  })

  describe('syncProfileUp', () => {
    it('upserts dirty row to supabase and marks local synced', async () => {
      // Stub BEFORE save so the background fire-and-forget sync that
      // saveProfileLocal triggers internally hits the same mock and gets
      // counted alongside the explicit syncProfileUp call. We assert >= 1
      // call rather than exactly 1 since the background sync may or may
      // not have flushed by the time we re-call syncProfileUp.
      const upsert = vi.fn().mockResolvedValue({ error: null })
      vi.spyOn(supabase, 'from').mockReturnValue({ upsert } as any)

      await saveProfileLocal('user-1', VALID_PROFILE)
      // Give the background promise a tick to settle. Without this the
      // assertion below may race against the unresolved fire-and-forget.
      await new Promise((r) => setTimeout(r, 0))
      await syncProfileUp('user-1')

      expect(supabase.from).toHaveBeenCalledWith('user_program_profiles')
      expect(upsert).toHaveBeenCalled()
      const arg = upsert.mock.calls[0][0]
      expect(arg.user_id).toBe('user-1')
      expect(arg.profile).toEqual(VALID_PROFILE)
      expect(typeof arg.updated_at).toBe('string')

      const row = await db.userProgramProfiles.get('user-1')
      expect(row?.synced).toBe(true)
    })

    it('is a no-op when row is missing', async () => {
      const from = vi.spyOn(supabase, 'from')
      await syncProfileUp('missing-user')
      expect(from).not.toHaveBeenCalled()
    })

    it('is a no-op when row is already synced', async () => {
      await saveProfileLocal('user-1', VALID_PROFILE)
      await db.userProgramProfiles.update('user-1', { synced: true })

      const from = vi.spyOn(supabase, 'from')
      await syncProfileUp('user-1')
      expect(from).not.toHaveBeenCalled()
    })

    it('throws and does not mark synced when supabase returns an error', async () => {
      await saveProfileLocal('user-1', VALID_PROFILE)

      const upsert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
      vi.spyOn(supabase, 'from').mockReturnValue({ upsert } as any)

      await expect(syncProfileUp('user-1')).rejects.toBeTruthy()
      const row = await db.userProgramProfiles.get('user-1')
      expect(row?.synced).toBe(false)
    })
  })

  describe('pullProfileFromCloud', () => {
    function mockCloudProfile(data: unknown, error: unknown = null) {
      const maybeSingle = vi.fn().mockResolvedValue({ data, error })
      const eq = vi.fn().mockReturnValue({ maybeSingle })
      const select = vi.fn().mockReturnValue({ eq })
      vi.spyOn(supabase, 'from').mockReturnValue({ select } as any)
      return { select, eq, maybeSingle }
    }

    it('fetches from supabase, saves locally, marks synced, returns profile', async () => {
      const mocks = mockCloudProfile({ profile: VALID_PROFILE, updated_at: '2026-04-17T00:00:00Z' })
      const result = await pullProfileFromCloud('user-1')

      expect(supabase.from).toHaveBeenCalledWith('user_program_profiles')
      expect(mocks.select).toHaveBeenCalledWith('profile, updated_at')
      expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
      // pullProfileFromCloud fills in the derived `primary_goal` on load
      // (graceful v1 → v2 fallback) so the returned profile is a superset of
      // VALID_PROFILE. The stored row reflects that inference too.
      expect(result).toMatchObject(VALID_PROFILE)
      expect(result?.primary_goal).toBe('build_muscle') // glutes → build_muscle

      const row = await db.userProgramProfiles.get('user-1')
      expect(row).toBeTruthy()
      expect(row?.synced).toBe(true)
      expect(JSON.parse(row!.profile_json)).toMatchObject(VALID_PROFILE)
    })

    it('returns null when no row exists in cloud', async () => {
      mockCloudProfile(null)
      const result = await pullProfileFromCloud('user-1')
      expect(result).toBeNull()
      const row = await db.userProgramProfiles.get('user-1')
      expect(row).toBeUndefined()
    })

    it('throws when supabase returns an error', async () => {
      mockCloudProfile(null, { message: 'network down' })
      await expect(pullProfileFromCloud('user-1')).rejects.toBeTruthy()
    })

    it('refuses to clobber unsynced local edits — returns local profile instead', async () => {
      const localProfile: UserProgramProfile = { ...VALID_PROFILE, goal: 'rehab' }
      await saveProfileLocal('user-1', localProfile)  // synced: false
      // saveProfileLocal triggers a background sync that hits supabase.from
      // internally. Wait for the microtask queue to drain so the spy below
      // sees a clean call counter — otherwise pullProfileFromCloud's
      // "no `from` call" assertion races with the still-pending background
      // push.
      await new Promise((r) => setTimeout(r, 10))
      // Force the row back to dirty in case the background sync (against
      // the stub client) flipped it. In a real env it would fail and
      // leave the row dirty; the stub returns no error → marks synced.
      await db.userProgramProfiles.update('user-1', { synced: false })

      const from = vi.spyOn(supabase, 'from')
      const result = await pullProfileFromCloud('user-1')
      // pullProfileFromCloud should short-circuit on dirty rows — no
      // fresh `from('user_program_profiles')` call.
      expect(from).not.toHaveBeenCalled()
      // Returned profile is the unsynced local profile + derived primary_goal.
      expect(result).toMatchObject(localProfile)
      expect(result?.primary_goal).toBe('mobility') // rehab → mobility
      const row = await db.userProgramProfiles.get('user-1')
      expect(row?.synced).toBe(false)
    })

    // ─── Last-write-wins rollback guard (2026-06-10 sync audit) ──────
    // If the cloud copy is OLDER than an already-synced local row (only
    // possible when the cloud rolled back, e.g. a backup restore around a
    // project pause), the pull must keep the local profile and repair the
    // cloud — not silently install the stale copy and mark it synced.
    describe('rollback guard (cloud older than synced local)', () => {
      function mockCloudWithUpsert(data: unknown) {
        const maybeSingle = vi.fn().mockResolvedValue({ data, error: null })
        const eq = vi.fn().mockReturnValue({ maybeSingle })
        const select = vi.fn().mockReturnValue({ eq })
        const upsert = vi.fn().mockResolvedValue({ error: null })
        vi.spyOn(supabase, 'from').mockReturnValue({ select, upsert } as any)
        return { upsert }
      }

      async function seedSyncedLocal(profile: UserProgramProfile, updatedAt: string) {
        await db.userProgramProfiles.put({
          user_id: 'user-1',
          profile_json: JSON.stringify(profile),
          updated_at: updatedAt,
          synced: true,
        })
      }

      it('keeps the newer local profile, flips it dirty, and pushes the repair', async () => {
        const localProfile: UserProgramProfile = { ...VALID_PROFILE, goal: 'rehab' }
        await seedSyncedLocal(localProfile, '2026-06-10T12:00:00.000Z')
        // Cloud copy is 9 days older AND uses the Postgres +00:00 offset
        // format — the compare must work across both timestamp styles.
        const staleCloud = { ...VALID_PROFILE, goal: 'glutes' }
        const { upsert } = mockCloudWithUpsert({
          profile: staleCloud,
          updated_at: '2026-06-01T00:00:00+00:00',
        })

        const result = await pullProfileFromCloud('user-1')

        // Local wins.
        expect(result).toMatchObject(localProfile)
        const row = await db.userProgramProfiles.get('user-1')
        expect(JSON.parse(row!.profile_json)).toMatchObject(localProfile)
        // Marked dirty so the repair push (or any later sweep) re-uploads it.
        expect(row?.synced).toBe(false)
        // Background repair push fired against the cloud table.
        await new Promise((r) => setTimeout(r, 10))
        expect(upsert).toHaveBeenCalled()
        const pushed = upsert.mock.calls[0][0]
        expect(pushed.user_id).toBe('user-1')
        expect(pushed.profile).toMatchObject(localProfile)
      })

      it('still lets a NEWER cloud copy replace an older synced local row', async () => {
        const localProfile: UserProgramProfile = { ...VALID_PROFILE, goal: 'rehab' }
        await seedSyncedLocal(localProfile, '2026-06-01T00:00:00.000Z')
        const freshCloud = { ...VALID_PROFILE, goal: 'glutes' }
        mockCloudWithUpsert({
          profile: freshCloud,
          updated_at: '2026-06-10T12:00:00+00:00',
        })

        const result = await pullProfileFromCloud('user-1')

        expect(result).toMatchObject(freshCloud)
        const row = await db.userProgramProfiles.get('user-1')
        expect(JSON.parse(row!.profile_json)).toMatchObject(freshCloud)
        expect(row?.synced).toBe(true)
      })

      it('treats an unparseable timestamp as no-rollback and takes the cloud copy', async () => {
        const localProfile: UserProgramProfile = { ...VALID_PROFILE, goal: 'rehab' }
        await seedSyncedLocal(localProfile, 'not-a-timestamp')
        const cloud = { ...VALID_PROFILE, goal: 'glutes' }
        mockCloudWithUpsert({ profile: cloud, updated_at: '2026-06-10T12:00:00+00:00' })

        const result = await pullProfileFromCloud('user-1')
        expect(result).toMatchObject(cloud)
        const row = await db.userProgramProfiles.get('user-1')
        expect(row?.synced).toBe(true)
      })
    })
  })
})
