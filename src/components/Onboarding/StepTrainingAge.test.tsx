import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepTrainingAge } from './StepTrainingAge'

describe('StepTrainingAge', () => {
  it('submits training_age_months on tap', () => {
    const onNext = vi.fn()
    render(<StepTrainingAge onNext={onNext} />)
    fireEvent.click(screen.getByRole('radio', { name: /some experience/i }))
    expect(onNext).toHaveBeenCalledWith(12)
  })

  it('offers all three experience buckets', () => {
    render(<StepTrainingAge onNext={() => undefined} />)
    expect(screen.getAllByRole('radio').length).toBe(3)
  })
})
