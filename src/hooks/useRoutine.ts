import { useLiveQuery } from 'dexie-react-hooks'
import { loadRoutine, type Routine, type RoutineKind } from '../lib/routines'

/**
 * Reactive hook that loads the saved routine for a (session, kind) pair from
 * Dexie. Uses `useLiveQuery` so the component re-renders automatically when a
 * new routine is generated (or regenerated) for this slot.
 *
 * Returns `{ routine: null, loading: true }` while the first query resolves
 * for a non-null sessionId, `{ routine: null, loading: false }` once we've
 * confirmed no saved routine exists, and `{ routine, loading: false }` once a
 * row is found and parsed.
 */
export function useRoutine(
  sessionId: string | null,
  kind: RoutineKind,
): { routine: Routine | null; loading: boolean } {
  const result = useLiveQuery<Routine | null>(
    async () => {
      if (!sessionId) return null
      return loadRoutine(sessionId, kind)
    },
    [sessionId, kind],
  )

  return {
    routine: result ?? null,
    loading: result === undefined && !!sessionId,
  }
}
