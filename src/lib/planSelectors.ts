import type { Mesocycle, PlannedSession } from '../types/plan'

function sortedSessions(meso: Mesocycle): PlannedSession[] {
  // Defensive: LLM output order is not guaranteed. Sort by (week, ordinal).
  return [...meso.sessions].sort((a, b) =>
    a.week_number !== b.week_number
      ? a.week_number - b.week_number
      : a.ordinal - b.ordinal
  )
}

/**
 * The "today" session:
 *   1. An in-progress session (user started and hasn't finished) takes priority.
 *   2. Otherwise, the first upcoming session in (week, ordinal) order.
 *   3. Null when the plan is missing or everything is completed/skipped.
 *
 * Progress-based, not date-based — if the user skips days the plan just
 * resumes from wherever they left off.
 */
export function getToday(meso: Mesocycle | null): PlannedSession | null {
  if (!meso) return null
  const sessions = sortedSessions(meso)
  return (
    sessions.find(s => s.status === 'in_progress') ??
    sessions.find(s => s.status === 'upcoming') ??
    null
  )
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
