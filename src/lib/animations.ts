/**
 * Animation primitives ported from the Lumo design zip
 * (`/tmp/workout-app-design-v2/animations.jsx`).
 *
 * Scope: the minimum set of utilities our TS scenes need — easing fns,
 * clamp/lerp/interpolate, and a tiny `useTime` RAF-driven hook. The full
 * Popmotion-style `Stage` from the reference implementation is intentionally
 * skipped; we don't need playback chrome, scrubbing, or Sprite windowing
 * in the production app. Scenes that want sub-windows can just compare
 * `time` against their own start/end values inline.
 *
 * All functions are pure and fully typed. No `any`.
 */
import { useEffect, useRef, useState } from 'react'

/** `t` ∈ [0,1] → eased `t`. May overshoot for Back / Elastic. */
export type EasingFn = (t: number) => number

/**
 * Hand-rolled Popmotion-style easings. Only the ones used by the Lumo
 * splash + workout scenes are included. Adding new ones is trivial —
 * keep the `(t: number) => number` contract.
 */
export const Easing: {
  readonly linear: EasingFn
  readonly easeInQuad: EasingFn
  readonly easeOutQuad: EasingFn
  readonly easeInOutQuad: EasingFn
  readonly easeInCubic: EasingFn
  readonly easeOutCubic: EasingFn
  readonly easeInOutCubic: EasingFn
  readonly easeInExpo: EasingFn
  readonly easeOutExpo: EasingFn
  readonly easeInSine: EasingFn
  readonly easeOutSine: EasingFn
  readonly easeOutBack: EasingFn
  readonly easeInBack: EasingFn
  readonly easeOutElastic: EasingFn
} = {
  linear: (t) => t,

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => {
    const u = t - 1
    return u * u * u + 1
  },
  easeInOutCubic: (t) =>
    t < 0.5
      ? 4 * t * t * t
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),

  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),

  easeOutBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeInBack: (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },

  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3
    if (t === 0) return 0
    if (t === 1) return 1
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
}

/** Clamp a value to the inclusive range `[min, max]`. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Linear interpolation between `a` and `b` at position `t` ∈ [0,1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Popmotion-style multi-segment interpolation. Maps `t` through an array
 * of input keyframes to the corresponding output values, with optional
 * easing applied per segment.
 *
 * @param input  Strictly increasing array of input keyframes.
 * @param output Array of output values, same length as `input`.
 * @param ease   Single easing fn (applied per segment) or array of
 *               easings (one per segment; falls back to linear).
 *
 * @returns A function `(t) => y` that clamps outside the input range.
 *
 * @example
 *   const fade = interpolate([0, 0.5, 1], [0, 1, 0], Easing.easeOutCubic)
 *   fade(0.25) // ~0.87 (eased halfway through the first segment)
 */
export function interpolate(
  input: readonly number[],
  output: readonly number[],
  ease: EasingFn | readonly EasingFn[] = Easing.linear,
): (t: number) => number {
  if (input.length !== output.length) {
    throw new Error(
      `interpolate: input.length (${input.length}) must equal output.length (${output.length})`,
    )
  }
  if (input.length === 0) {
    throw new Error('interpolate: input/output arrays must be non-empty')
  }

  return (t: number): number => {
    if (t <= input[0]) return output[0]
    const last = input.length - 1
    if (t >= input[last]) return output[last]
    for (let i = 0; i < last; i += 1) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i]
        const local = span === 0 ? 0 : (t - input[i]) / span
        const easeFn = Array.isArray(ease)
          ? (ease[i] ?? Easing.linear)
          : (ease as EasingFn)
        const eased = easeFn(local)
        return output[i] + (output[i + 1] - output[i]) * eased
      }
    }
    return output[last]
  }
}

export interface UseTimeOptions {
  /** Scene duration in seconds. `time` wraps back to 0 at `duration` when looping. */
  duration: number
  /** Whether the clock should advance. When `false`, the hook pauses at the current time. */
  play?: boolean
  /** Loop back to 0 after `duration` seconds. When `false`, clamps at `duration`. */
  loop?: boolean
}

/**
 * Self-contained RAF clock. Returns the current scene time in seconds
 * since the first played frame. Wraps at `duration` when `loop === true`.
 *
 * Safe in SSR / jsdom envs: when `requestAnimationFrame` is unavailable
 * the hook simply returns 0 without scheduling any work.
 *
 * Tests that need deterministic time should render the scene directly
 * with an explicit `time` prop instead of relying on RAF to advance —
 * see `LumoWorkoutScene` which accepts `time` as a plain prop.
 */
export function useTime({
  duration,
  play = true,
  loop = true,
}: UseTimeOptions): number {
  const [time, setTime] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)

  useEffect(() => {
    if (!play) {
      lastRef.current = null
      return
    }
    if (typeof requestAnimationFrame === 'undefined') return

    const step = (ts: number): void => {
      if (lastRef.current == null) lastRef.current = ts
      const dt = (ts - lastRef.current) / 1000
      lastRef.current = ts
      setTime((t) => {
        let next = t + dt
        if (next >= duration) {
          next = loop ? next % duration : duration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastRef.current = null
    }
  }, [play, duration, loop])

  return time
}
