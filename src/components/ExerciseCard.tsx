import { useState } from 'react'
import { Timer, ChevronDown, ChevronUp } from 'lucide-react'
import { WeightInput } from './WeightInput'
import type { WorkoutExercise } from '../types'

interface ExerciseCardProps {
  exercise: WorkoutExercise
  exerciseName: string
  sectionIdx: number
  exerciseIdx: number
  checkedSets: Record<string, boolean>
  onToggleSet: (key: string) => void
  onStartTimer: (seconds: number, label: string, type: 'rest' | 'work') => void
  weight?: number
  lastWeight?: number
  pr?: number
  onWeightChange: (exerciseId: string, weight: number) => void
}

export function ExerciseCard({
  exercise, exerciseName, sectionIdx, exerciseIdx,
  checkedSets, onToggleSet, onStartTimer,
  weight, lastWeight, pr, onWeightChange,
}: ExerciseCardProps) {
  const [restExpanded, setRestExpanded] = useState(false)
  const [customRest, setCustomRest] = useState(exercise.rest_seconds)

  const allDone = Array.from({ length: exercise.sets }, (_, k) =>
    checkedSets[`${sectionIdx}-${exerciseIdx}-${k}`]
  ).every(Boolean)

  return (
    <div
      className="rounded-xl p-3.5 mb-2 transition-opacity duration-300"
      style={{
        background: '#222226',
        opacity: allDone ? 0.45 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex justify-between items-baseline mb-1">
        <div className="text-sm font-bold flex-1">{exerciseName}</div>
        <div className="text-sm text-zinc-400 font-semibold whitespace-nowrap ml-2">
          {exercise.sets}x{exercise.reps}
        </div>
      </div>

      {/* Note */}
      {exercise.note && (
        <div className="text-[11px] text-brand italic mb-1.5">{exercise.note}</div>
      )}

      {/* Weight input */}
      {exercise.track_weight && (
        <div className="mb-2">
          <WeightInput
            value={weight}
            lastWeight={lastWeight}
            pr={pr}
            onChange={w => onWeightChange(exercise.exercise_id, w)}
          />
        </div>
      )}

      {/* Set buttons + rest timer */}
      <div className="flex gap-1.5 flex-wrap items-center mt-2">
        {Array.from({ length: exercise.sets }, (_, k) => {
          const key = `${sectionIdx}-${exerciseIdx}-${k}`
          const done = checkedSets[key]
          return (
            <button
              key={k}
              onClick={() => {
                onToggleSet(key)
                if (!done && customRest > 0) {
                  onStartTimer(customRest, exerciseName, 'rest')
                }
              }}
              className="min-w-[52px] px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
              style={{
                background: done ? '#4ade80' : '#2a2a2e',
                color: done ? '#111' : '#aaa',
                border: done ? '2px solid #4ade80' : '2px solid #3a3a3e',
              }}
            >
              {done ? '\u2713' : `Set ${k + 1}`}
            </button>
          )
        })}

        {/* Work timer (for timed exercises) */}
        {exercise.work_seconds && exercise.work_seconds > 0 && (
          <button
            onClick={() => onStartTimer(exercise.work_seconds!, exerciseName, 'work')}
            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-purple-500/30 text-purple-400 bg-transparent active:scale-95 transition-transform flex items-center gap-1"
          >
            <Timer size={12} />
            {exercise.work_seconds}s
          </button>
        )}

        {/* Adjustable rest timer */}
        {customRest > 0 && (
          <div className="relative">
            <button
              onClick={() => setRestExpanded(!restExpanded)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-brand/30 text-brand bg-transparent active:scale-95 transition-transform flex items-center gap-1"
            >
              <Timer size={12} />
              {customRest}s
              {restExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {restExpanded && (
              <div className="absolute top-full left-0 mt-1 bg-surface-raised border border-border-subtle rounded-xl p-2 z-10 flex gap-1 shadow-xl">
                {[15, 30, 45, 60, 90, 120].map(s => (
                  <button
                    key={s}
                    onClick={() => { setCustomRest(s); setRestExpanded(false) }}
                    className="px-2 py-1 rounded-lg text-[11px] font-bold transition-colors active:scale-95"
                    style={{
                      background: customRest === s ? '#f97316' : '#2a2a2e',
                      color: customRest === s ? '#fff' : '#aaa',
                    }}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
