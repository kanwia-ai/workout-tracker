import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepInjuries } from './StepInjuries'

describe('StepInjuries', () => {
  it('skip button calls onNext with an empty array', () => {
    const onNext = vi.fn()
    render(<StepInjuries onNext={onNext} />)
    fireEvent.click(screen.getByTestId('step-injuries-none'))
    expect(onNext).toHaveBeenCalledWith([])
  })

  it('submits a cleaned injury row (part + severity, no empty note)', () => {
    const onNext = vi.fn()
    render(<StepInjuries onNext={onNext} />)
    const partSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(partSelect, { target: { value: 'lower_back' } })
    const sevSelect = screen.getAllByRole('combobox')[1]
    fireEvent.change(sevSelect, { target: { value: 'chronic' } })
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))
    expect(onNext).toHaveBeenCalledWith([
      { part: 'lower_back', severity: 'chronic' },
    ])
  })

  it('renders a Lumo speech bubble', () => {
    render(<StepInjuries onNext={() => undefined} />)
    expect(screen.getByTestId('step-lumo-bubble')).toBeInTheDocument()
  })
})
