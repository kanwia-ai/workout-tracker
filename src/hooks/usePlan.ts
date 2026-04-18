import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { loadMesocycle } from '../lib/planGen'
import type { Mesocycle } from '../types/plan'

/**
 * Reactive hook that loads the user's latest mesocycle from Dexie.
 *
 * Uses `useLiveQuery` to re-run whenever the `mesocycles` table changes, so
 * after `generatePlan` completes the WorkoutView updates without a manual
 * refresh. Parses the Dexie row (with JSON-stringified `sessions` /
 * `profile_snapshot` fields) via `loadMesocycle`, which re-validates the shape.
 *
 * Returns `{ plan: null, loading: true }` while the first query resolves,
 * `{ plan: null, loading: false }` once we've confirmed no plan exists, and
 * `{ plan, loading: false }` once a row is found and parsed.
 */
export function usePlan(userId: string): { plan: Mesocycle | null; loading: boolean } {
  // useLiveQuery returns `undefined` until the first query resolves. We
  // distinguish "loading" (undefined) from "confirmed missing" (null) so the
  // caller can show a spinner vs. an empty-state prompt.
  const result = useLiveQuery<Mesocycle | null>(
    async () => {
      const rows = await db.mesocycles
        .where('user_id')
        .equals(userId)
        .sortBy('generated_at')
      const latest = rows[rows.length - 1]
      if (!latest) return null
      return loadMesocycle(latest.id)
    },
    [userId],
  )

  return {
    plan: result ?? null,
    loading: result === undefined,
  }
}
