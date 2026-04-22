import { db } from './db'
import {
  UserProgramProfileSchema,
  legacyGoalToPrimaryGoal,
  type UserProgramProfile,
} from '../types/profile'
import { supabase } from './supabase'

/**
 * Graceful v1 → v2 fallback: if a stored profile has no `primary_goal`, infer
 * it from the legacy `goal` field so downstream code (onboarding summary,
 * personalization pipeline) sees a fully-populated profile without a forced
 * migration. Pure; called after Zod parsing so the profile is already valid.
 *
 * Also migrates `primary_goal` (single) → `primary_goals` (multi) so the new
 * multi-select aware UI never sees a blank goal list. Back-fills `units` to
 * 'metric' (legacy default — prior profiles were metric-only) and mirrors
 * `time_budget_min` into `active_minutes` when the new field is missing so
 * the planner prompt has a number to cap sets by either way.
 */
function ensurePrimaryGoal(profile: UserProgramProfile): UserProgramProfile {
  const withPrimary: UserProgramProfile = profile.primary_goal
    ? profile
    : { ...profile, primary_goal: legacyGoalToPrimaryGoal(profile.goal) }

  const withGoals: UserProgramProfile =
    withPrimary.primary_goals && withPrimary.primary_goals.length > 0
      ? withPrimary
      : {
          ...withPrimary,
          primary_goals: withPrimary.primary_goal
            ? [withPrimary.primary_goal]
            : undefined,
        }

  const withUnits: UserProgramProfile =
    withGoals.units !== undefined
      ? withGoals
      : { ...withGoals, units: 'metric' }

  // Legacy profiles only stored total gym time in `time_budget_min`. Treat
  // that as the active-minutes proxy rather than forcing a re-prompt — close
  // enough for the planner, and users can edit in Settings once it ships.
  const withActive: UserProgramProfile =
    withUnits.active_minutes !== undefined
      ? withUnits
      : { ...withUnits, active_minutes: withUnits.time_budget_min }

  return withActive
}

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
  return ensurePrimaryGoal(
    UserProgramProfileSchema.parse(JSON.parse(row.profile_json)),
  )
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
 * Returns null if no cloud row exists. Throws on Supabase errors so callers
 * can distinguish "not found" (null) from "network failed" (throw).
 *
 * Refuses to overwrite a dirty local row — if the user has unsynced local
 * edits, those win and this pull is a no-op that returns the local profile.
 * TODO: compare updated_at and offer last-write-wins or a merge prompt before MVP ships.
 */
export async function pullProfileFromCloud(userId: string): Promise<UserProgramProfile | null> {
  const localRow = await db.userProgramProfiles.get(userId)
  if (localRow && !localRow.synced) {
    // Local has unsynced edits — don't clobber.
    return ensurePrimaryGoal(
      UserProgramProfileSchema.parse(JSON.parse(localRow.profile_json)),
    )
  }

  const { data, error } = await supabase
    .from('user_program_profiles')
    .select('profile, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const profile = ensurePrimaryGoal(UserProgramProfileSchema.parse(data.profile))
  // Single write: validated profile + synced flag in one put.
  await db.userProgramProfiles.put({
    user_id: userId,
    profile_json: JSON.stringify(profile),
    updated_at: data.updated_at ?? new Date().toISOString(),
    synced: true,
  })
  return profile
}
