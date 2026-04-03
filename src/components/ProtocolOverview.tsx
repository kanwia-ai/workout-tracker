import { ArrowLeft, ChevronRight, Play, Pause, RotateCcw, Check } from 'lucide-react'
import { QUAD_PROTOCOL, GLUTE_PROTOCOL } from '../data/protocols'
import { useProtocol } from '../hooks/useProtocol'

interface ProtocolOverviewProps {
  onBack: () => void
  onNavigate: (view: 'quad' | 'glute') => void
}

function QuadCard({ onNavigate }: { onNavigate: () => void }) {
  const protocol = QUAD_PROTOCOL
  const { progress } = useProtocol(protocol.id, protocol.total_weeks)

  const currentWeek = progress?.current_week ?? 0
  const weekPct = protocol.total_weeks > 0 ? (currentWeek / protocol.total_weeks) * 100 : 0
  const isActive = progress?.status === 'active'
  const isPaused = progress?.status === 'paused'
  const isCompleted = progress?.status === 'completed'
  const notStarted = !progress

  // Compute current week's exercise completion
  let exercisesDone = 0
  let exercisesTotal = 0
  if (progress && currentWeek > 0 && currentWeek <= protocol.total_weeks) {
    const weekData = protocol.weeks[currentWeek - 1]
    exercisesTotal = weekData.exercises.length
    exercisesDone = weekData.exercises.filter(
      e => progress.completed_exercises[`${currentWeek}-${e.id}`]
    ).length
  }

  return (
    <button
      onClick={onNavigate}
      className="w-full bg-surface-raised border border-border-subtle rounded-2xl p-4 text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{protocol.emoji}</div>
          <div>
            <div className="text-base font-bold">{protocol.name}</div>
            <div className="text-[11px] text-zinc-500">{protocol.total_weeks}-week progressive program</div>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-500 mt-1" />
      </div>

      {/* Status */}
      {notStarted && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 border border-brand/20 mb-3">
          <Play size={14} className="text-brand" />
          <span className="text-xs font-semibold text-brand">Ready to start</span>
        </div>
      )}

      {isActive && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-xs font-bold text-brand">Week {currentWeek}</span>
            </div>
            <span className="text-[11px] text-zinc-500">{exercisesDone}/{exercisesTotal} exercises</span>
          </div>
          {/* Week progress bar */}
          <div className="h-1.5 bg-surface-overlay rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-brand"
              style={{ width: `${weekPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-zinc-600">Week 1</span>
            <span className="text-[10px] text-zinc-600">Week {protocol.total_weeks}</span>
          </div>

          {/* Current week focus */}
          {currentWeek > 0 && currentWeek <= protocol.total_weeks && (
            <div className="mt-2 text-[11px] text-zinc-500">
              Focus: <span className="text-zinc-300">{protocol.weeks[currentWeek - 1].focus}</span>
            </div>
          )}
        </div>
      )}

      {isPaused && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10 border border-warning/20 mb-3">
          <Pause size={14} className="text-warning" />
          <span className="text-xs font-semibold text-warning">Paused at Week {currentWeek}</span>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-success-soft border border-success/20 mb-3">
          <Check size={14} className="text-success" />
          <span className="text-xs font-semibold text-success">Completed!</span>
        </div>
      )}

      {/* Recent pain log */}
      {progress && progress.pain_logs.length > 0 && (
        <div className="text-[10px] text-zinc-600">
          Last check-in: {progress.pain_logs[progress.pain_logs.length - 1].pain_level}
          {progress.pain_logs[progress.pain_logs.length - 1].auto_regressed && ' (auto-regressed)'}
        </div>
      )}
    </button>
  )
}

function GluteCard({ onNavigate }: { onNavigate: () => void }) {
  const protocol = GLUTE_PROTOCOL

  return (
    <button
      onClick={onNavigate}
      className="w-full bg-surface-raised border border-border-subtle rounded-2xl p-4 text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{protocol.emoji}</div>
          <div>
            <div className="text-base font-bold">{protocol.name}</div>
            <div className="text-[11px] text-zinc-500">{protocol.categories.length} muscle groups covered</div>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-500 mt-1" />
      </div>

      {/* Category summary */}
      <div className="space-y-1.5">
        {protocol.categories.map(cat => {
          const colors: Record<string, string> = {
            'glute-max': '#f97316',
            'glute-med-min': '#a78bfa',
            'glute-stabilizers': '#60a5fa',
          }
          const color = colors[cat.id] || '#f97316'
          return (
            <div key={cat.id} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[11px] text-zinc-400">
                <span className="font-semibold" style={{ color }}>{cat.name}</span>
                {' '}&mdash; {cat.exercises.length} exercises
              </span>
            </div>
          )
        })}
      </div>

      {/* Integration hint */}
      <div className="mt-3 px-3 py-2 rounded-xl bg-purple-soft border border-purple-900/30">
        <div className="text-[11px] text-purple-300">
          {protocol.warmup_note}
        </div>
      </div>
    </button>
  )
}

export function ProtocolOverview({ onBack, onNavigate }: ProtocolOverviewProps) {
  return (
    <div className="min-h-screen bg-surface font-[system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="max-w-lg mx-auto px-3 pb-20 safe-top safe-bottom">
        {/* Header */}
        <div className="flex items-center gap-3 pt-3 pb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold tracking-tight bg-gradient-to-r from-brand to-orange-300 bg-clip-text text-transparent">
              Protocols
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Specialized rehab & strengthening programs</p>
          </div>
          <div className="p-2">
            <RotateCcw size={16} className="text-transparent" /> {/* spacer for symmetry */}
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-surface-raised border border-border-subtle rounded-2xl px-4 py-3 mb-4">
          <div className="text-sm text-zinc-300 font-semibold mb-1">Your Recovery Programs</div>
          <p className="text-xs text-zinc-500">
            Structured protocols designed for meniscus recovery and lower-body strengthening.
            Each protocol tracks your progress and adjusts based on how your knee responds.
          </p>
        </div>

        {/* Protocol cards */}
        <div className="space-y-3">
          <QuadCard onNavigate={() => onNavigate('quad')} />
          <GluteCard onNavigate={() => onNavigate('glute')} />
        </div>
      </div>
    </div>
  )
}
