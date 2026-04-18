import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepAesthetic } from './StepAesthetic'

describe('StepAesthetic', () => {
  it('emits none when no card is selected', () => {
    const onNext = vi.fn()
    render(
      <StepAesthetic onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.click(screen.getByTestId('step-aesthetic-next'))
    expect(onNext).toHaveBeenCalledWith('none')
  })

  it('emits selected preference on Next', () => {
    const onNext = vi.fn()
    render(
      <StepAesthetic onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.click(screen.getByRole('radio', { name: /strong & defined/i }))
    fireEvent.click(screen.getByTestId('step-aesthetic-next'))
    expect(onNext).toHaveBeenCalledWith('strong_defined')
  })

  it('surfaces a skip button', () => {
    const onSkip = vi.fn()
    render(
      <StepAesthetic onNext={() => undefined} onSkip={onSkip} />,
    )
    fireEvent.click(screen.getByTestId('step-skip'))
    expect(onSkip).toHaveBeenCalled()
  })
})
