import type { Mesocycle, PlannedSession } from '../types/plan'
import type { LocalDayOverride } from './db'

/** Day-of-week helper: Mon=0 through Sun=6, matching PlannedSession.day_of_week. */
function dowMon0(date: Date): number {
  // JS Date.getDay() returns 0=Sun..6=Sat. Shift to Mon=0..Sun=6.
  return (date.getDay() + 6) % 7
}

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

/**
 * The session to show for a specific calendar date. Resolution order:
 *   1. Active day-override for that date (user built a workout on a rest
 *      day, or swapped in a different session).
 *   2. Scheduled session whose day_of_week matches that date's dow.
 *   3. null (rest day).
 *
 * `weekNumber` is the current training week (1-indexed) to look up in the
 * plan. Most callers pass 1 today — we don't yet track multi-week cursors.
 */
export function getSessionForDate(
  meso: Mesocycle | null,
  overrides: LocalDayOverride[],
  date: Date,
  weekNumber = 1,
): PlannedSession | null {
  if (!meso) return null

  // 1. Override?
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const dateISO = `${yyyy}-${mm}-${dd}`
  const override = overrides.find((o) => o.date === dateISO)
  if (override) {
    const hit = meso.sessions.find((s) => s.id === override.session_id)
    if (hit) return hit
    // Dangling override (session removed from plan) — fall through to scheduled.
  }

  // 2. Scheduled session at this dow in the current week.
  const dow = dowMon0(date)
  const scheduled = meso.sessions.find(
    (s) => s.week_number === weekNumber && s.day_of_week === dow,
  )
  return scheduled ?? null
}

/**
 * The next session the user should do: prefers `in_progress`, then the
 * earliest `upcoming` session in (week, ordinal) order. Used by the
 * "build me a workout anyway" flow to pick which session to stamp onto
 * today.
 */
export function getNextUpcomingSession(meso: Mesocycle | null): PlannedSession | null {
  if (!meso) return null
  const sessions = [...meso.sessions].sort((a, b) =>
    a.week_number !== b.week_number
      ? a.week_number - b.week_number
      : a.ordinal - b.ordinal,
  )
  return (
    sessions.find((s) => s.status === 'in_progress') ??
    sessions.find((s) => s.status === 'upcoming') ??
    null
  )
}
