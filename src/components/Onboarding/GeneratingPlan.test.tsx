import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { GeneratingPlan } from './GeneratingPlan'

describe('GeneratingPlan', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders honest headline and copy', () => {
    render(<GeneratingPlan />)
    expect(
      screen.getByText(/Designing your training block/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Usually takes 60-120 seconds/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Matching 24 sessions to your profile, injuries, and recovery windows/i,
      ),
    ).toBeInTheDocument()
  })

  it('starts at 0:00 elapsed and ~0% progress', () => {
    render(<GeneratingPlan />)
    expect(screen.getByTestId('elapsed-time')).toHaveTextContent('0:00')
    const bar = screen.getByTestId('progress-bar-fill')
    expect(bar.style.width).toBe('0%')
  })

  it('at 30s, elapsed is 0:30 and progress is ~31%', () => {
    render(<GeneratingPlan />)
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getByTestId('elapsed-time')).toHaveTextContent('0:30')
    const bar = screen.getByTestId('progress-bar-fill')
    const pct = parseFloat(bar.style.width)
    // min(30/90*95, 95) = 31.666…
    expect(pct).toBeGreaterThanOrEqual(30)
    expect(pct).toBeLessThanOrEqual(33)
  })

  it('at 90s, progress sits at its 95% ceiling', () => {
    render(<GeneratingPlan />)
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    const bar = screen.getByTestId('progress-bar-fill')
    expect(bar.style.width).toBe('95%')
    expect(screen.getByTestId('elapsed-time')).toHaveTextContent('1:30')
  })

  it('progress never exceeds 95% even after 200s', () => {
    render(<GeneratingPlan />)
    act(() => {
      vi.advanceTimersByTime(200_000)
    })
    const bar = screen.getByTestId('progress-bar-fill')
    const pct = parseFloat(bar.style.width)
    expect(pct).toBeLessThanOrEqual(95)
    expect(pct).toBe(95)
  })

  it('shows the "taking longer than usual" message after 180s', () => {
    render(<GeneratingPlan />)
    // Not visible initially
    expect(
      screen.queryByText(/taking longer than usual/i),
    ).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(200_000)
    })
    expect(
      screen.getByText(/This is taking longer than usual/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Hang tight or refresh to retry/i),
    ).toBeInTheDocument()
  })

  it('formats elapsed as MM:SS with leading zero on seconds', () => {
    render(<GeneratingPlan />)
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(screen.getByTestId('elapsed-time')).toHaveTextContent('0:05')
    act(() => {
      vi.advanceTimersByTime(65_000) // total 70s
    })
    expect(screen.getByTestId('elapsed-time')).toHaveTextContent('1:10')
  })
})
