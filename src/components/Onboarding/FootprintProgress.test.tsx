import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FootprintProgress } from './FootprintProgress'

describe('FootprintProgress', () => {
  it('renders N footprints with correct kinds', () => {
    const completed = new Set<number>([0, 1])
    render(
      <FootprintProgress
        totalSteps={5}
        currentStep={2}
        completedSteps={completed}
      />,
    )
    expect(screen.getByTestId('footprint-0').getAttribute('data-kind')).toBe(
      'filled',
    )
    expect(screen.getByTestId('footprint-1').getAttribute('data-kind')).toBe(
      'filled',
    )
    expect(screen.getByTestId('footprint-2').getAttribute('data-kind')).toBe(
      'current',
    )
    expect(screen.getByTestId('footprint-3').getAttribute('data-kind')).toBe(
      'outlined',
    )
    expect(screen.getByTestId('footprint-4').getAttribute('data-kind')).toBe(
      'outlined',
    )
  })

  it('sets aria-valuenow and aria-valuemax', () => {
    render(
      <FootprintProgress
        totalSteps={4}
        currentStep={1}
        completedSteps={new Set([0])}
      />,
    )
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
  })

  it('calls onFootprintTap only for completed footprints', () => {
    const handler = vi.fn()
    render(
      <FootprintProgress
        totalSteps={4}
        currentStep={2}
        completedSteps={new Set([0, 1])}
        onFootprintTap={handler}
      />,
    )
    const completed = screen.getByTestId('footprint-0')
    fireEvent.click(completed)
    expect(handler).toHaveBeenCalledWith(0)

    // Current and upcoming are not buttons; no handler fires.
    const current = screen.getByTestId('footprint-2')
    fireEvent.click(current)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('falls back to static footprints when no tap handler is provided', () => {
    render(
      <FootprintProgress
        totalSteps={3}
        currentStep={0}
        completedSteps={new Set([])}
      />,
    )
    // None should be a <button> since completedSteps is empty.
    expect(screen.queryByRole('button')).toBeNull()
  })
})
