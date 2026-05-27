// Post-workout check-in persistence. One SessionCheckin per finished
// session, keyed by session_id. Check-ins feed the adaptive-feedback loop:
// next-session warmup tweaks + end-of-block re-planning.
//
// Schema lives in src/types/checkin.ts and must not drift — a sibling agent
// consumes the exact shape exported there.
//
// Sync (2026-05-27): Dexie is the cache, Supabase is the source of truth.
// Every save marks the row dirty (synced: false) and fires a background
// push. Pull happens on sign-in (see pullCheckinsFromCloud below).
import { db } from './db'
import { SessionCheckinSchema, type SessionCheckin } from '../types/checkin'
import { supabase } from './supabase'

/**
 * Validate and persist a check-in to Dexie. Overwrites any existing row
 * for the same session_id. Throws a ZodError on invalid input — nothing
 * is written in that case.
 *
 * We always force synced: false on save. The caller shouldn't have to care
 * about the sync flag; a future worker will flip it after upload.
 */
export async function saveCheckin(checkin: SessionCheckin): Promise<void> {
  const parsed = SessionCheckinSchema.parse(checkin)
  const row = {
    session_id: parsed.session_id,
    user_id: parsed.user_id,
    completed_at: parsed.completed_at,
    week_number: parsed.week_number,
    checkin_json: JSON.stringify({ ...parsed, synced: false }),
    synced: false,
  }
  // Be loud at the persistence boundary. Callers (WorkoutView) decide
  // whether to surface — but the console + thrown error makes silent Dexie
  // failures impossible to miss in devtools.
  try {
    await db.sessionCheckins.put(row)
  } catch (err) {
    console.error('saveCheckin: Dexie put failed', { session_id: parsed.session_id, err })
    throw err
  }
  // Fire-and-forget cloud sync. Failure leaves the row dirty so the
  // next checkin save (or a manual `syncDirtyCheckins` call from the
  // sync hook) retries.
  void syncCheckinUp(parsed.session_id).catch((err) => {
    console.warn('syncCheckinUp (background) failed', err)
  })
}

/**
 * Push a single dirty check-in to Supabase. No-op if the row is missing
 * or already synced. On success flips the local synced flag.
 *
 * The cloud row stores the full SessionCheckin JSON in a `checkin` jsonb
 * column so we don't have to migrate Postgres every time we extend the
 * client-side schema. Indexed columns (user_id, completed_at) are
 * mirrored at the top level for query speed.
 */
export async function syncCheckinUp(sessionId: string): Promise<void> {
  const row = await db.sessionCheckins.get(sessionId)
  if (!row || row.synced) return
  const { error } = await supabase.from('session_checkins').upsert({
    session_id: row.session_id,
    user_id: row.user_id,
    completed_at: row.completed_at,
    week_number: row.week_number,
    checkin: JSON.parse(row.checkin_json),
  })
  if (error) throw error
  await db.sessionCheckins.update(sessionId, { synced: true })
}

/**
 * Push every dirty check-in for a user. Used by the background sync
 * driver on sign-in (in case the previous session ended before the
 * fire-and-forget push completed) and as a manual retry hook.
 *
 * Failures on individual rows are logged but don't stop the loop —
 * partial progress is better than none, and the next attempt picks up
 * the still-dirty rows.
 */
export async function syncDirtyCheckins(userId: string): Promise<void> {
  const dirty = await db.sessionCheckins
    .where('user_id')
    .equals(userId)
    .filter((r) => !r.synced)
    .toArray()
  for (const row of dirty) {
    try {
      await syncCheckinUp(row.session_id)
    } catch (err) {
      console.warn('syncDirtyCheckins: row failed', { session_id: row.session_id, err })
    }
  }
}

/**
 * Pull every cloud check-in for a user and merge into Dexie. Used on
 * sign-in so a fresh-Dexie device gets the user's check-in history.
 *
 * Merge strategy: last-write-wins by `completed_at`. If a row exists
 * locally with a newer `completed_at` (e.g. the user logged on this
 * device after the cloud row was written), we keep the local copy.
 *
 * Errors propagate so the caller (useAuth / a sync driver) can flip
 * sync status to 'error' and surface a banner.
 */
export async function pullCheckinsFromCloud(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('session_checkins')
    .select('session_id, user_id, completed_at, week_number, checkin')
    .eq('user_id', userId)
  if (error) throw error
  if (!data || data.length === 0) return

  for (const cloud of data) {
    const cloudCheckin = SessionCheckinSchema.safeParse(cloud.checkin)
    if (!cloudCheckin.success) {
      console.warn('pullCheckinsFromCloud: skipping malformed row', { session_id: cloud.session_id })
      continue
    }
    const local = await db.sessionCheckins.get(cloud.session_id)
    if (local && local.completed_at >= cloud.completed_at && local.synced) {
      // Local is at least as fresh and already synced — nothing to do.
      continue
    }
    if (local && !local.synced) {
      // Local has unpushed edits — don't clobber. The next push cycle
      // will reconcile by upserting our newer copy.
      continue
    }
    await db.sessionCheckins.put({
      session_id: cloud.session_id,
      user_id: cloud.user_id,
      completed_at: cloud.completed_at,
      week_number: cloud.week_number,
      checkin_json: JSON.stringify(cloudCheckin.data),
      synced: true,
    })
  }
}

/**
 * Load the stored check-in for a given session, or null if none exists.
 * Throws if the stored JSON is malformed — that's a migration bug, not a
 * user error, and we'd rather surface it than silently return partial data.
 */
export async function loadCheckin(sessionId: string): Promise<SessionCheckin | null> {
  const row = await db.sessionCheckins.get(sessionId)
  if (!row) return null
  return SessionCheckinSchema.parse(JSON.parse(row.checkin_json))
}

/**
 * List every check-in for a user, newest-first. Optionally filter to only
 * check-ins completed at/after `sinceISO` so the end-of-block re-planner can
 * pull "just this block" cheaply.
 *
 * Sort is done in-memory after the index fetch — a Dexie compound index on
 * [user_id, completed_at] would be cleaner, but at our row volumes this is
 * indistinguishable from free.
 */
export async function listCheckinsForUser(
  userId: string,
  sinceISO?: string,
): Promise<SessionCheckin[]> {
  const rows = await db.sessionCheckins.where('user_id').equals(userId).toArray()
  const parsed = rows
    .map((r) => SessionCheckinSchema.parse(JSON.parse(r.checkin_json)))
    .filter((c) => (sinceISO ? c.completed_at >= sinceISO : true))
  parsed.sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
  return parsed
}

/**
 * Export every check-in for a user as a pretty-printed JSON string, ready
 * for download or hand-off to an LLM. Wraps the array in an object so
 * consumers can extend the payload (e.g. add profile snapshot) without a
 * breaking schema change.
 */
export async function exportCheckinsForUser(userId: string): Promise<string> {
  const checkins = await listCheckinsForUser(userId)
  const payload = {
    user_id: userId,
    exported_at: new Date().toISOString(),
    count: checkins.length,
    checkins,
  }
  return JSON.stringify(payload, null, 2)
}
