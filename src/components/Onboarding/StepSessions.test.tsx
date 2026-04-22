import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepSessions } from './StepSessions'

describe('StepSessions', () => {
  it('disables Next until sessions count is chosen', () => {
    const onNext = vi.fn()
    render(<StepSessions onNext={onNext} />)
    fireEvent.click(screen.getByTestId('step-sessions-next'))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('submits sessions + time budget', () => {
    const onNext = vi.fn()
    render(<StepSessions onNext={onNext} />)
    fireEvent.click(screen.getByRole('radio', { name: '4' }))
    fireEvent.click(screen.getByTestId('step-sessions-next'))
    expect(onNext).toHaveBeenCalledWith({ sessions_per_week: 4 })
  })
})
