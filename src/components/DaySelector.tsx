import type { ScheduleDay } from '../types'

interface DaySelectorProps {
  schedule: ScheduleDay[]
  selectedDay: number
  todayIdx: number
  onSelect: (day: number) => void
}

export function DaySelector({ schedule, selectedDay, todayIdx, onSelect }: DaySelectorProps) {
  // Calculate actual dates for this week
  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0=Sun
  const todayMondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1

  return (
    <div className="flex gap-1 justify-center">
      {schedule.map((day, i) => {
        const isSelected = i === selectedDay
        const isToday = i === todayIdx
        const isRest = day.is_rest_day

        // Calculate date for this day slot
        const dayDate = new Date(now)
        dayDate.setDate(now.getDate() + (i - todayMondayOffset))
        const dateNum = dayDate.getDate()

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className="flex flex-col items-center justify-center w-11 h-14 rounded-xl transition-all active:scale-95"
            style={{
              background: isSelected ? '#f97316' : isToday ? '#2a2a2e' : 'transparent',
              color: isSelected ? '#fff' : isRest ? '#555' : '#aaa',
              border: isToday && !isSelected ? '1px solid #444' : '1px solid transparent',
            }}
          >
            <span className="text-[11px] font-bold leading-none">{day.day_label}</span>
            <span className="text-[10px] leading-none mt-1" style={{ opacity: isSelected ? 1 : 0.6 }}>{dateNum}</span>
            {isRest && <span className="text-[8px] leading-none mt-0.5">REST</span>}
          </button>
        )
      })}
    </div>
  )
}
