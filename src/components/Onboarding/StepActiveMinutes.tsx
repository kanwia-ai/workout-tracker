// StepActiveMinutes — active-work session length. This is how long the user
// is ACTUALLY under the bar / moving, NOT total gym time. Rest between sets
// is budgeted separately by the planner. Lumo bounces ("run") here.
//
// The planner reads `active_minutes` to cap the set count per session. We
// also mirror the value into `time_budget_min` at save time (see
// OnboardingFlow.finalize) so legacy code that reads `time_budget_min`
// continues to work without a schema migration.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  value?: { active_minutes?: number }
  onNext: (patch: { active_minutes: number }) => void
  cheek?: CheekLevel
}

// Minute buckets chosen for real user experience:
//   30 = quick session, 3-4 exercises
//   45 = solid mid-length session
//   60 = full session
//   75 = long session with accessories
//   90 = big compound day
const MINUTE_OPTIONS = [30, 45, 60, 75, 90] as const

export function StepActiveMinutes({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  const [minutes, setMinutes] = useState<number | undefined>(value?.active_minutes)
  const bubble = useMemo(
    () => pickCopy('onboardingActiveMinutes', cheek),
    [cheek],
  )
  const canSubmit = minutes !== undefined

  return (
    <StepChrome
      lumoState="run"
      bubbleText={bubble}
      title="How long is your actual lifting time?"
      subtitle="Rest between sets not counted — we budget that separately."
    >
      <fieldset className="mb-5">
        <legend
          className="text-sm font-bold mb-2"
          style={{ color: 'var(--lumo-text)' }}
        >
          Active work minutes
        </legend>
        <div className="grid grid-cols-5 gap-2">
          {MINUTE_OPTIONS.map((m) => {
            const isOn = minutes === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={isOn}
                onClick={() => setMinutes(m)}
                className="min-h-[56px] rounded-2xl font-bold transition active:scale-[0.97] flex flex-col items-center justify-center"
                style={{
                  background: isOn
                    ? 'color-mix(in srgb, var(--brand) 18%, var(--lumo-raised))'
                    : 'var(--lumo-raised)',
                  border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                  color: 'var(--lumo-text)',
                }}
              >
                <span className="text-base">{m}</span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--lumo-text-ter)' }}
                >
                  min
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <p
        className="text-xs mb-5"
        style={{ color: 'var(--lumo-text-ter)' }}
      >
        Rough guide: a 60-min active session often takes ~90 min of gym time
        once you count rest, warmup + walking around.
      </p>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          canSubmit && onNext({ active_minutes: minutes! })
        }
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="step-active-minutes-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
