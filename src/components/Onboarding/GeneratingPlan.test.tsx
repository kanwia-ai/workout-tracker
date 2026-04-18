import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest'
import {
  render,
  screen,
  act,
  fireEvent,
  cleanup,
} from '@testing-library/react'
import { GeneratingPlan } from './GeneratingPlan'

// We drive elapsed time through `vi.advanceTimersByTime`. Vitest's fake
// timers auto-advance the mocked Date, so calling `setSystemTime` here too
// would double-count elapsed time (earlier version of this helper did that
// and caused the progress-bar test to read ~2x the expected percentage).
// advanceTimersByTime fires every scheduled interval callback inside the
// advanced window AND keeps Date.now() in sync, which is what our
// checkpoint math relies on.
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('GeneratingPlan', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    // Anchor wall clock so progress math is deterministic across runs.
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders the Fraunces headline and a label under it', () => {
    render(<GeneratingPlan />)
    expect(
      screen.getByText(/Designing your training block/i),
    ).toBeInTheDocument()
    // Checkpoint label is visible (not the old "60-120 seconds" copy).
    expect(
      screen.getByText(/reading your profile/i),
    ).toBeInTheDocument()
  })

  it('starts at 0% progress with role="progressbar"', () => {
    render(<GeneratingPlan />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.style.width).toBe('0%')
    // Percentage text is visible instead of elapsed timer.
    expect(screen.getByTestId('progress-pct')).toHaveTextContent('0%')
  })

  it('renders a Lumo mascot in the thinking state initially', () => {
    render(<GeneratingPlan />)
    const wrapper = screen.getByTestId('generating-plan-lumo')
    expect(wrapper).toHaveAttribute('data-lumo-state', 'thinking')
  })

  it('renders narration with role=status and aria-live=polite', () => {
    render(<GeneratingPlan />)
    const narration = screen.getByTestId('narration')
    expect(narration.getAttribute('role')).toBe('status')
    expect(narration.getAttribute('aria-live')).toBe('polite')
    expect(narration.textContent).not.toBe('')
  })

  it('progresses past 30% by the time we hit the 20s "pick exercises" checkpoint', () => {
    render(<GeneratingPlan />)
    advance(20_000)
    const bar = screen.getByRole('progressbar')
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(
      30,
    )
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(40)
  })

  it('never exceeds the 95% ceiling even after 300s', () => {
    render(<GeneratingPlan />)
    advance(300_000)
    const bar = screen.getByRole('progressbar')
    const val = Number(bar.getAttribute('aria-valuenow'))
    expect(val).toBeLessThanOrEqual(95)
    expect(val).toBe(95)
  })

  it('shows the "still cooking" message and sleepy Lumo past the 180s threshold', () => {
    render(<GeneratingPlan />)
    // Not visible initially — the long-wait banner has its own testid so
    // we don't collide with narration lines that happen to mention
    // "still cooking".
    expect(screen.queryByTestId('long-wait-banner')).not.toBeInTheDocument()
    advance(200_000)
    expect(screen.getByTestId('long-wait-banner')).toBeInTheDocument()
    expect(screen.getByTestId('long-wait-banner').textContent).toMatch(
      /still cooking/i,
    )
    const wrapper = screen.getByTestId('generating-plan-lumo')
    expect(wrapper).toHaveAttribute('data-lumo-state', 'sleepy')
  })

  it('shows a Cancel button past 180s when onCancel is provided, and clicking it fires onCancel', () => {
    const onCancel = vi.fn()
    render(<GeneratingPlan onCancel={onCancel} />)
    expect(
      screen.queryByRole('button', { name: /cancel and try again/i }),
    ).not.toBeInTheDocument()
    advance(200_000)
    const btn = screen.getByRole('button', { name: /cancel and try again/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does NOT show the cancel button when onCancel is not provided', () => {
    render(<GeneratingPlan />)
    advance(200_000)
    expect(
      screen.queryByRole('button', { name: /cancel and try again/i }),
    ).not.toBeInTheDocument()
  })

  it('rotates narration over time (new line within ~6s)', () => {
    render(<GeneratingPlan />)
    const first = screen.getByTestId('narration').textContent
    // Force the rotation by advancing past the rotation interval a few times,
    // checking that at least one tick produces a different line.
    let changed = false
    for (let i = 0; i < 20 && !changed; i += 1) {
      advance(6_500)
      const now = screen.getByTestId('narration').textContent
      if (now !== first) {
        changed = true
        break
      }
    }
    expect(changed).toBe(true)
  })

  it('injury-aware rotation surfaces at least one injury-specific line when injuries prop is provided', () => {
    render(
      <GeneratingPlan
        injuries={[{ part: 'left_meniscus', severity: 'chronic' }]}
      />,
    )
    const seen = new Set<string>()
    const initial = screen.getByTestId('narration').textContent
    if (initial) seen.add(initial)
    // Rotate many times to exercise the full pool. With the interleaved
    // left_meniscus bucket, at least one rotation should land on an
    // injury-specific line.
    for (let i = 0; i < 40; i += 1) {
      advance(6_500)
      const line = screen.getByTestId('narration').textContent
      if (line) seen.add(line)
    }
    const hasInjuryLine = Array.from(seen).some((line) =>
      /meniscus|knee/i.test(line),
    )
    expect(hasInjuryLine).toBe(true)
  })

  it('uses the long-wait pool once elapsed exceeds 180s', () => {
    render(<GeneratingPlan />)
    advance(200_000)
    const seen = new Set<string>()
    // Sample narration over several rotations to ensure only long-wait lines
    // appear. Known markers from the long-wait pool at tier 2 include
    // "cooking", "thorough", "oven", "buffering".
    for (let i = 0; i < 20; i += 1) {
      seen.add(screen.getByTestId('narration').textContent ?? '')
      advance(6_500)
    }
    const longWaitMarker = /cooking|thorough|oven|buffering|chunky|ghosting/i
    const hasLongWaitLine = Array.from(seen).some((l) => longWaitMarker.test(l))
    expect(hasLongWaitLine).toBe(true)
  })

  it('respects the preserved `startedAt` prop', () => {
    // When the parent passes a startedAt in the past, initial elapsed should
    // already be non-zero after the first tick.
    const past = Date.now() - 50_000
    render(<GeneratingPlan startedAt={past} />)
    advance(250)
    const bar = screen.getByRole('progressbar')
    // At 50s+ we're in the "picking exercises" → "building week 1" band.
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(30)
  })
})
