import type { Mesocycle, PlannedSession } from '../types/plan'
import { db, type LocalDayOverride, type LocalSessionLog } from './db'
import {
  computeGapFromLogs,
  computeRecalibration,
  type RecalibrationResult,
  type CompletedSessionRef,
} from './planner/skipRecalibration'

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

/**
 * Optional override so tests can pass in an in-memory log fixture without
 * needing fake-indexeddb. Production callers leave `logs` undefined and the
 * selector reads from Dexie directly.
 */
export interface RecalibrationOptions {
  /** Profile-derived — controls the 14+ day branch (<12 → reset, ≥12 → step back 2). */
  trainingAgeMonths?: number
  /** Test hook: inject completed-session refs directly instead of hitting Dexie. */
  logs?: CompletedSessionRef[]
}

/**
 * Same resolution as {@link getSessionForDate}, but also returns a
 * {@link RecalibrationResult} when the user is coming back from ≥4 days
 * off. UI layers can surface `recalibration.rationale` as a banner.
 *
 * Returns `recalibration: null` when:
 *   - no session resolves for the date (rest day / no plan)
 *   - the user has no completed sessions yet (first-ever session)
 *   - the gap is 0-3 days (no adjustment needed)
 *
 * Side effect: reads `db.sessionLogs` filtered by `userId`. Pass
 * `options.logs` to bypass Dexie in tests.
 */
export async function getSessionForDateWithRecalibration(
  meso: Mesocycle | null,
  overrides: LocalDayOverride[],
  date: Date,
  weekNumber: number,
  userId: string,
  options: RecalibrationOptions = {},
): Promise<{ session: PlannedSession | null; recalibration: RecalibrationResult | null }> {
  const session = getSessionForDate(meso, overrides, date, weekNumber)
  if (!session) return { session: null, recalibration: null }

  const logs: CompletedSessionRef[] =
    options.logs ??
    (await db.sessionLogs
      .where('user_id')
      .equals(userId)
      .toArray()
      .then((rows: LocalSessionLog[]) =>
        rows.map((r) => ({
          user_id: r.user_id,
          date: r.date,
          ended_at: r.ended_at,
          started_at: r.started_at,
        })),
      ))

  const gap = computeGapFromLogs(logs, userId, date)
  if (gap === null) return { session, recalibration: null }

  const age = options.trainingAgeMonths ?? 0
  const recal = computeRecalibration(gap, session.week_number, age)

  // Don't surface a banner when the rule table says "slide" — UI-wise it's
  // indistinguishable from a normal session.
  if (recal.action === 'slide') return { session, recalibration: null }
  return { session, recalibration: recal }
}
