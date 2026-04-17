import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepGoal } from './StepGoal'

describe('StepGoal', () => {
  it('calls onNext with the correct goal id when an option is tapped', () => {
    const onNext = vi.fn()
    render(<StepGoal onNext={onNext} />)

    const option = screen.getByRole('button', { name: /Glute focus/i })
    fireEvent.click(option)

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledWith('glutes')
  })

  it('passes the selected goal id for a different option', () => {
    const onNext = vi.fn()
    render(<StepGoal onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: /Rehab/i }))

    expect(onNext).toHaveBeenCalledWith('rehab')
  })
})
