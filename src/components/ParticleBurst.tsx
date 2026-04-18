import { useEffect, useMemo, useRef, type CSSProperties } from 'react'

/**
 * ParticleBurst — a quick celebratory pop for set-complete / PR moments.
 *
 * A small radial burst of N particles that explode outward in the brand
 * color, rotate slightly, and fade out over ~500ms. Fire it by changing the
 * `trigger` prop (number or boolean) — each change remounts the particles
 * and replays the keyframe animation.
 *
 * The component is absolutely positioned and pointer-events-none so it can
 * be stacked over any element (place its parent as `relative`, or wrap the
 * burst in an absolutely-positioned anchor).
 *
 * Respects `prefers-reduced-motion`: when set, the animation is skipped and
 * `onComplete` fires on the next tick.
 */

export interface ParticleBurstProps {
  /** Change this value to fire a burst. */
  trigger: number | boolean
  /** Particle color. Defaults to `var(--brand)`. */
  color?: string
  /** Number of particles. Default 8. */
  count?: number
  /** Container size in px (square). Default 80. */
  size?: number
  /** Called after the animation ends (or immediately if reduced motion). */
  onComplete?: () => void
}

// Keyframe is emitted once per component instance via an inline <style> tag.
// Using CSS custom props (--tx, --ty, --rot) so each particle can have its
// own trajectory without generating N unique keyframes.
const BURST_DURATION_MS = 500

const KEYFRAMES = `
@keyframes particle-burst-go {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.4) rotate(0deg);
  }
  60% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform:
      translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))
      scale(1.1)
      rotate(var(--rot));
  }
}
`

interface Particle {
  tx: number
  ty: number
  rot: number
  diameter: number
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function buildParticles(count: number): Particle[] {
  // Deterministic-ish radial distribution with a small random jitter per fire.
  // Travel distance ~60–90px, slight size variance for visual interest.
  const particles: Particle[] = []
  for (let i = 0; i < count; i += 1) {
    const baseAngle = (i / count) * Math.PI * 2
    const jitter = (Math.random() - 0.5) * 0.35
    const angle = baseAngle + jitter
    const distance = 60 + Math.random() * 30
    particles.push({
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      rot: Math.random() * 360 - 180,
      diameter: 6 + Math.random() * 3,
    })
  }
  return particles
}

export function ParticleBurst({
  trigger,
  color = 'var(--brand)',
  count = 8,
  size = 80,
  onComplete,
}: ParticleBurstProps) {
  // Rebuild particles whenever trigger changes so each fire feels fresh.
  const particles = useMemo(
    () => buildParticles(count),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger, count],
  )

  // Keep the latest onComplete in a ref so the timer effect doesn't need to
  // depend on it (avoids re-running the timer if the callback identity
  // changes between renders).
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (prefersReducedMotion()) {
      // Fire immediately on the next tick so callers get the "done" signal
      // without any visible animation.
      const id = window.setTimeout(() => {
        onCompleteRef.current?.()
      }, 0)
      return () => window.clearTimeout(id)
    }

    const id = window.setTimeout(() => {
      onCompleteRef.current?.()
    }, BURST_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [trigger, count])

  if (prefersReducedMotion()) {
    // Render a stable, invisible anchor so layout doesn't shift.
    return (
      <div
        aria-hidden="true"
        data-testid="particle-burst"
        data-reduced-motion="true"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          pointerEvents: 'none',
        }}
      />
    )
  }

  const containerStyle: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none',
    // Anchor the burst from its own center — callers can then position this
    // component's parent wherever they want the origin to be.
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  }

  return (
    <div
      aria-hidden="true"
      data-testid="particle-burst"
      style={containerStyle}
    >
      <style>{KEYFRAMES}</style>
      {particles.map((p, i) => {
        const style: CSSProperties = {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: p.diameter,
          height: p.diameter,
          borderRadius: '50%',
          background: color,
          willChange: 'transform, opacity',
          transform: 'translate(-50%, -50%) scale(0.4)',
          animation: `particle-burst-go ${BURST_DURATION_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards`,
        }
        // CSS custom properties aren't in the CSSProperties type — cast
        // once to a loose record so we can attach the per-particle vars.
        const vars = style as CSSProperties & Record<string, string | number>
        vars['--tx'] = `${p.tx}px`
        vars['--ty'] = `${p.ty}px`
        vars['--rot'] = `${p.rot}deg`
        return <span key={i} data-testid="particle-burst-dot" style={style} />
      })}
    </div>
  )
}

export default ParticleBurst
