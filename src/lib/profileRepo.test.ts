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

  describe('syncProfileUp', () => {
    it('upserts dirty row to supabase and marks local synced', async () => {
      await saveProfileLocal('user-1', VALID_PROFILE)

      const upsert = vi.fn().mockResolvedValue({ error: null })
      vi.spyOn(supabase, 'from').mockReturnValue({ upsert } as any)

      await syncProfileUp('user-1')

      expect(supabase.from).toHaveBeenCalledWith('user_program_profiles')
      expect(upsert).toHaveBeenCalledTimes(1)
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

      const from = vi.spyOn(supabase, 'from')
      const result = await pullProfileFromCloud('user-1')
      expect(from).not.toHaveBeenCalled()
      // Returned profile is the unsynced local profile + derived primary_goal.
      expect(result).toMatchObject(localProfile)
      expect(result?.primary_goal).toBe('mobility') // rehab → mobility
      const row = await db.userProgramProfiles.get('user-1')
      expect(row?.synced).toBe(false)
    })
  })
})
