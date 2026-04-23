import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SessionCheckinSheet } from './SessionCheckinSheet'
import type { PlannedExercise } from '../types/plan'
import { SessionCheckinSchema } from '../types/checkin'

function makeExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    library_id: 'ex:rdl',
    name: 'romanian deadlift',
    sets: 3,
    reps: '8',
    rir: 2,
    rest_seconds: 90,
    role: 'main lift',
    warmup_sets: [],
    ...overrides,
  }
}

const baseProps = {
  open: true,
  userId: 'user-1',
  sessionId: 'sess-42',
  weekNumber: 2,
}

describe('SessionCheckinSheet', () => {
  beforeEach(() => {
    cleanup()
  })

  it('renders every exercise from the session prop', () => {
    const exercises = [
      makeExercise({ library_id: 'ex:rdl', name: 'romanian deadlift' }),
      makeExercise({ library_id: 'ex:hip-thrust', name: 'barbell hip thrust' }),
      makeExercise({ library_id: 'ex:split-squat', name: 'split squat' }),
    ]
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={exercises}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    expect(screen.getByText('romanian deadlift')).toBeInTheDocument()
    expect(screen.getByText('barbell hip thrust')).toBeInTheDocument()
    expect(screen.getByText('split squat')).toBeInTheDocument()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <SessionCheckinSheet
        {...baseProps}
        open={false}
        exercises={[makeExercise()]}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it.each(['easy', 'solid', 'tough', 'failed'] as const)(
    'accepts "%s" rating per exercise and marks the chip active',
    (rating) => {
      const exercises = [makeExercise()]
      render(
        <SessionCheckinSheet
          {...baseProps}
          exercises={exercises}
          onSave={vi.fn()}
          onSkip={vi.fn()}
        />,
      )
      const chip = screen.getByTestId(`rating-ex:rdl-${rating}`)
      fireEvent.click(chip)
      expect(chip).toHaveAttribute('aria-checked', 'true')
    },
  )

  it('allows each of the 5 overall-feel emojis to be selected', () => {
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={[makeExercise()]}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    for (const value of [1, 2, 3, 4, 5] as const) {
      const btn = screen.getByTestId(`feel-${value}`)
      fireEvent.click(btn)
      expect(btn).toHaveAttribute('aria-checked', 'true')
    }
  })

  it('Save button is disabled until every exercise is rated and overall feel is set', () => {
    const exercises = [
      makeExercise({ library_id: 'ex:rdl', name: 'romanian deadlift' }),
      makeExercise({ library_id: 'ex:hip-thrust', name: 'barbell hip thrust' }),
    ]
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={exercises}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    const save = screen.getByTestId('checkin-save') as HTMLButtonElement
    expect(save.disabled).toBe(true)

    fireEvent.click(screen.getByTestId('rating-ex:rdl-solid'))
    expect(save.disabled).toBe(true)
    fireEvent.click(screen.getByTestId('rating-ex:hip-thrust-tough'))
    expect(save.disabled).toBe(true)
    fireEvent.click(screen.getByTestId('feel-4'))
    expect(save.disabled).toBe(false)
  })

  it('Save calls onSave with a valid SessionCheckin payload', () => {
    const onSave = vi.fn()
    const exercises = [
      makeExercise({ library_id: 'ex:rdl', name: 'romanian deadlift' }),
      makeExercise({ library_id: 'ex:hip-thrust', name: 'barbell hip thrust' }),
    ]
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={exercises}
        completedWeights={{ 'ex:rdl': 135, 'ex:hip-thrust': 0 }}
        onSave={onSave}
        onSkip={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('rating-ex:rdl-solid'))
    fireEvent.click(screen.getByTestId('rating-ex:hip-thrust-tough'))
    fireEvent.click(screen.getByTestId('feel-4'))
    fireEvent.change(screen.getByTestId('checkin-notes'), {
      target: { value: 'felt good, knee held up' },
    })
    fireEvent.click(screen.getByTestId('checkin-save'))

    expect(onSave).toHaveBeenCalledTimes(1)
    const payload = onSave.mock.calls[0]?.[0]
    // Validate against the schema so we know the consumer can parse it.
    const parsed = SessionCheckinSchema.parse(payload)
    expect(parsed.session_id).toBe('sess-42')
    expect(parsed.user_id).toBe('user-1')
    expect(parsed.week_number).toBe(2)
    expect(parsed.overall_feel).toBe(4)
    expect(parsed.overall_notes).toBe('felt good, knee held up')
    expect(parsed.synced).toBe(false)
    expect(parsed.exercises).toHaveLength(2)
    const rdl = parsed.exercises.find((e) => e.library_id === 'ex:rdl')
    expect(rdl?.rating).toBe('solid')
    expect(rdl?.used_weight_lb).toBe(135)
    const ht = parsed.exercises.find((e) => e.library_id === 'ex:hip-thrust')
    expect(ht?.rating).toBe('tough')
    // Zero-weight exercise should not carry used_weight_lb.
    expect(ht?.used_weight_lb).toBeUndefined()
    expect(typeof parsed.completed_at).toBe('string')
    expect(() => new Date(parsed.completed_at).toISOString()).not.toThrow()
  })

  it('clicking Save while disabled does not call onSave', () => {
    const onSave = vi.fn()
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={[makeExercise()]}
        onSave={onSave}
        onSkip={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('checkin-save'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Skip button closes without saving', () => {
    const onSave = vi.fn()
    const onSkip = vi.fn()
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={[makeExercise()]}
        onSave={onSave}
        onSkip={onSkip}
      />,
    )
    fireEvent.click(screen.getByTestId('checkin-skip'))
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('header close (X) also triggers skip', () => {
    const onSkip = vi.fn()
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={[makeExercise()]}
        onSave={vi.fn()}
        onSkip={onSkip}
      />,
    )
    fireEvent.click(screen.getByTestId('checkin-skip-close'))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('notes textarea caps at 500 chars', () => {
    render(
      <SessionCheckinSheet
        {...baseProps}
        exercises={[makeExercise()]}
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />,
    )
    const textarea = screen.getByTestId('checkin-notes') as HTMLTextAreaElement
    const longText = 'a'.repeat(700)
    fireEvent.change(textarea, { target: { value: longText } })
    expect(textarea.value.length).toBe(500)
  })
})
