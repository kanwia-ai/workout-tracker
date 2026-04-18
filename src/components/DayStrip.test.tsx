import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DayStrip } from './DayStrip'
import type { Mesocycle, PlannedSession } from '../types/plan'

// Inline test helpers (intentionally not shared with other test files)
function makeSession(
  weekNumber: number,
  ordinal: number,
  overrides: Partial<PlannedSession> = {},
): PlannedSession {
  return {
    id: `s-${weekNumber}-${ordinal}`,
    week_number: weekNumber,
    ordinal,
    focus: ['glutes'],
    title: `Session ${ordinal}`,
    estimated_minutes: 60,
    exercises: [
      {
        library_id: 'lib:1',
        name: 'Barbell Squat',
        sets: 3,
        reps: '8-12',
        rir: 2,
        rest_seconds: 120,
        role: 'main lift',
      },
    ],
    day_of_week: 0,
    rationale: 'Because.',
    status: 'upcoming',
    ...overrides,
  }
}

function makePlan(sessions: PlannedSession[]): Mesocycle {
  return {
    id: 'meso-1',
    user_id: 'user-1',
    generated_at: new Date('2026-04-13T00:00:00Z').toISOString(),
    length_weeks: 4,
    sessions,
    profile_snapshot: {},
  }
}

const MONDAY = new Date(2026, 3, 13) // 2026-04-13 is a Monday

describe('DayStrip', () => {
  it('renders 7 day cards', () => {
    const plan = makePlan([])
    render(
      <DayStrip
        plan={plan}
        weekNumber={1}
        todayDow={0}
        selectedDow={0}
        onSelect={vi.fn()}
        weekStartDate={MONDAY}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(7)
  })

  it('marks training days vs rest days via data-rest attribute', () => {
    // Session 1 (Mon, day_of_week=0) has focus=['glutes'] → legs bucket → plum.
    // Session 2 (Thu, day_of_week=3) has focus=['chest'] → upper bucket → sun.
    const plan = makePlan([
      makeSession(1, 1, {
        day_of_week: 0,
        title: 'Lower A - Glutes & Quads',
        focus: ['glutes'],
      }),
      makeSession(1, 2, {
        day_of_week: 3,
        title: 'Upper A - Push Focus',
        focus: ['chest'],
      }),
    ])
    render(
      <DayStrip
        plan={plan}
        weekNumber={1}
        todayDow={2}
        selectedDow={2}
        onSelect={vi.fn()}
        weekStartDate={MONDAY}
      />,
    )
    const buttons = screen.getAllByRole('button')
    // Training days carry data-rest="false" and the matching focus bucket.
    expect(buttons[0].getAttribute('data-rest')).toBe('false')
    expect(buttons[0].getAttribute('data-focus')).toBe('legs')
    expect(buttons[3].getAttribute('data-rest')).toBe('false')
    expect(buttons[3].getAttribute('data-focus')).toBe('upper')
    // 5 rest days (7 total - 2 training).
    const restCount = buttons.filter(
      (b) => b.getAttribute('data-rest') === 'true',
    ).length
    expect(restCount).toBe(5)
    // Aria-labels describe the state in words (no more visible REST text).
    expect(buttons[0].getAttribute('aria-label')).toContain('legs day')
    expect(buttons[3].getAttribute('aria-label')).toContain('upper day')
    expect(buttons[1].getAttribute('aria-label')).toContain('rest day')
  })

  it('calls onSelect with day_of_week when a day is tapped', () => {
    const onSelect = vi.fn()
    const plan = makePlan([
      makeSession(1, 1, { day_of_week: 0, title: 'Lower A' }),
    ])
    render(
      <DayStrip
        plan={plan}
        weekNumber={1}
        todayDow={0}
        selectedDow={0}
        onSelect={onSelect}
        weekStartDate={MONDAY}
      />,
    )
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[4]) // Fri (index 4)
    expect(onSelect).toHaveBeenCalledWith(4)
  })

  it('marks today via aria-current', () => {
    const plan = makePlan([])
    render(
      <DayStrip
        plan={plan}
        weekNumber={1}
        todayDow={2}
        selectedDow={0}
        onSelect={vi.fn()}
        weekStartDate={MONDAY}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[2].getAttribute('aria-current')).toBe('date')
    expect(buttons[0].getAttribute('aria-current')).not.toBe('date')
  })

  it('marks selected day differently from unselected', () => {
    const plan = makePlan([])
    render(
      <DayStrip
        plan={plan}
        weekNumber={1}
        todayDow={0}
        selectedDow={3}
        onSelect={vi.fn()}
        weekStartDate={MONDAY}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false')
    // And the selected button has a visually distinct inline style
    // (brand-tinted border vs. neutral --lumo-border).
    expect(buttons[3].getAttribute('style')).not.toBe(
      buttons[0].getAttribute('style'),
    )
  })

  it('renders correct date numbers from weekStartDate', () => {
    const plan = makePlan([])
    render(
      <DayStrip
        plan={plan}
        weekNumber={1}
        todayDow={0}
        selectedDow={0}
        onSelect={vi.fn()}
        weekStartDate={MONDAY} // Apr 13 2026
      />,
    )
    // Mon=13, Tue=14 ... Sun=19
    expect(screen.getByText('13')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
  })
})
