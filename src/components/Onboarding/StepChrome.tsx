// Shared chrome for onboarding steps: Lumo + speech bubble on top, body
// (children) in the middle, optional skip button at the bottom.
// Uses CSS vars only — theme-aware.

import type { ReactNode } from 'react'
import { Lumo, type LumoState } from '../Lumo'

export interface StepChromeProps {
  /** Lumo state (cheer, thinking, etc.) — see Lumo.tsx for the enum. */
  lumoState: LumoState
  /** Speech bubble contents. Usually a line from copy.ts. */
  bubbleText: string
  /** Required step heading, shown above the body. */
  title: string
  /** Optional subtitle below the title. */
  subtitle?: string
  /** The step's form / inputs. */
  children: ReactNode
  /** Optional "skip" / "skip for now" button shown at the bottom. */
  onSkip?: () => void
  /** Text shown on the skip button. Defaults to "skip for now". */
  skipLabel?: string
  /** Lumo body size. Defaults to 72. */
  lumoSize?: number
}

/**
 * Consistent step scaffold so every onboarding screen has the same rhythm:
 * Lumo greets (top), context (title + optional subtitle), body, optional
 * skip affordance. Pure presentational — data stays in the parent step.
 */
export function StepChrome({
  lumoState,
  bubbleText,
  title,
  subtitle,
  children,
  onSkip,
  skipLabel = 'skip for now',
  lumoSize = 72,
}: StepChromeProps) {
  return (
    <div className="flex flex-col gap-5" data-testid="step-chrome">
      <div className="flex items-end gap-3" data-testid="step-lumo-bubble">
        <Lumo state={lumoState} size={lumoSize} />
        <div
          className="flex-1 px-3 py-2.5 text-[14px] leading-snug"
          style={{
            background: 'var(--lumo-raised)',
            border: '1px solid var(--lumo-border)',
            borderRadius: 16,
            borderBottomLeftRadius: 4,
            color: 'var(--lumo-text)',
            fontFamily: "'Fraunces', Georgia, serif",
            fontStyle: 'italic',
          }}
        >
          {bubbleText}
        </div>
      </div>

      <header>
        <h1
          className="text-2xl font-extrabold"
          style={{ color: 'var(--lumo-text)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--lumo-text-sec)' }}
          >
            {subtitle}
          </p>
        )}
      </header>

      <div>{children}</div>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="self-center min-h-[48px] px-4 rounded-2xl font-semibold text-sm"
          style={{
            background: 'transparent',
            color: 'var(--lumo-text-sec)',
            border: '1px dashed var(--lumo-border)',
          }}
          data-testid="step-skip"
        >
          {skipLabel}
        </button>
      )}
    </div>
  )
}
