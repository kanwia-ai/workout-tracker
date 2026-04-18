import type { CSSProperties } from 'react'
import type { Mesocycle, MuscleGroup, PlannedSession } from '../types/plan'

/**
 * DayStrip — horizontal 7-day strip (Mon–Sun) used at the top of the Workout
 * screen. Reskinned to the Lumo visual language (see /tmp/workout-app-design
 * → app.jsx → DayStrip).
 *
 * Behavior is intentionally unchanged from the pre-Lumo version:
 *   - Same Props shape
 *   - Same selected/today/rest detection
 *   - Same `onSelect(dow)` callback on tap
 *   - Same responsive horizontal layout that fits the 390px viewport
 *
 * What's new is purely visual:
 *   - Rest days show a moon + tiny "zZ" (no more "REST" text label).
 *   - Training days show a small focus-colored dot/pip. The focus color is
 *     derived from the session's muscle-group focus and maps to a Lumo accent
 *     (legs→plum, upper→sun, full-body→mint, other→brand).
 *   - Today gets a soft mascot-tinted ring + subtle glow, not a heavy solid
 *     border.
 *   - Selected day uses a brand-tinted ring on top of the same base card.
 *   - All colors come from CSS vars exposed by src/lib/theme.ts — no hex
 *     literals beyond the token references themselves.
 */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

const MS_PER_DAY = 86_400_000

interface Props {
  plan: Mesocycle
  weekNumber: number // 1-indexed
  todayDow: number // 0-6, Mon=0
  selectedDow: number // 0-6
  onSelect: (dow: number) => void
  weekStartDate: Date // Monday of the currently-viewed week; used to print the day number
}

type FocusBucket = 'legs' | 'upper' | 'full-body' | 'other'

const LEG_GROUPS: ReadonlySet<MuscleGroup> = new Set<MuscleGroup>([
  'quads',
  'hamstrings',
  'glutes',
  'calves',
])

const UPPER_GROUPS: ReadonlySet<MuscleGroup> = new Set<MuscleGroup>([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
])

/**
 * Classify a session's `focus` array into one of four visual buckets.
 * Priority: full-body wins if present, then majority class (legs vs upper),
 * then falls through to "other" (core / rehab / mobility).
 */
function focusBucket(focus: MuscleGroup[]): FocusBucket {
  if (focus.includes('full_body')) return 'full-body'
  let legs = 0
  let upper = 0
  for (const g of focus) {
    if (LEG_GROUPS.has(g)) legs++
    else if (UPPER_GROUPS.has(g)) upper++
  }
  if (legs === 0 && upper === 0) return 'other'
  return legs >= upper ? 'legs' : 'upper'
}

/** CSS-var expression for each bucket. Purely token-based — no hex. */
function focusColorVar(bucket: FocusBucket): string {
  switch (bucket) {
    case 'legs':
      return 'var(--accent-plum)'
    case 'upper':
      return 'var(--accent-sun)'
    case 'full-body':
      return 'var(--accent-mint)'
    case 'other':
      return 'var(--brand)'
  }
}

/** Short focus label used only inside aria-label (not rendered). */
function focusLabel(bucket: FocusBucket, session: PlannedSession): string {
  switch (bucket) {
    case 'legs':
      return 'legs day'
    case 'upper':
      return 'upper day'
    case 'full-body':
      return 'full-body day'
    case 'other':
      // Core / rehab / mobility — fall back to the session title so the label
      // still says something meaningful.
      return session.title
  }
}

/**
 * Small moon + "zZ" used for rest days. Mint-tinted per design spec.
 * `aria-hidden` — the surrounding button's aria-label conveys the state.
 */
function RestIcon() {
  return (
    <svg
      width="22"
      height="18"
      viewBox="0 0 22 18"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* crescent moon */}
      <path
        d="M13 12 A6 6 0 1 1 8 4 A5 5 0 0 0 13 12 Z"
        fill="var(--accent-mint)"
        fillOpacity="0.28"
        stroke="var(--accent-mint)"
        strokeOpacity="0.7"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* tiny "zZ" flanking the moon */}
      <text
        x="16"
        y="6"
        fill="var(--accent-mint)"
        fillOpacity="0.85"
        fontSize="5"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        z
      </text>
      <text
        x="18.5"
        y="10"
        fill="var(--accent-mint)"
        fillOpacity="0.7"
        fontSize="4"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        Z
      </text>
    </svg>
  )
}

/**
 * Small focus-colored pip for training days. Done sessions are slightly more
 * saturated; upcoming ones use a hollow-ring look. We don't have completion
 * data in the plan yet (status='upcoming' by default), so we treat all as
 * upcoming — the visual still reads as "training day" clearly.
 */
function FocusPip({ colorVar }: { colorVar: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
        border: `1.5px solid color-mix(in srgb, ${colorVar} 60%, transparent)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colorVar,
        }}
      />
    </div>
  )
}

export function DayStrip({
  plan,
  weekNumber,
  todayDow,
  selectedDow,
  onSelect,
  weekStartDate,
}: Props) {
  const byDow: Record<number, PlannedSession> = {}
  for (const s of plan.sessions) {
    if (s.week_number === weekNumber) byDow[s.day_of_week] = s
  }

  return (
    <div
      className="flex gap-1.5 overflow-x-auto -mx-1 px-1"
      data-testid="day-strip"
    >
      {DAYS.map((label, dow) => {
        const session = byDow[dow]
        const isRest = !session
        const isToday = dow === todayDow
        const isSelected = dow === selectedDow
        const dateNum = new Date(
          weekStartDate.getTime() + dow * MS_PER_DAY,
        ).getDate()

        const bucket = session ? focusBucket(session.focus) : null
        const colorVar = bucket ? focusColorVar(bucket) : null

        // Ring / glow. Precedence: selected (brand) > today (mascot) > none.
        // Keep it subtle — no heavy solid borders.
        let borderColor = 'var(--lumo-border)'
        let borderWidth = 1
        let boxShadow: string | undefined
        let gradient: string | undefined

        if (isSelected) {
          borderColor = 'color-mix(in srgb, var(--brand) 55%, transparent)'
          borderWidth = 1.5
          boxShadow =
            '0 0 0 2px color-mix(in srgb, var(--brand) 25%, transparent), 0 0 18px color-mix(in srgb, var(--brand) 22%, transparent)'
          gradient =
            'linear-gradient(160deg, color-mix(in srgb, var(--brand) 14%, transparent), transparent 60%)'
        } else if (isToday) {
          borderColor =
            'color-mix(in srgb, var(--mascot-color) 40%, transparent)'
          boxShadow =
            '0 0 16px color-mix(in srgb, var(--mascot-color) 18%, transparent)'
          gradient =
            'linear-gradient(160deg, color-mix(in srgb, var(--mascot-color) 14%, transparent), transparent 60%)'
        }

        const cardStyle: CSSProperties = {
          flex: 1,
          minWidth: 40,
          // Tall slim cards that fit seven across in a 390px viewport.
          aspectRatio: '0.62',
          borderRadius: 14,
          background: 'var(--lumo-raised)',
          border: `${borderWidth}px solid ${borderColor}`,
          backgroundImage: gradient,
          boxShadow,
          padding: '8px 4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
          appearance: 'none',
          WebkitAppearance: 'none',
          outline: 'none',
        }

        const dayLabelStyle: CSSProperties = {
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isToday || isSelected
            ? 'var(--lumo-text-sec)'
            : 'var(--lumo-text-ter)',
        }

        const dateStyle: CSSProperties = {
          fontSize: 18,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: isToday || isSelected
            ? 'var(--lumo-text)'
            : 'var(--lumo-text-sec)',
        }

        const ariaLabelParts: string[] = [
          DAY_FULL[dow],
          String(dateNum),
          isRest ? 'rest day' : focusLabel(bucket!, session),
        ]
        if (isToday) ariaLabelParts.push('today')
        const ariaLabel = ariaLabelParts.join(', ')

        return (
          <button
            key={dow}
            type="button"
            onClick={() => onSelect(dow)}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            aria-label={ariaLabel}
            data-dow={dow}
            data-rest={isRest ? 'true' : 'false'}
            data-focus={bucket ?? ''}
            style={cardStyle}
          >
            <div style={dayLabelStyle}>{label}</div>
            <div style={dateStyle}>{dateNum}</div>
            {isRest || !colorVar ? (
              <RestIcon />
            ) : (
              <FocusPip colorVar={colorVar} />
            )}
          </button>
        )
      })}
    </div>
  )
}
