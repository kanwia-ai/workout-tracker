import { useState } from 'react'
import { ChevronDown, AlertTriangle, Check, Timer, Zap } from 'lucide-react'
import { QUAD_PROTOCOL, GLUTE_PROTOCOL } from '../data/protocols'
import { useProtocol } from '../hooks/useProtocol'
import type { ProtocolExercise } from '../data/protocols'

interface ProtocolSectionProps {
  workoutFocus: string[]
  onStartTimer: (seconds: number, label: string, type: 'rest' | 'work') => void
}

function ProtocolExerciseRow({ exercise, completed, onToggle, onStartTimer }: {
  exercise: ProtocolExercise
  completed: boolean
  onToggle: () => void
  onStartTimer: (seconds: number, label: string, type: 'rest' | 'work') => void
}) {
  return (
    <div className={`flex items-start gap-2.5 py-2.5 ${completed ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          completed ? 'bg-brand border-brand' : 'border-zinc-600'
        }`}
      >
        {completed && <Check size={12} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{exercise.name}</span>
          {exercise.knee_safety === 'knee_caution' && (
            <AlertTriangle size={12} className="text-yellow-400 shrink-0" />
          )}
        </div>
        <div className="text-xs text-zinc-500">{exercise.sets}x{exercise.reps}</div>
        {exercise.note && (
          <div className="text-xs text-orange-400/80 mt-0.5">{exercise.note}</div>
        )}
        {exercise.cues.length > 0 && (
          <div className="text-[11px] text-zinc-600 mt-0.5">{exercise.cues[0]}</div>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {exercise.work_seconds && (
          <button
            onClick={() => onStartTimer(exercise.work_seconds!, exercise.name, 'work')}
            className="p-1.5 rounded-lg bg-brand/10 text-brand active:scale-90"
          >
            <Timer size={14} />
          </button>
        )}
        {exercise.rest_seconds > 0 && (
          <button
            onClick={() => onStartTimer(exercise.rest_seconds, 'Rest', 'rest')}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 active:scale-90"
          >
            <Timer size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export function ProtocolSection({ workoutFocus, onStartTimer }: ProtocolSectionProps) {
  const isLowerBody = workoutFocus.some(f => ['legs', 'glutes'].includes(f))
  const {
    progress: quadProgress,
    startProtocol: startQuad,
    toggleExercise: toggleQuadExercise,
    isExerciseCompleted: isQuadCompleted,
  } = useProtocol(QUAD_PROTOCOL.id, QUAD_PROTOCOL.total_weeks)

  const [expanded, setExpanded] = useState(true)

  if (!isLowerBody) return null

  // Get current week's exercises
  const currentWeek = quadProgress?.current_week ?? 1
  const weekData = QUAD_PROTOCOL.weeks.find(w => w.week === currentWeek)

  // Pick glute activation exercises for warm-up integration
  const gluteActivation = GLUTE_PROTOCOL.categories
    .find(c => c.id === 'glute-med-min')?.exercises.slice(0, 2) ?? []

  return (
    <div className="space-y-2.5">
      {/* Glute activation reminder */}
      <div className="bg-surface-raised border border-purple-900/30 rounded-2xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-purple-400" />
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">Glute Activation</span>
          <span className="text-[10px] text-zinc-500 ml-auto">do before main lifts</span>
        </div>
        {gluteActivation.map(ex => (
          <div key={ex.id} className="text-xs text-zinc-400 py-0.5">
            <span className="text-zinc-300">{ex.name}</span> — {ex.sets}x{ex.reps}
          </div>
        ))}
      </div>

      {/* Quad protocol section */}
      <div className="bg-surface-raised border border-brand/20 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3.5 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{'🦵'}</span>
            <div className="text-left">
              <div className="text-sm font-bold text-brand">Knee Rehab</div>
              <div className="text-[11px] text-zinc-500">
                {quadProgress
                  ? `Week ${currentWeek}/9 — ${weekData?.focus}`
                  : 'Tap to start 9-week quad protocol'}
              </div>
            </div>
          </div>
          <ChevronDown size={16} className={`text-brand transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="px-3.5 pb-3.5 border-t border-border-subtle">
            {!quadProgress ? (
              <button
                onClick={startQuad}
                className="w-full mt-3 py-2.5 rounded-xl bg-brand text-white text-sm font-bold active:scale-[0.98] transition-transform"
              >
                Start Quad Protocol (Week 1)
              </button>
            ) : weekData ? (
              <div className="mt-1">
                {/* Week progress dots */}
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i + 1 < currentWeek ? 'bg-green-500' :
                        i + 1 === currentWeek ? 'bg-brand' :
                        'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                {weekData.exercises.map(ex => (
                  <ProtocolExerciseRow
                    key={`${currentWeek}-${ex.id}`}
                    exercise={ex}
                    completed={isQuadCompleted(currentWeek, ex.id)}
                    onToggle={() => toggleQuadExercise(currentWeek, ex.id)}
                    onStartTimer={onStartTimer}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
