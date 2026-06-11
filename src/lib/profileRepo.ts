import { db } from './db'
import {
  UserProgramProfileSchema,
  legacyGoalToPrimaryGoal,
  ExerciseDislike,
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
/**
 * Pre-parse migration for stored profiles. Runs on raw JSON BEFORE Zod
 * validation so stored values that have since left the enum don't throw
 * and brick the user's app.
 *
 * 2026-05-24 — `aesthetic_preference` enum collapsed from the 5-value
 * myth-laden set (`toned_lean`, `muscle_size_bulk`, `strong_defined`,
 * `athletic`, `balanced`) to a 4-value research-honest set
 * (`build_muscle`, `get_stronger`, `balanced`, `none`). Old values map:
 *   - `toned_lean` → `build_muscle`   (user wanted hypertrophy; "tone" is diet)
 *   - `muscle_size_bulk` → `build_muscle`
 *   - `strong_defined` → `get_stronger`
 *   - `athletic` → `balanced`
 * Without this, every existing user's profile fails Zod parse on next load.
 *
 * 2026-06-09 — `exercise_dislikes` value `high_rep_cardio` was renamed
 * `cardio_machines` (51ff614, 2026-05-24) with no data migration: profiles
 * saved 2026-04-18 → 05-24 with that dislike failed Zod parse on load and
 * silently dumped the user back into onboarding. We remap the rename AND
 * defensively drop any dislike value that has since left the enum, so a
 * stale dislike can never brick a stored profile again.
 */
function migrateLegacyProfile(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return raw
  let obj = raw as Record<string, unknown>

  const pref = obj.aesthetic_preference
  if (typeof pref === 'string') {
    const remap: Record<string, string> = {
      toned_lean: 'build_muscle',
      muscle_size_bulk: 'build_muscle',
      strong_defined: 'get_stronger',
      athletic: 'balanced',
    }
    if (pref in remap) {
      obj = { ...obj, aesthetic_preference: remap[pref] }
    }
  }

  if (Array.isArray(obj.exercise_dislikes)) {
    const dislikeRemap: Record<string, string> = {
      high_rep_cardio: 'cardio_machines',
    }
    const known = new Set<string>(ExerciseDislike.options)
    // De-dupe via Set in case the remap collides with an already-present
    // value (e.g. ['high_rep_cardio', 'cardio_machines']).
    const migrated = [
      ...new Set(
        obj.exercise_dislikes
          .filter((d): d is string => typeof d === 'string')
          .map((d) => dislikeRemap[d] ?? d)
          .filter((d) => known.has(d)),
      ),
    ]
    obj = { ...obj, exercise_dislikes: migrated }
  }

  // 2026-06-10 — the 'lean_and_strong' hybrid goal card was removed from
  // onboarding (the pick-two multi-select expresses it as get_stronger +
  // build_muscle, and "lean" as a training outcome is the body-composition
  // myth the research pass stripped). Stored profiles expand
  // deterministically: the hybrid becomes 'get_stronger' in place, and
  // 'build_muscle' is appended only when a second slot is free — the user's
  // OTHER explicit pick always survives over the implied half.
  if (obj.primary_goal === 'lean_and_strong') {
    obj = { ...obj, primary_goal: 'get_stronger' }
  }
  if (
    Array.isArray(obj.primary_goals) &&
    obj.primary_goals.includes('lean_and_strong')
  ) {
    const expanded = [
      ...new Set(
        obj.primary_goals
          .filter((g): g is string => typeof g === 'string')
          .map((g) => (g === 'lean_and_strong' ? 'get_stronger' : g)),
      ),
    ]
    if (expanded.length < 2 && !expanded.includes('build_muscle')) {
      expanded.push('build_muscle')
    }
    obj = { ...obj, primary_goals: expanded.slice(0, 2) }
  }

  return obj
}

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
 * Marks the row as dirty (synced: false) and fires an async push to
 * Supabase. Caller does NOT await the push — Dexie is the immediate
 * source of truth for the next render; the cloud catches up in the
 * background.
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
  // Fire-and-forget cloud sync. On error the row stays dirty so the
  // next `saveProfileLocal` (or an explicit syncProfileUp) will retry.
  // Skipped during tests where Supabase env is unset — syncProfileUp
  // is a no-op against the stub client anyway.
  void syncProfileUp(userId).catch((err) => {
    console.warn('syncProfileUp (background) failed', err)
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
    UserProgramProfileSchema.parse(migrateLegacyProfile(JSON.parse(row.profile_json))),
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
 *
 * Last-write-wins guard (2026-06-10 resurrection-sweep audit): when the
 * LOCAL row is synced but strictly NEWER than the cloud copy (only possible
 * when the cloud rolled back — e.g. a backup restore around a project
 * pause), we keep the local profile, flip it dirty, and push it back up to
 * repair the cloud. Without this the older cloud copy silently replaced the
 * fresh local one AND got marked synced, making the rollback permanent.
 */
export async function pullProfileFromCloud(userId: string): Promise<UserProgramProfile | null> {
  const localRow = await db.userProgramProfiles.get(userId)
  if (localRow && !localRow.synced) {
    // Local has unsynced edits — don't clobber.
    return ensurePrimaryGoal(
      UserProgramProfileSchema.parse(migrateLegacyProfile(JSON.parse(localRow.profile_json))),
    )
  }

  const { data, error } = await supabase
    .from('user_program_profiles')
    .select('profile, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  // Date.parse instead of string compare: local timestamps are
  // `toISOString()` ("...Z") while Postgres returns "+00:00" offsets —
  // lexicographic comparison across the two formats is not safe.
  const localMs = localRow ? Date.parse(localRow.updated_at) : NaN
  const cloudMs = typeof data.updated_at === 'string' ? Date.parse(data.updated_at) : NaN
  if (localRow && Number.isFinite(localMs) && Number.isFinite(cloudMs) && localMs > cloudMs) {
    // Cloud is older than our already-synced local row — keep local,
    // mark it dirty, and repair the cloud in the background.
    await db.userProgramProfiles.update(userId, { synced: false })
    void syncProfileUp(userId).catch((err) => {
      console.warn('pullProfileFromCloud: cloud-repair push failed', err)
    })
    return ensurePrimaryGoal(
      UserProgramProfileSchema.parse(migrateLegacyProfile(JSON.parse(localRow.profile_json))),
    )
  }

  const profile = ensurePrimaryGoal(UserProgramProfileSchema.parse(migrateLegacyProfile(data.profile)))
  // Single write: validated profile + synced flag in one put.
  await db.userProgramProfiles.put({
    user_id: userId,
    profile_json: JSON.stringify(profile),
    updated_at: data.updated_at ?? new Date().toISOString(),
    synced: true,
  })
  return profile
}
