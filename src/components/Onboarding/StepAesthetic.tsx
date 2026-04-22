// StepAesthetic — OPTIONAL. What "good" looks like. 5 cards + "no preference".
// Added 2026-04: `muscle_size_bulk` card for users who want muscle size /
// width (not definition). Lumo winks on this step.

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
    id: 'toned_lean',
    title: 'Toned & lean',
    blurb: 'Definition, low bodyfat vibe',
  },
  {
    id: 'strong_defined',
    title: 'Strong & defined',
    blurb: 'Muscular, built, confident',
  },
  {
    id: 'muscle_size_bulk',
    title: 'Muscle size',
    blurb: 'Wide, thick, bear-mode — size over definition',
  },
  {
    id: 'athletic',
    title: 'Athletic',
    blurb: 'Fast, agile, capable',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    blurb: 'Nothing specific — proportionate',
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
      title="What look are you chasing?"
      subtitle="Shapes the muscle bias — not your worth. Skip if you don't care."
      onSkip={onSkip}
    >
      <div className="grid grid-cols-2 gap-3 mb-4" role="radiogroup" aria-label="Aesthetic preference">
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
