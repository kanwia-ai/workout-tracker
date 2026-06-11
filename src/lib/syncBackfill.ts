// One-call "push everything that never made it to the cloud" sweep.
//
// Why this exists (2026-06-10 resurrection-sweep audit): every save path
// writes Dexie `synced: false` and fires ONE background push. If that push
// fails (backend paused, offline, flaky network) the row stays dirty forever
// for immutable data — sessions, set logs, cardio — because nothing ever
// re-saves them. The per-module sweeps (`syncDirtyPersistence`,
// `syncDirtyCheckins`, `syncProfileUp`) existed but had no caller wired to
// "the backend is back" moments, so weeks of workouts logged during the
// 2026-05/06 Supabase pause sat local-only, one sign-out (wipeUserData)
// away from permanent deletion.
//
// Call sites:
//   - useAuth sign-in resolution — backend is provably reachable, flush.
//   - useAuth signOut — flush BEFORE supabase.auth.signOut(), because the
//     RLS policies need the live session for the upserts to land.
//
// Best-effort by design: each class is isolated so one failing table never
// blocks the others, and per-row failures inside the sweeps are already
// non-fatal. Returns `ok: false` when anything stayed dirty so callers can
// surface a sync-status hint instead of pretending everything landed.
import { syncProfileUp } from './profileRepo'
import { syncDirtyCheckins } from './checkins'
import { syncDirtyPersistence } from './persistence'
import { db } from './db'

export interface FlushResult {
  ok: boolean
  /** Row classes that still have dirty rows after the flush attempt. */
  stillDirty: string[]
}

/**
 * Push every dirty (synced: false) row this user owns up to Supabase:
 * program profile, session check-ins, and all workout persistence tables
 * (sessions, set logs, cardio, PRs, last-used weights).
 *
 * Never throws — sign-in and sign-out must not be blocked by a flaky
 * backfill. Inspect the returned `FlushResult` for partial failure.
 */
export async function flushDirtyToCloud(userId: string): Promise<FlushResult> {
  // Profile first: it's a single row and the cheapest repair for the
  // stale-resurrection class (old cloud profile restored onto a new device).
  try {
    await syncProfileUp(userId)
  } catch (err) {
    console.warn('flushDirtyToCloud: profile push failed — row stays queued', err)
  }

  try {
    await syncDirtyCheckins(userId)
  } catch (err) {
    console.warn('flushDirtyToCloud: check-in sweep failed', err)
  }

  try {
    await syncDirtyPersistence(userId)
  } catch (err) {
    console.warn('flushDirtyToCloud: persistence sweep failed', err)
  }

  // Report what's still dirty so callers can reflect reality in the UI.
  const stillDirty: string[] = []
  try {
    const profileRow = await db.userProgramProfiles.get(userId)
    if (profileRow && !profileRow.synced) stillDirty.push('profile')

    const counts: Array<[label: string, dirty: number]> = [
      ['checkins', await db.sessionCheckins.where('user_id').equals(userId).filter((r) => !r.synced).count()],
      ['sessions', await db.sessionLogs.where('user_id').equals(userId).filter((r) => !r.synced).count()],
      ['sets', await db.setLogs.where('user_id').equals(userId).filter((r) => !r.synced).count()],
      ['cardio', await db.cardioLogs.where('user_id').equals(userId).filter((r) => !r.synced).count()],
      ['prs', await db.personalRecords.where('user_id').equals(userId).filter((r) => !r.synced).count()],
      ['weights', await db.userWeights.where('user_id').equals(userId).filter((r) => !r.synced).count()],
    ]
    for (const [label, dirty] of counts) {
      if (dirty > 0) stillDirty.push(label)
    }
  } catch (err) {
    // Dexie read failed — can't verify, report unknown as not-ok.
    console.warn('flushDirtyToCloud: dirty-count check failed', err)
    return { ok: false, stillDirty: ['unknown'] }
  }

  return { ok: stillDirty.length === 0, stillDirty }
}
