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
  })
})
