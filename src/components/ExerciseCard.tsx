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
      className="transition-opacity duration-300"
      style={{
        background: 'var(--lumo-raised)',
        border: '1px solid var(--lumo-border)',
        borderRadius: 20,
        padding: 14,
        marginBottom: 8,
        opacity: allDone ? 0.5 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex justify-between items-baseline mb-1">
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--lumo-text)',
            flex: 1,
          }}
        >
          {exerciseName}
        </div>
        <div
          className="tabular-nums whitespace-nowrap ml-2"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--lumo-text-sec)',
          }}
        >
          {exercise.sets}x{exercise.reps}
        </div>
      </div>

      {/* Note */}
      {exercise.note && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--brand)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
            marginBottom: 6,
          }}
        >
          {exercise.note}
        </div>
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
              className="active:scale-95 transition-transform"
              style={{
                minWidth: 52,
                padding: '8px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                background: done
                  ? 'color-mix(in srgb, var(--accent-mint) 18%, transparent)'
                  : 'var(--lumo-overlay)',
                color: done ? 'var(--accent-mint)' : 'var(--lumo-text-sec)',
                border: done
                  ? '1.5px solid color-mix(in srgb, var(--accent-mint) 55%, transparent)'
                  : '1.5px solid var(--lumo-border-strong)',
              }}
            >
              {done ? '✓' : `Set ${k + 1}`}
            </button>
          )
        })}

        {/* Work timer (for timed exercises) */}
        {exercise.work_seconds && exercise.work_seconds > 0 && (
          <button
            onClick={() => onStartTimer(exercise.work_seconds!, exerciseName, 'work')}
            className="active:scale-95 transition-transform flex items-center gap-1"
            style={{
              padding: '6px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              background: 'transparent',
              border: '1px solid color-mix(in srgb, var(--accent-plum) 40%, transparent)',
              color: 'var(--accent-plum)',
            }}
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
              className="active:scale-95 transition-transform flex items-center gap-1"
              style={{
                padding: '6px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                background: 'transparent',
                border: '1px solid color-mix(in srgb, var(--brand) 40%, transparent)',
                color: 'var(--brand)',
              }}
            >
              <Timer size={12} />
              {customRest}s
              {restExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {restExpanded && (
              <div
                className="absolute top-full left-0 mt-1 flex gap-1 z-10"
                style={{
                  background: 'var(--lumo-raised)',
                  border: '1px solid var(--lumo-border)',
                  borderRadius: 14,
                  padding: 8,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
                }}
              >
                {[15, 30, 45, 60, 90, 120].map(s => (
                  <button
                    key={s}
                    onClick={() => { setCustomRest(s); setRestExpanded(false) }}
                    className="active:scale-95 transition-colors"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      background: customRest === s ? 'var(--brand)' : 'var(--lumo-overlay)',
                      color: customRest === s ? 'var(--lumo-bg)' : 'var(--lumo-text-sec)',
                      border: 'none',
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
