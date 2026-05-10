import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepDays, suggestedDaysFor } from './StepDays'

describe('suggestedDaysFor', () => {
  it('maps every supported sessions/week count to the right defaults', () => {
    expect(suggestedDaysFor(1)).toEqual([2])
    expect(suggestedDaysFor(2)).toEqual([0, 3])
    expect(suggestedDaysFor(3)).toEqual([0, 2, 4])
    expect(suggestedDaysFor(4)).toEqual([0, 1, 3, 4])
    expect(suggestedDaysFor(5)).toEqual([0, 1, 2, 3, 4])
    expect(suggestedDaysFor(6)).toEqual([0, 1, 2, 3, 4, 5])
    expect(suggestedDaysFor(7)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('StepDays', () => {
  it('renders 7 day chips Mon..Sun', () => {
    render(<StepDays sessionsPerWeek={3} onNext={() => undefined} />)
    for (let dow = 0; dow < 7; dow += 1) {
      expect(screen.getByTestId(`onboarding-day-${dow}`)).toBeInTheDocument()
    }
  })

  it('pre-selects Mon/Tue/Thu/Fri when sessions_per_week=4', () => {
    render(<StepDays sessionsPerWeek={4} onNext={() => undefined} />)
    expect(screen.getByTestId('onboarding-day-0')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('onboarding-day-1')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('onboarding-day-2')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('onboarding-day-3')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('onboarding-day-4')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('onboarding-day-5')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('onboarding-day-6')).toHaveAttribute('aria-checked', 'false')
  })

  it('emits sorted preferred_days on Continue when count matches', () => {
    const onNext = vi.fn()
    // Start with default (Mon/Wed/Fri = [0,2,4]) for sessions_per_week=3
    render(<StepDays sessionsPerWeek={3} onNext={onNext} />)
    // Untoggle Wed (default) and Fri, then add Tue (1) and Thu (3) →
    // selection becomes Mon/Tue/Thu = [0,1,3]
    fireEvent.click(screen.getByTestId('onboarding-day-2'))
    fireEvent.click(screen.getByTestId('onboarding-day-4'))
    fireEvent.click(screen.getByTestId('onboarding-day-1'))
    fireEvent.click(screen.getByTestId('onboarding-day-3'))
    fireEvent.click(screen.getByTestId('onboarding-days-continue'))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledWith({ preferred_days: [0, 1, 3] })
  })

  it('disables Continue and shows live hint when fewer than N days picked', () => {
    const onNext = vi.fn()
    // sessions_per_week=4 starts pre-filled with 4. Untoggle two so we have 2.
    render(<StepDays sessionsPerWeek={4} onNext={onNext} />)
    fireEvent.click(screen.getByTestId('onboarding-day-0')) // off
    fireEvent.click(screen.getByTestId('onboarding-day-1')) // off

    const cta = screen.getByTestId('onboarding-days-continue')
    expect(cta).toBeDisabled()
    expect(screen.getByTestId('onboarding-days-hint').textContent).toBe('pick 2 days')

    // Tapping disabled button should not call onNext.
    fireEvent.click(cta)
    expect(onNext).not.toHaveBeenCalled()
  })

  it('shows "remove N day" hint when too many picked', () => {
    const onNext = vi.fn()
    render(<StepDays sessionsPerWeek={3} onNext={onNext} />)
    // Default = [0,2,4]. Add Sat → 4 selected, need 3.
    fireEvent.click(screen.getByTestId('onboarding-day-5'))
    expect(screen.getByTestId('onboarding-days-hint').textContent).toBe('remove 1 day')
    expect(screen.getByTestId('onboarding-days-continue')).toBeDisabled()
  })

  it('honors a passed-in `value` over the default for the same N', () => {
    render(
      <StepDays
        sessionsPerWeek={3}
        value={[1, 3, 5]} // Tue/Thu/Sat
        onNext={() => undefined}
      />,
    )
    expect(screen.getByTestId('onboarding-day-1')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('onboarding-day-3')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('onboarding-day-5')).toHaveAttribute('aria-checked', 'true')
    // Defaults Mon/Wed/Fri should NOT be selected
    expect(screen.getByTestId('onboarding-day-0')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('onboarding-day-2')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('onboarding-day-4')).toHaveAttribute('aria-checked', 'false')
  })
})
