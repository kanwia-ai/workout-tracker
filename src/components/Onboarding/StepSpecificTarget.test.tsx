import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepSpecificTarget } from './StepSpecificTarget'

describe('StepSpecificTarget', () => {
  it('submits trimmed text', () => {
    const onNext = vi.fn()
    render(
      <StepSpecificTarget onNext={onNext} onSkip={() => undefined} />,
    )
    const input = screen.getByLabelText(/specific target/i)
    fireEvent.change(input, { target: { value: '  first pull-up   ' } })
    fireEvent.click(screen.getByTestId('step-specific-target-next'))
    expect(onNext).toHaveBeenCalledWith('first pull-up')
  })

  it('caps input at 200 chars', () => {
    render(
      <StepSpecificTarget onNext={() => undefined} onSkip={() => undefined} />,
    )
    const input = screen.getByLabelText(/specific target/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'a'.repeat(250) } })
    expect(input.value.length).toBe(200)
  })

  it('skip applies empty default', () => {
    const onSkip = vi.fn()
    render(
      <StepSpecificTarget onNext={() => undefined} onSkip={onSkip} />,
    )
    fireEvent.click(screen.getByTestId('step-skip'))
    expect(onSkip).toHaveBeenCalled()
  })
})
