// StepPostureNotes — OPTIONAL free-text notes (500 char cap).
// Maps to profile.posture_notes; skip fills with empty string.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

const MAX_LEN = 500

interface Props {
  value?: string
  onNext: (notes: string) => void
  onSkip: () => void
  cheek?: CheekLevel
}

export function StepPostureNotes({ value, onNext, onSkip, cheek = DEFAULT_CHEEK }: Props) {
  const [text, setText] = useState<string>(value ?? '')
  const bubble = useMemo(
    () => pickCopy('onboardingInjuries', cheek),
    [cheek],
  )

  return (
    <StepChrome
      lumoState="sleepy"
      bubbleText={bubble}
      title="Anything else?"
      subtitle="Posture, lifestyle, desk-job vibes — totally optional."
      onSkip={onSkip}
    >
      <label className="block mb-2">
        <span className="sr-only">Posture and lifestyle notes</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          placeholder="Desk 8h/day? Tight hips after sitting? Anything..."
          rows={6}
          className="w-full p-4 rounded-2xl resize-none"
          style={{
            background: 'var(--lumo-raised)',
            border: '2px solid var(--lumo-border)',
            color: 'var(--lumo-text)',
          }}
          aria-label="Posture and lifestyle notes"
        />
      </label>
      <div
        className="flex justify-end text-xs mb-5"
        style={{ color: 'var(--lumo-text-ter)' }}
      >
        {text.length} / {MAX_LEN}
      </div>
      <button
        type="button"
        onClick={() => onNext(text.trim())}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold"
        style={{ background: 'var(--brand)', color: 'var(--lumo-bg)' }}
        data-testid="step-posture-next"
      >
        Next
      </button>
    </StepChrome>
  )
}
