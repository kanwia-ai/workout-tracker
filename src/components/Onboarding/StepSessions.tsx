// StepSessions — sessions/week picker. Required (hard constraint for
// architecture lookup). Lumo does a squat here.
//
// Active-minutes (per-session duration) moved to its own step so the copy
// can call out that it's WORK minutes only — rest between sets is budgeted
// separately by the planner.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  value?: { sessions_per_week?: number }
  onNext: (patch: { sessions_per_week: number }) => void
  cheek?: CheekLevel
}

const SESSION_OPTIONS = [2, 3, 4, 5, 6] as const

export function StepSessions({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const [sessions, setSessions] = useState<number | undefined>(value?.sessions_per_week)
  const bubble = useMemo(
    () => pickCopy('onboardingSessions', cheek),
    [cheek],
  )
  const canSubmit = sessions !== undefined

  return (
    <StepChrome
      lumoState="squat"
      bubbleText={bubble}
      title="How many sessions a week?"
      subtitle="Be honest — what you'll actually show up for."
    >
      <fieldset className="mb-5">
        <legend
          className="text-sm font-bold mb-2"
          style={{ color: 'var(--lumo-text)' }}
        >
          Sessions per week
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {SESSION_OPTIONS.map((n) => {
            const isOn = sessions === n
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={isOn}
                onClick={() => setSessions(n)}
                className="min-h-[56px] rounded-2xl font-bold transition active:scale-[0.97]"
                style={{
                  background: isOn
                    ? 'color-mix(in srgb, var(--brand) 18%, var(--lumo-raised))'
                    : 'var(--lumo-raised)',
                  border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                  color: 'var(--lumo-text)',
                }}
              >
                {n}
              </button>
            )
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          canSubmit && onNext({ sessions_per_week: sessions! })
        }
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="step-sessions-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
