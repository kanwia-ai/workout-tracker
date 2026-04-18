import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepPostureNotes } from './StepPostureNotes'

describe('StepPostureNotes', () => {
  it('submits trimmed text', () => {
    const onNext = vi.fn()
    render(
      <StepPostureNotes onNext={onNext} onSkip={() => undefined} />,
    )
    fireEvent.change(screen.getByLabelText(/posture/i), {
      target: { value: '  desk 8h/day  ' },
    })
    fireEvent.click(screen.getByTestId('step-posture-next'))
    expect(onNext).toHaveBeenCalledWith('desk 8h/day')
  })

  it('skip applies empty default', () => {
    const onSkip = vi.fn()
    render(
      <StepPostureNotes onNext={() => undefined} onSkip={onSkip} />,
    )
    fireEvent.click(screen.getByTestId('step-skip'))
    expect(onSkip).toHaveBeenCalled()
  })
})
