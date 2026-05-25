// StepAesthetic — OPTIONAL. Research-honest training-emphasis selector.
//
// Body composition is diet-driven, not rep-range-driven. The old cards
// ("Toned & lean" = high reps, "Muscle size" = different reps) encoded the
// gym-bro myth that rep ranges sculpt the body. Per docs/research/
// 01-strength-hypertrophy.md (Principle 3): hypertrophy works across
// ~30-85% 1RM when sets are taken close to failure; rep range does NOT
// determine "toned vs bulky". The only research-backed lever from this
// step is whether to bias the program toward strength expression or
// hypertrophy on the main compounds.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'
import { type AestheticPreference } from '../../types/profile'

interface Props {
  value?: AestheticPreference
  onNext: (pref: AestheticPreference) => void
  onSkip: () => void
  cheek?: CheekLevel
}

const CARDS: { id: AestheticPreference; title: string; blurb: string }[] = [
  {
    id: 'build_muscle',
    title: 'Add muscle',
    blurb: 'Hypertrophy focus. Higher set volumes, 6-15 reps near failure.',
  },
  {
    id: 'get_stronger',
    title: 'Get stronger',
    blurb: 'Lower reps, heavier loads, longer rest. Builds force production.',
  },
  {
    id: 'balanced',
    title: 'Mix of both',
    blurb: 'Strength on main lifts, hypertrophy on accessories.',
  },
]

export function StepAesthetic({ value, onNext, onSkip, cheek = DEFAULT_CHEEK }: Props) {
  const [selected, setSelected] = useState<AestheticPreference | undefined>(value)
  const bubble = useMemo(
    () => pickCopy('onboardingAesthetic', cheek),
    [cheek],
  )

  return (
    <StepChrome
      lumoState="wink"
      bubbleText={bubble}
      title="How should we weight the program?"
      subtitle="Strength bias, hypertrophy bias, or both. (Body composition is diet — not rep ranges.)"
      onSkip={onSkip}
    >
      <div className="grid grid-cols-2 gap-3 mb-4" role="radiogroup" aria-label="Training emphasis">
        {CARDS.map((c) => {
          const isOn = selected === c.id
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => setSelected(c.id)}
              className="min-h-[84px] p-3 rounded-2xl text-left transition active:scale-[0.98]"
              style={{
                background: isOn
                  ? 'color-mix(in srgb, var(--brand) 14%, var(--lumo-raised))'
                  : 'var(--lumo-raised)',
                border: `2px solid ${isOn ? 'var(--brand)' : 'var(--lumo-border)'}`,
                color: 'var(--lumo-text)',
              }}
            >
              <div className="font-bold text-sm">{c.title}</div>
              <div
                className="text-xs mt-1"
                style={{ color: 'var(--lumo-text-sec)' }}
              >
                {c.blurb}
              </div>
            </button>
          )
        })}
      </div>

      <div
        className="p-3 rounded-2xl mb-4 text-xs"
        style={{
          background: 'var(--lumo-raised)',
          border: '2px solid var(--lumo-border)',
          color: 'var(--lumo-text-sec)',
        }}
        data-testid="step-aesthetic-myth-note"
      >
        <span className="font-bold" style={{ color: 'var(--lumo-text)' }}>Note:</span>{' '}
        Common myth: high reps don't "tone" or "lean you out." Lean comes from
        a calorie deficit + protected muscle. Pick the training emphasis —
        your kitchen handles the rest.
      </div>

      <button
        type="button"
        onClick={() => onNext(selected ?? 'none')}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
        data-testid="step-aesthetic-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
