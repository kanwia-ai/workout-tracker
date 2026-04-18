import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ParticleBurst } from './ParticleBurst'

// Helper: install a matchMedia mock that returns the given `reduce` flag for
// `(prefers-reduced-motion: reduce)` queries.
function installMatchMedia(reduce: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  // Default to motion-enabled; individual tests override as needed.
  installMatchMedia(false)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ParticleBurst', () => {
  it('renders the requested number of particles when triggered', () => {
    render(<ParticleBurst trigger={1} count={8} />)

    const dots = screen.getAllByTestId('particle-burst-dot')
    expect(dots).toHaveLength(8)
  })

  it('honours a custom count prop', () => {
    render(<ParticleBurst trigger={1} count={12} />)

    const dots = screen.getAllByTestId('particle-burst-dot')
    expect(dots).toHaveLength(12)
  })

  it('calls onComplete after the animation duration', () => {
    const onComplete = vi.fn()

    render(<ParticleBurst trigger={1} onComplete={onComplete} />)

    // Before the timer fires, nothing should have been called.
    expect(onComplete).not.toHaveBeenCalled()

    // The component uses a ~500ms timeout matching the keyframe duration.
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('fires another burst + onComplete when trigger changes', () => {
    const onComplete = vi.fn()

    const { rerender } = render(
      <ParticleBurst trigger={1} onComplete={onComplete} />,
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)

    // Re-fire by changing trigger — the effect should re-run.
    rerender(<ParticleBurst trigger={2} onComplete={onComplete} />)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onComplete).toHaveBeenCalledTimes(2)
  })

  it('respects prefers-reduced-motion: skips animation and fires onComplete immediately', () => {
    installMatchMedia(true)
    const onComplete = vi.fn()

    render(
      <ParticleBurst trigger={1} count={8} onComplete={onComplete} />,
    )

    // With reduced motion, no particle dots should be rendered.
    expect(screen.queryAllByTestId('particle-burst-dot')).toHaveLength(0)

    // The container still renders (as a data-reduced-motion marker) so
    // layout stays stable.
    const container = screen.getByTestId('particle-burst')
    expect(container).toHaveAttribute('data-reduced-motion', 'true')

    // onComplete fires on the next tick (timeout 0), not after 500ms.
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
