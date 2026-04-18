// StepSpecificTarget — OPTIONAL free-text "specific goal" line.
// 200 chars max, examples as placeholder. Skip fills with empty string.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

const MAX_LEN = 200

interface Props {
  value?: string
  onNext: (target: string) => void
  onSkip: () => void
  cheek?: CheekLevel
}

export function StepSpecificTarget({ value, onNext, onSkip, cheek = DEFAULT_CHEEK }: Props) {
  const [text, setText] = useState<string>(value ?? '')
  const bubble = useMemo(
    () => pickCopy('onboardingGoal', cheek),
    [cheek],
  )

  return (
    <StepChrome
      lumoState="thinking"
      bubbleText={bubble}
      title="Anything specific?"
      subtitle="One concrete target if you have one. Totally optional."
      onSkip={onSkip}
    >
      <label className="block mb-2">
        <span className="sr-only">Specific target</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          placeholder="e.g. first pull-up, glutes by June, 5km under 25min"
          className="w-full min-h-[52px] px-4 rounded-2xl text-[15px]"
          style={{
            background: 'var(--lumo-raised)',
            border: '2px solid var(--lumo-border)',
            color: 'var(--lumo-text)',
          }}
          aria-label="Specific target"
        />
      </label>
      <div
        className="flex justify-end text-xs mb-4"
        style={{ color: 'var(--lumo-text-ter)' }}
      >
        {text.length} / {MAX_LEN}
      </div>
      <button
        type="button"
        onClick={() => onNext(text.trim())}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
        data-testid="step-specific-target-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
