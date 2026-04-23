import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  analyzeYouTubeShort,
  isYouTubeUrl,
  BIOMECHANICAL_ATTRIBUTE_VOCAB,
  extractFromUrl,
} from './gemini'

// All tests mock fetch — the real Gemini endpoint is never hit. This keeps
// the suite deterministic and avoids burning API quota during CI or
// pre-commit hooks.
const originalKey = import.meta.env.VITE_GEMINI_API_KEY
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  // Ensure a key is present so analyzeYouTubeShort doesn't short-circuit
  // before it ever touches the mocked fetch.
  ;(import.meta.env as Record<string, unknown>).VITE_GEMINI_API_KEY = 'test-key'
})
afterEach(() => {
  vi.restoreAllMocks()
  ;(import.meta.env as Record<string, unknown>).VITE_GEMINI_API_KEY = originalKey
})

function mockGeminiOk(args: unknown) {
  ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ functionCall: { name: 'emit_exercise', args } }],
          },
        },
      ],
    }),
  })
}

describe('isYouTubeUrl', () => {
  it('accepts youtube.com/watch', () => {
    expect(isYouTubeUrl('https://youtube.com/watch?v=abc123')).toBe(true)
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc123&t=10s')).toBe(true)
  })

  it('accepts youtube.com/shorts', () => {
    expect(isYouTubeUrl('https://youtube.com/shorts/abc123')).toBe(true)
    expect(isYouTubeUrl('https://www.youtube.com/shorts/abc123')).toBe(true)
  })

  it('accepts youtu.be short links', () => {
    expect(isYouTubeUrl('https://youtu.be/abc123')).toBe(true)
  })

  it('rejects non-YouTube URLs', () => {
    expect(isYouTubeUrl('https://tiktok.com/@user/video/123')).toBe(false)
    expect(isYouTubeUrl('https://instagram.com/reel/abc')).toBe(false)
    expect(isYouTubeUrl('https://example.com')).toBe(false)
  })

  it('rejects malformed strings', () => {
    expect(isYouTubeUrl('')).toBe(false)
    expect(isYouTubeUrl('not a url')).toBe(false)
    expect(isYouTubeUrl('https://youtube.com')).toBe(false) // no video path
  })
})

describe('analyzeYouTubeShort', () => {
  it('throws when the URL is not a YouTube link', async () => {
    await expect(analyzeYouTubeShort('https://tiktok.com/x')).rejects.toThrow(/Not a YouTube URL/)
  })

  it('throws when VITE_GEMINI_API_KEY is not set', async () => {
    ;(import.meta.env as Record<string, unknown>).VITE_GEMINI_API_KEY = ''
    await expect(analyzeYouTubeShort('https://youtu.be/abc')).rejects.toThrow(/api key/i)
  })

  it('returns the normalized AnalyzedExercise on a valid response', async () => {
    mockGeminiOk({
      name: 'Bulgarian Split Squat',
      primary_muscles: ['QUADS', 'Glutes'],
      secondary_muscles: ['core'],
      equipment: ['dumbbell', 'bench'],
      movement_pattern: 'squat',
      form_cues: ['drive through the front heel', 'keep chest tall'],
      injury_flags: ['loaded_knee_flexion_deep', 'unilateral_loaded', 'FAKE_NOT_IN_VOCAB'],
      confidence: 'high',
    })

    const result = await analyzeYouTubeShort('https://youtu.be/abc123')
    expect(result.name).toBe('Bulgarian Split Squat')
    // Lowercase normalization on muscles/equipment
    expect(result.primary_muscles).toEqual(['quads', 'glutes'])
    expect(result.equipment).toEqual(['dumbbell', 'bench'])
    expect(result.form_cues).toHaveLength(2)
    // Injury flags filter novel strings against the allowed vocabulary
    expect(result.injury_flags).toEqual(['loaded_knee_flexion_deep', 'unilateral_loaded'])
    expect(result.confidence).toBe('high')
    expect(result.movement_pattern).toBe('squat')
    expect(result.source_url).toBe('https://youtu.be/abc123')
  })

  it('defaults to safe values when the model omits fields', async () => {
    mockGeminiOk({}) // completely empty — pathological but possible
    const result = await analyzeYouTubeShort('https://youtu.be/abc123')
    expect(result.name).toBe('Unknown Exercise')
    expect(result.primary_muscles).toEqual([])
    expect(result.injury_flags).toEqual([])
    expect(result.movement_pattern).toBe('other')
    expect(result.confidence).toBe('low')
  })

  it('POSTs to the Gemini endpoint with the video URL as fileData', async () => {
    mockGeminiOk({ name: 'Squat', primary_muscles: [], secondary_muscles: [], equipment: [], movement_pattern: 'squat', form_cues: [], injury_flags: [], confidence: 'high' })
    await analyzeYouTubeShort('https://youtu.be/xyz')
    const mock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(mock).toHaveBeenCalledOnce()
    const [url, init] = mock.mock.calls[0]
    expect(url).toContain('generativelanguage.googleapis.com')
    expect(url).toContain('gemini-2.0-flash')
    const body = JSON.parse((init as RequestInit).body as string)
    const fileData = body.contents[0].parts[0].fileData
    expect(fileData.fileUri).toBe('https://youtu.be/xyz')
    expect(fileData.mimeType).toBe('video/*')
    // Forced function call
    expect(body.toolConfig.functionCallingConfig.mode).toBe('ANY')
  })

  it('wraps non-200 responses with a clear error', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'quota exceeded',
    })
    await expect(analyzeYouTubeShort('https://youtu.be/abc')).rejects.toThrow(/403/)
  })

  it('throws when Gemini returns no function call', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'no-tool' }] } }] }),
    })
    await expect(analyzeYouTubeShort('https://youtu.be/abc')).rejects.toThrow(/structured exercise/)
  })

  it('surfaces Gemini safety blocks as errors', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
    })
    await expect(analyzeYouTubeShort('https://youtu.be/abc')).rejects.toThrow(/blocked/i)
  })
})

describe('extractFromUrl routing', () => {
  it('routes YouTube URLs through the Gemini analyzer', async () => {
    mockGeminiOk({
      name: 'Deadlift',
      primary_muscles: ['back', 'hamstrings'],
      secondary_muscles: [],
      equipment: ['barbell'],
      movement_pattern: 'hinge',
      form_cues: ['brace', 'push the floor'],
      injury_flags: ['loaded_deadlift'],
      confidence: 'high',
    })

    const result = await extractFromUrl('https://youtube.com/shorts/abc')
    expect(result.error).toBeUndefined()
    expect(result.exercises).toHaveLength(1)
    expect(result.exercises[0].name).toBe('Deadlift')
    expect(result.exercises[0].muscle_groups).toEqual(['back', 'hamstrings'])
    expect(result.source_url).toBe('https://youtube.com/shorts/abc')
  })

  it('returns SCREENSHOT_NEEDED for non-YouTube URLs', async () => {
    const result = await extractFromUrl('https://tiktok.com/@u/video/1')
    expect(result.error).toBe('SCREENSHOT_NEEDED')
    // No fetch should happen when we short-circuit to screenshots
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces Gemini errors as a populated ExtractionResult.error', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => 'boom',
    })
    const result = await extractFromUrl('https://youtu.be/abc')
    expect(result.exercises).toEqual([])
    expect(result.error).toMatch(/500/)
  })
})

describe('BIOMECHANICAL_ATTRIBUTE_VOCAB', () => {
  it('includes the core knee and back patterns the rehab protocols reference', () => {
    const asSet = new Set<string>(BIOMECHANICAL_ATTRIBUTE_VOCAB)
    // These are pulled directly from src/data/rehab-protocols/*.ts — if the
    // protocols add a new hard_ban_patterns token, this test should force us
    // to extend the vocabulary so Gemini can surface it.
    expect(asSet.has('loaded_knee_flexion_under_90')).toBe(true)
    expect(asSet.has('loaded_deadlift')).toBe(true)
    expect(asSet.has('overhead_press_any_load')).toBe(true)
  })
})
