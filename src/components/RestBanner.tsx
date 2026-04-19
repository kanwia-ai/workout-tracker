import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * RestBanner — circular countdown shown between sets.
 *
 * Renders a mint-colored SVG progress ring with the remaining rest time at
 * its center (MM:SS, or just SS when under a minute). Optionally displays a
 * short cheeky message from Lumo to the right of the ring and a "skip" button
 * when the caller wants user-initiated early ends.
 *
 * Time math is driven by `startedAt` + `seconds` so the display stays
 * correct even if the component re-mounts mid-rest (e.g. route change).
 * Internal state just re-renders every second via `setInterval` — precision
 * to the second is plenty for a human-scale rest timer.
 *
 * Fires `onDone` exactly once when the remaining time hits zero. Respects
 * `prefers-reduced-motion`: the subtle digit pulse is suppressed when set.
 */

export interface RestBannerProps {
  /** Total rest duration in seconds. */
  seconds: number
  /** Timestamp (ms) when the rest period began — usually `Date.now()`. */
  startedAt: number
  /** Fires once when remaining time reaches 0. */
  onDone?: () => void
  /** Fires when the user taps "skip". Button only renders when provided. */
  onSkip?: () => void
  /** Optional cheeky line (e.g. from Lumo). */
  message?: string
}

const ACCENT_MINT = '#6EE7C7'
const BORDER_SUBTLE = '#2a2a2e'

const PULSE_KEYFRAMES = `
@keyframes rest-banner-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.72; }
}
`

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function formatRemaining(remaining: number): string {
  const safe = Math.max(0, Math.floor(remaining))
  if (safe < 60) {
    // Under a minute: show just the seconds. Two digits for tabular alignment.
    return String(safe).padStart(2, '0')
  }
  const mm = Math.floor(safe / 60)
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function RestBanner({
  seconds,
  startedAt,
  onDone,
  onSkip,
  message,
}: RestBannerProps) {
  // `now` is what drives the countdown render. We tick it every 1s since
  // second-level precision is enough.
  const [now, setNow] = useState<number>(() => Date.now())

  // Latest onDone ref so the timer effect doesn't re-subscribe when the
  // parent passes a fresh callback each render.
  const onDoneRef = useRef<(() => void) | undefined>(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  // Guard so onDone fires exactly once, even across re-renders or if the
  // parent keeps the component mounted past completion.
  const firedRef = useRef<boolean>(false)

  useEffect(() => {
    // Reset the "already fired" flag whenever the rest period itself resets
    // (new startedAt or seconds). Otherwise, a second rest in the same mount
    // would never fire onDone.
    firedRef.current = false
    setNow(Date.now())

    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [startedAt, seconds])

  const elapsedMs = now - startedAt
  const totalMs = seconds * 1000
  const remainingMs = Math.max(0, totalMs - elapsedMs)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const done = remainingMs <= 0

  // Fire onDone exactly once when we cross into "done".
  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true
      onDoneRef.current?.()
    }
  }, [done])

  // Ring geometry. Diameter 72 (size 72x72, radius 34, stroke 4).
  const size = 72
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // Visible arc length: full at start, shrinks to zero as time runs out.
  // Combined with rotate(-90) at 12 o'clock, the arc's trailing edge walks
  // counterclockwise back toward the start — the standard countdown feel.
  const remainingRatio = totalMs > 0 ? remainingMs / totalMs : 0
  const visibleLen = circumference * remainingRatio
  const gapLen = circumference - visibleLen

  const reducedMotion = prefersReducedMotion()
  const digitsAnimation = reducedMotion
    ? undefined
    : 'rest-banner-pulse 2s ease-in-out infinite'

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: `linear-gradient(90deg, ${ACCENT_MINT}1F, transparent)`,
    border: `1px solid ${ACCENT_MINT}44`,
    padding: '10px 14px',
    borderRadius: 16,
  }

  const labelStyle: CSSProperties = {
    fontSize: 10,
    color: ACCENT_MINT,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 700,
  }

  const digitsStyle: CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--lumo-text)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1,
    marginTop: 2,
    animation: digitsAnimation,
  }

  const messageStyle: CSSProperties = {
    fontSize: 12,
    color: 'var(--lumo-text-sec)',
    marginTop: 4,
    lineHeight: 1.3,
  }

  const skipButtonStyle: CSSProperties = {
    background: 'transparent',
    border: `1px solid ${ACCENT_MINT}66`,
    color: ACCENT_MINT,
    fontSize: 11,
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: 10,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }

  return (
    <div data-testid="rest-banner" style={containerStyle}>
      <style>{PULSE_KEYFRAMES}</style>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={BORDER_SUBTLE}
          strokeWidth={stroke}
        />
        {/* Progress arc — full at start, shrinks back to 12 o'clock. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ACCENT_MINT}
          strokeWidth={stroke}
          strokeDasharray={`${visibleLen} ${gapLen}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 250ms linear' }}
        />
      </svg>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>rest</div>
        <div
          data-testid="rest-banner-digits"
          aria-live="polite"
          aria-label={`${remainingSec} seconds remaining`}
          style={digitsStyle}
        >
          {formatRemaining(remainingSec)}
        </div>
        {message && (
          <div data-testid="rest-banner-message" style={messageStyle}>
            {message}
          </div>
        )}
      </div>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip rest"
          style={skipButtonStyle}
        >
          skip
        </button>
      )}
    </div>
  )
}

export default RestBanner
