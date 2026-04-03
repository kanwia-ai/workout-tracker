import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Heart, CalendarDays, Clock, Dumbbell } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  MOCK_WEIGHT_PROGRESS,
  MOCK_CARDIO_TREND,
  MOCK_GYM_DAYS,
  MOCK_SESSIONS,
  MOCK_VOLUME,
} from '../data/mock-progress'

// ─── Chart card wrapper ──────────────────────────────────────────────────

interface ChartCardProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}

function ChartCard({ title, subtitle, icon, children }: ChartCardProps) {
  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-4 min-h-[320px] flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
          {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}

// ─── 1. Weight Progression ───────────────────────────────────────────────

function WeightProgressionChart() {
  const exercises = Object.entries(MOCK_WEIGHT_PROGRESS)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selected = exercises[selectedIdx]
  if (!selected) return null

  const [, { name, data }] = selected
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: d.weight,
  }))

  return (
    <ChartCard
      title="Weight Progression"
      subtitle={name}
      icon={<TrendingUp size={16} className="text-brand" />}
    >
      {/* Exercise picker */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {exercises.map(([, { name: exName }], i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors active:scale-95"
            style={{
              background: i === selectedIdx ? '#f97316' : '#222226',
              color: i === selectedIdx ? '#fff' : '#888',
            }}
          >
            {exName}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            width={35}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip
            contentStyle={{
              background: '#222226',
              border: '1px solid #3a3a3e',
              borderRadius: 12,
              fontSize: 12,
              color: '#fff',
            }}
            formatter={(value) => [`${value} lbs`, 'Weight']}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── 2. Cardio Duration Trend ────────────────────────────────────────────

function CardioDurationChart() {
  const goalMinutes = 30
  const chartData = MOCK_CARDIO_TREND.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    minutes: d.minutes,
    type: d.type,
  }))

  return (
    <ChartCard
      title="Cardio Duration"
      subtitle="Progress toward 30 min goal"
      icon={<Heart size={16} className="text-rose-400" />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            width={30}
            domain={[0, 'dataMax + 5']}
          />
          <Tooltip
            contentStyle={{
              background: '#222226',
              border: '1px solid #3a3a3e',
              borderRadius: 12,
              fontSize: 12,
              color: '#fff',
            }}
            formatter={(value) => [`${value} min`, 'Duration']}
          />
          <ReferenceLine
            y={goalMinutes}
            stroke="#4ade80"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: 'Goal: 30 min',
              position: 'right',
              fill: '#4ade80',
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="#f472b6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#f472b6', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── 3. Consistency Calendar ─────────────────────────────────────────────

function ConsistencyCalendar() {
  const today = new Date()
  const weeksToShow = 12
  const gymDaysSet = new Set(MOCK_GYM_DAYS)

  // Build grid: 7 rows (Mon-Sun) x N columns (weeks)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - weeksToShow * 7)
  // Align to Monday
  const dayOfWeek = startDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startDate.setDate(startDate.getDate() + mondayOffset)

  const weeks: { date: Date; dateStr: string; isGymDay: boolean; isFuture: boolean }[][] = []

  const cursor = new Date(startDate)
  for (let w = 0; w < weeksToShow; w++) {
    const week: typeof weeks[0] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0]
      week.push({
        date: new Date(cursor),
        dateStr,
        isGymDay: gymDaysSet.has(dateStr),
        isFuture: cursor > today,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  // Count stats
  const totalGymDays = MOCK_GYM_DAYS.filter(d => {
    const date = new Date(d)
    return date >= startDate && date <= today
  }).length
  const totalWeeks = weeksToShow
  const avgPerWeek = (totalGymDays / totalWeeks).toFixed(1)

  return (
    <ChartCard
      title="Consistency"
      subtitle={`${totalGymDays} days in ${totalWeeks} weeks (${avgPerWeek}/wk)`}
      icon={<CalendarDays size={16} className="text-success" />}
    >
      <div className="flex gap-1 items-start">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1 pt-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[18px] flex items-center text-[9px] text-zinc-600 font-medium">
              {i % 2 === 0 ? label : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] flex-1 overflow-hidden">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="w-[18px] h-[18px] rounded-[4px] transition-colors"
                  style={{
                    background: day.isFuture
                      ? 'transparent'
                      : day.isGymDay
                        ? '#4ade80'
                        : '#1a1a1e',
                    opacity: day.isFuture ? 0 : day.isGymDay ? 0.3 + Math.random() * 0.7 : 0.5,
                  }}
                  title={day.isGymDay ? `Gym: ${day.dateStr}` : day.dateStr}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 justify-end">
        <span className="text-[10px] text-zinc-600">Less</span>
        {[0.2, 0.4, 0.6, 0.8, 1].map((opacity, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-[3px]"
            style={{ background: '#4ade80', opacity }}
          />
        ))}
        <span className="text-[10px] text-zinc-600">More</span>
      </div>
    </ChartCard>
  )
}

// ─── 4. Session Duration ─────────────────────────────────────────────────

function SessionDurationChart() {
  const chartData = MOCK_SESSIONS.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    minutes: s.durationMinutes,
    workout: s.workoutTitle,
  }))

  const avgDuration = Math.round(
    MOCK_SESSIONS.reduce((sum, s) => sum + s.durationMinutes, 0) / MOCK_SESSIONS.length
  )

  return (
    <ChartCard
      title="Session Duration"
      subtitle={`Avg ${avgDuration} min per session`}
      icon={<Clock size={16} className="text-purple-400" />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
            width={30}
            domain={[0, 'dataMax + 10']}
          />
          <Tooltip
            contentStyle={{
              background: '#222226',
              border: '1px solid #3a3a3e',
              borderRadius: 12,
              fontSize: 12,
              color: '#fff',
            }}
            formatter={(value, _name, props) => [
              `${value} min${(props as { payload?: { workout?: string } }).payload?.workout ? ` \u2014 ${(props as { payload?: { workout?: string } }).payload?.workout}` : ''}`,
              'Duration',
            ]}
          />
          <ReferenceLine
            y={avgDuration}
            stroke="#a78bfa"
            strokeDasharray="6 4"
            strokeWidth={1}
            label={{
              value: `Avg: ${avgDuration}m`,
              position: 'right',
              fill: '#a78bfa',
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="minutes"
            stroke="#a78bfa"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── 5. Volume by Muscle Group ───────────────────────────────────────────

function VolumeChart() {
  const chartData = MOCK_VOLUME.map(v => ({
    name: v.muscleGroup,
    sets: v.sets,
  }))

  return (
    <ChartCard
      title="Weekly Volume"
      subtitle="Sets per muscle group this week"
      icon={<Dumbbell size={16} className="text-blue-400" />}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#aaa', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              background: '#222226',
              border: '1px solid #3a3a3e',
              borderRadius: 12,
              fontSize: 12,
              color: '#fff',
            }}
            formatter={(value) => [`${value} sets`, 'Volume']}
          />
          <Bar
            dataKey="sets"
            fill="#f97316"
            radius={[0, 6, 6, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Chart carousel ──────────────────────────────────────────────────────

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
