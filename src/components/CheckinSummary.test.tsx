import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { CheckinSummary } from './CheckinSummary'
import { saveCheckin } from '../lib/checkins'
import { db } from '../lib/db'
import type { SessionCheckin } from '../types/checkin'

function makeCheckin(overrides: Partial<SessionCheckin> = {}): SessionCheckin {
  return {
    session_id: 'sess-99',
    user_id: 'user-1',
    completed_at: '2026-04-10T12:00:00.000Z',
    week_number: 2,
    overall_feel: 4,
    overall_notes: 'felt strong, knee twinge on RDLs',
    exercises: [
      {
        library_id: 'ex:rdl',
        name: 'romanian deadlift',
        rating: 'tough',
        used_weight_lb: 135,
        notes: 'form started slipping by set 3',
      },
      {
        library_id: 'ex:hip-thrust',
        name: 'barbell hip thrust',
        rating: 'solid',
        used_weight_lb: 185,
      },
    ],
    synced: false,
    ...overrides,
  }
}

describe('CheckinSummary', () => {
  beforeEach(async () => {
    cleanup()
    await db.sessionCheckins.clear()
  })

  it('renders the wrapper, overall feel dots, notes, and per-exercise pills', async () => {
    await saveCheckin(makeCheckin())
    render(<CheckinSummary sessionId="sess-99" />)

    // Wrapper renders once load resolves.
    await waitFor(() =>
      expect(screen.getByTestId('checkin-summary')).toBeInTheDocument(),
    )

    // Overall-feel dots: dot 4 active, the others inactive.
    const dot4 = screen.getByTestId('checkin-feel-dot-4')
    expect(dot4.getAttribute('data-active')).toBe('true')
    for (const n of [1, 2, 3, 5]) {
      const d = screen.getByTestId(`checkin-feel-dot-${n}`)
      expect(d.getAttribute('data-active')).toBe('false')
    }

    // Overall notes block renders the saved text.
    expect(screen.getByTestId('checkin-overall-notes')).toHaveTextContent(
      /felt strong, knee twinge on RDLs/i,
    )

    // Per-exercise rating pills, with the captured rating text.
    expect(screen.getByTestId('checkin-rating-ex:rdl')).toHaveTextContent(
      /tough/i,
    )
    expect(
      screen.getByTestId('checkin-rating-ex:hip-thrust'),
    ).toHaveTextContent(/solid/i)

    // Per-exercise notes appear when present, are skipped when absent.
    expect(screen.getByTestId('checkin-notes-ex:rdl')).toHaveTextContent(
      /form started slipping/i,
    )
    expect(screen.queryByTestId('checkin-notes-ex:hip-thrust')).toBeNull()

    // Used weight surfaces for each exercise that has one.
    expect(screen.getByText(/135 lb/)).toBeInTheDocument()
    expect(screen.getByText(/185 lb/)).toBeInTheDocument()
  })

  it('renders the empty prompt (not a blank box) when no check-in exists yet', async () => {
    render(<CheckinSummary sessionId="never-saved" />)

    // Wrapper still renders, but with the prompt body — not the dots / pills.
    await waitFor(() =>
      expect(screen.getByTestId('checkin-summary')).toBeInTheDocument(),
    )
    expect(screen.getByTestId('checkin-summary-empty')).toHaveTextContent(
      /tap End Session to record how it felt/i,
    )

    // None of the populated bits render in the empty state.
    expect(screen.queryByTestId('checkin-feel-row')).toBeNull()
    expect(screen.queryByTestId('checkin-overall-notes')).toBeNull()
  })

  it('omits the overall-notes block when the saved check-in has no notes', async () => {
    await saveCheckin(
      makeCheckin({ overall_notes: undefined, session_id: 'sess-no-notes' }),
    )
    render(<CheckinSummary sessionId="sess-no-notes" />)

    await waitFor(() =>
      expect(screen.getByTestId('checkin-summary')).toBeInTheDocument(),
    )
    // Per-exercise pill still renders (proves the load resolved fully).
    expect(screen.getByTestId('checkin-rating-ex:rdl')).toBeInTheDocument()
    // But the overall-notes blockquote is suppressed.
    expect(screen.queryByTestId('checkin-overall-notes')).toBeNull()
  })
})
