// StepDislikes — OPTIONAL. Multi-select of exercises/movements the user
// wants to avoid. Pool filter downweights these (injury bans still win).

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import { ExerciseDislike, type ExerciseDislike as ExerciseDislikeValue } from '../../types/profile'

interface Props {
  value?: ExerciseDislikeValue[]
  onNext: (dislikes: ExerciseDislikeValue[]) => void
  onSkip: () => void
  cheek?: CheekLevel
}

const LABELS: Record<ExerciseDislikeValue, string> = {
  burpees: 'Burpees',
  running: 'Running',
  jumping: 'Jumping / plyos',
  overhead_pressing: 'Overhead pressing',
  high_rep_cardio: 'High-rep cardio',
  hex_bar: 'Hex bar / trap bar',
  battle_ropes: 'Battle ropes',
  bike_sprints: 'Bike sprints',
  rowing_machine: 'Rowing machine',
  kettlebell_swings: 'Kettlebell swings',
  box_jumps: 'Box jumps',
}

const ALL = ExerciseDislike.options as readonly ExerciseDislikeValue[]

export function StepDislikes({ value, onNext, onSkip, cheek = DEFAULT_CHEEK }: Props) {
  const [selected, setSelected] = useState<Set<ExerciseDislikeValue>>(
    () => new Set(value ?? []),
  )
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )

  const toggle = (id: ExerciseDislikeValue) => {
    setSelected((prev) => {
      const nxt = new Set(prev)
      if (nxt.has(id)) nxt.delete(id)
      else nxt.add(id)
      return nxt
    })
  }

  return (
    <StepChrome
      lumoState="thinking"
      bubbleText={bubble}
      title="Anything you don't want to see?"
      subtitle="Totally valid. Optional — skip if you're game for anything."
      onSkip={onSkip}
    >
      <div
        className="flex flex-wrap gap-2 mb-5"
        role="group"
        aria-label="Exercises to avoid"
      >
        {ALL.map((id) => {
          const isOn = selected.has(id)
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(id)}
              className="min-h-[44px] px-4 rounded-full text-sm font-semibold transition active:scale-[0.97]"
              style={{
                background: isOn
                  ? 'color-mix(in srgb, var(--accent-blush) 28%, var(--lumo-raised))'
                  : 'var(--lumo-raised)',
                border: `1.5px solid ${isOn ? 'var(--accent-blush)' : 'var(--lumo-border)'}`,
                color: 'var(--lumo-text)',
              }}
            >
              {isOn && '✕ '}
              {LABELS[id]}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onNext(Array.from(selected))}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
        data-testid="step-dislikes-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
