import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepPrimaryGoal } from './StepPrimaryGoal'
import { COPY } from '../../lib/copy'

describe('StepPrimaryGoal', () => {
  it('renders a goal prompt from the tier-2 pool', () => {
    render(<StepPrimaryGoal onNext={() => undefined} />)
    const bubble = screen.getByTestId('step-lumo-bubble').textContent ?? ''
    const pool = COPY[2].onboardingGoal
    expect(pool.some((line) => bubble.includes(line))).toBe(true)
  })

  it('renders all 7 goals with radio semantics', () => {
    render(<StepPrimaryGoal onNext={() => undefined} />)
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBe(7)
  })

  it('disables Next until a goal is picked', () => {
    const onNext = vi.fn()
    render(<StepPrimaryGoal onNext={onNext} />)
    const next = screen.getByTestId('step-primary-goal-next')
    fireEvent.click(next)
    expect(onNext).not.toHaveBeenCalled()
  })

  it('emits the chosen primary_goal on Next', () => {
    const onNext = vi.fn()
    render(<StepPrimaryGoal onNext={onNext} />)
    fireEvent.click(screen.getByRole('radio', { name: /get stronger/i }))
    fireEvent.click(screen.getByTestId('step-primary-goal-next'))
    expect(onNext).toHaveBeenCalledWith('get_stronger')
  })
})
