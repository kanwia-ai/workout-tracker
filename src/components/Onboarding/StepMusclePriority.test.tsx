import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepMusclePriority } from './StepMusclePriority'

describe('StepMusclePriority', () => {
  it('lets user proceed with zero picks (optional)', () => {
    const onNext = vi.fn()
    render(
      <StepMusclePriority onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.click(screen.getByTestId('step-muscle-priority-next'))
    expect(onNext).toHaveBeenCalledWith([])
  })

  it('preserves tap order as priority rank', () => {
    const onNext = vi.fn()
    render(
      <StepMusclePriority onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Glutes/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Back/i }))
    fireEvent.click(screen.getByTestId('step-muscle-priority-next'))
    expect(onNext).toHaveBeenCalledWith(['glutes', 'back'])
  })

  it('skip button applies empty default', () => {
    const onSkip = vi.fn()
    render(
      <StepMusclePriority onNext={() => undefined} onSkip={onSkip} />,
    )
    fireEvent.click(screen.getByTestId('step-skip'))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })
})
