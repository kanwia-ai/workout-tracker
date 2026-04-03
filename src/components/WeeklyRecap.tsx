import { useState } from 'react'
import { X, ChevronRight, Trophy, Flame, Timer } from 'lucide-react'
import type { WeeklyRecapData } from '../data/mock-progress'

interface WeeklyRecapProps {
  data: WeeklyRecapData
  onDismiss: () => void
  onViewProgress: () => void
}

export function WeeklyRecap({ data, onDismiss, onViewProgress }: WeeklyRecapProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative bg-gradient-to-br from-brand/15 via-surface-raised to-surface-raised border border-brand/25 rounded-2xl overflow-hidden">
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all z-10"
      >
        <X size={16} />
      </button>

      {/* Collapsed: 1-2 highlights */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 pr-10"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-brand/20 flex items-center justify-center">
            <Trophy size={14} className="text-brand" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            {data.weekLabel}
          </span>
        </div>

        <div className="space-y-1.5">
          {data.highlights.slice(0, 2).map((h, i) => (
            <p key={i} className="text-[15px] font-semibold text-zinc-100 leading-snug">
              {h}
            </p>
          ))}
        </div>

        {!expanded && (
          <div className="flex items-center gap-1 mt-3 text-xs text-zinc-500">
            <span>Tap for details</span>
            <ChevronRight size={12} />
          </div>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-surface-overlay rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={12} className="text-brand" />
                <span className="text-[11px] text-zinc-500 font-medium">Sessions</span>
              </div>
              <span className="text-xl font-extrabold">{data.workoutsCompleted}</span>
            </div>
            <div className="flex-1 bg-surface-overlay rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Timer size={12} className="text-purple-400" />
                <span className="text-[11px] text-zinc-500 font-medium">Total Time</span>
              </div>
              <span className="text-xl font-extrabold">{Math.floor(data.totalMinutes / 60)}h {data.totalMinutes % 60}m</span>
            </div>
          </div>

          {/* PRs */}
          {data.newPRs.length > 0 && (
            <div className="bg-surface-overlay rounded-xl p-3">
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">New PRs</span>
              {data.newPRs.map((pr, i) => (
                <div key={i} className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-semibold text-zinc-200">{pr.exercise}</span>
                  <span className="text-sm font-bold text-success">{pr.weight} lbs</span>
                </div>
              ))}
            </div>
          )}

          {/* Cardio highlight */}
          {data.cardioHighlight && (
            <div className="bg-surface-overlay rounded-xl p-3">
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">Cardio</span>
              <p className="text-sm font-semibold text-zinc-200 mt-1">{data.cardioHighlight}</p>
            </div>
          )}

          {/* View full progress */}
          <button
            onClick={onViewProgress}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand/10 border border-brand/20 text-brand text-sm font-bold active:scale-[0.98] transition-transform"
          >
            View Full Progress
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
