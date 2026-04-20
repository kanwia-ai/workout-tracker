// FootprintProgress — row of Lumo footprints showing onboarding progress.
// Filled = completed, outlined = upcoming, current = brand with glow.
// Tap on a completed footprint fires an easter-egg callback (optional).

import { useEffect, useState } from 'react'

export interface FootprintProgressProps {
  totalSteps: number
  currentStep: number
  /** Indices (0-based) of steps that have been completed. */
  completedSteps: ReadonlySet<number>
  /**
   * Called when the user taps any footprint. The index is 0-based.
   * Kept lenient — callers that don't care can omit it.
   */
  onFootprintTap?: (index: number) => void
  /**
   * Accessible label for the progress bar as a whole. Defaults to a sensible
   * string describing position; callers can override for tighter scoping.
   */
  ariaLabel?: string
}

// Prefers-reduced-motion detection. Done once per mount (NOT memoized across
// mounts — user can toggle the OS setting mid-session on some platforms).
function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
      return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
      return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefers(e.matches)
    // Fresh API first, falls back to addListener for older Safari.
    if ('addEventListener' in mq) {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    // @ts-expect-error legacy Safari path
    mq.addListener(handler)
    return () => {
      // @ts-expect-error legacy Safari path
      mq.removeListener(handler)
    }
  }, [])
  return prefers
}

interface FootprintIconProps {
  kind: 'filled' | 'outlined' | 'current'
  glow: boolean
  size?: number
}

// A small heart. Outlined = pending, filled = completed, filled+glow = current.
// Replaces the old paw-print icons — Kyra said "are these paws?? wtf?" so we
// swapped to something less ambiguous and more on-brand.
function FootprintIcon({ kind, glow, size = 20 }: FootprintIconProps) {
  const fill =
    kind === 'filled' || kind === 'current'
      ? 'var(--brand, #FF7A45)'
      : 'transparent'
  const stroke =
    kind === 'outlined'
      ? 'color-mix(in srgb, var(--lumo-text-ter, #55556A) 60%, transparent)'
      : 'var(--brand, #FF7A45)'
  const glowStyle =
    glow && kind === 'current'
      ? {
          filter:
            'drop-shadow(0 0 6px color-mix(in srgb, var(--brand, #FF7A45) 70%, transparent))',
          animation: 'lumo-footprint-glow 1.6s ease-in-out infinite',
        }
      : undefined
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={glowStyle}
    >
      <path
        d="M10 17 C 2 11, 0 7, 4 4 C 7 2, 9 4, 10 6 C 11 4, 13 2, 16 4 C 20 7, 18 11, 10 17 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={kind === 'outlined' ? 1.5 : 1}
        strokeLinejoin="round"
      />
    </svg>
  )
}

const CSS = `
@keyframes lumo-footprint-glow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.92; }
}
`

export function FootprintProgress({
  totalSteps,
  currentStep,
  completedSteps,
  onFootprintTap,
  ariaLabel,
}: FootprintProgressProps) {
  const reduceMotion = usePrefersReducedMotion()
  const label =
    ariaLabel ?? `Onboarding progress: step ${currentStep + 1} of ${totalSteps}`

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep + 1}
      aria-label={label}
      className="flex items-center gap-1.5 py-2"
      data-testid="footprint-progress"
    >
      <style>{CSS}</style>
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCurrent = i === currentStep
        const isDone = completedSteps.has(i)
        const kind: 'filled' | 'outlined' | 'current' = isCurrent
          ? 'current'
          : isDone
            ? 'filled'
            : 'outlined'
        const tappable = isDone && onFootprintTap !== undefined
        const commonProps = {
          'aria-label': isCurrent
            ? `current step ${i + 1}`
            : isDone
              ? `completed step ${i + 1}`
              : `upcoming step ${i + 1}`,
          'data-testid': `footprint-${i}`,
          'data-kind': kind,
        }
        if (tappable) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onFootprintTap?.(i)}
              className="p-0.5 bg-transparent border-0 cursor-pointer"
              style={{ minWidth: 28, minHeight: 28 }}
              {...commonProps}
            >
              <FootprintIcon kind={kind} glow={!reduceMotion} />
            </button>
          )
        }
        return (
          <div
            key={i}
            className="p-0.5"
            style={{ minWidth: 28, minHeight: 28 }}
            {...commonProps}
          >
            <FootprintIcon kind={kind} glow={!reduceMotion} />
          </div>
        )
      })}
    </div>
  )
}
