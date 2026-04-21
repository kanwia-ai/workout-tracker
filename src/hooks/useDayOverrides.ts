import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LocalDayOverride } from '../lib/db'

/**
 * Reactive hook returning all day-overrides for the given user. Re-fires
 * whenever the `dayOverrides` table mutates, so when the user taps "build
 * me a workout anyway" and we write an override, every subscriber re-renders
 * with the new session in place.
 */
export function useDayOverrides(userId: string): LocalDayOverride[] {
  const result = useLiveQuery<LocalDayOverride[]>(
    async () => {
      return db.dayOverrides.where('user_id').equals(userId).toArray()
    },
    [userId],
  )
  return result ?? []
}
