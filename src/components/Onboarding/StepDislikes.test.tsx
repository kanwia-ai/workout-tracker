import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepDislikes } from './StepDislikes'

describe('StepDislikes', () => {
  it('submits the chosen dislikes', () => {
    const onNext = vi.fn()
    render(
      <StepDislikes onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /burpees/i }))
    fireEvent.click(screen.getByRole('button', { name: /running/i }))
    fireEvent.click(screen.getByTestId('step-dislikes-next'))
    expect(onNext).toHaveBeenCalledWith(
      expect.arrayContaining(['burpees', 'running']),
    )
  })

  it('submits an empty array when nothing is toggled', () => {
    const onNext = vi.fn()
    render(
      <StepDislikes onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.click(screen.getByTestId('step-dislikes-next'))
    expect(onNext).toHaveBeenCalledWith([])
  })

  it('skip invokes onSkip', () => {
    const onSkip = vi.fn()
    render(
      <StepDislikes onNext={() => undefined} onSkip={onSkip} />,
    )
    fireEvent.click(screen.getByTestId('step-skip'))
    expect(onSkip).toHaveBeenCalled()
  })
})
