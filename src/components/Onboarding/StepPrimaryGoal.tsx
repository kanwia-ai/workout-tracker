// StepPrimaryGoal — the 7-value primary_goal picker, NOW MULTI-SELECT (max 2).
// First tap = dominant goal (drives split + rep ranges). Second tap adds a
// secondary emphasis. Tapping a selected chip un-selects it. Min 1 required
// to advance.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import { type PrimaryGoal } from '../../types/profile'

interface Props {
  value?: PrimaryGoal[]
  onNext: (goals: PrimaryGoal[]) => void
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

const MAX_PICKS = 2

export function StepPrimaryGoal({ value, onNext, cheek = DEFAULT_CHEEK }: Props) {
  // Order preserved from user taps so `picks[0]` is the dominant goal.
  const [picks, setPicks] = useState<PrimaryGoal[]>(() => value ?? [])
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )
  const canSubmit = picks.length >= 1

  const toggle = (id: PrimaryGoal) => {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id)
      if (prev.length >= MAX_PICKS) return prev // cap at 2; user must untoggle first
      return [...prev, id]
    })
  }

  return (
    <StepChrome
      lumoState="flex"
      bubbleText={bubble}
      title="What's the goal?"
      subtitle="Pick up to 2 — first tap is the top priority. Strength AND size? Both."
    >
      <div
        className="grid gap-3 mb-4"
        role="group"
        aria-label="Primary goals (pick up to 2)"
      >
        {OPTIONS.map((opt) => {
          const rank = picks.indexOf(opt.id)
          const isOn = rank >= 0
          const atCap = !isOn && picks.length >= MAX_PICKS
          return (
            <button
              key={opt.id}
              type="button"
              role="checkbox"
              aria-checked={isOn}
              aria-disabled={atCap}
              onClick={() => toggle(opt.id)}
              className="min-h-[56px] p-4 rounded-2xl text-left transition active:scale-[0.98] flex items-center gap-3"
              style={{
                background: isOn
                  ? 'color-mix(in srgb, var(--brand) 18%, var(--lumo-raised))'
                  : 'var(--lumo-raised)',
                border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                color: 'var(--lumo-text)',
                opacity: atCap ? 0.45 : 1,
                cursor: atCap ? 'not-allowed' : 'pointer',
              }}
            >
              <div className="flex-1">
                <div className="font-bold">{opt.title}</div>
                <div
                  className="text-sm mt-0.5"
                  style={{ color: 'var(--lumo-text-sec)' }}
                >
                  {opt.blurb}
                </div>
              </div>
              {isOn && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
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
        disabled={!canSubmit}
        onClick={() => canSubmit && onNext(picks)}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="step-primary-goal-next"
      >
        {picks.length <= 1 ? 'Next' : `Next — ${picks.length} picked`}
      </button>
    </StepChrome>
  )
}
