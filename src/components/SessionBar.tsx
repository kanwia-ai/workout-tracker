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
// Semantic colors sourced from Lumo tokens:
//   warm-up  → sun  (ramping up)
//   lifts    → brand (the work)
//   cardio   → mint (movement / heart)
//   cool-down → plum (wind-down / rest)
const PHASE_COLORS: Record<SessionPhase['name'], string> = {
  'warm-up': 'var(--accent-sun)',
  'lifts': 'var(--brand)',
  'cardio': 'var(--accent-mint)',
  'cool-down': 'var(--accent-plum)',
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
        className="w-full flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        style={{
          padding: '16px 18px',
          borderRadius: 20,
          background: 'var(--lumo-raised)',
          border: '1px solid var(--lumo-border)',
          color: 'var(--brand)',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '-0.01em',
        }}
      >
        <Play size={18} fill="currentColor" />
        let's go — start workout
      </button>
    )
  }

  return (
    <div
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 20,
        padding: 14,
      }}
    >
      {/* Total timer + End button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--accent-mint)' }}
          />
          <span
            className="tabular-nums"
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--lumo-text)',
            }}
          >
            {formatTime(totalElapsed)}
          </span>
        </div>
        {confirmEnd ? (
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 11, color: 'var(--lumo-text-sec)' }}>End workout?</span>
            <button
              onClick={confirmEndSession}
              className="active:scale-95 transition-transform"
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                background: 'var(--danger, #ef4444)',
                border: 'none',
              }}
            >
              Yes, end
            </button>
            <button
              onClick={() => setConfirmEnd(false)}
              className="active:scale-95 transition-transform"
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--lumo-text-sec)',
                background: 'var(--lumo-overlay)',
                border: 'none',
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleEndClick}
            className="flex items-center gap-1 active:scale-95 transition-transform"
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--lumo-text-ter)',
              background: 'transparent',
              border: 'none',
            }}
            aria-label="End session"
          >
            <Square size={10} />
            end
          </button>
        )}
      </div>

      {/* Completed laps */}
      {completedLaps.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 px-0.5">
          {completedLaps.map((lap, i) => (
            <div key={i} className="flex items-center gap-1.5" style={{ fontSize: 11 }}>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: PHASE_COLORS[lap.name] }}
              />
              <span style={{ color: PHASE_COLORS[lap.name], fontWeight: 600 }}>
                {PHASE_LABELS[lap.name]}
              </span>
              <span
                className="tabular-nums"
                style={{ color: 'var(--lumo-text-ter)' }}
              >
                {formatTime(lap.duration)}
              </span>
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
          <span style={{ fontSize: 12, fontWeight: 700, color: PHASE_COLORS[currentPhase] }}>
            {PHASE_LABELS[currentPhase]}
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--lumo-text-sec)' }}
          >
            {formatTime(currentLapElapsed)}
          </span>
        </div>
      )}

      {/* Phase switch confirmation */}
      {confirmPhase && (
        <div
          style={{
            background: 'var(--lumo-overlay)',
            border: '1px solid var(--lumo-border-strong)',
            borderRadius: 12,
            padding: '8px 12px',
            marginBottom: 8,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 12, color: 'var(--lumo-text)' }}>
              Switch to{' '}
              <span style={{ fontWeight: 700, color: PHASE_COLORS[confirmPhase] }}>
                {PHASE_LABELS[confirmPhase]}
              </span>
              ?
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={confirmSwitch}
                className="active:scale-95 transition-transform"
                style={{
                  padding: '4px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  background: PHASE_COLORS[confirmPhase],
                  border: 'none',
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmPhase(null)}
                className="active:scale-95 transition-transform"
                style={{
                  padding: '4px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--lumo-text-sec)',
                  background: 'var(--lumo-raised)',
                  border: '1px solid var(--lumo-border)',
                }}
              >
                No
              </button>
            </div>
          </div>
          {skippingEarly && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--accent-sun)',
              }}
            >
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
              className="flex-1 active:scale-95 transition-all"
              style={{
                padding: '8px 6px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                background: active
                  ? `color-mix(in srgb, ${PHASE_COLORS[phase]} 18%, transparent)`
                  : done
                    ? 'var(--lumo-bg)'
                    : 'var(--lumo-overlay)',
                color: active
                  ? PHASE_COLORS[phase]
                  : done
                    ? 'var(--lumo-text-ter)'
                    : 'var(--lumo-text-sec)',
                border: active
                  ? `1.5px solid color-mix(in srgb, ${PHASE_COLORS[phase]} 45%, transparent)`
                  : '1.5px solid transparent',
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
