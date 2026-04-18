import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { RestBanner } from './RestBanner'

// Install a matchMedia mock so `prefers-reduced-motion` checks don't throw
// in jsdom. Tests that need the "reduced" state override per-test.
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

// Freeze "now" at a fixed epoch so fake timers + Date.now() agree. Vitest's
// fake timers mock Date, so advancing timers also advances Date.now().
const FROZEN_NOW = new Date('2026-04-17T12:00:00Z').getTime()

beforeEach(() => {
  installMatchMedia(false)
  vi.useFakeTimers()
  vi.setSystemTime(FROZEN_NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RestBanner', () => {
  it('renders MM:SS for durations >= 60s', () => {
    render(<RestBanner seconds={125} startedAt={FROZEN_NOW} />)
    // 125s total, 0 elapsed → 2:05
    expect(screen.getByTestId('rest-banner-digits')).toHaveTextContent('2:05')
  })

  it('renders just SS (zero-padded) when remaining is under 60s', () => {
    render(<RestBanner seconds={45} startedAt={FROZEN_NOW} />)
    expect(screen.getByTestId('rest-banner-digits')).toHaveTextContent('45')
  })

  it('counts down as time passes', () => {
    render(<RestBanner seconds={120} startedAt={FROZEN_NOW} />)
    expect(screen.getByTestId('rest-banner-digits')).toHaveTextContent('2:00')

    // Advance by 5s — both Date.now() and the interval tick forward.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTestId('rest-banner-digits')).toHaveTextContent('1:55')

    // Another 60s → should now read 55s (sub-minute format).
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByTestId('rest-banner-digits')).toHaveTextContent('55')
  })

  it('calls onDone exactly once when the timer ends', () => {
    const onDone = vi.fn()
    render(
      <RestBanner seconds={10} startedAt={FROZEN_NOW} onDone={onDone} />,
    )

    expect(onDone).not.toHaveBeenCalled()

    // Cross the finish line — 10s of rest means remaining hits 0 at t+10s.
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(onDone).toHaveBeenCalledTimes(1)

    // Continue ticking — onDone must not fire again.
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('calls onSkip when the skip button is tapped', () => {
    const onSkip = vi.fn()
    render(
      <RestBanner seconds={90} startedAt={FROZEN_NOW} onSkip={onSkip} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('does not render the skip button when onSkip is absent', () => {
    render(<RestBanner seconds={90} startedAt={FROZEN_NOW} />)
    expect(screen.queryByRole('button', { name: /skip/i })).toBeNull()
  })

  it('renders the optional message when provided', () => {
    render(
      <RestBanner
        seconds={60}
        startedAt={FROZEN_NOW}
        message="Shake it out. Next one's yours."
      />,
    )
    expect(screen.getByTestId('rest-banner-message')).toHaveTextContent(
      "Shake it out. Next one's yours.",
    )
  })

  it('skips the pulse animation when prefers-reduced-motion is set', () => {
    installMatchMedia(true)
    render(<RestBanner seconds={60} startedAt={FROZEN_NOW} />)
    const digits = screen.getByTestId('rest-banner-digits')
    // Inline style carries the animation shorthand when motion is allowed;
    // we assert no animation keyword leaked through in the reduced path.
    expect(digits.style.animation).toBe('')
  })
})
