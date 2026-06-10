import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EndOfBlockCard, isBlockComplete } from './EndOfBlockCard'
import type { Mesocycle, PlannedSession, SessionStatus } from '../types/plan'

function makeSession(
  week: number,
  ordinal: number,
  status: SessionStatus,
): PlannedSession {
  return {
    id: `s-${week}-${ordinal}`,
    week_number: week,
    ordinal,
    focus: ['glutes'],
    title: 'Glutes + Hamstrings',
    subtitle: 'LOWER',
    estimated_minutes: 45,
    exercises: [
      {
        library_id: 'fedb:glute-bridge',
        name: 'Glute Bridge',
        sets: 3,
        reps: '8-12',
        rir: 2,
        rest_seconds: 120,
        role: 'main lift',
        warmup_sets: [],
      },
    ],
    day_of_week: ordinal - 1,
    rationale: 'test session',
    status,
  }
}

// generated_at is built from LOCAL date components so the Monday-anchor math
// stays deterministic regardless of the machine's timezone.
// 2026-04-27 is a Monday; a 6-week block anchored there ends Sun 2026-06-07,
// so the first out-of-block day is Mon 2026-06-08.
const GENERATED_AT = new Date(2026, 3, 27, 10, 0, 0).toISOString()

function makeMeso(opts: {
  generatedAt?: string
  lengthWeeks?: number
  statuses?: SessionStatus[]
}): Mesocycle {
  const statuses = opts.statuses ?? ['completed', 'upcoming']
  return {
    id: 'meso-1',
    user_id: 'user-1',
    generated_at: opts.generatedAt ?? GENERATED_AT,
    length_weeks: opts.lengthWeeks ?? 6,
    sessions: statuses.map((status, i) => makeSession(1, i + 1, status)),
    profile_snapshot: {},
  }
}

describe('isBlockComplete', () => {
  it('returns false for a null plan', () => {
    expect(isBlockComplete(null, new Date(2026, 5, 9))).toBe(false)
  })

  it('returns false mid-block while sessions are still upcoming', () => {
    const meso = makeMeso({ statuses: ['completed', 'upcoming', 'upcoming'] })
    // Week 2 of the block.
    expect(isBlockComplete(meso, new Date(2026, 4, 5))).toBe(false)
  })

  it('returns true when every session is completed or skipped, even mid-block by date', () => {
    const meso = makeMeso({ statuses: ['completed', 'skipped', 'completed'] })
    expect(isBlockComplete(meso, new Date(2026, 4, 5))).toBe(true)
  })

  it('returns false while a session is still in progress', () => {
    const meso = makeMeso({ statuses: ['completed', 'in_progress'] })
    expect(isBlockComplete(meso, new Date(2026, 4, 5))).toBe(false)
  })

  it('returns true once today is past generated_at + length_weeks, even with upcoming sessions', () => {
    const meso = makeMeso({ statuses: ['completed', 'upcoming'] })
    // Mon 2026-06-08 is the first day after week 6 ends.
    expect(isBlockComplete(meso, new Date(2026, 5, 8))).toBe(true)
    // Well past the end too.
    expect(isBlockComplete(meso, new Date(2026, 5, 20))).toBe(true)
  })

  it('returns false on the last day of the final week', () => {
    const meso = makeMeso({ statuses: ['completed', 'upcoming'] })
    // Sun 2026-06-07 is still inside week 6.
    expect(isBlockComplete(meso, new Date(2026, 5, 7, 23, 59))).toBe(false)
  })

  it('anchors the end date to the Monday of the generated_at week (mid-week generation)', () => {
    // Generated on a Thursday — week 1 still starts the preceding Monday,
    // matching HomeScreen's week math.
    const meso = makeMeso({
      generatedAt: new Date(2026, 3, 30, 18, 0, 0).toISOString(), // Thu Apr 30
      statuses: ['completed', 'upcoming'],
    })
    expect(isBlockComplete(meso, new Date(2026, 5, 7, 23, 59))).toBe(false)
    expect(isBlockComplete(meso, new Date(2026, 5, 8))).toBe(true)
  })
})

describe('EndOfBlockCard', () => {
  it('renders celebratory Lumo and the block-complete copy', () => {
    render(<EndOfBlockCard onStartNextBlock={() => {}} />)
    expect(screen.getByTestId('end-of-block-card')).toBeInTheDocument()
    expect(document.querySelector('[data-lumo-state="celebrate"]')).toBeTruthy()
    expect(screen.getByText('block complete')).toBeInTheDocument()
    expect(screen.getByText(/time to build your next one/i)).toBeInTheDocument()
  })

  it('fires onStartNextBlock when the CTA is tapped', () => {
    const onStartNextBlock = vi.fn()
    render(<EndOfBlockCard onStartNextBlock={onStartNextBlock} />)
    fireEvent.click(screen.getByRole('button', { name: /build my next block/i }))
    expect(onStartNextBlock).toHaveBeenCalledTimes(1)
  })
})
