// StepDays — pick the actual days of the week the user will train.
//
// We already asked sessions/week on the previous step, but that doesn't tell
// us WHICH days. Without this, the planner falls back to a fixed pattern
// (Mon/Wed/Fri etc.) and might park rest day on a day the user actually
// wants to lift. This step closes that loop.
//
// UX:
//   • 7 chips in a horizontal row, Mon..Sun.
//   • Tap toggles selection; selected = brand fill.
//   • Pre-fill suggested defaults based on `sessions_per_week` so the
//     common case is one tap (Continue).
//   • Continue is disabled until exactly `sessions_per_week` days are
//     selected, with a live "pick {N} day{s}" hint.
//
// State: selections live in this component. The parent receives the final
// `preferred_days` array (sorted Mon→Sun) on Continue.

import { useEffect, useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  /** How many days the user committed to in the previous step. Required —
   *  this step makes no sense without it. */
  sessionsPerWeek: number
  /** Existing selection, e.g. when navigating back to this step. */
  value?: number[]
  onNext: (patch: { preferred_days: number[] }) => void
  cheek?: CheekLevel
}

// 0=Mon..6=Sun. Order matches the storage convention used everywhere else
// in the planner (see SESSION_DEFAULTS.day_slot, spreadDaysOfWeek).
const DAY_CHIPS: ReadonlyArray<{ dow: number; label: string }> = [
  { dow: 0, label: 'Mon' },
  { dow: 1, label: 'Tue' },
  { dow: 2, label: 'Wed' },
  { dow: 3, label: 'Thu' },
  { dow: 4, label: 'Fri' },
  { dow: 5, label: 'Sat' },
  { dow: 6, label: 'Sun' },
]

/**
 * Pre-fill heuristics tuned to common splits:
 *   1 → Wed (mid-week single)
 *   2 → Mon, Thu (PPL feeder, ~72h split)
 *   3 → Mon, Wed, Fri (classic full-body)
 *   4 → Mon, Tue, Thu, Fri (UL/UL with Wed rest)
 *   5 → Mon..Fri (weekday lifter)
 *   6 → Mon..Sat (PPL twice + Sun rest)
 *   7 → all days (lighter days are recovery / mobility)
 */
export function suggestedDaysFor(sessionsPerWeek: number): number[] {
  switch (sessionsPerWeek) {
    case 1: return [2]
    case 2: return [0, 3]
    case 3: return [0, 2, 4]
    case 4: return [0, 1, 3, 4]
    case 5: return [0, 1, 2, 3, 4]
    case 6: return [0, 1, 2, 3, 4, 5]
    case 7: return [0, 1, 2, 3, 4, 5, 6]
    default: return []
  }
}

export function StepDays({
  sessionsPerWeek,
  value,
  onNext,
  cheek = DEFAULT_CHEEK,
}: Props) {
  // Initial selection: prefer the value the user already chose (back-nav),
  // otherwise the suggested default for their sessions/week.
  const [selected, setSelected] = useState<ReadonlySet<number>>(() =>
    new Set(value && value.length > 0 ? value : suggestedDaysFor(sessionsPerWeek)),
  )

  // If the user navigates back to sessions, changes the count, then comes
  // forward, the previous selection might be stale. Re-prime defaults
  // whenever sessions_per_week changes AND we don't have an existing value.
  useEffect(() => {
    if (value && value.length > 0) return
    setSelected(new Set(suggestedDaysFor(sessionsPerWeek)))
  }, [sessionsPerWeek, value])

  const bubble = useMemo(
    () => pickCopy('onboardingDays', cheek),
    [cheek],
  )

  const toggle = (dow: number) => {
    const next = new Set(selected)
    if (next.has(dow)) next.delete(dow)
    else next.add(dow)
    setSelected(next)
  }

  const count = selected.size
  const canSubmit = count === sessionsPerWeek
  const remaining = sessionsPerWeek - count
  // Live hint: "pick 4 days" / "pick 1 day" / "remove 1 day".
  // Stays visible whenever the count is wrong so users know what to fix.
  const hint = canSubmit
    ? null
    : remaining > 0
      ? `pick ${remaining} day${remaining === 1 ? '' : 's'}`
      : `remove ${-remaining} day${-remaining === 1 ? '' : 's'}`

  const submit = () => {
    if (!canSubmit) return
    const sorted = [...selected].sort((a, b) => a - b)
    onNext({ preferred_days: sorted })
  }

  return (
    <StepChrome
      lumoState="cheer"
      bubbleText={bubble}
      title="Which days?"
      subtitle="Pick your usual lifting days. We'll plan around them."
    >
      <fieldset className="mb-3">
        <legend
          className="text-sm font-bold mb-2"
          style={{ color: 'var(--lumo-text)' }}
        >
          Lifting days
        </legend>
        <div className="grid grid-cols-7 gap-2">
          {DAY_CHIPS.map(({ dow, label }) => {
            const isOn = selected.has(dow)
            return (
              <button
                key={dow}
                type="button"
                role="checkbox"
                aria-checked={isOn}
                aria-label={label}
                onClick={() => toggle(dow)}
                data-testid={`onboarding-day-${dow}`}
                className="min-h-[56px] rounded-2xl font-bold transition active:scale-[0.97] flex items-center justify-center text-sm"
                style={{
                  background: isOn ? 'var(--brand)' : 'var(--lumo-overlay)',
                  border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                  color: isOn ? 'var(--lumo-bg)' : 'var(--lumo-text)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <p
        className="text-xs mb-5 min-h-[16px]"
        style={{ color: canSubmit ? 'var(--lumo-text-ter)' : 'var(--lumo-text-sec)' }}
        data-testid="onboarding-days-hint"
      >
        {hint ?? `${count} day${count === 1 ? '' : 's'} selected.`}
      </p>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="onboarding-days-continue"
      >
        Continue
      </button>
    </StepChrome>
  )
}
