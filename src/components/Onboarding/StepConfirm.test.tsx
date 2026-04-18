import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepConfirm } from './StepConfirm'

describe('StepConfirm', () => {
  it('renders a summary row for each filled field', () => {
    render(
      <StepConfirm
        draft={{
          primary_goal: 'build_muscle',
          sessions_per_week: 4,
          time_budget_min: 60,
          equipment: ['full_gym'],
          injuries: [{ part: 'lower_back', severity: 'chronic' }],
          exercise_dislikes: ['burpees'],
          sex: 'female',
          age: 30,
          weight_kg: 65,
          training_age_months: 18,
          posture_notes: '',
          first_name: 'Kyra',
        }}
        onNext={() => undefined}
      />,
    )
    expect(screen.getByText(/Build muscle/i)).toBeInTheDocument()
    expect(screen.getByText(/4/)).toBeInTheDocument()
    expect(screen.getByText(/60 min/)).toBeInTheDocument()
    expect(screen.getByText(/Full gym/i)).toBeInTheDocument()
    expect(screen.getByText(/1 noted/)).toBeInTheDocument()
    expect(screen.getByText(/burpees/i)).toBeInTheDocument()
  })

  it('fires onNext on CTA tap', () => {
    const onNext = vi.fn()
    render(
      <StepConfirm
        draft={{ primary_goal: 'general_fitness' }}
        onNext={onNext}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Save and generate/i }))
    expect(onNext).toHaveBeenCalled()
  })

  it('falls back to legacy goal when primary_goal missing', () => {
    render(
      <StepConfirm
        draft={{ goal: 'strength' }}
        onNext={() => undefined}
      />,
    )
    expect(screen.getByText('Strength')).toBeInTheDocument()
  })
})
