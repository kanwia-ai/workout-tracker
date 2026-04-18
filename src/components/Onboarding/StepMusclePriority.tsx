// StepMusclePriority — OPTIONAL multi-select of muscles to prioritize.
// Used by Pass 3 pool filter to upweight exercises that hit these muscles.
// Ordered highest→lowest priority (first tap = highest).

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import { MuscleGroup } from '../../types/plan'

type MuscleGroupValue = MuscleGroup

interface Props {
  value?: MuscleGroupValue[]
  onNext: (muscles: MuscleGroupValue[]) => void
  onSkip: () => void
  cheek?: CheekLevel
}

const LABELS: Record<MuscleGroupValue, string> = {
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  full_body: 'Full body',
  rehab: 'Rehab',
  mobility: 'Mobility',
}

// Keep the set of user-selectable muscles lean — exclude the generic ones
// (full_body / rehab / mobility) that are better expressed through the
// Primary Goal step.
const SELECTABLE_MUSCLES = [
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
] as const satisfies readonly MuscleGroupValue[]

export function StepMusclePriority({ value, onNext, onSkip, cheek = DEFAULT_CHEEK }: Props) {
  const [picks, setPicks] = useState<MuscleGroupValue[]>(value ?? [])
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )

  const toggle = (m: MuscleGroupValue) => {
    setPicks((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m)
      return [...prev, m] // preserve tap order
    })
  }

  return (
    <StepChrome
      lumoState="thinking"
      bubbleText={bubble}
      title="Any muscles to prioritize?"
      subtitle="Tap in order — first tap is top priority. Totally optional."
      onSkip={onSkip}
    >
      <div
        className="flex flex-wrap gap-2 mb-5"
        role="group"
        aria-label="Muscle priority"
      >
        {SELECTABLE_MUSCLES.map((m) => {
          const rank = picks.indexOf(m)
          const isOn = rank >= 0
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              aria-pressed={isOn}
              className="min-h-[44px] px-4 rounded-full text-sm font-semibold transition active:scale-[0.97] flex items-center gap-2"
              style={{
                background: isOn
                  ? 'color-mix(in srgb, var(--brand) 18%, var(--lumo-raised))'
                  : 'var(--lumo-raised)',
                border: `1.5px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                color: 'var(--lumo-text)',
              }}
            >
              {LABELS[m]}
              {isOn && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'var(--brand)',
                    color: 'var(--lumo-bg)',
                  }}
                  aria-label={`priority ${rank + 1}`}
                >
                  {rank + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onNext(picks)}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
        data-testid="step-muscle-priority-next"
      >
        {picks.length === 0 ? 'Next' : `Next — ${picks.length} picked`}
      </button>
    </StepChrome>
  )
}
