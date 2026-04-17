import { useState, useEffect } from 'react'
import { Play, Square } from 'lucide-react'
import type { SessionPhase } from '../types'

interface CompletedLap {
  name: SessionPhase['name']
  duration: number // seconds
}

interface SessionBarProps {
  started_at: string | null
  currentPhase: SessionPhase['name'] | null
  phases: SessionPhase[]
  onStart: () => void
  onSwitchPhase: (phase: SessionPhase['name']) => void
  onEnd: () => void
}

const PHASES: SessionPhase['name'][] = ['warm-up', 'lifts', 'cardio', 'cool-down']
const PHASE_LABELS: Record<SessionPhase['name'], string> = {
  'warm-up': 'Warm-Up',
  'lifts': 'Lifting',
  'cardio': 'Cardio',
  'cool-down': 'Cool-Down',
}
const PHASE_COLORS: Record<SessionPhase['name'], string> = {
  'warm-up': '#f97316',
  'lifts': '#a78bfa',
  'cardio': '#4ade80',
  'cool-down': '#60a5fa',
}
const MIN_PHASE_SECONDS: Record<SessionPhase['name'], number> = {
  'warm-up': 180,
  'lifts': 600,
  'cardio': 300,
  'cool-down': 60,
}

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

export function SessionBar({ started_at, currentPhase, phases, onStart, onSwitchPhase, onEnd }: SessionBarProps) {
  const [now, setNow] = useState(Date.now())
  const [confirmPhase, setConfirmPhase] = useState<SessionPhase['name'] | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  useEffect(() => {
    if (!started_at) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [started_at])

  // Auto-dismiss confirm after 4 seconds
  useEffect(() => {
    if (!confirmPhase && !confirmEnd) return
    const t = setTimeout(() => { setConfirmPhase(null); setConfirmEnd(false) }, 10000)
    return () => clearTimeout(t)
  }, [confirmPhase, confirmEnd])

  const totalElapsed = started_at ? Math.floor((now - new Date(started_at).getTime()) / 1000) : 0

  const completedLaps: CompletedLap[] = phases
    .filter(p => p.ended_at)
    .map(p => ({
      name: p.name,
      duration: Math.floor((new Date(p.ended_at!).getTime() - new Date(p.started_at).getTime()) / 1000),
    }))

  const currentLapStart = phases.length > 0 ? phases[phases.length - 1].started_at : null
  const currentLapElapsed = currentLapStart ? Math.floor((now - new Date(currentLapStart).getTime()) / 1000) : 0

  const skippingEarly = (() => {
    if (!confirmPhase || !currentPhase) return null
    const curIdx = PHASES.indexOf(currentPhase)
    const nextIdx = PHASES.indexOf(confirmPhase)
    if (nextIdx <= curIdx) return null
    const min = MIN_PHASE_SECONDS[currentPhase]
    if (currentLapElapsed >= min) return null
    return { phase: currentPhase, elapsed: currentLapElapsed, min }
  })()

  const handlePhaseClick = (phase: SessionPhase['name']) => {
    if (phase === currentPhase) return // Already on this phase
    setConfirmEnd(false)
    setConfirmPhase(phase)
  }

  const confirmSwitch = () => {
    if (confirmPhase) {
      onSwitchPhase(confirmPhase)
      setConfirmPhase(null)
    }
  }

  const handleEndClick = () => {
    setConfirmPhase(null)
    setConfirmEnd(true)
  }

  const confirmEndSession = () => {
    onEnd()
    setConfirmEnd(false)
  }

  if (!started_at) {
    return (
      <button
        onClick={onStart}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base bg-brand text-white active:scale-[0.98] transition-transform"
      >
        <Play size={18} fill="white" />
        Start Workout
      </button>
    )
  }

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3">
      {/* Total timer + End button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xl font-extrabold tabular-nums">{formatTime(totalElapsed)}</span>
        </div>
        {confirmEnd ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400">End workout?</span>
            <button
              onClick={confirmEndSession}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-danger active:scale-95 transition-transform"
            >
              Yes, end
            </button>
            <button
              onClick={() => setConfirmEnd(false)}
              className="px-2 py-1.5 rounded-lg text-xs font-bold text-zinc-400 bg-surface-overlay active:scale-95 transition-transform"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleEndClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-danger bg-danger/10 border border-danger/20 active:scale-95 transition-transform"
          >
            <Square size={12} />
            End
          </button>
        )}
      </div>

      {/* Completed laps */}
      {completedLaps.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 px-0.5">
          {completedLaps.map((lap, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: PHASE_COLORS[lap.name] }}
              />
              <span style={{ color: PHASE_COLORS[lap.name] }} className="font-semibold">
                {PHASE_LABELS[lap.name]}
              </span>
              <span className="text-zinc-500 tabular-nums">{formatTime(lap.duration)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Current lap indicator */}
      {currentPhase && (
        <div className="flex items-center gap-2 mb-2.5 px-0.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: PHASE_COLORS[currentPhase] }}
          />
          <span className="text-xs font-bold" style={{ color: PHASE_COLORS[currentPhase] }}>
            {PHASE_LABELS[currentPhase]}
          </span>
          <span className="text-xs text-zinc-400 tabular-nums font-semibold">
            {formatTime(currentLapElapsed)}
          </span>
        </div>
      )}

      {/* Phase switch confirmation */}
      {confirmPhase && (
        <div className="bg-surface-overlay rounded-xl px-3 py-2 mb-2 border border-border-medium">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">
              Switch to <span className="font-bold" style={{ color: PHASE_COLORS[confirmPhase] }}>{PHASE_LABELS[confirmPhase]}</span>?
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={confirmSwitch}
                className="px-3 py-1 rounded-lg text-xs font-bold text-white active:scale-95 transition-transform"
                style={{ background: PHASE_COLORS[confirmPhase] }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmPhase(null)}
                className="px-2 py-1 rounded-lg text-xs font-bold text-zinc-400 bg-border-subtle active:scale-95 transition-transform"
              >
                No
              </button>
            </div>
          </div>
          {skippingEarly && (
            <div className="mt-1.5 text-[11px] text-amber-400">
              {PHASE_LABELS[skippingEarly.phase]} only ran for {formatTime(skippingEarly.elapsed)} — skip anyway?
            </div>
          )}
        </div>
      )}

      {/* Phase selector */}
      <div className="flex gap-1.5">
        {PHASES.map(phase => {
          const active = currentPhase === phase
          const done = completedLaps.some(l => l.name === phase)
          return (
            <button
              key={phase}
              onClick={() => handlePhaseClick(phase)}
              className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95"
              style={{
                background: active ? PHASE_COLORS[phase] + '22' : done ? '#1a1a1e' : '#2a2a2e',
                color: active ? PHASE_COLORS[phase] : done ? '#555' : '#666',
                border: active ? `1.5px solid ${PHASE_COLORS[phase]}44` : '1.5px solid transparent',
                textDecoration: done && !active ? 'line-through' : 'none',
              }}
            >
              {PHASE_LABELS[phase]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
