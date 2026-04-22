import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { PlannedSession } from '../types/plan'
import type { UserProgramProfile } from '../types/profile'
import type { Routine } from '../lib/routines'

// Mock `../hooks/useRoutine` and `../lib/routines` BEFORE importing the component
// so the mocked versions are injected.
vi.mock('../hooks/useRoutine', () => ({
  useRoutine: vi.fn(),
}))

vi.mock('../lib/routines', () => ({
  generateRoutine: vi.fn(),
}))

import { RoutineSlot } from './RoutineSlot'
import { useRoutine } from '../hooks/useRoutine'
import { generateRoutine } from '../lib/routines'

const baseProfile: UserProgramProfile = {
  goal: 'glutes',
  sessions_per_week: 4,
  training_age_months: 18,
  equipment: ['full_gym'],
  injuries: [],
  time_budget_min: 60,
  sex: 'female',
  posture_notes: 'desk worker',
}

const baseSession: PlannedSession = {
  id: 'sess-1',
  week_number: 1,
  ordinal: 1,
  focus: ['glutes'],
  title: 'Lower A',
  subtitle: '',
  estimated_minutes: 55,
  day_of_week: 0,
  rationale: 'Lower A Monday; fresh week start.',
  status: 'upcoming',
  exercises: [
    {
      library_id: 'fedb:hip-thrust',
      name: 'Barbell Hip Thrust',
      sets: 3,
      reps: '8-12',
      rir: 2,
      rest_seconds: 120,
      role: 'main lift',
      warmup_sets: [],
    },
  ],
}

const validRoutine: Routine = {
  title: 'Glute Warm-up',
  exercises: [
    { name: 'Banded glute bridge', reps: '15', notes: 'Squeeze at top' },
    { name: 'Hip airplane', duration_seconds: 30 },
    { name: '90/90 hip switch', reps: '10/side' },
  ],
}

beforeEach(() => {
  vi.mocked(useRoutine).mockReset()
  vi.mocked(generateRoutine).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('RoutineSlot', () => {
  it('renders spinner when useRoutine is loading', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: null, loading: true })

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    // Spinner (lucide Loader2 renders an svg). We assert on a role-less
    // status element tagged with a test id or accessible name.
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('auto-fires generateRoutine with default minutes when routine is null and not loading', async () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: null, loading: false })
    vi.mocked(generateRoutine).mockResolvedValue(validRoutine)

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    await waitFor(() => {
      expect(generateRoutine).toHaveBeenCalledTimes(1)
    })
    expect(generateRoutine).toHaveBeenCalledWith({
      session: baseSession,
      kind: 'warmup',
      profile: baseProfile,
      minutes: 10, // default for warmup
    })
  })

  it('uses cooldown default minutes (5) when kind is cooldown', async () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: null, loading: false })
    vi.mocked(generateRoutine).mockResolvedValue(validRoutine)

    render(<RoutineSlot session={baseSession} kind="cooldown" profile={baseProfile} />)

    await waitFor(() => {
      expect(generateRoutine).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'cooldown', minutes: 5 }),
      )
    })
  })

  it('uses cardio default minutes (15) when kind is cardio', async () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: null, loading: false })
    vi.mocked(generateRoutine).mockResolvedValue(validRoutine)

    render(<RoutineSlot session={baseSession} kind="cardio" profile={baseProfile} />)

    await waitFor(() => {
      expect(generateRoutine).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'cardio', minutes: 15 }),
      )
    })
  })

  it('renders title + exercises when routine is ready', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    expect(screen.getByText('Glute Warm-up')).toBeInTheDocument()
    expect(screen.getByText('Banded glute bridge')).toBeInTheDocument()
    expect(screen.getByText('Hip airplane')).toBeInTheDocument()
    expect(screen.getByText('90/90 hip switch')).toBeInTheDocument()
    // Duration rendered as MM:SS
    expect(screen.getByText('00:30')).toBeInTheDocument()
    // Reps rendered as string
    expect(screen.getByText('15')).toBeInTheDocument()
    // Notes shown
    expect(screen.getByText('Squeeze at top')).toBeInTheDocument()
  })

  it('does NOT show the regenerate picker by default after a routine is ready', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    // No minute chips visible until user explicitly opens the picker
    expect(screen.queryByText(/Replace current/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('tapping the regenerate icon opens the picker with minute + focus chips', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    const regenBtn = screen.getByRole('button', { name: /regenerate/i })
    fireEvent.click(regenBtn)

    // Picker is now open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Minute chips for warmup: 5 / 10 / 15 / 20
    expect(screen.getByRole('button', { name: '5 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '15 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20 min' })).toBeInTheDocument()
    // Focus chips for warmup
    expect(screen.getByRole('button', { name: 'Mobility' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Movement prep' })).toBeInTheDocument()
  })

  it('cooldown picker shows the cooldown-specific chips', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })

    render(<RoutineSlot session={baseSession} kind="cooldown" profile={baseProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))

    // Cooldown minute chips: 3 / 5 / 10
    expect(screen.getByRole('button', { name: '3 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10 min' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '20 min' })).not.toBeInTheDocument()
    // Cooldown focus chips
    expect(screen.getByRole('button', { name: 'Stretching' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Breath' })).toBeInTheDocument()
  })

  it('cardio picker shows the cardio-specific chips', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })

    render(<RoutineSlot session={baseSession} kind="cardio" profile={baseProfile} />)
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))

    expect(screen.getByRole('button', { name: '15 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zone 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Intervals' })).toBeInTheDocument()
  })

  it('picking time + focus + confirming calls generateRoutine with the selected args', async () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })
    vi.mocked(generateRoutine).mockResolvedValue(validRoutine)

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    fireEvent.click(screen.getByRole('button', { name: '15 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Activation' }))
    fireEvent.click(screen.getByRole('button', { name: /^yes/i }))

    await waitFor(() => {
      expect(generateRoutine).toHaveBeenCalledWith({
        session: baseSession,
        kind: 'warmup',
        profile: baseProfile,
        minutes: 15,
        focusTag: 'Activation',
      })
    })
  })

  it('cancel in the picker closes without calling generateRoutine', () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: validRoutine, loading: false })

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(generateRoutine).not.toHaveBeenCalled()
  })

  it('shows Retry button when generation throws; retry re-calls generateRoutine', async () => {
    vi.mocked(useRoutine).mockReturnValue({ routine: null, loading: false })
    vi.mocked(generateRoutine).mockRejectedValueOnce(new Error('boom'))

    render(<RoutineSlot session={baseSession} kind="warmup" profile={baseProfile} />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to build warmup/i)).toBeInTheDocument()
    })
    expect(generateRoutine).toHaveBeenCalledTimes(1)

    // Make the retry succeed.
    vi.mocked(generateRoutine).mockResolvedValueOnce(validRoutine)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(generateRoutine).toHaveBeenCalledTimes(2)
    })
  })
})
