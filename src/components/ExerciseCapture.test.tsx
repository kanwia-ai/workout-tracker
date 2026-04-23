import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the gemini + enrichment libs BEFORE importing the component so the
// test never triggers a real network call. The tests assert that the
// YouTube flow calls analyzeYouTubeShort (not the edge screenshot path) and
// that Claude enrichment failures degrade silently instead of crashing the
// review step.
vi.mock('../lib/gemini', async () => {
  const actual = await vi.importActual<typeof import('../lib/gemini')>('../lib/gemini')
  return {
    ...actual,
    analyzeYouTubeShort: vi.fn(),
    extractFromUrl: vi.fn(),
    extractFromScreenshots: vi.fn(),
  }
})

vi.mock('../lib/enrichExercise', () => ({
  enrichExercise: vi.fn(),
}))

import { ExerciseCapture } from './ExerciseCapture'
import {
  analyzeYouTubeShort,
  extractFromUrl,
  type AnalyzedExercise,
} from '../lib/gemini'
import { enrichExercise, type EnrichedExercise } from '../lib/enrichExercise'

const sampleAnalysis: AnalyzedExercise = {
  name: 'Bulgarian Split Squat',
  primary_muscles: ['quads', 'glutes'],
  secondary_muscles: ['core'],
  equipment: ['dumbbell', 'bench'],
  movement_pattern: 'squat',
  form_cues: ['drive through the front heel', 'keep chest tall'],
  injury_flags: ['loaded_knee_flexion_deep', 'unilateral_loaded'],
  confidence: 'high',
  source_url: 'https://youtu.be/abc123',
}

const sampleEnrichment: EnrichedExercise = {
  compatible_protocols: ['hip_flexors', 'meniscus'],
  contraindicated_protocols: [],
  progression: {
    name: 'Barbell Back Squat',
    why: 'bilateral load, heavier absolute weight',
  },
  regression: {
    name: 'Goblet Split Squat',
    why: 'lower load, lower balance demand',
  },
  rationale: 'Great fit — unilateral quad work without loading the lumbar spine.',
}

beforeEach(() => {
  vi.clearAllMocks()
})

function openYouTubeMode() {
  render(<ExerciseCapture onBack={vi.fn()} onSaveToLibrary={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /From YouTube URL/i }))
}

describe('ExerciseCapture — YouTube flow', () => {
  it('renders a YouTube URL input when the From YouTube URL mode is chosen', () => {
    openYouTubeMode()
    expect(screen.getByPlaceholderText(/youtube.com\/watch/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /extract exercises/i })).toBeInTheDocument()
  })

  it('calls analyzeYouTubeShort and shows the review step with extracted data', async () => {
    vi.mocked(analyzeYouTubeShort).mockResolvedValue(sampleAnalysis)
    vi.mocked(enrichExercise).mockResolvedValue(sampleEnrichment)

    openYouTubeMode()
    fireEvent.change(screen.getByPlaceholderText(/youtube.com\/watch/i), {
      target: { value: 'https://youtu.be/abc123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract exercises/i }))

    await waitFor(() => {
      expect(analyzeYouTubeShort).toHaveBeenCalledWith('https://youtu.be/abc123')
    })

    // Review step appears with the exercise name
    expect(await screen.findByText('Bulgarian Split Squat')).toBeInTheDocument()
    // Confidence chip from the analysis panel
    expect(screen.getByText('high')).toBeInTheDocument()
    // Movement pattern label
    expect(screen.getByText(/pattern: squat/)).toBeInTheDocument()
    // Biomechanical flag chip
    expect(screen.getByText('loaded_knee_flexion_deep')).toBeInTheDocument()
  })

  it('routes NON-YouTube URLs through extractFromUrl (screenshot fallback)', async () => {
    vi.mocked(extractFromUrl).mockResolvedValue({
      exercises: [],
      source_url: 'https://tiktok.com/@u/video/1',
      error: 'SCREENSHOT_NEEDED',
    })

    openYouTubeMode()
    fireEvent.change(screen.getByPlaceholderText(/youtube.com\/watch/i), {
      target: { value: 'https://tiktok.com/@u/video/1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract exercises/i }))

    await waitFor(() => {
      expect(extractFromUrl).toHaveBeenCalledWith('https://tiktok.com/@u/video/1')
    })
    // The Gemini path is NOT hit for non-YouTube inputs
    expect(analyzeYouTubeShort).not.toHaveBeenCalled()
  })

  it('calls enrichExercise in the background and shows Coach notes when it succeeds', async () => {
    vi.mocked(analyzeYouTubeShort).mockResolvedValue(sampleAnalysis)
    vi.mocked(enrichExercise).mockResolvedValue(sampleEnrichment)

    openYouTubeMode()
    fireEvent.change(screen.getByPlaceholderText(/youtube.com\/watch/i), {
      target: { value: 'https://youtu.be/abc123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract exercises/i }))

    await waitFor(() => {
      expect(enrichExercise).toHaveBeenCalledWith(sampleAnalysis)
    })
    // Coach notes render after the Promise settles
    expect(await screen.findByText(/Coach notes/i)).toBeInTheDocument()
    expect(screen.getByText(/Great fit/i)).toBeInTheDocument()
    expect(screen.getByText('Barbell Back Squat')).toBeInTheDocument()
    expect(screen.getByText('Goblet Split Squat')).toBeInTheDocument()
    // Compatible protocol chips
    expect(screen.getByText('hip_flexors')).toBeInTheDocument()
    expect(screen.getByText('meniscus')).toBeInTheDocument()
  })

  it('degrades silently when enrichExercise throws (e.g. edge op not deployed)', async () => {
    vi.mocked(analyzeYouTubeShort).mockResolvedValue(sampleAnalysis)
    vi.mocked(enrichExercise).mockRejectedValue(new Error('unknown op: enrich_exercise'))

    openYouTubeMode()
    fireEvent.change(screen.getByPlaceholderText(/youtube.com\/watch/i), {
      target: { value: 'https://youtu.be/abc123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract exercises/i }))

    // The exercise name still shows — review step isn't blocked by the
    // enrichment failure.
    expect(await screen.findByText('Bulgarian Split Squat')).toBeInTheDocument()
    // And "Coach notes" never appears because enrichment failed.
    await waitFor(() => {
      expect(enrichExercise).toHaveBeenCalled()
    })
    expect(screen.queryByText(/Coach notes/i)).not.toBeInTheDocument()
  })

  it('calls onSaveToLibrary with the reviewed exercise when the user confirms', async () => {
    vi.mocked(analyzeYouTubeShort).mockResolvedValue(sampleAnalysis)
    vi.mocked(enrichExercise).mockResolvedValue(sampleEnrichment)
    const onSave = vi.fn()

    render(<ExerciseCapture onBack={vi.fn()} onSaveToLibrary={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /From YouTube URL/i }))
    fireEvent.change(screen.getByPlaceholderText(/youtube.com\/watch/i), {
      target: { value: 'https://youtu.be/abc123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract exercises/i }))

    await screen.findByText('Bulgarian Split Squat')
    fireEvent.click(screen.getByRole('button', { name: /add to library/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const [savedExercises] = onSave.mock.calls[0]
    expect(savedExercises).toHaveLength(1)
    expect(savedExercises[0].name).toBe('Bulgarian Split Squat')
    expect(savedExercises[0].muscle_groups).toEqual(['quads', 'glutes', 'core'])
    expect(savedExercises[0].equipment).toEqual(['dumbbell', 'bench'])
    expect(savedExercises[0].form_cues).toHaveLength(2)
  })

  it('surfaces Gemini errors on the input screen without crashing', async () => {
    vi.mocked(analyzeYouTubeShort).mockRejectedValue(new Error('Gemini API error 403: quota exceeded'))

    openYouTubeMode()
    fireEvent.change(screen.getByPlaceholderText(/youtube.com\/watch/i), {
      target: { value: 'https://youtu.be/abc123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract exercises/i }))

    expect(await screen.findByText(/quota exceeded/i)).toBeInTheDocument()
    // Does NOT advance to review — still on the input screen
    expect(screen.queryByText(/Review Exercises/i)).not.toBeInTheDocument()
  })
})
