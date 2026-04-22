import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Heart, CalendarDays, Clock, Dumbbell } from 'lucide-react'
import { Lumo } from './Lumo'

// ─── Empty state ────────────────────────────────────────────────────────

function EmptyChart({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode
  title: string
  message: string
}) {
  return (
    <div
      className="min-h-[320px] flex flex-col items-center justify-center text-center"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 22,
        padding: 20,
      }}
    >
      <div className="mb-3">
        <Lumo state="curious" size={72} />
      </div>
      <div
        className="flex items-center gap-2 mb-2"
        style={{
          padding: '6px 10px',
          borderRadius: 10,
          background: 'var(--lumo-overlay)',
          border: '1px solid var(--lumo-border)',
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 11,
            color: 'var(--lumo-text-sec)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
      </div>
      <p
        style={{
          fontSize: 14,
          color: 'var(--lumo-text)',
          maxWidth: 260,
          fontFamily: "'Fraunces', Georgia, serif",
          fontStyle: 'italic',
          lineHeight: 1.4,
        }}
      >
        {message}
      </p>
    </div>
  )
}

// ─── 1. Weight Progression ──────────────────────────────────────────────

function WeightProgressionChart() {
  return (
    <EmptyChart
      icon={<TrendingUp size={14} style={{ color: 'var(--brand)' }} />}
      title="Weight Progression"
      message="no lifts logged yet — start something good and your strength curve shows up here."
    />
  )
}

// ─── 2. Cardio Duration ────────────────────────────────────────────────

function CardioDurationChart() {
  return (
    <EmptyChart
      icon={<Heart size={14} style={{ color: 'var(--accent-blush)' }} />}
      title="Cardio Duration"
      message="no sessions yet — log some cardio and we'll track the climb."
    />
  )
}

// ─── 3. Consistency Calendar ───────────────────────────────────────────

function ConsistencyCalendar() {
  return (
    <EmptyChart
      icon={<CalendarDays size={14} style={{ color: 'var(--accent-mint)' }} />}
      title="Consistency"
      message="no sessions yet — show up a few times and your gym days light up here."
    />
  )
}

// ─── 4. Session Duration ───────────────────────────────────────────────

function SessionDurationChart() {
  return (
    <EmptyChart
      icon={<Clock size={14} style={{ color: 'var(--accent-plum)' }} />}
      title="Session Duration"
      message="no sessions yet — start the timer and we'll track how long you train."
    />
  )
}

// ─── 5. Volume by Muscle Group ─────────────────────────────────────────

function VolumeChart() {
  return (
    <EmptyChart
      icon={<Dumbbell size={14} style={{ color: 'var(--accent-sun)' }} />}
      title="Weekly Volume"
      message="no sessions yet — complete a few and we'll show which muscles you're hitting most."
    />
  )
}

// ─── Chart carousel ────────────────────────────────────────────────────

const CHARTS = [
  { id: 'weight', label: 'weight', component: WeightProgressionChart },
  { id: 'cardio', label: 'cardio', component: CardioDurationChart },
  { id: 'consistency', label: 'consistency', component: ConsistencyCalendar },
  { id: 'duration', label: 'duration', component: SessionDurationChart },
  { id: 'volume', label: 'volume', component: VolumeChart },
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
        {CHARTS.map((chart, i) => {
          const isActive = i === activeIdx
          return (
            <button
              key={chart.id}
              onClick={() => setActiveIdx(i)}
              aria-pressed={isActive}
              className="shrink-0 active:scale-95 transition-colors"
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.02em',
                background: isActive ? 'var(--brand)' : 'var(--lumo-raised)',
                color: isActive ? '#fff' : 'var(--lumo-text-sec)',
                border: isActive ? 'none' : '1px solid var(--lumo-border)',
              }}
            >
              {chart.label}
            </button>
          )
        })}
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
          aria-label="Previous chart"
          className="p-2 rounded-xl active:scale-90 transition-all disabled:opacity-20"
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            color: 'var(--lumo-text-sec)',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex gap-1.5">
          {CHARTS.map((_, i) => {
            const isActive = i === activeIdx
            return (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to chart ${i + 1}`}
                className="rounded-full transition-all active:scale-90"
                style={{
                  width: 8,
                  height: 8,
                  background: isActive ? 'var(--brand)' : 'var(--lumo-border-strong)',
                  transform: isActive ? 'scale(1.3)' : 'scale(1)',
                  border: 'none',
                  padding: 0,
                }}
              />
            )
          })}
        </div>

        <button
          onClick={() => setActiveIdx(prev => Math.min(CHARTS.length - 1, prev + 1))}
          disabled={activeIdx === CHARTS.length - 1}
          aria-label="Next chart"
          className="p-2 rounded-xl active:scale-90 transition-all disabled:opacity-20"
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            color: 'var(--lumo-text-sec)',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
