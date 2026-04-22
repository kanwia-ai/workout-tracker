import { useTimer } from '../hooks/useTimer'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { Lumo } from './Lumo'

interface TimerOverlayProps {
  seconds: number
  label: string
  type: 'rest' | 'work'
  onClose: () => void
}

export function TimerOverlay({ seconds, label, type, onClose }: TimerOverlayProps) {
  const timer = useTimer({
    initialSeconds: seconds,
    autoStart: true,
    onComplete: () => {
      try { navigator.vibrate?.(200) } catch {}
    },
  })

  // Work = brand (the grind). Rest = plum (wind-down). Done = mint.
  const ringColor =
    timer.seconds === 0
      ? 'var(--accent-mint)'
      : type === 'rest'
        ? 'var(--accent-plum)'
        : 'var(--brand)'
  const size = 220
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference * (1 - timer.progress / 100)

  const isDone = timer.seconds === 0
  const mainLabel = isDone ? 'done.' : label || (type === 'rest' ? 'rest' : 'work')

  // Encouragement line — Fraunces italic, swaps based on state.
  const encouragement = isDone
    ? type === 'rest'
      ? 'back at it when you are.'
      : 'nice work. breathe.'
    : type === 'rest'
      ? 'catch your breath.'
      : 'stay with it.'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'var(--lumo-bg)',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Sleepy Lumo in corner during rest */}
      {type === 'rest' && !isDone && (
        <div
          style={{
            position: 'absolute',
            top: 'max(env(safe-area-inset-top, 0px), 24px)',
            right: 20,
            opacity: 0.85,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <Lumo state="sleepy" size={56} color="var(--accent-plum)" />
        </div>
      )}

      <div
        className="flex flex-col items-center"
        style={{
          padding: '24px 28px',
          minWidth: 280,
          textAlign: 'center',
        }}
      >
        {/* Kicker label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--lumo-text-ter)',
            marginBottom: 8,
          }}
        >
          {mainLabel}
        </div>

        {/* Ring + big clock */}
        <div
          className="relative flex items-center justify-center"
          style={{ marginTop: 8, marginBottom: 16 }}
        >
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--lumo-overlay)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 300ms ease' }}
            />
          </svg>
          <div
            className="absolute tabular-nums"
            style={{
              fontSize: 84,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: 'var(--lumo-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {timer.formatted}
          </div>
        </div>

        {/* Encouragement */}
        <div
          style={{
            fontSize: 14,
            color: 'var(--lumo-text-sec)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            marginBottom: 24,
            maxWidth: 260,
            lineHeight: 1.4,
          }}
        >
          {encouragement}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center items-center">
          <button
            onClick={timer.isRunning ? timer.pause : timer.start}
            className="flex items-center gap-2 active:scale-95 transition-all"
            style={{
              padding: '12px 20px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 14,
              background: timer.isRunning ? 'var(--lumo-overlay)' : 'var(--brand)',
              color: timer.isRunning ? 'var(--lumo-text)' : '#fff',
              border: timer.isRunning ? '1px solid var(--lumo-border)' : 'none',
            }}
            aria-label={timer.isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {timer.isRunning ? <Pause size={16} /> : <Play size={16} />}
            {timer.isRunning ? 'Pause' : 'Resume'}
          </button>

          <button
            onClick={timer.restart}
            className="flex items-center justify-center active:scale-95 transition-all"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'var(--lumo-overlay)',
              border: '1px solid var(--lumo-border)',
              color: 'var(--lumo-text-sec)',
            }}
            aria-label="Restart timer"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Skip — subtle underline */}
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            background: 'transparent',
            border: 'none',
            color: 'var(--lumo-text-ter)',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
          }}
          aria-label={isDone ? 'Done — close timer' : 'Skip rest'}
        >
          {isDone ? 'done' : 'skip'}
        </button>
      </div>
    </div>
  )
}
