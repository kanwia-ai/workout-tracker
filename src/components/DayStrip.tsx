import type { Mesocycle, PlannedSession } from '../types/plan'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

interface Props {
  plan: Mesocycle
  weekNumber: number // 1-indexed
  todayDow: number // 0-6, Mon=0
  selectedDow: number // 0-6
  onSelect: (dow: number) => void
  weekStartDate: Date // Monday of the currently-viewed week; used to print the day number
}

const MS_PER_DAY = 86_400_000

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
    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
      {DAYS.map((label, dow) => {
        const session = byDow[dow]
        const isRest = !session
        const isToday = dow === todayDow
        const isSelected = dow === selectedDow
        const dateNum = new Date(weekStartDate.getTime() + dow * MS_PER_DAY).getDate()

        const base =
          'flex-1 min-w-[44px] min-h-[68px] rounded-2xl px-2 py-2 text-center transition'
        const variant = isSelected
          ? 'bg-brand text-black'
          : isToday
            ? 'bg-surface-raised border-2 border-brand text-zinc-200'
            : 'bg-surface-raised text-zinc-500'

        return (
          <button
            key={dow}
            type="button"
            onClick={() => onSelect(dow)}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            aria-label={`${label} ${dateNum}${isRest ? ' rest day' : ` ${session.title}`}`}
            className={`${base} ${variant}`}
          >
            <div className="text-[11px] font-bold">{label}</div>
            <div className="text-base font-extrabold tabular-nums">{dateNum}</div>
            <div className="text-[9px] uppercase tracking-wide mt-0.5 opacity-75">
              {isRest ? 'REST' : session.title.slice(0, 14)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
