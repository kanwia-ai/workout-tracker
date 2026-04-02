import { useState, useMemo } from 'react'
import { Timer, Clock, Sparkles } from 'lucide-react'
import { buildAdaptiveWarmup, type ProgrammedWarmup, type WarmupFocus } from '../data/warmups'
import { buildAdaptiveCooldown, type CooldownExercise, type CooldownFocus } from '../data/cooldowns'

type FocusArea = 'legs' | 'glutes' | 'back' | 'shoulders' | 'arms' | 'core' | 'full_body'

interface AdaptiveRoutineProps {
  mode: 'warmup' | 'cooldown'
  workoutFocus: FocusArea[]
  kneeFlag?: boolean
  onStartTimer?: (seconds: number, label: string, type: 'rest' | 'work') => void
}

const DURATION_OPTIONS = [5, 10, 15, 20]

const WARMUP_FOCUS_OPTIONS: { value: WarmupFocus; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'activation', label: 'Activation' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'mobility', label: 'Mobility' },
]

const COOLDOWN_FOCUS_OPTIONS: { value: CooldownFocus; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'recovery', label: 'Recovery' },
]

// Unified item for rendering (handles both warmup with sets and cooldown without)
interface RoutineItem {
  id: string
  name: string
  prescription: string // "2x15 reps" or "30s each side"
  cue?: string
  timerSeconds?: number
}

export function AdaptiveRoutine({ mode, workoutFocus, kneeFlag, onStartTimer }: AdaptiveRoutineProps) {
  const [duration, setDuration] = useState(10)
  const [warmupFocus, setWarmupFocus] = useState<WarmupFocus>('balanced')
  const [cooldownFocus, setCooldownFocus] = useState<CooldownFocus>('balanced')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const activeFocus = mode === 'warmup' ? warmupFocus : cooldownFocus

  const items: RoutineItem[] = useMemo(() => {
    if (mode === 'warmup') {
      const programmed = buildAdaptiveWarmup({
        targetMinutes: duration,
        workoutFocus,
        focus: warmupFocus,
        kneeFlag,
      })
      return programmed.map((p: ProgrammedWarmup) => ({
        id: p.exercise.id,
        name: p.exercise.name,
        prescription: p.sets > 1 ? `${p.sets}x ${p.exercise.duration}` : p.exercise.duration,
        cue: p.exercise.cues?.[0],
        timerSeconds: p.exercise.seconds,
      }))
    } else {
      const cooldowns = buildAdaptiveCooldown({
        targetMinutes: duration,
        workoutFocus,
        focus: cooldownFocus,
        kneeFlag,
      })
      return cooldowns.map((ex: CooldownExercise) => ({
        id: ex.id,
        name: ex.name,
        prescription: ex.duration,
        cue: ex.cues?.[0],
        timerSeconds: ex.seconds,
      }))
    }
  }, [mode, duration, workoutFocus, warmupFocus, cooldownFocus, kneeFlag])

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
          {completedCount}/{items.length}
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

      {/* Focus picker */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={12} className="text-zinc-500" />
        <div className="flex gap-1">
          {(mode === 'warmup' ? WARMUP_FOCUS_OPTIONS : COOLDOWN_FOCUS_OPTIONS).map(f => (
            <button
              key={f.value}
              onClick={() => {
                if (mode === 'warmup') setWarmupFocus(f.value as WarmupFocus)
                else setCooldownFocus(f.value as CooldownFocus)
                setChecked({})
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
              style={{
                background: activeFocus === f.value ? (mode === 'warmup' ? '#f97316' : '#60a5fa') : '#2a2a2e',
                color: activeFocus === f.value ? '#fff' : '#666',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isChecked = checked[item.id]
          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 py-2 px-1 rounded-lg transition-opacity"
              style={{ opacity: isChecked ? 0.4 : 1 }}
            >
              <input
                type="checkbox"
                checked={!!isChecked}
                onChange={() => setChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                className="w-4 h-4 shrink-0 accent-brand rounded"
              />

              <div
                className="flex-1 cursor-pointer"
                onClick={() => setChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[13px] font-medium"
                    style={{
                      textDecoration: isChecked ? 'line-through' : 'none',
                      color: isChecked ? '#555' : '#ccc',
                    }}
                  >
                    {item.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-semibold whitespace-nowrap">
                    {item.prescription}
                  </span>
                </div>
                {item.cue && !isChecked && (
                  <div className="text-[10px] text-zinc-600 mt-0.5">{item.cue}</div>
                )}
              </div>

              {item.timerSeconds && item.timerSeconds > 0 && onStartTimer && (
                <button
                  onClick={() => onStartTimer(item.timerSeconds!, item.name, 'work')}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-brand/30 text-brand bg-transparent active:scale-95 transition-transform flex items-center gap-1 shrink-0"
                >
                  <Timer size={10} />
                  {item.timerSeconds}s
                </button>
              )}
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-4 text-zinc-500 text-sm">No exercises match your criteria</div>
      )}
    </div>
  )
}
