import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { loadLatestMesocycleForUser } from '../lib/planGen'
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
  // Dexie's `useLiveQuery` needs to observe at least one table to re-fire on
  // mutation. We touch `db.mesocycles` here via `.count()` just so the hook
  // subscribes to that table; the actual load is delegated to the shared
  // `loadLatestMesocycleForUser` helper so query logic lives in one place.
  const result = useLiveQuery<Mesocycle | null>(
    async () => {
      await db.mesocycles.count()
      return loadLatestMesocycleForUser(userId)
    },
    [userId],
  )

  return {
    plan: result ?? null,
    loading: result === undefined,
  }
}
