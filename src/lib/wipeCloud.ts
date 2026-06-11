// Cloud-side "Start fresh" — deletes every training-data row the sync layer
// (and local-first persistence) pushed for this user. Without this, the
// next sign-in pulls the cloud profile back down and the local wipe appears
// to do nothing. The `profiles` display row is intentionally kept: it
// belongs to the ACCOUNT (recreated by the signup trigger), not the
// training data.
import { isSupabaseConfigured, supabase } from './supabase'

// set_logs carries its own user_id column, so one pass per table works —
// no need to cascade through session_logs.
const USER_TABLES = [
  'user_program_profiles',
  'session_checkins',
  'mesocycles',
  'session_logs',
  'set_logs',
  'cardio_logs',
  'personal_records',
  'last_weights',
  'user_goals',
] as const

export interface CloudWipeResult {
  ok: boolean
  /** Tables whose delete failed (RLS, network) — cloud copy may survive. */
  failed: string[]
}

/**
 * Delete the user's rows from every cloud table. Returns per-table failures
 * instead of throwing so the caller can decide whether to proceed with the
 * local wipe (a half-wiped cloud still resurrects data on next sign-in).
 */
export async function wipeCloudData(userId: string): Promise<CloudWipeResult> {
  if (!isSupabaseConfigured) return { ok: true, failed: [] }

  const failed: string[] = []
  await Promise.all(
    USER_TABLES.map(async (table) => {
      try {
        const { error } = await supabase.from(table).delete().eq('user_id', userId)
        if (error) failed.push(table)
      } catch {
        failed.push(table)
      }
    }),
  )
  return { ok: failed.length === 0, failed }
}
