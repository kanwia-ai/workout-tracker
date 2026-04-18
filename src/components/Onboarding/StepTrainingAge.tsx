// StepTrainingAge — maps to training_age_months via 3 buckets:
// novice (<6mo = 3mo), intermediate (6-24mo = 12mo), advanced (24+mo = 36mo).
// Required (architecture-lookup input).

import { useMemo } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  value?: number
  onNext: (months: number) => void
  cheek?: CheekLevel
}

const OPTIONS: { months: number; title: string; blurb: string }[] = [
  {
    months: 3,
    title: 'New to lifting',
    blurb: 'Less than 6 months consistent training',
  },
  {
    months: 12,
    title: 'Some experience',
    blurb: '6 months – 2 years consistent',
  },
  {
    months: 36,
    title: 'Experienced',
    blurb: '2+ years consistent, comfortable with main lifts',
  },
]

export function StepTrainingAge({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )

  return (
    <StepChrome
      lumoState="thinking"
      bubbleText={bubble}
      title="How much lifting experience?"
      subtitle="Shapes intensity + exercise selection. Pick closest."
    >
      <div className="grid gap-3" role="radiogroup" aria-label="Training experience">
        {OPTIONS.map((opt) => {
          const isOn = value === opt.months
          return (
            <button
              key={opt.months}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => onNext(opt.months)}
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
    </StepChrome>
  )
}
