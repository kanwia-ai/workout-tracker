import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepWelcome } from './StepWelcome'
import { COPY } from '../../lib/copy'

describe('StepWelcome', () => {
  it('renders a welcome line from the tier-2 pool', () => {
    render(<StepWelcome onNext={() => undefined} />)
    const bubble = screen.getByTestId('step-lumo-bubble')
    const text = bubble.textContent ?? ''
    const pool = COPY[2].onboardingWelcome
    expect(pool.some((line) => text.includes(line))).toBe(true)
  })

  it('renders Lumo in the cheer state', () => {
    render(<StepWelcome onNext={() => undefined} />)
    const lumo = screen.getByRole('img', { name: /cheering/i })
    expect(lumo).toHaveAttribute('data-lumo-state', 'cheer')
  })

  it('calls onNext when Start is tapped', () => {
    const onNext = vi.fn()
    render(<StepWelcome onNext={onNext} />)
    fireEvent.click(screen.getByTestId('step-welcome-start'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
