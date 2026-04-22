import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { Mesocycle, PlannedSession } from '../types/plan'

// ─── Mocks ───────────────────────────────────────────────────────────────
// WorkoutView imports a bunch of reactive infra (Dexie-backed plan, session
// state, Supabase-backed persistence, Gemini plan generation). The tests
// here are behaviour-focused: they don't care about the real infra. Mocks
// stand in for every cross-module boundary the component pokes.

vi.mock('../hooks/usePlan', () => ({
  usePlan: vi.fn(),
}))

vi.mock('../hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    session: null,
    startSession: vi.fn(),
    switchPhase: vi.fn(),
    endSession: vi.fn(),
    clearSession: vi.fn(),
  })),
}))

vi.mock('../lib/persistence', () => ({
  saveSession: vi.fn().mockResolvedValue('saved-1'),
  saveLastWeight: vi.fn().mockResolvedValue(undefined),
  updatePR: vi.fn().mockResolvedValue(false),
  loadLastWeights: vi.fn().mockResolvedValue({}),
  loadPRs: vi.fn().mockResolvedValue({}),
}))

vi.mock('../lib/profileRepo', () => ({
  loadProfileLocal: vi.fn().mockResolvedValue(null),
}))

vi.mock('../lib/planGen', () => ({
  generatePlan: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/swap', () => ({
  requestSwap: vi.fn().mockResolvedValue({ replacement: null }),
  applySwap: vi.fn().mockResolvedValue(undefined),
}))

// RoutineSlot spins up its own auto-generate on mount. Stub it so the tests
// don't accidentally exercise Gemini/Dexie.
vi.mock('./RoutineSlot', () => ({
  RoutineSlot: ({ kind }: { kind: string }) => (
    <div data-testid={`routine-slot-${kind}`}>[{kind} slot]</div>
  ),
}))

// Swap + info sheets aren't under test here and render portals that muddy
// the DOM; stub them to trivial components that only surface when open.
vi.mock('./SwapSheet', () => ({
  SwapSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="swap-sheet" /> : null,
}))

vi.mock('./ExerciseInfoSheet', () => ({
  ExerciseInfoSheet: ({ libraryId }: { libraryId: string | null }) =>
    libraryId ? <div data-testid="info-sheet">{libraryId}</div> : null,
}))

// TimerOverlay uses useTimer which touches setInterval — swap for a trivial
// renderable that exposes the seconds so the manual-timer path is observable.
vi.mock('./TimerOverlay', () => ({
  TimerOverlay: ({ seconds, onClose }: { seconds: number; onClose: () => void }) => (
    <div data-testid="timer-overlay">
      <span data-testid="timer-seconds">{seconds}</span>
      <button onClick={onClose}>close</button>
    </div>
  ),
}))

// SessionBar has its own ticker; stub to a minimal "End" button so the
// handleEndSession path is exercisable without cognitive overhead.
vi.mock('./SessionBar', () => ({
  SessionBar: ({ onStart, onEnd }: { onStart: () => void; onEnd: () => void }) => (
    <div data-testid="session-bar">
      <button onClick={onStart} data-testid="start-session">
        start
      </button>
      <button onClick={onEnd} data-testid="end-session">
        end
      </button>
    </div>
  ),
}))

import { WorkoutView } from './WorkoutView'
import { usePlan } from '../hooks/usePlan'

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: 'sess-1',
    week_number: 1,
    ordinal: 1,
    focus: ['glutes'],
    title: 'glutes & hammies',
    subtitle: '',
    estimated_minutes: 48,
    exercises: [
      {
        library_id: 'ex:rdl',
        name: 'romanian deadlift',
        sets: 3,
        reps: '8',
        rir: 2,
        rest_seconds: 90,
        role: 'main lift',
        warmup_sets: [],
      },
      {
        library_id: 'ex:hip-thrust',
        name: 'barbell hip thrust',
        sets: 2,
        reps: '10',
        rir: 1,
        rest_seconds: 60,
        role: 'main lift',
        warmup_sets: [],
      },
    ],
    day_of_week: 0,
    rationale: 'Lower-A Monday; fresh week start.',
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

const baseProfile = {
  display_name: 'Juno',
  avatar_emoji: '🦋',
  streak: 3,
  knee_flag: false,
}

const baseProps = {
  userId: 'user-1',
  profile: baseProfile,
  onSignOut: vi.fn(),
  onWorkoutComplete: vi.fn(),
  onNavigateToCapture: vi.fn(),
  onNavigateCardio: vi.fn(),
  onNavigateProgress: vi.fn(),
}

function installMatchMedia(reduce: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  installMatchMedia(false)
  // Force Monday (day_of_week=0) so selectedDow lines up with the session
  // we feed the plan. Vitest's fake timers also freeze Date.now.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-04-13T09:00:00Z'))
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ─── Tests ───────────────────────────────────────────────────────────────

describe('WorkoutView loading + empty states', () => {
  it('shows a Lumo thinking state while the plan is loading', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: null, loading: true })
    render(<WorkoutView {...baseProps} />)
    // Lumo renders with aria-label describing state; we don't need to
    // assert visual pixels — just that the thinking state is used.
    expect(screen.getByLabelText(/Lumo is thinking/i)).toBeInTheDocument()
  })

  it('shows the no-plan retry state when the user has no plan', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: null, loading: false })
    render(<WorkoutView {...baseProps} />)
    expect(screen.getByText(/no plan yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate plan/i })).toBeInTheDocument()
  })
})

describe('WorkoutView session rendering', () => {
  it('renders the Lumo preamble bubble with a greeting when no sets done', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    const preamble = screen.getByTestId('workout-preamble')
    expect(preamble).toBeInTheDocument()
    // Preamble contains a Lumo mascot…
    expect(preamble.querySelector('[data-lumo-state]')).toBeTruthy()
    // …and Fraunces-italic bubble text. We read by role/structure rather
    // than exact copy — the copy.ts tier may change, but the structure
    // is load-bearing.
    expect(preamble.textContent?.length).toBeGreaterThan(0)
  })

  it('renders circular SetCircle buttons, one per set', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    // First exercise has 3 sets; second has 2. 5 circles total.
    const circles = screen.getAllByRole('button', { name: /Mark set \d+ of/i })
    expect(circles).toHaveLength(5)
  })

  it('fills a SetCircle on tap (aria-pressed flips to true)', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    const firstCircle = screen.getByRole('button', {
      name: /Mark set 1 of romanian deadlift/i,
    })
    expect(firstCircle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(firstCircle)
    // After click, the label changes from "Mark" to "Unmark"; query fresh.
    const flipped = screen.getByRole('button', {
      name: /Unmark set 1 of romanian deadlift/i,
    })
    expect(flipped.getAttribute('aria-pressed')).toBe('true')
  })

  it('shows RestBanner after completing a set', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    expect(screen.queryByTestId('rest-banner')).not.toBeInTheDocument()
    const firstCircle = screen.getByRole('button', {
      name: /Mark set 1 of romanian deadlift/i,
    })
    fireEvent.click(firstCircle)
    expect(screen.getByTestId('rest-banner')).toBeInTheDocument()
  })

  it('hides the RestBanner when Skip is tapped', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    fireEvent.click(
      screen.getByRole('button', { name: /Mark set 1 of romanian deadlift/i }),
    )
    expect(screen.getByTestId('rest-banner')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Skip rest/i }))
    expect(screen.queryByTestId('rest-banner')).not.toBeInTheDocument()
  })

  it('fires navigator.vibrate with a 10ms pulse on set complete when available', () => {
    const vibrate = vi.fn().mockReturnValue(true)
    // vibrate isn't available in jsdom by default; define it.
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrate,
    })
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    fireEvent.click(
      screen.getByRole('button', { name: /Mark set 1 of romanian deadlift/i }),
    )
    expect(vibrate).toHaveBeenCalledWith(10)
  })

  it('renders a Lumo-themed rest-day card when no session is selected', () => {
    // Session is day_of_week=2 (Wednesday), but we've frozen "today" to
    // Monday → selectedDow=0 → no session match → rest day branch.
    const restDayPlan = makePlan([makeSession({ day_of_week: 2 })])
    vi.mocked(usePlan).mockReturnValue({ plan: restDayPlan, loading: false })
    render(<WorkoutView {...baseProps} />)
    const card = screen.getByTestId('rest-day-card')
    expect(card).toBeInTheDocument()
    // Lumo is in the sleepy state inside the card itself (the preamble
    // ALSO goes sleepy on rest days, so we scope the query).
    expect(card.querySelector('[data-lumo-state="sleepy"]')).toBeTruthy()
  })
})

describe('WorkoutView PR celebration', () => {
  // These tests exercise async state (loadPRs resolves on mount). Switch to
  // real timers — the component tree doesn't poll, so a microtask drain is
  // enough and we avoid waitFor interactions with fake timers. Because we're
  // on real `Date`, seed selectedDow=0 in localStorage so the fixture
  // session (day_of_week=0) is the one rendered regardless of the actual
  // wall-clock day.
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.setItem('workout-tracker:selected-dow', '0')
  })

  it('opens the PR celebration when a set-complete exceeds the stored PR', async () => {
    const { loadPRs } = await import('../lib/persistence')
    vi.mocked(loadPRs).mockResolvedValueOnce({ 'ex:rdl': 95 })
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })

    render(<WorkoutView {...baseProps} />)

    // Drain the loadPRs promise so prs state is populated before we tap.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // Enter a heavier working weight so set-complete triggers PR detection.
    const weightInput = screen.getAllByPlaceholderText(/lbs/i)[0]
    fireEvent.change(weightInput, { target: { value: '105' } })

    // Tap the first set circle.
    fireEvent.click(
      screen.getByRole('button', { name: /Mark set 1 of romanian deadlift/i }),
    )

    // PRCelebration renders role="dialog" with the "NEW PR" heading.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('NEW PR')).toBeInTheDocument()
  })

  it('does not open the PR celebration when the weight ties or is below the PR', async () => {
    const { loadPRs } = await import('../lib/persistence')
    vi.mocked(loadPRs).mockResolvedValueOnce({ 'ex:rdl': 100 })
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })

    render(<WorkoutView {...baseProps} />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    const weightInput = screen.getAllByPlaceholderText(/lbs/i)[0]
    fireEvent.change(weightInput, { target: { value: '100' } })
    fireEvent.click(
      screen.getByRole('button', { name: /Mark set 1 of romanian deadlift/i }),
    )
    // No dialog should appear.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('WorkoutView per-set expand', () => {
  it('expands per-set weights panel when the chevron is tapped', () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    const chevrons = screen.getAllByRole('button', { name: /per-set weights/i })
    // Before expand → no Set-1 sublabel.
    expect(screen.queryByText(/^Set 1$/)).not.toBeInTheDocument()
    fireEvent.click(chevrons[0])
    // After expand the per-set panel labels each set.
    expect(screen.getAllByText(/^Set \d+$/).length).toBeGreaterThan(0)
  })
})

// Per-lift Timer button removed; rest fires auto via RestBanner.

describe('WorkoutView preamble + Lumo per-set reactions', () => {
  // Use real timers so async state settles and the reaction timeout can be
  // observed; the reaction bubble renders with animation but the test only
  // checks the initial render state.
  beforeEach(() => {
    vi.useRealTimers()
    localStorage.setItem('workout-tracker:selected-dow', '0')
  })

  it('renders a copy-pool preamble string (not a hardcoded literal)', async () => {
    // Seed Math.random so the pick is deterministic.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    const { COPY } = await import('../lib/copy')
    render(<WorkoutView {...baseProps} />)

    const preamble = screen.getByTestId('workout-preamble')
    // The preamble text must come from the tier-2 preamble pools or the
    // rest-flex line (when restState is set). On first render, we expect
    // a line from preamble_* pools.
    const text = preamble.textContent ?? ''
    const candidatePools = [
      ...COPY[2].preamble_morning,
      ...COPY[2].preamble_afternoon,
      ...COPY[2].preamble_evening,
    ].map((t) => t.replace('{name}', 'Juno'))
    const matched = candidatePools.some((candidate) => text.includes(candidate))
    expect(matched).toBe(true)
    spy.mockRestore()
  })

  it('fires a Lumo reaction bubble on set complete with a setDone pool line', async () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    const { COPY } = await import('../lib/copy')
    render(<WorkoutView {...baseProps} />)

    expect(screen.queryByTestId('lumo-reaction')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: /Mark set 1 of romanian deadlift/i }),
    )
    const reaction = screen.getByTestId('lumo-reaction')
    expect(reaction).toBeInTheDocument()
    expect(reaction.getAttribute('data-is-pr')).toBe('false')
    // Reaction text must come from the tier-2 setDone pool.
    const reactionText = screen.getByTestId('lumo-reaction-text').textContent
    expect(COPY[2].setDone).toContain(reactionText)
  })

  it('rotates reaction lines across consecutive set taps (never repeats)', async () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)

    const firstBtn = screen.getByRole('button', {
      name: /Mark set 1 of romanian deadlift/i,
    })
    fireEvent.click(firstBtn)
    const firstLine = screen.getByTestId('lumo-reaction-text').textContent

    const secondBtn = screen.getByRole('button', {
      name: /Mark set 2 of romanian deadlift/i,
    })
    fireEvent.click(secondBtn)
    const secondLine = screen.getByTestId('lumo-reaction-text').textContent
    // With anti-repeat the lines must be different.
    expect(secondLine).not.toBe(firstLine)
  })

  it('fires a setDonePR reaction when the tap also beats the stored PR', async () => {
    const { loadPRs } = await import('../lib/persistence')
    const { COPY } = await import('../lib/copy')
    vi.mocked(loadPRs).mockResolvedValueOnce({ 'ex:rdl': 95 })
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const weightInput = screen.getAllByPlaceholderText(/lbs/i)[0]
    fireEvent.change(weightInput, { target: { value: '105' } })
    fireEvent.click(
      screen.getByRole('button', { name: /Mark set 1 of romanian deadlift/i }),
    )

    const reaction = screen.getByTestId('lumo-reaction')
    expect(reaction.getAttribute('data-is-pr')).toBe('true')
    const reactionText = screen.getByTestId('lumo-reaction-text').textContent
    expect(COPY[2].setDonePR).toContain(reactionText)
  })

  it('renders a ProgressStrip in the session body', async () => {
    vi.mocked(usePlan).mockReturnValue({ plan: makePlan([makeSession()]), loading: false })
    render(<WorkoutView {...baseProps} />)
    expect(screen.getByTestId('progress-strip')).toBeInTheDocument()
  })
})

// Warmup-circle UI removed in commit dedf5d6; will be replaced with inline
// prescription text, not interactive circles. The describe block that lived
// here (6 tests covering row counts, PR suppression, reaction bubble, rest-banner
// suppression, and haptic pulse) was deleted along with the
// `working-set tap does fire the 10ms haptic` sibling test (which relied on
// the same `makeWarmupSession` fixture).
