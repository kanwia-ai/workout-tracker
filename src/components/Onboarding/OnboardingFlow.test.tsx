import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { OnboardingFlow } from './OnboardingFlow'
import { UserProgramProfileSchema } from '../../types/profile'

// Smoke helper: assert the visible step is the expected one.
function expectStep(step: string) {
  expect(screen.getByTestId(`onboarding-step-${step}`)).toBeInTheDocument()
}

describe('OnboardingFlow', () => {
  it('fast path — skip every optional step and still complete with valid profile', () => {
    const onComplete = vi.fn()
    render(<OnboardingFlow onComplete={onComplete} />)

    expectStep('welcome')
    fireEvent.click(screen.getByTestId('step-welcome-start'))

    // name — skip
    expectStep('name')
    fireEvent.click(screen.getByTestId('step-name-skip'))

    // primary goal
    expectStep('primary_goal')
    fireEvent.click(screen.getByRole('checkbox', { name: /build muscle/i }))
    fireEvent.click(screen.getByTestId('step-primary-goal-next'))

    // muscle priority — skip
    expectStep('muscle_priority')
    fireEvent.click(screen.getByTestId('step-skip'))

    // aesthetic — skip
    expectStep('aesthetic')
    fireEvent.click(screen.getByTestId('step-skip'))

    // specific target — skip
    expectStep('specific_target')
    fireEvent.click(screen.getByTestId('step-skip'))

    // sessions — pick 3
    expectStep('sessions')
    fireEvent.click(screen.getByRole('radio', { name: '3' }))
    fireEvent.click(screen.getByTestId('step-sessions-next'))

    // active minutes — pick 45 (split from sessions step)
    expectStep('active_minutes')
    fireEvent.click(screen.getByRole('radio', { name: /45/ }))
    fireEvent.click(screen.getByTestId('step-active-minutes-next'))

    // equipment — pick bodyweight_only
    expectStep('equipment')
    fireEvent.click(screen.getByRole('button', { name: /bodyweight only/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))

    // training age — pick new to lifting
    expectStep('training_age')
    fireEvent.click(screen.getByRole('radio', { name: /new to lifting/i }))

    // body info — enter age + sex
    expectStep('body_info')
    fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: '30' } })
    fireEvent.click(screen.getByLabelText(/female/i))
    fireEvent.click(screen.getByTestId('step-body-info-next'))

    // injuries — none
    expectStep('injuries')
    fireEvent.click(screen.getByTestId('step-injuries-none'))

    // dislikes — skip
    expectStep('dislikes')
    fireEvent.click(screen.getByTestId('step-skip'))

    // posture — skip
    expectStep('posture')
    fireEvent.click(screen.getByTestId('step-skip'))

    // confirm — tap the save button
    expectStep('confirm')
    fireEvent.click(
      screen.getByRole('button', { name: /Save and generate my plan/i }),
    )

    expect(onComplete).toHaveBeenCalledTimes(1)
    const [profile] = onComplete.mock.calls[0]
    const parsed = UserProgramProfileSchema.safeParse(profile)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.primary_goal).toBe('build_muscle')
      expect(parsed.data.sessions_per_week).toBe(3)
      expect(parsed.data.equipment).toEqual(['bodyweight_only'])
      expect(parsed.data.injuries).toEqual([])
      expect(parsed.data.sex).toBe('female')
      expect(parsed.data.age).toBe(30)
      // skipped optionals should not be set (or empty)
      expect(parsed.data.muscle_priority).toBeUndefined()
      expect(parsed.data.aesthetic_preference).toBeUndefined()
    }
  })

  it('back button preserves state on a previous step', () => {
    render(<OnboardingFlow onComplete={() => undefined} />)
    fireEvent.click(screen.getByTestId('step-welcome-start'))
    // skip the name step to reach primary goal
    fireEvent.click(screen.getByTestId('step-name-skip'))
    // pick a goal, then go back to welcome
    fireEvent.click(screen.getByRole('checkbox', { name: /get stronger/i }))
    fireEvent.click(screen.getByTestId('step-primary-goal-next'))
    expectStep('muscle_priority')
    fireEvent.click(screen.getByTestId('onboarding-back'))
    expectStep('primary_goal')
    // Selection should still be visible as checked
    const checkbox = screen.getByRole('checkbox', { name: /get stronger/i })
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })

  it('welcome step has no back button (first step)', () => {
    render(<OnboardingFlow onComplete={() => undefined} />)
    expect(screen.queryByTestId('onboarding-back')).toBeNull()
  })

  it('footprint progress bar shows total steps and current index', () => {
    render(<OnboardingFlow onComplete={() => undefined} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemax', '15')
    expect(bar).toHaveAttribute('aria-valuenow', '1')
  })

  it('detailed path — fill every optional step and reach confirm', () => {
    const onComplete = vi.fn()
    render(<OnboardingFlow onComplete={onComplete} />)

    fireEvent.click(screen.getByTestId('step-welcome-start'))
    // name — type a name so the greeting has something to call us later
    fireEvent.change(screen.getByTestId('step-name-input'), {
      target: { value: 'Kyra' },
    })
    fireEvent.click(screen.getByTestId('step-name-next'))
    fireEvent.click(screen.getByRole('checkbox', { name: /lean & strong/i }))
    fireEvent.click(screen.getByTestId('step-primary-goal-next'))

    // muscle priority — pick glutes then back (order = priority rank)
    fireEvent.click(screen.getByRole('button', { name: /^Glutes/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Back$/i }))
    fireEvent.click(screen.getByTestId('step-muscle-priority-next'))

    // aesthetic
    fireEvent.click(screen.getByRole('radio', { name: /athletic/i }))
    fireEvent.click(screen.getByTestId('step-aesthetic-next'))

    // specific target
    fireEvent.change(screen.getByLabelText(/specific target/i), {
      target: { value: 'first pull-up' },
    })
    fireEvent.click(screen.getByTestId('step-specific-target-next'))

    // sessions
    fireEvent.click(screen.getByRole('radio', { name: '4' }))
    fireEvent.click(screen.getByTestId('step-sessions-next'))

    // active minutes — pick 60 (split from sessions step)
    fireEvent.click(screen.getByRole('radio', { name: /60/ }))
    fireEvent.click(screen.getByTestId('step-active-minutes-next'))

    // equipment
    fireEvent.click(screen.getByRole('button', { name: /full gym/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))

    // training
    fireEvent.click(screen.getByRole('radio', { name: /experienced/i }))

    // body info — switch to metric so we can enter kg directly
    fireEvent.click(screen.getByTestId('step-body-info-units-metric'))
    fireEvent.change(screen.getByLabelText(/^age$/i), { target: { value: '29' } })
    fireEvent.click(screen.getByLabelText(/^female$/i))
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '65' } })
    fireEvent.click(screen.getByTestId('step-body-info-next'))

    // injuries — skip
    fireEvent.click(screen.getByTestId('step-injuries-none'))

    // dislikes — pick burpees
    fireEvent.click(screen.getByRole('button', { name: /burpees/i }))
    fireEvent.click(screen.getByTestId('step-dislikes-next'))

    // posture
    fireEvent.change(screen.getByLabelText(/posture/i), {
      target: { value: 'desk worker' },
    })
    fireEvent.click(screen.getByTestId('step-posture-next'))

    // confirm
    expectStep('confirm')
    const confirmPanel = screen.getByTestId('onboarding-step-confirm')
    expect(within(confirmPanel).getByText(/lean & strong/i)).toBeInTheDocument()
    expect(within(confirmPanel).getByText(/first pull-up/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Save and generate/i }))

    expect(onComplete).toHaveBeenCalled()
    const [profile] = onComplete.mock.calls[0]
    expect(profile.primary_goal).toBe('lean_and_strong')
    expect(profile.muscle_priority).toEqual(['glutes', 'back'])
    expect(profile.aesthetic_preference).toBe('athletic')
    expect(profile.specific_target).toBe('first pull-up')
    expect(profile.weight_kg).toBe(65)
    expect(profile.exercise_dislikes).toEqual(['burpees'])
  })
})
