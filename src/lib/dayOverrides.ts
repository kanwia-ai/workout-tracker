import { db, type LocalDayOverride } from './db'

/** Local-date ISO (YYYY-MM-DD) for the given Date. */
export function localDateISO(d: Date = new Date()): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function keyFor(userId: string, dateISO: string): string {
  return `${userId}:${dateISO}`
}

/** All overrides belonging to `userId`. Used for reactive lookup. */
export async function loadOverridesForUser(
  userId: string,
): Promise<LocalDayOverride[]> {
  return db.dayOverrides.where('user_id').equals(userId).toArray()
}

/** Most recent override for `userId` on `dateISO`, or null. */
export async function getOverrideForDate(
  userId: string,
  dateISO: string,
): Promise<LocalDayOverride | null> {
  const row = await db.dayOverrides.get(keyFor(userId, dateISO))
  return row ?? null
}

/**
 * Upsert an override: "on {date}, use session {sessionId} from the plan".
 * Writes to Dexie, marks as unsynced so the Supabase sync layer can pick it
 * up later.
 */
export async function setOverrideForDate(
  userId: string,
  dateISO: string,
  sessionId: string,
): Promise<LocalDayOverride> {
  const row: LocalDayOverride = {
    id: keyFor(userId, dateISO),
    user_id: userId,
    date: dateISO,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    synced: false,
  }
  await db.dayOverrides.put(row)
  return row
}

/** Remove an override so the scheduled session (or rest) returns. */
export async function clearOverrideForDate(
  userId: string,
  dateISO: string,
): Promise<void> {
  await db.dayOverrides.delete(keyFor(userId, dateISO))
}

/** Drop overrides older than `cutoffDays` days. Cleanup helper. */
export async function pruneOldOverrides(
  userId: string,
  cutoffDays = 14,
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - cutoffDays)
  const cutoffISO = localDateISO(cutoff)
  const rows = await db.dayOverrides
    .where('user_id')
    .equals(userId)
    .toArray()
  const stale = rows.filter((r) => r.date < cutoffISO)
  if (stale.length === 0) return 0
  await db.dayOverrides.bulkDelete(stale.map((r) => r.id))
  return stale.length
}
