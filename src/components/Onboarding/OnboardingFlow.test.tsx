import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingFlow } from './OnboardingFlow'
import { UserProgramProfileSchema } from '../../types/profile'

describe('OnboardingFlow', () => {
  it('walks through all 8 steps and calls onComplete with a valid profile', () => {
    const onComplete = vi.fn()
    render(<OnboardingFlow onComplete={onComplete} />)

    // Step 1: Goal — tap "Strength"
    fireEvent.click(screen.getByRole('button', { name: /^Strength Get stronger/i }))

    // Step 2: Frequency — tap "4 sessions / week"
    fireEvent.click(screen.getByRole('button', { name: /4 sessions \/ week/i }))

    // Step 3: Experience — tap "Some experience"
    fireEvent.click(screen.getByRole('button', { name: /Some experience/i }))

    // Step 4: Equipment — multi-select. Pick "Full gym", then Next.
    fireEvent.click(screen.getByRole('button', { name: /Full gym/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))

    // Step 5: Injuries — skip with "I don't have any".
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))

    // Step 6: Time & sex — default slider is 60, pick "Female", then Next.
    fireEvent.click(screen.getByRole('radio', { name: /Female/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))

    // Step 7: Posture — leave empty, tap Next.
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))

    // Step 8: Confirm — tap the save button.
    fireEvent.click(
      screen.getByRole('button', { name: /Save and generate my plan/i })
    )

    expect(onComplete).toHaveBeenCalledTimes(1)
    const [profile] = onComplete.mock.calls[0]
    const parsed = UserProgramProfileSchema.safeParse(profile)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.goal).toBe('strength')
      expect(parsed.data.sessions_per_week).toBe(4)
      expect(parsed.data.training_age_months).toBe(12)
      expect(parsed.data.equipment).toEqual(['full_gym'])
      expect(parsed.data.injuries).toEqual([])
      expect(parsed.data.time_budget_min).toBe(60)
      expect(parsed.data.sex).toBe('female')
      expect(parsed.data.posture_notes).toBe('')
    }
  })
})
