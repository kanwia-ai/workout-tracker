// StepPrimaryGoal — the 7-value primary_goal picker. Required step.
// Radio-select. Each option has an emoji-free icon slot (keeps brand) + blurb.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import { type PrimaryGoal } from '../../types/profile'

interface Props {
  value?: PrimaryGoal
  onNext: (goal: PrimaryGoal) => void
  cheek?: CheekLevel
}

const OPTIONS: {
  id: PrimaryGoal
  title: string
  blurb: string
}[] = [
  {
    id: 'build_muscle',
    title: 'Build muscle',
    blurb: 'Grow size — more volume, mid-rep ranges',
  },
  {
    id: 'get_stronger',
    title: 'Get stronger',
    blurb: 'Chase the main lifts — heavier, lower reps',
  },
  {
    id: 'lean_and_strong',
    title: 'Lean & strong',
    blurb: 'Hybrid — muscle + strength, mixed reps',
  },
  {
    id: 'fat_loss',
    title: 'Fat loss',
    blurb: 'Protect strength in a deficit, add density',
  },
  {
    id: 'mobility',
    title: 'Mobility / rehab',
    blurb: 'Move better, low-load high-frequency',
  },
  {
    id: 'athletic',
    title: 'Athletic',
    blurb: 'Power + strength, sport-adjacent (needs some experience)',
  },
  {
    id: 'general_fitness',
    title: 'General fitness',
    blurb: 'A well-rounded plan, no single focus',
  },
]

export function StepPrimaryGoal({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const [selected, setSelected] = useState<PrimaryGoal | undefined>(value)
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )
  const canSubmit = selected !== undefined

  return (
    <StepChrome
      lumoState="thinking"
      bubbleText={bubble}
      title="What's the goal?"
      subtitle="Pick the closest fit — you can tune later."
    >
      <div className="grid gap-3 mb-4" role="radiogroup" aria-label="Primary goal">
        {OPTIONS.map((opt) => {
          const isOn = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => setSelected(opt.id)}
              className="min-h-[56px] p-4 rounded-2xl text-left transition active:scale-[0.98]"
              style={{
                background: isOn
                  ? 'color-mix(in srgb, var(--brand) 14%, var(--lumo-raised))'
                  : 'var(--lumo-raised)',
                border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                color: 'var(--lumo-text)',
              }}
            >
              <div className="font-bold">{opt.title}</div>
              <div
                className="text-sm mt-0.5"
                style={{ color: 'var(--lumo-text-sec)' }}
              >
                {opt.blurb}
              </div>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => canSubmit && onNext(selected!)}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="step-primary-goal-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
