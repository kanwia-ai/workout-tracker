import { describe, it, expect } from 'vitest'
import { Easing, clamp, lerp, interpolate } from './animations'

describe('clamp', () => {
  it('returns the value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps below the min', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })
  it('clamps above the max', () => {
    expect(clamp(100, 0, 10)).toBe(10)
  })
  it('handles degenerate ranges (min === max)', () => {
    expect(clamp(5, 3, 3)).toBe(3)
  })
})

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })
  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })
  it('returns midpoint at t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
  it('extrapolates outside [0,1]', () => {
    expect(lerp(0, 10, 1.5)).toBe(15)
    expect(lerp(0, 10, -0.5)).toBe(-5)
  })
})

describe('Easing invariants', () => {
  // Every easing must map 0 → 0 and 1 → 1 (the standard tween contract).
  // Back / Elastic may overshoot in the middle but are pinned at the ends.
  const easings: Array<[keyof typeof Easing, (t: number) => number]> = [
    ['linear', Easing.linear],
    ['easeInQuad', Easing.easeInQuad],
    ['easeOutQuad', Easing.easeOutQuad],
    ['easeInOutQuad', Easing.easeInOutQuad],
    ['easeInCubic', Easing.easeInCubic],
    ['easeOutCubic', Easing.easeOutCubic],
    ['easeInOutCubic', Easing.easeInOutCubic],
    ['easeInExpo', Easing.easeInExpo],
    ['easeOutExpo', Easing.easeOutExpo],
    ['easeInSine', Easing.easeInSine],
    ['easeOutSine', Easing.easeOutSine],
    ['easeOutBack', Easing.easeOutBack],
    ['easeInBack', Easing.easeInBack],
    ['easeOutElastic', Easing.easeOutElastic],
  ]

  it.each(easings)('%s(0) ≈ 0 and %s(1) ≈ 1', (_name, fn) => {
    expect(fn(0)).toBeCloseTo(0, 5)
    expect(fn(1)).toBeCloseTo(1, 5)
  })

  // Monotonic easings (no overshoot) should stay inside [0,1] for t ∈ [0,1].
  const monotonic: Array<[string, (t: number) => number]> = [
    ['linear', Easing.linear],
    ['easeInQuad', Easing.easeInQuad],
    ['easeOutQuad', Easing.easeOutQuad],
    ['easeInOutQuad', Easing.easeInOutQuad],
    ['easeInCubic', Easing.easeInCubic],
    ['easeOutCubic', Easing.easeOutCubic],
    ['easeInOutCubic', Easing.easeInOutCubic],
    ['easeInSine', Easing.easeInSine],
    ['easeOutSine', Easing.easeOutSine],
  ]

  it.each(monotonic)('%s stays in [0,1] across t=0..1', (_name, fn) => {
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20
      const y = fn(t)
      expect(y).toBeGreaterThanOrEqual(-1e-6)
      expect(y).toBeLessThanOrEqual(1 + 1e-6)
    }
  })

  it('easeOutBack overshoots past 1 somewhere in (0, 1)', () => {
    // The whole point of Back is overshoot; we expect at least one sample > 1.
    let maxVal = 0
    for (let i = 1; i < 20; i += 1) {
      const y = Easing.easeOutBack(i / 20)
      if (y > maxVal) maxVal = y
    }
    expect(maxVal).toBeGreaterThan(1)
  })
})

describe('interpolate', () => {
  it('clamps below the first input', () => {
    const fn = interpolate([0, 1], [10, 20])
    expect(fn(-5)).toBe(10)
  })

  it('clamps above the last input', () => {
    const fn = interpolate([0, 1], [10, 20])
    expect(fn(5)).toBe(20)
  })

  it('linearly interpolates between two keyframes', () => {
    const fn = interpolate([0, 1], [0, 100])
    expect(fn(0)).toBe(0)
    expect(fn(0.25)).toBeCloseTo(25)
    expect(fn(0.5)).toBe(50)
    expect(fn(1)).toBe(100)
  })

  it('handles multi-segment keyframes (fade-in / hold / fade-out)', () => {
    const fn = interpolate([0, 0.5, 1], [0, 100, 50])
    expect(fn(0)).toBe(0)
    expect(fn(0.25)).toBeCloseTo(50)
    expect(fn(0.5)).toBe(100)
    expect(fn(0.75)).toBeCloseTo(75)
    expect(fn(1)).toBe(50)
  })

  it('applies a per-segment easing when an array is supplied', () => {
    // First segment eased in (slower early, faster late),
    // second segment linear. At t=0.25 the eased first segment should be
    // well below 0.5 (the linear midpoint) of the first output range.
    const fn = interpolate(
      [0, 0.5, 1],
      [0, 100, 100],
      [Easing.easeInCubic, Easing.linear],
    )
    const linearFn = interpolate([0, 0.5, 1], [0, 100, 100], Easing.linear)
    expect(fn(0.25)).toBeLessThan(linearFn(0.25))
  })

  it('applies a single easing fn across all segments when not an array', () => {
    const fn = interpolate([0, 1], [0, 100], Easing.easeInCubic)
    // easeInCubic(0.5) = 0.125; output should be 12.5.
    expect(fn(0.5)).toBeCloseTo(12.5)
  })

  it('throws when input/output lengths differ', () => {
    expect(() => interpolate([0, 1], [0, 50, 100])).toThrow()
  })

  it('throws when arrays are empty', () => {
    expect(() => interpolate([], [])).toThrow()
  })

  it('handles a degenerate zero-span segment without dividing by zero', () => {
    // Two identical input keyframes in a row should just return the later
    // output, never NaN / Infinity.
    const fn = interpolate([0, 0.5, 0.5, 1], [0, 10, 20, 30])
    const result = fn(0.5)
    expect(Number.isFinite(result)).toBe(true)
  })
})
