// StepWelcome — the first screen. Lumo cheers, we say hi, one CTA.

import { useMemo } from 'react'
import { StepChrome } from './StepChrome'
import { pickCopy, DEFAULT_CHEEK, type CheekLevel } from '../../lib/copy'

interface Props {
  onNext: () => void
  cheek?: CheekLevel
}

export function StepWelcome({ onNext, cheek = DEFAULT_CHEEK }: Props) {
  // Sample one welcome line at mount. `useMemo` freezes the pick so the
  // bubble doesn't reshuffle on every re-render — tests can still assert
  // the text is from the pool.
  const bubble = useMemo(
    () => pickCopy('onboardingWelcome', cheek),
    [cheek],
  )

  return (
    <StepChrome
      lumoState="cheer"
      bubbleText={bubble}
      title="Let's build your plan."
      subtitle="A few questions so Lumo can program something that fits."
    >
      <button
        type="button"
        onClick={onNext}
        className="w-full min-h-[56px] p-4 rounded-2xl font-extrabold"
        style={{
          background: 'var(--brand)',
          color: 'var(--lumo-bg)',
        }}
        data-testid="step-welcome-start"
      >
        Start
      </button>
    </StepChrome>
  )
}
