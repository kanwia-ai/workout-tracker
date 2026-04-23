// StepName — ask the user what to call them. One text input, optional skip.
// Lives early in the onboarding flow so subsequent bubbles ("ready, {name}?")
// can actually use a real first name instead of falling back to "friend" or
// worse, the email local part.

import { useMemo, useState } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  value?: string
  onNext: (first_name: string) => void
  onSkip: () => void
  cheek?: CheekLevel
}

export function StepName({ value, onNext, onSkip, cheek = DEFAULT_CHEEK }: Props) {
  const [name, setName] = useState<string>(value ?? '')
  const bubble = useMemo(
    () => pickCopy('onboardingName', cheek),
    [cheek],
  )
  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= 50

  return (
    <StepChrome
      lumoState="wave"
      bubbleText={bubble}
      title="What should Lumo call you?"
      subtitle="First name, nickname, whatever you want to hear between sets."
    >
      <label className="block mb-5">
        <input
          type="text"
          autoComplete="given-name"
          autoFocus
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) onNext(trimmed)
          }}
          placeholder="Your name"
          className="w-full min-h-[52px] px-4 rounded-2xl"
          style={{
            background: 'var(--lumo-raised)',
            border: '2px solid var(--lumo-border)',
            color: 'var(--lumo-text)',
          }}
          aria-label="First name"
          data-testid="step-name-input"
        />
      </label>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => canSubmit && onNext(trimmed)}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold transition mb-3"
        style={{
          background: canSubmit ? 'var(--brand)' : 'var(--lumo-overlay)',
          color: canSubmit ? 'var(--lumo-bg)' : 'var(--lumo-text-ter)',
        }}
        data-testid="step-name-next"
      >
        Next
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="w-full min-h-[44px] text-sm font-semibold"
        style={{
          background: 'transparent',
          color: 'var(--lumo-text-ter)',
        }}
        data-testid="step-name-skip"
      >
        Skip for now
      </button>
    </StepChrome>
  )
}
