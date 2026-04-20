// LumoLoader — full-viewport overlay that plays the LumoWorkoutScene on a
// loop. Drop it in anywhere you'd previously have rendered a static spinner;
// pass copy/progress children to layer on top of the animation.
//
// Ported (shape-wise) from the LumoLoader in
// /tmp/workout-app-design-v2/app.jsx, simplified to:
//   - use our standalone `useTime` hook instead of a TimelineContext
//   - respect prefers-reduced-motion (no RAF; static cheer Lumo instead)
//   - read CSS variables for colors so theme switches cascade
//   - layer a subtle scrim behind children so narration stays legible

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useTime } from '../lib/animations'
import { Lumo } from './Lumo'
import {
  LumoWorkoutScene,
  LUMO_SCENE_DURATION,
} from './LumoWorkoutScene'

export interface LumoLoaderProps {
  /** Loop the scene forever. Defaults to `true`. */
  loop?: boolean
  /** Override the scene duration. Defaults to `LUMO_SCENE_DURATION` (7s). */
  duration?: number
  /**
   * Content layered on top of the animated scene. Intended for narration +
   * progress bars; gets a subtle scrim so it stays legible over the
   * motion underneath.
   */
  children?: ReactNode
  /** Animate the opacity of the loader itself when it first mounts. */
  fadeIn?: boolean
}

const CSS = `
@keyframes lumo-loader-in { from { opacity: 0; } to { opacity: 1; } }
`

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches)
    // Some older Safari versions use addListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    mq.addListener(handler)
    return () => mq.removeListener(handler)
  }, [])
  return reduced
}

/**
 * Best-effort dark-mode detection. Reads the `color-scheme` CSS prop on the
 * documentElement first (set by our theme system), falls back to the OS
 * preference. Returns `true` for dark, `false` for light.
 */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => detectIsDark())
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => setIsDark(detectIsDark())
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    mq.addListener(handler)
    return () => mq.removeListener(handler)
  }, [])
  return isDark
}

function detectIsDark(): boolean {
  if (typeof document === 'undefined') return true
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--lumo-bg')
    .trim()
  // Our dark theme uses #0B0B0F; light uses #FFF7F4. Anything starting with
  // "#0" or rgb with a very low channel value counts as dark.
  if (bg) {
    const hexMatch = /^#([0-9a-f]{6})$/i.exec(bg)
    if (hexMatch) {
      const n = parseInt(hexMatch[1], 16)
      const r = (n >> 16) & 0xff
      const g = (n >> 8) & 0xff
      const b = n & 0xff
      return (r + g + b) / 3 < 80
    }
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return true
    }
  }
  return true
}

export function LumoLoader({
  loop = true,
  duration = LUMO_SCENE_DURATION,
  children,
  fadeIn = true,
}: LumoLoaderProps): ReactNode {
  const reducedMotion = usePrefersReducedMotion()
  const isDark = useIsDark()
  const time = useTime({ duration, play: !reducedMotion, loop })

  // Background matches the scene's own gradient so the wrapper fills any
  // safe-area the scene doesn't cover (tall screens, notches, etc.).
  const background = isDark
    ? 'radial-gradient(120% 80% at 50% 0%, #2D1330 0%, #14071A 55%, #0A0410 100%)'
    : 'radial-gradient(120% 80% at 50% 0%, var(--mascot-color, #FFB4C6) 0%, #FFF7F4 55%, #FFEFEA 100%)'

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 60,
    animation: fadeIn ? 'lumo-loader-in 0.25s ease' : undefined,
  }

  const childScrimStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '32px 24px 48px',
    // subtle bottom scrim so copy stays readable over the animation.
    background: isDark
      ? 'linear-gradient(to top, rgba(11,11,15,0.72), rgba(11,11,15,0) 100%)'
      : 'linear-gradient(to top, rgba(255,247,244,0.78), rgba(255,247,244,0) 100%)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    pointerEvents: 'auto',
  }

  return (
    <div
      data-testid="lumo-loader"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={overlayStyle}
      role="presentation"
    >
      <style>{CSS}</style>
      {reducedMotion ? (
        // Static fallback: a friendly cheer Lumo with no motion.
        <div
          data-testid="lumo-loader-static"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            inset: 0,
          }}
        >
          <Lumo state="cheer" size={180} />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LumoWorkoutScene time={time} size={240} isDark={isDark} />
        </div>
      )}

      {children && <div style={childScrimStyle}>{children}</div>}
    </div>
  )
}

export default LumoLoader
