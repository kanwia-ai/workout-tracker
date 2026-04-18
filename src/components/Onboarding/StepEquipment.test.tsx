import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepEquipment } from './StepEquipment'

describe('StepEquipment', () => {
  it('disables Next when nothing is selected', () => {
    const onNext = vi.fn()
    render(<StepEquipment onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))
    expect(onNext).not.toHaveBeenCalled()
  })

  it('submits the chosen equipment list', () => {
    const onNext = vi.fn()
    render(<StepEquipment onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: /Full gym/i }))
    fireEvent.click(screen.getByRole('button', { name: /Home weights/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))
    expect(onNext).toHaveBeenCalledWith(expect.arrayContaining(['full_gym', 'home_weights']))
  })

  it('renders a Lumo speech bubble', () => {
    render(<StepEquipment onNext={() => undefined} />)
    expect(screen.getByTestId('step-lumo-bubble')).toBeInTheDocument()
  })
})
