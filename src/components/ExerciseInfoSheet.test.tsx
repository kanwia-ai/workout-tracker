import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { LibraryExercise } from '../lib/db'

// Mock `dexie-react-hooks` BEFORE importing the component so the mocked
// `useLiveQuery` is injected. We return a controlled value per test by
// reassigning the mock implementation.
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn(),
}))

// Mock `../lib/db` — the component references `db.exerciseLibrary.get(...)`
// inside the useLiveQuery callback, but since we mock useLiveQuery itself,
// the real Dexie call never fires. We still stub it to avoid module init
// side-effects in the test env.
vi.mock('../lib/db', () => ({
  db: {
    exerciseLibrary: {
      get: vi.fn(),
    },
  },
}))

import { ExerciseInfoSheet } from './ExerciseInfoSheet'
import { useLiveQuery } from 'dexie-react-hooks'

const sampleExercise: LibraryExercise = {
  id: 'fedb:barbell-squat',
  name: 'Barbell Squat',
  force: 'push',
  level: 'intermediate',
  mechanic: 'compound',
  equipment: 'barbell',
  primaryMuscles: ['quads', 'glutes'],
  secondaryMuscles: ['hamstrings', 'calves'],
  instructions: [
    'Set the bar on your upper back.',
    'Descend with control.',
    'Drive through mid-foot to stand.',
  ],
  category: 'strength',
  imageCount: 2,
  rawId: 'Barbell_Squat',
}

beforeEach(() => {
  vi.mocked(useLiveQuery).mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('ExerciseInfoSheet', () => {
  it('renders nothing when libraryId is null', () => {
    vi.mocked(useLiveQuery).mockReturnValue(undefined)

    const { container } = render(
      <ExerciseInfoSheet libraryId={null} onClose={vi.fn()} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders name, instructions, and muscle chips when a matching row is found', () => {
    vi.mocked(useLiveQuery).mockReturnValue(sampleExercise)

    render(
      <ExerciseInfoSheet libraryId="fedb:barbell-squat" onClose={vi.fn()} />,
    )

    // Name rendered prominently
    expect(
      screen.getByRole('heading', { name: 'Barbell Squat' }),
    ).toBeInTheDocument()

    // Instructions rendered as a numbered list (content checks)
    expect(
      screen.getByText('Set the bar on your upper back.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Descend with control.')).toBeInTheDocument()
    expect(
      screen.getByText('Drive through mid-foot to stand.'),
    ).toBeInTheDocument()

    // Muscle pills
    expect(screen.getByText('quads')).toBeInTheDocument()
    expect(screen.getByText('glutes')).toBeInTheDocument()
    expect(screen.getByText('hamstrings')).toBeInTheDocument()
    expect(screen.getByText('calves')).toBeInTheDocument()
  })

  it('shows "No details" state when libraryId is set but no matching row', () => {
    // useLiveQuery resolved with null = confirmed-missing
    vi.mocked(useLiveQuery).mockReturnValue(null)

    render(
      <ExerciseInfoSheet libraryId="fedb:does-not-exist" onClose={vi.fn()} />,
    )

    expect(screen.getByText(/No details for this exercise/i)).toBeInTheDocument()
  })

  it('fires onClose when the close button is clicked', () => {
    vi.mocked(useLiveQuery).mockReturnValue(sampleExercise)
    const onClose = vi.fn()

    render(
      <ExerciseInfoSheet libraryId="fedb:barbell-squat" onClose={onClose} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fires onClose when the backdrop is tapped', () => {
    vi.mocked(useLiveQuery).mockReturnValue(sampleExercise)
    const onClose = vi.fn()

    render(
      <ExerciseInfoSheet libraryId="fedb:barbell-squat" onClose={onClose} />,
    )

    const backdrop = screen.getByTestId('exercise-info-backdrop')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows a loading spinner while useLiveQuery is pending', () => {
    // undefined = still pending
    vi.mocked(useLiveQuery).mockReturnValue(undefined)

    render(
      <ExerciseInfoSheet libraryId="fedb:barbell-squat" onClose={vi.fn()} />,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
