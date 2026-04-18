// StepSessions — sessions/week + time budget, combined because they're both
// short scalar pickers. Required (hard constraint for architecture lookup).

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  value?: { sessions_per_week?: number; time_budget_min?: number }
  onNext: (patch: { sessions_per_week: number; time_budget_min: number }) => void
  cheek?: CheekLevel
}

const SESSION_OPTIONS = [2, 3, 4, 5, 6] as const

export function StepSessions({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const [sessions, setSessions] = useState<number | undefined>(value?.sessions_per_week)
  const [minutes, setMinutes] = useState<number>(value?.time_budget_min ?? 60)
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )
  const canSubmit = sessions !== undefined

  return (
    <StepChrome
      lumoState="flex"
      bubbleText={bubble}
      title="Cadence & time"
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

      <div
        className="p-4 rounded-2xl mb-5"
        style={{
          background: 'var(--lumo-raised)',
          border: '2px solid var(--lumo-border)',
        }}
      >
        <div className="flex items-baseline justify-between mb-2">
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--lumo-text)' }}
          >
            Session length
          </span>
          <span
            className="font-extrabold text-lg tabular-nums"
            style={{ color: 'var(--brand)' }}
          >
            {minutes} min
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={120}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-full accent-[var(--brand)]"
          aria-label="Session length in minutes"
        />
        <div
          className="flex justify-between text-xs mt-1"
          style={{ color: 'var(--lumo-text-ter)' }}
        >
          <span>15</span>
          <span>120</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          canSubmit &&
          onNext({ sessions_per_week: sessions!, time_budget_min: minutes })
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
