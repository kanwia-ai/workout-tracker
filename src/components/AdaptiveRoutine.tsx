import { useState, useMemo } from 'react'
import { Timer, Clock, Zap, Wind, Sparkles } from 'lucide-react'
import { buildAdaptiveWarmup, type WarmupExercise, type WarmupFocus } from '../data/warmups'
import { buildAdaptiveCooldown, type CooldownExercise } from '../data/cooldowns'

type FocusArea = 'legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body'

interface AdaptiveRoutineProps {
  mode: 'warmup' | 'cooldown'
  workoutFocus: FocusArea[]
  kneeFlag?: boolean
  onStartTimer?: (seconds: number, label: string, type: 'rest' | 'work') => void
}

const DURATION_OPTIONS = [5, 10, 15, 20]

const FOCUS_OPTIONS: { value: WarmupFocus; label: string; icon: typeof Zap }[] = [
  { value: 'activation', label: 'Activation', icon: Zap },
  { value: 'dynamic', label: 'Dynamic', icon: Wind },
  { value: 'mobility', label: 'Mobility', icon: Sparkles },
]

export function AdaptiveRoutine({ mode, workoutFocus, kneeFlag, onStartTimer }: AdaptiveRoutineProps) {
  const [duration, setDuration] = useState(mode === 'warmup' ? 10 : 10)
  const [focus, setFocus] = useState<WarmupFocus | undefined>(undefined)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const exercises = useMemo(() => {
    if (mode === 'warmup') {
      return buildAdaptiveWarmup({
        targetMinutes: duration,
        workoutFocus,
        focus,
        kneeFlag,
      })
    } else {
      return buildAdaptiveCooldown({
        targetMinutes: duration,
        workoutFocus,
        kneeFlag,
      })
    }
  }, [mode, duration, workoutFocus, focus, kneeFlag])

  const completedCount = Object.values(checked).filter(Boolean).length
  const focusLabel = workoutFocus.join(', ')

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-zinc-500">
          Adapted for: <span className="text-zinc-300 font-medium capitalize">{focusLabel}</span>
        </div>
        <div className="text-xs text-zinc-500">
          {completedCount}/{exercises.length}
        </div>
      </div>

      {/* Duration picker */}
      <div className="flex items-center gap-2 mb-3">
        <Clock size={12} className="text-zinc-500" />
        <div className="flex gap-1">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => { setDuration(d); setChecked({}) }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
              style={{
                background: duration === d ? (mode === 'warmup' ? '#f97316' : '#60a5fa') : '#2a2a2e',
                color: duration === d ? '#fff' : '#666',
              }}
            >
              {d}min
            </button>
          ))}
        </div>
      </div>

      {/* Focus picker (warmup only) */}
      {mode === 'warmup' && (
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} className="text-zinc-500" />
          <div className="flex gap-1">
            <button
              onClick={() => { setFocus(undefined); setChecked({}) }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
              style={{
                background: !focus ? '#f97316' : '#2a2a2e',
                color: !focus ? '#fff' : '#666',
              }}
            >
              Auto
            </button>
            {FOCUS_OPTIONS.map(f => (
              <button
                key={f.value}
                onClick={() => { setFocus(f.value); setChecked({}) }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                style={{
                  background: focus === f.value ? '#f97316' : '#2a2a2e',
                  color: focus === f.value ? '#fff' : '#666',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-1">
        {exercises.map((ex) => {
          const isChecked = checked[ex.id]
          return (
            <div
              key={ex.id}
              className="flex items-center gap-2.5 py-2 px-1 rounded-lg transition-opacity"
              style={{ opacity: isChecked ? 0.4 : 1 }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={!!isChecked}
                onChange={() => setChecked(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                className="w-4 h-4 shrink-0 accent-brand rounded"
              />

              {/* Name + cue */}
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setChecked(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
              >
                <div
                  className="text-[13px] font-medium"
                  style={{
                    textDecoration: isChecked ? 'line-through' : 'none',
                    color: isChecked ? '#555' : '#ccc',
                  }}
                >
                  {ex.name}
                </div>
                <div className="text-[11px] text-zinc-500">{ex.duration}</div>
                {ex.cues && ex.cues.length > 0 && !isChecked && (
                  <div className="text-[10px] text-zinc-600 mt-0.5">{ex.cues[0]}</div>
                )}
              </div>

              {/* Timer button */}
              {ex.seconds && ex.seconds > 0 && onStartTimer && (
                <button
                  onClick={() => onStartTimer(ex.seconds!, ex.name, 'work')}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-brand/30 text-brand bg-transparent active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                >
                  <Timer size={10} />
                  {ex.seconds}s
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Type badge for each exercise */}
      {exercises.length === 0 && (
        <div className="text-center py-4 text-zinc-500 text-sm">No exercises match your criteria</div>
      )}
    </div>
  )
}
