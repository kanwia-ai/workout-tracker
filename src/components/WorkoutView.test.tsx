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

// Check-in persistence is Dexie-backed; stub so the end-session flow
// doesn't try to open a real IndexedDB in the test env.
vi.mock('../lib/checkins', () => ({
  saveCheckin: vi.fn().mockResolvedValue(undefined),
}))

// Auto-progression reads Dexie sessionCheckins to recommend next-session
// weights. Stub to an empty map so the seeded suggestion path stays
// deterministic and tests don't need a fake-indexeddb backend.
vi.mock('../lib/planner/autoProgress', () => ({
  computeAutoProgressionForSession: vi.fn().mockResolvedValue({}),
}))

// The check-in sheet renders a modal dialog; stub to a trivial hook so
// WorkoutView tests can observe its presence without dealing with the
// full widget surface.
vi.mock('./SessionCheckinSheet', () => ({
  SessionCheckinSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="checkin-sheet" /> : null,
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

import { WorkoutView, LiftCard } from './WorkoutView'
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

describe('LiftCard adaptive rep-target badge', () => {
  // Direct prop-driven tests of LiftCard render, isolating the rep_target
  // wire-up from WorkoutView's effect chain. The end-to-end render path
  // (Dexie → autoProgress → setRepTargets → LiftCard) is browser-tested.
  function makeExercise() {
    return makeSession().exercises[0]!
  }
  const baseLiftCardProps = {
    exIdx: 0,
    isCompleted: false,
    displayedWeight: 100,
    perSetActive: false,
    perSetArr: [],
    expanded: false,
    hasPRFlag: false,
    checkedSets: {} as Record<string, boolean>,
    burstKey: null,
    burstTrigger: 0,
    burstIsWarmup: false,
    onTapSet: vi.fn(),
    onInfo: vi.fn(),
    onSwap: vi.fn(),
    onToggleExpand: vi.fn(),
    onChangeWeight: vi.fn(),
    onChangePerSet: vi.fn(),
  }

  it('renders an "aim N" badge when repTarget prop is set', () => {
    render(<LiftCard {...baseLiftCardProps} ex={makeExercise()} repTarget={13} />)
    const badge = screen.getByTestId('rep-target-ex:rdl')
    expect(badge.textContent).toContain('aim 13')
  })

  it('does not render the badge when repTarget is undefined', () => {
    render(<LiftCard {...baseLiftCardProps} ex={makeExercise()} repTarget={undefined} />)
    expect(screen.queryByTestId('rep-target-ex:rdl')).not.toBeInTheDocument()
  })
})

describe('LiftCard band-tension picker', () => {
  // Direct prop-driven tests, mirroring the rep-target block above. The
  // detection branch (suggested_weight_lbs undefined + name regex) is wired
  // up in WorkoutView itself; here we exercise the rendered control by
  // passing isBanded through directly.
  function makeBandedExercise(): PlannedSession['exercises'][number] {
    return {
      library_id: 'ex:clamshell',
      name: 'banded clamshell',
      sets: 2,
      reps: '15',
      rir: 1,
      rest_seconds: 45,
      role: 'isolation',
      warmup_sets: [],
      // Note: no suggested_weight_lbs — that's what triggers the band branch
      // in the WorkoutView call site. Here we control it via isBanded.
    }
  }
  function makeBodyweightExercise(): PlannedSession['exercises'][number] {
    return {
      library_id: 'ex:pullup',
      name: 'pull-up',
      sets: 3,
      reps: '5-8',
      rir: 2,
      rest_seconds: 120,
      role: 'main lift',
      warmup_sets: [],
    }
  }
  const baseLiftCardProps = {
    exIdx: 0,
    isCompleted: false,
    displayedWeight: 0,
    perSetActive: false,
    perSetArr: [],
    expanded: false,
    hasPRFlag: false,
    checkedSets: {} as Record<string, boolean>,
    burstKey: null,
    burstTrigger: 0,
    burstIsWarmup: false,
    onTapSet: vi.fn(),
    onInfo: vi.fn(),
    onSwap: vi.fn(),
    onToggleExpand: vi.fn(),
    onChangeWeight: vi.fn(),
    onChangePerSet: vi.fn(),
  }

  it('renders the 4-button tension control instead of the weight pill when isBanded', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeBandedExercise()}
        isBanded
        onChangeBandTension={vi.fn()}
      />,
    )
    expect(screen.getByTestId('band-tension-ex:clamshell')).toBeInTheDocument()
    expect(screen.getByTestId('band-tension-ex:clamshell-light')).toBeInTheDocument()
    expect(screen.getByTestId('band-tension-ex:clamshell-medium')).toBeInTheDocument()
    expect(screen.getByTestId('band-tension-ex:clamshell-heavy')).toBeInTheDocument()
    expect(screen.getByTestId('band-tension-ex:clamshell-x-heavy')).toBeInTheDocument()
    // The weight-row is the OTHER branch — should not render alongside.
    expect(screen.queryByTestId('weight-row')).not.toBeInTheDocument()
  })

  it('calls onChangeBandTension with the selected value when a button is tapped', () => {
    const onChange = vi.fn()
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeBandedExercise()}
        isBanded
        onChangeBandTension={onChange}
      />,
    )
    fireEvent.click(screen.getByTestId('band-tension-ex:clamshell-medium'))
    expect(onChange).toHaveBeenCalledWith('medium')
    fireEvent.click(screen.getByTestId('band-tension-ex:clamshell-x-heavy'))
    expect(onChange).toHaveBeenLastCalledWith('x-heavy')
  })

  it('renders all 4 buttons unselected when no tension is set yet', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeBandedExercise()}
        isBanded
        bandTension={undefined}
        onChangeBandTension={vi.fn()}
      />,
    )
    for (const t of ['light', 'medium', 'heavy', 'x-heavy']) {
      const btn = screen.getByTestId(`band-tension-ex:clamshell-${t}`)
      expect(btn.getAttribute('aria-checked')).toBe('false')
    }
  })

  it('does NOT render the band-tension control for a non-banded bodyweight exercise', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeBodyweightExercise()}
        isBanded={false}
        repTarget={8}
      />,
    )
    expect(screen.queryByTestId('band-tension-ex:pullup')).not.toBeInTheDocument()
    // The non-banded branch should still render the weight row (when not perSetActive).
    expect(screen.getByTestId('weight-row')).toBeInTheDocument()
    // And the rep-target badge stays present, proving the bodyweight rep-target path
    // still works alongside this change.
    expect(screen.getByTestId('rep-target-ex:pullup')).toBeInTheDocument()
  })
})

// ─── Per-set effort tap pill (Affordance 1) ───────────────────────────────
// The pill row sits inline below each completed set circle. It only renders
// after the set is marked done — capturing the signal while the experience
// is fresh, without nagging the user before they've finished.

describe('LiftCard per-set effort tap', () => {
  function makeExercise(): PlannedSession['exercises'][number] {
    return {
      library_id: 'ex:squat',
      name: 'Back Squat',
      sets: 3,
      reps: '8-12',
      rir: 2,
      rest_seconds: 90,
      role: 'main lift',
      warmup_sets: [],
      suggested_weight_lbs: 100,
    }
  }
  const baseLiftCardProps = {
    exIdx: 0,
    isCompleted: false,
    displayedWeight: 100,
    perSetActive: false,
    perSetArr: [],
    expanded: false,
    hasPRFlag: false,
    burstKey: null,
    burstTrigger: 0,
    burstIsWarmup: false,
    onTapSet: vi.fn(),
    onInfo: vi.fn(),
    onSwap: vi.fn(),
    onToggleExpand: vi.fn(),
    onChangeWeight: vi.fn(),
    onChangePerSet: vi.fn(),
  }

  it('does NOT render the rating pill for incomplete sets', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeExercise()}
        checkedSets={{}}
        onSetRating={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('set-rating-0')).not.toBeInTheDocument()
  })

  it('renders the 3-button rating pill below a completed set', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeExercise()}
        checkedSets={{ '0-0': true }}
        onSetRating={vi.fn()}
      />,
    )
    expect(screen.getByTestId('set-rating-0')).toBeInTheDocument()
    expect(screen.getByTestId('set-rating-0-easy')).toBeInTheDocument()
    expect(screen.getByTestId('set-rating-0-on-it')).toBeInTheDocument()
    expect(screen.getByTestId('set-rating-0-cooked')).toBeInTheDocument()
  })

  it('fires onSetRating with the tapped value', () => {
    const onSetRating = vi.fn()
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeExercise()}
        checkedSets={{ '0-0': true }}
        onSetRating={onSetRating}
      />,
    )
    fireEvent.click(screen.getByTestId('set-rating-0-cooked'))
    expect(onSetRating).toHaveBeenCalledWith(0, 'cooked')
    fireEvent.click(screen.getByTestId('set-rating-0-easy'))
    expect(onSetRating).toHaveBeenLastCalledWith(0, 'easy')
  })

  it('marks the current tap as aria-checked', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeExercise()}
        checkedSets={{ '0-0': true }}
        setRatings={{ '0-0': 'on it' }}
        onSetRating={vi.fn()}
      />,
    )
    expect(screen.getByTestId('set-rating-0-on-it').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('set-rating-0-easy').getAttribute('aria-checked')).toBe('false')
    expect(screen.getByTestId('set-rating-0-cooked').getAttribute('aria-checked')).toBe('false')
  })

  it('does NOT render the rating pill when onSetRating is absent (legacy callers)', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeExercise()}
        checkedSets={{ '0-0': true }}
      />,
    )
    expect(screen.queryByTestId('set-rating-0')).not.toBeInTheDocument()
  })
})

// ─── Mind-muscle prompt (Affordance 3) ────────────────────────────────────
// Only renders on hard-to-feel exercises, after the first working set is
// marked done, and only when the user hasn't already answered.

describe('LiftCard mind-muscle prompt', () => {
  function makeHardToFeel(): PlannedSession['exercises'][number] {
    return {
      library_id: 'variant:cable_row_neutral',
      name: 'Neutral-Grip Cable Row',
      sets: 3,
      reps: '10',
      rir: 2,
      rest_seconds: 90,
      role: 'main lift',
      warmup_sets: [],
      suggested_weight_lbs: 80,
    }
  }
  function makeEasyToFeel(): PlannedSession['exercises'][number] {
    return {
      library_id: 'variant:back_squat_moderate',
      name: 'Back Squat',
      sets: 3,
      reps: '8-12',
      rir: 2,
      rest_seconds: 180,
      role: 'main lift',
      warmup_sets: [],
      suggested_weight_lbs: 135,
    }
  }
  const baseLiftCardProps = {
    exIdx: 0,
    isCompleted: false,
    displayedWeight: 80,
    perSetActive: false,
    perSetArr: [],
    expanded: false,
    hasPRFlag: false,
    burstKey: null,
    burstTrigger: 0,
    burstIsWarmup: false,
    onTapSet: vi.fn(),
    onInfo: vi.fn(),
    onSwap: vi.fn(),
    onToggleExpand: vi.fn(),
    onChangeWeight: vi.fn(),
    onChangePerSet: vi.fn(),
  }

  it('hides the prompt before any sets are done (no nagging upfront)', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeHardToFeel()}
        isHardToFeelEx
        checkedSets={{}}
        onMindMuscleFelt={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('mind-muscle-pill')).not.toBeInTheDocument()
  })

  it('shows the prompt once the first set is done on a hard-to-feel exercise', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeHardToFeel()}
        isHardToFeelEx
        checkedSets={{ '0-0': true }}
        onMindMuscleFelt={vi.fn()}
      />,
    )
    expect(screen.getByTestId('mind-muscle-pill')).toBeInTheDocument()
    expect(screen.getByTestId('mind-muscle-felt')).toBeInTheDocument()
    expect(screen.getByTestId('mind-muscle-missed')).toBeInTheDocument()
  })

  it('hides the prompt and shows a confirm once the user taps', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeHardToFeel()}
        isHardToFeelEx
        checkedSets={{ '0-0': true }}
        mindMuscleFelt="felt"
        onMindMuscleFelt={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('mind-muscle-pill')).not.toBeInTheDocument()
    expect(screen.getByTestId('mind-muscle-confirm')).toBeInTheDocument()
    expect(
      screen.getByTestId('mind-muscle-confirm').getAttribute('data-mind-muscle-value'),
    ).toBe('felt')
  })

  it('does NOT show the prompt on easy-to-feel exercises (back squat)', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeEasyToFeel()}
        isHardToFeelEx={false}
        checkedSets={{ '0-0': true }}
        onMindMuscleFelt={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('mind-muscle-pill')).not.toBeInTheDocument()
  })

  it('fires onMindMuscleFelt with the selected value', () => {
    const onMM = vi.fn()
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={makeHardToFeel()}
        isHardToFeelEx
        checkedSets={{ '0-0': true }}
        onMindMuscleFelt={onMM}
      />,
    )
    fireEvent.click(screen.getByTestId('mind-muscle-missed'))
    expect(onMM).toHaveBeenCalledWith('missed')
  })

  it('renders +1 extra warmup row when warmupDelta is 1', () => {
    render(
      <LiftCard
        {...baseLiftCardProps}
        ex={{
          ...makeHardToFeel(),
          warmup_sets: [{ percent: 50, reps: 10 }],
        }}
        isHardToFeelEx
        warmupDelta={1}
        checkedSets={{}}
      />,
    )
    const warmup = screen.getByTestId('warmup-block')
    // The "extra" prefix flags the delta row so the user can see WHY it's
    // there. Two rows total: 1 extra + 1 base.
    expect(warmup.textContent).toContain('extra')
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
    // New UI: tap the center chip (aria-label="Set weight" when unset), type
    // into the inline input (aria-label="Edit current weight"), commit via Enter.
    fireEvent.click(screen.getAllByRole('button', { name: /^Set weight$/i })[0])
    const weightInput = screen.getByLabelText(/Edit current weight/i)
    fireEvent.change(weightInput, { target: { value: '105' } })
    fireEvent.keyDown(weightInput, { key: 'Enter' })

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
    // Enter a weight that ties the PR via the new chip-row editor.
    fireEvent.click(screen.getAllByRole('button', { name: /^Set weight$/i })[0])
    const weightInput = screen.getByLabelText(/Edit current weight/i)
    fireEvent.change(weightInput, { target: { value: '100' } })
    fireEvent.keyDown(weightInput, { key: 'Enter' })
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
    const chevron = screen.getAllByRole('button', { name: /per set|per-set weights/i })[0]
    // Before expand → no Set-1 sublabel.
    expect(screen.queryByText(/^Set 1$/)).not.toBeInTheDocument()
    fireEvent.click(chevron)
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

    // New UI: enter weight via the chip-row center tap-to-edit input.
    fireEvent.click(screen.getAllByRole('button', { name: /^Set weight$/i })[0])
    const weightInput = screen.getByLabelText(/Edit current weight/i)
    fireEvent.change(weightInput, { target: { value: '105' } })
    fireEvent.keyDown(weightInput, { key: 'Enter' })
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
