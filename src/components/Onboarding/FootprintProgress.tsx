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
  /** When true, the SVG fills its container width (for flex layouts). */
  fluid?: boolean
}

// A proper dumbbell with stacked plates: outer endcap, big plate, handle bar
// with a small grip mark, then mirror. Reads unambiguously as a gym dumbbell
// at 22px — not an "H". Kyra reference: classic line-art barbell w/ two
// plate tiers per side.
//   outlined = pending, filled = completed, filled + glow = current.
function FootprintIcon({ kind, glow, size = 24, fluid = false }: FootprintIconProps) {
  const isFilled = kind === 'filled' || kind === 'current'
  const fill = isFilled ? 'var(--brand, #FF7A45)' : 'transparent'
  const stroke = isFilled
    ? 'var(--brand, #FF7A45)'
    : 'color-mix(in srgb, var(--lumo-text-ter, #55556A) 70%, transparent)'
  const glowStyle =
    glow && kind === 'current'
      ? {
          filter:
            'drop-shadow(0 0 6px color-mix(in srgb, var(--brand, #FF7A45) 70%, transparent))',
          animation: 'lumo-footprint-glow 1.6s ease-in-out infinite',
        }
      : undefined
  const sw = kind === 'outlined' ? 1.4 : 1.1
  // When fluid, stretch to container width; height auto-scales via viewBox
  // preserveAspectRatio. When fixed, render at `size` px square.
  const svgSizeProps = fluid
    ? ({ width: '100%', height: 'auto' } as const)
    : ({ width: size, height: size } as const)
  return (
    <svg
      {...svgSizeProps}
      viewBox="0 0 28 20"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', ...glowStyle }}
    >
      {/* Left endcap */}
      <rect
        x="1"
        y="7"
        width="2.5"
        height="6"
        rx="1"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Left plate (taller than endcap) */}
      <rect
        x="3.5"
        y="3"
        width="4"
        height="14"
        rx="1.4"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Bar */}
      <rect
        x="7.5"
        y="8.5"
        width="13"
        height="3"
        rx="0.6"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Grip mark — short line in the middle of the bar, only when the icon
          has fill (i.e. completed / current); otherwise the outline alone is
          enough and this line would crowd the silhouette. */}
      {isFilled && (
        <line
          x1="11"
          y1="10"
          x2="17"
          y2="10"
          stroke="color-mix(in srgb, var(--lumo-bg, #fff3ec) 80%, transparent)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      )}
      {/* Right plate */}
      <rect
        x="20.5"
        y="3"
        width="4"
        height="14"
        rx="1.4"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* Right endcap */}
      <rect
        x="24.5"
        y="7"
        width="2.5"
        height="6"
        rx="1"
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
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
      className="flex items-center py-2 w-full"
      style={{ gap: 4 }}
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
        // Flex each item so 14 steps fit a 360-390px viewport without
        // overflowing. Icon scales to container via width:100%.
        const itemStyle = {
          flex: '1 1 0',
          minWidth: 0,
          maxWidth: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }
        if (tappable) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onFootprintTap?.(i)}
              className="bg-transparent border-0 cursor-pointer"
              style={{ ...itemStyle, padding: 2 }}
              {...commonProps}
            >
              <FootprintIcon kind={kind} glow={!reduceMotion} fluid />
            </button>
          )
        }
        return (
          <div
            key={i}
            style={{ ...itemStyle, padding: 2 }}
            {...commonProps}
          >
            <FootprintIcon kind={kind} glow={!reduceMotion} fluid />
          </div>
        )
      })}
    </div>
  )
}
