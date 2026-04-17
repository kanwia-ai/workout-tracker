import type { Mesocycle, PlannedSession } from '../types/plan'

/**
 * The "today" session is the first session in the plan whose status is still
 * `upcoming`. Progress-based, not date-based — if the user skips days the plan
 * just resumes from wherever they left off. Null when the plan is missing or
 * every session has been completed/skipped/in_progress.
 */
export function getToday(meso: Mesocycle | null): PlannedSession | null {
  if (!meso) return null
  return meso.sessions.find(s => s.status === 'upcoming') ?? null
}

/**
 * All sessions belonging to `weekNumber`, sorted by ordinal ascending.
 * Returns an empty array for a missing plan or a week with no sessions.
 */
export function getWeekView(meso: Mesocycle | null, weekNumber: number): PlannedSession[] {
  if (!meso) return []
  return meso.sessions
    .filter(s => s.week_number === weekNumber)
    .sort((a, b) => a.ordinal - b.ordinal)
}
