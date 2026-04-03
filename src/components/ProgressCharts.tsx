import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Heart, CalendarDays, Clock, Dumbbell } from 'lucide-react'

// ─── Empty state ────────────────────────────────────────────────────────

function EmptyChart({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 min-h-[320px] flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-overlay flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-zinc-300 mb-1">{title}</h3>
      <p className="text-xs text-zinc-600 max-w-[240px]">{message}</p>
    </div>
  )
}

// ─── 1. Weight Progression ──────────────────────────────────────────────

function WeightProgressionChart() {
  return (
    <EmptyChart
      icon={<TrendingUp size={20} className="text-brand" />}
      title="Weight Progression"
      message="Log a few workouts with weights to see your strength gains over time."
    />
  )
}

// ─── 2. Cardio Duration ────────────────────────────────────────────────

function CardioDurationChart() {
  return (
    <EmptyChart
      icon={<Heart size={20} className="text-rose-400" />}
      title="Cardio Duration"
      message="Log cardio sessions to track your progress toward your goals."
    />
  )
}

// ─── 3. Consistency Calendar ───────────────────────────────────────────

function ConsistencyCalendar() {
  return (
    <EmptyChart
      icon={<CalendarDays size={20} className="text-green-400" />}
      title="Consistency"
      message="Complete a few workouts and your gym days will light up here."
    />
  )
}

// ─── 4. Session Duration ───────────────────────────────────────────────

function SessionDurationChart() {
  return (
    <EmptyChart
      icon={<Clock size={20} className="text-purple-400" />}
      title="Session Duration"
      message="Start and end workouts with the session timer to track how long you train."
    />
  )
}

// ─── 5. Volume by Muscle Group ─────────────────────────────────────────

function VolumeChart() {
  return (
    <EmptyChart
      icon={<Dumbbell size={20} className="text-blue-400" />}
      title="Weekly Volume"
      message="Complete workouts to see which muscle groups you're hitting most."
    />
  )
}

// ─── Chart carousel ────────────────────────────────────────────────────

const CHARTS = [
  { id: 'weight', label: 'Weight', component: WeightProgressionChart },
  { id: 'cardio', label: 'Cardio', component: CardioDurationChart },
  { id: 'consistency', label: 'Consistency', component: ConsistencyCalendar },
  { id: 'duration', label: 'Duration', component: SessionDurationChart },
  { id: 'volume', label: 'Volume', component: VolumeChart },
]

export function ProgressCharts() {
  const [activeIdx, setActiveIdx] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (diff > threshold && activeIdx < CHARTS.length - 1) {
      setActiveIdx(prev => prev + 1)
    } else if (diff < -threshold && activeIdx > 0) {
      setActiveIdx(prev => prev - 1)
    }
  }, [activeIdx])

  const ActiveChart = CHARTS[activeIdx].component

  return (
    <div>
      {/* Tab pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {CHARTS.map((chart, i) => (
          <button
            key={chart.id}
            onClick={() => setActiveIdx(i)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors active:scale-95"
            style={{
              background: i === activeIdx ? '#f97316' : '#1a1a1e',
              color: i === activeIdx ? '#fff' : '#666',
              border: i === activeIdx ? 'none' : '1px solid #2a2a2e',
            }}
          >
            {chart.label}
          </button>
        ))}
      </div>

      {/* Chart area with swipe */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ActiveChart />
      </div>

      {/* Navigation arrows + dots */}
      <div className="flex items-center justify-between mt-4 px-2">
        <button
          onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
          disabled={activeIdx === 0}
          className="p-2 rounded-lg active:scale-90 transition-all disabled:opacity-20"
        >
          <ChevronLeft size={20} className="text-zinc-400" />
        </button>

        <div className="flex gap-1.5">
          {CHARTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="w-2 h-2 rounded-full transition-all active:scale-90"
              style={{
                background: i === activeIdx ? '#f97316' : '#3a3a3e',
                transform: i === activeIdx ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => setActiveIdx(prev => Math.min(CHARTS.length - 1, prev + 1))}
          disabled={activeIdx === CHARTS.length - 1}
          className="p-2 rounded-lg active:scale-90 transition-all disabled:opacity-20"
        >
          <ChevronRight size={20} className="text-zinc-400" />
        </button>
      </div>
    </div>
  )
}
