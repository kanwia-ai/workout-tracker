import { useTimer } from '../hooks/useTimer'
import { Play, Pause, RotateCcw, X } from 'lucide-react'

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

  const ringColor = timer.seconds === 0 ? '#4ade80' : type === 'rest' ? '#f97316' : '#a78bfa'
  const circumference = 2 * Math.PI * 52
  const dashoffset = circumference * (1 - timer.progress / 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-raised rounded-3xl p-8 text-center border border-border-subtle min-w-[280px]">
        {/* Label */}
        <div className="text-sm font-bold text-zinc-400 mb-1">
          {timer.seconds === 0 ? 'GO!' : label || (type === 'rest' ? 'Rest' : 'Work')}
        </div>

        {/* Ring timer */}
        <div className="relative flex items-center justify-center my-4">
          <svg viewBox="0 0 120 120" width="140" height="140">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2a2e" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={ringColor} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute text-4xl font-extrabold tabular-nums">
            {timer.formatted}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center mt-2">
          <button
            onClick={timer.isRunning ? timer.pause : timer.start}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-colors"
            style={{ background: timer.isRunning ? '#3a3a3e' : '#f97316' }}
          >
            {timer.isRunning ? <Pause size={16} /> : <Play size={16} />}
            {timer.isRunning ? 'Pause' : 'Resume'}
          </button>

          <button
            onClick={timer.restart}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-border-medium"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
            style={{ background: timer.seconds === 0 ? '#4ade80' : '#ef4444', color: timer.seconds === 0 ? '#111' : '#fff' }}
          >
            {timer.seconds === 0 ? 'Done' : <X size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
