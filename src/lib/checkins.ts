// Post-workout check-in persistence. One SessionCheckin per finished
// session, keyed by session_id. Check-ins feed the adaptive-feedback loop:
// next-session warmup tweaks + end-of-block re-planning.
//
// Schema lives in src/types/checkin.ts and must not drift — a sibling agent
// consumes the exact shape exported there.
//
// Sync is deliberately out of scope. We mark every row synced: false so a
// future sync worker can pick them up without another migration.
import { db } from './db'
import { SessionCheckinSchema, type SessionCheckin } from '../types/checkin'

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
  await db.sessionCheckins.put(row)
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
