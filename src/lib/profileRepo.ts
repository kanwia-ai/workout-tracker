import { db } from './db'
import { UserProgramProfileSchema, type UserProgramProfile } from '../types/profile'
import { supabase } from './supabase'

/**
 * Validate and persist a UserProgramProfile to the local Dexie store.
 * Marks the row as dirty (synced: false) so the next syncProfileUp() call
 * will push it to Supabase.
 *
 * Throws a ZodError if the profile fails schema validation — nothing is
 * written in that case.
 */
export async function saveProfileLocal(userId: string, profile: UserProgramProfile): Promise<void> {
  // Validate before touching IndexedDB so a bad profile never leaves a
  // partially-written row behind.
  UserProgramProfileSchema.parse(profile)
  await db.userProgramProfiles.put({
    user_id: userId,
    profile_json: JSON.stringify(profile),
    updated_at: new Date().toISOString(),
    synced: false,
  })
}

/**
 * Load the stored profile for a user from Dexie, or null if none exists.
 * Returns a parsed UserProgramProfile — will throw if the stored JSON is
 * malformed (migration bug), which is the right failure mode.
 */
export async function loadProfileLocal(userId: string): Promise<UserProgramProfile | null> {
  const row = await db.userProgramProfiles.get(userId)
  if (!row) return null
  return UserProgramProfileSchema.parse(JSON.parse(row.profile_json))
}

/**
 * Push a dirty local profile up to Supabase. No-op if the row is missing or
 * already synced. On success, flips the local synced flag. Throws the
 * Supabase error if the upsert fails (local row stays dirty so we'll retry
 * next time).
 */
export async function syncProfileUp(userId: string): Promise<void> {
  const row = await db.userProgramProfiles.get(userId)
  if (!row || row.synced) return
  const { error } = await supabase.from('user_program_profiles').upsert({
    user_id: userId,
    profile: JSON.parse(row.profile_json),
    updated_at: row.updated_at,
  })
  if (error) throw error
  await db.userProgramProfiles.update(userId, { synced: true })
}

/**
 * Fetch the cloud copy of a user's profile, persist it locally, and return it.
 * Returns null if no cloud row exists. After saving locally, immediately
 * marks the local row as synced (we just pulled it from the source of truth).
 */
export async function pullProfileFromCloud(userId: string): Promise<UserProgramProfile | null> {
  const { data } = await supabase
    .from('user_program_profiles')
    .select('profile')
    .eq('user_id', userId)
    .single()
  if (!data) return null
  const profile = UserProgramProfileSchema.parse(data.profile)
  await saveProfileLocal(userId, profile)
  await db.userProgramProfiles.update(userId, { synced: true })
  return profile
}
